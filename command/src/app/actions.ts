"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_KEEN_NAME, adminKeenHolders, giveAdminKeen } from "@/lib/keen-grant";
import { describeLocation, maskIp } from "@/lib/geo";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

type S = { role: string; code: string };
type Level = "STAFF" | "SECURITY" | "ADMIN" | "OWNER";
type Res = { ok: boolean; info?: string; newOwner?: string; role?: string; code?: string; holders?: string[] };

const GENERIC_FAILURE = "Något gick fel. Försök igen.";

/**
 * Every mutating action funnels through here so that
 *  - the caller's code is always checked against the live codes in the DB, and
 *  - a database hiccup returns a clean failure object instead of throwing.
 * A thrown error from a server action becomes an unhandled rejection in the
 * browser (and, in dev, the error overlay), which is exactly what we don't want.
 */
async function withAuth(min: Level, s: S | null | undefined, fn: () => Promise<Res>): Promise<Res> {
  try {
    if (!(await ok(s, min))) return { ok: false, info: "" };
    return await fn();
  } catch {
    return { ok: false, info: GENERIC_FAILURE };
  }
}

async function ok(s: S | null | undefined, min: Level): Promise<boolean> {
  if (!s?.code) return false;
  const settings = await prisma.adminSettings.findFirst();
  if (!settings) return false;
  if (min === "STAFF")
    return s.code === settings.ownerCode || s.code === settings.adminCode || s.code === settings.securityCode;
  if (min === "SECURITY") return s.code === settings.ownerCode || s.code === settings.securityCode;
  if (min === "ADMIN") return s.code === settings.ownerCode || s.code === settings.adminCode;
  if (min === "OWNER") return s.code === settings.ownerCode;
  return false;
}

async function log(username: string, action: string) {
  await prisma.activity.create({ data: { username, action } });
}

const userShape = (u: any) => ({
  id: u.id,
  username: u.username,
  role: u.role,
  level: u.level,
  xp: u.xp,
  coins: u.coins,
  warnings: u.warnings,
  bannedUntil: u.bannedUntil ? u.bannedUntil.toISOString() : null,
  lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
  livePath: u.livePath,
  secretNote: u.secretNote,
  pinned: Boolean(u.pinned),
});

/**
 * "Fäst" puts a user on top of every staff list; the queries come back newest
 * first, so a stable sort by the pin flag keeps that order inside each group.
 * Without this the pin button wrote to the database and nothing ever moved.
 */
const byPinnedFirst = (a: { pinned: boolean }, b: { pinned: boolean }) => Number(b.pinned) - Number(a.pinned);

const time = (d: Date | null) => (d ? d.toISOString() : null);

/**
 * Whole numbers only, and never NaN.
 *
 * Every duration in this console arrives as a string from a modal. `NaN` used
 * to go straight into `new Date(...)`, which Prisma rejected, so the user saw
 * "Något gick fel" instead of a ban. Clamping at the edge is what keeps those
 * actions honest.
 */
const whole = (value: unknown, fallback = 0): number => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
};

/** Minutes already used today by the shared console budget. */
function startOfDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const ADMIN_COIN_DAILY_CAP = 1000;

/**
 * Who a staff code may act on.
 *
 * The old actions took a username and never looked at the target's role, so a
 * security code could ban an admin and an admin could ban a colleague. The
 * in-app moderation panel already refuses that; this makes both tools agree.
 * Only the owner reaches staff accounts, and nobody reaches the owner.
 */
async function targetGuard(
  actorRole: string,
  username: string
): Promise<{ ok: true; id: string; username: string; role: string } | { ok: false; info: string }> {
  const t = await prisma.profile.findUnique({
    where: { username },
    select: { id: true, username: true, role: true },
  });
  if (!t) return { ok: false, info: "Användaren finns inte." };
  if (t.role === "OWNER") return { ok: false, info: "Ägarens konto är skyddat." };
  if (actorRole !== "OWNER" && (t.role === "ADMIN" || t.role === "SECURITY")) {
    return { ok: false, info: "Bara ägaren kan göra det mot personal." };
  }
  return { ok: true, ...t };
}

/** Security may only lift short sanctions; a day-long ban is someone else's call. */
function secCanUndo(until: Date | null): { ok: true } | { ok: false; info: string } {
  if (!until) return { ok: true };
  if (until.getTime() - Date.now() > 60 * 60_000) {
    return { ok: false, info: "Bara admin eller ägaren kan häva den bannen." };
  }
  return { ok: true };
}

// ─── unlock ──────────────────────────────────────────────────────────────

export async function unlock(code: string, kind: "OWNER" | "ADMIN" | "SECURITY") {
  try {
    const clean = (code || "").trim();
    if (!clean) return { ok: false, role: "", code: "" };
    const settings = await prisma.adminSettings.findFirst();
    if (!settings) return { ok: false, role: "", code: "" };
    if (kind === "OWNER" && clean === settings.ownerCode) return { ok: true, role: "OWNER", code: clean };
    if (kind === "ADMIN" && clean === settings.adminCode) return { ok: true, role: "ADMIN", code: clean };
    if (kind === "SECURITY" && clean === settings.securityCode) return { ok: true, role: "SECURITY", code: clean };
    return { ok: false, role: "", code: "" };
  } catch {
    return { ok: false, role: "", code: "" };
  }
}

// ─── read models ─────────────────────────────────────────────────────────

export async function getOwnerData(s: S) {
  try {
    if (!(await ok(s, "OWNER"))) return null;
    const [users, settings, logRows, quizzes, decks, games, teachers] = await Promise.all([
      prisma.profile.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.adminSettings.findFirst(),
      prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.quiz.count(),
      prisma.flashcardCollection.count(),
      prisma.gameSession.count(),
      prisma.profile.count({ where: { role: "TEACHER" } }),
    ]);
    const totXP = users.reduce((a, u) => a + u.xp, 0);
    const totCoins = users.reduce((a, u) => a + u.coins, 0);
    return {
      users: users.map(userShape).sort(byPinnedFirst),
      // Explicit shape, with dates as ISO strings: the console needs to know
      // *when* the notice ends, not just the text.
      settings: settings
        ? {
            ownerCode: settings.ownerCode,
            adminCode: settings.adminCode,
            securityCode: settings.securityCode,
            broadcast: settings.broadcast ?? "",
            broadcastUntil: settings.broadcastUntil ? settings.broadcastUntil.toISOString() : null,
            shutdown: settings.shutdown,
          }
        : {
            ownerCode: "",
            adminCode: "",
            securityCode: "",
            broadcast: "",
            broadcastUntil: null,
            shutdown: false,
          },
      log: logRows.map((l) => ({ username: l.username, action: l.action, createdAt: time(l.createdAt) })),
      stats: { users: users.length, teachers, quizzes, decks, games, totXP, totCoins },
    };
  } catch {
    return null;
  }
}

export async function getAdminData(s: S) {
  try {
    if (!(await ok(s, "ADMIN"))) return null;
    const [users, logRows, settings] = await Promise.all([
      prisma.profile.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.adminSettings.findFirst({ select: { broadcast: true, broadcastUntil: true } }),
    ]);
    const until = settings?.broadcastUntil ?? null;
    const live = !!settings?.broadcast?.trim() && (!until || until.getTime() > Date.now());
    return {
      users: users.map(userShape).sort(byPinnedFirst),
      // The banner tab needs to show what is already on screen — otherwise an
      // admin opens it, sees an empty box, and assumes nothing is running.
      settings: {
        broadcast: live ? settings!.broadcast : "",
        broadcastUntil: live && until ? until.toISOString() : null,
      },
      log: logRows.map((l) => ({ username: l.username, action: l.action, createdAt: time(l.createdAt) })),
    };
  } catch {
    return null;
  }
}

export async function getSecurityData(s: S) {
  try {
    if (!(await ok(s, "SECURITY"))) return null;
    const [users, logRows] = await Promise.all([
      prisma.profile.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    return {
      users: users.map(userShape).sort(byPinnedFirst),
      log: logRows.map((l) => ({ username: l.username, action: l.action, createdAt: time(l.createdAt) })),
    };
  } catch {
    return null;
  }
}

export async function getOwnerExtra(s: S) {
  try {
    if (!(await ok(s, "OWNER"))) return null;
    const requests = await prisma.banRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return {
      requests: requests.map((r) => ({
        id: r.id,
        target: r.targetUsername,
        admin: r.adminUsername,
        minutes: r.minutes,
        reason: r.reason,
        status: r.status,
        createdAt: time(r.createdAt),
      })),
    };
  } catch {
    return null;
  }
}

export async function spyOnChats(s: S) {
  try {
    if (!(await ok(s, "STAFF"))) return null;
    const [global, inbox, staff, reqs] = await Promise.all([
      prisma.chatMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.ownerMessage.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.staffChat.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.chatRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    return {
      global: global.map((m) => ({ id: m.id, from: m.name, role: m.role, text: m.text, at: time(m.createdAt) })),
      inbox: inbox.map((m) => ({
        id: m.id,
        from: m.fromUsername,
        about: m.aboutUsername,
        text: m.message,
        resolved: m.resolved,
        at: time(m.createdAt),
      })),
      staff: staff.map((m) => ({ id: m.id, channel: m.channel, from: m.fromRole, text: m.text, at: time(m.createdAt) })),
      requests: reqs.map((r) => ({ id: r.id, from: r.fromUser, to: r.toUser, status: r.status, at: time(r.createdAt) })),
    };
  } catch {
    return null;
  }
}

// ─── staff chat ──────────────────────────────────────────────────────────

export async function getStaffChat(s: S, channel: string) {
  try {
    if (!(await ok(s, "STAFF"))) return [];
    return await prisma.staffChat.findMany({ where: { channel }, orderBy: { createdAt: "asc" }, take: 100 });
  } catch {
    return [];
  }
}

export async function sendStaffChat(s: S, channel: string, text: string) {
  return withAuth("STAFF", s, async () => {
    const body = text.trim().slice(0, 1000);
    if (!body) return { ok: false, info: "" };
    await prisma.staffChat.create({ data: { channel, fromRole: s.role, text: body } });
    return { ok: true };
  });
}

export async function getChats(s: S, channel: string) {
  return getStaffChat(s, channel);
}
export async function sendChat(s: S, channel: string, text: string) {
  return sendStaffChat(s, channel, text);
}

// ─── owner powers ────────────────────────────────────────────────────────

export async function banUser(s: S, username: string, minutes: number, msg: string) {
  return withAuth("OWNER", s, async () => {
    const mins = whole(minutes, 0);
    const until = mins <= 0 ? new Date("2099-01-01") : new Date(Date.now() + mins * 60000);
    await prisma.profile.update({ where: { username }, data: { bannedUntil: until, banMessage: msg || null } });
    await log("[OWNER]", `bannade ${username} (${mins <= 0 ? "FÖR ALLTID" : mins + " min"})`);
    return { ok: true, info: `${username} bannad!` };
  });
}

export async function unbanUser(s: S, username: string) {
  return withAuth("OWNER", s, async () => {
    await prisma.profile.update({ where: { username }, data: { bannedUntil: null, banMessage: null } });
    await log("[OWNER]", `unbannade ${username}`);
    return { ok: true, info: `${username} är fri!` };
  });
}

export async function giveXP(s: S, id: string, username: string, amt: number) {
  return withAuth("OWNER", s, async () => {
    const n = whole(amt, 0);
    if (!n) return { ok: false, info: "Skriv ett antal XP." };
    if (Math.abs(n) > 1_000_000) return { ok: false, info: "Max ±1 000 000 XP per gång." };
    await prisma.profile.update({ where: { id }, data: { xp: { increment: n } } });
    await log("[OWNER]", `gav ${n} XP till ${username}`);
    return { ok: true, info: `${n > 0 ? "+" : ""}${n} XP till ${username}` };
  });
}

export async function giveCoins(s: S, id: string, username: string, amt: number) {
  return withAuth("OWNER", s, async () => {
    const n = whole(amt, 0);
    if (!n) return { ok: false, info: "Skriv ett antal mynt." };
    if (Math.abs(n) > 1_000_000) return { ok: false, info: "Max ±1 000 000 mynt per gång." };
    await prisma.profile.update({ where: { id }, data: { coins: { increment: n } } });
    await prisma.coinGrant.create({
      data: { staffId: "console:OWNER", staffName: "OWNER", targetId: id, targetName: username, amount: n },
    }).catch(() => {});
    await log("[OWNER]", `gav ${n} mynt till ${username}`);
    return { ok: true, info: `${n > 0 ? "+" : ""}${n} mynt till ${username}` };
  });
}

export async function renameUser(s: S, id: string, old: string, newName: string) {
  return withAuth("OWNER", s, async () => {
    const clean = newName.trim();
    if (clean.length < 3) return { ok: false, info: "Minst 3 tecken i namnet." };
    await prisma.profile.update({ where: { id }, data: { username: clean } });
    await log("[OWNER]", `bytte namn ${old} → ${clean}`);
    return { ok: true, info: `${old} heter nu ${clean}.` };
  });
}

export async function setRole(s: S, id: string, username: string, role: string) {
  return withAuth("OWNER", s, async () => {
    const allowed = ["STUDENT", "TEACHER", "ADMIN", "OWNER", "SECURITY"];
    if (!allowed.includes(role)) return { ok: false, info: "Ogiltig roll." };
    // There is exactly one owner. Without this guard a second click could mint
    // a second account that no one — not even the first owner — can discipline.
    if (role === "OWNER") {
      const others = await prisma.profile.count({ where: { role: "OWNER", NOT: { id } } });
      if (others > 0) return { ok: false, info: "Det finns redan en ägare." };
    }
    await prisma.profile.update({ where: { id }, data: { role: role as any } });
    await log("[OWNER]", `satte roll ${role} på ${username}`);
    return { ok: true, info: `${username} är nu ${role}.` };
  });
}

export async function resetPassword(s: S, id: string, username: string, notify: boolean, customPw: string) {
  return withAuth("OWNER", s, async () => {
    const newPw = customPw.trim() || Math.random().toString(36).slice(-8);
    if (newPw.length < 6) return { ok: false, info: "Lösenordet måste vara minst 6 tecken." };
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: newPw });
    // The old code reported success no matter what Supabase answered.
    if (error) return { ok: false, info: `Kunde inte byta lösenord: ${error.message}` };
    if (notify) await prisma.profile.update({ where: { id }, data: { passwordNote: newPw } });
    await log("[OWNER]", `återställde lösenord på ${username}`);
    return { ok: true, info: `Nytt lösenord: ${newPw}` };
  });
}

export async function getEmail(s: S, id: string, username: string) {
  return withAuth("OWNER", s, async () => {
    const { data } = await supabaseAdmin.auth.admin.getUserById(id);
    await log("[OWNER]", `kikade email på ${data?.user?.email}`);
    return { ok: true, info: `${username}: ${data?.user?.email || "okänd"}` };
  });
}

export async function deleteUser(s: S, id: string, username: string) {
  return withAuth("OWNER", s, async () => {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) return { ok: false, info: `Kunde inte radera: ${error.message}` };
    await prisma.profile.delete({ where: { id } });
    await log("[OWNER]", `RADERADE ${username}`);
    return { ok: true, info: `${username} raderad.` };
  });
}

// ─── broadcast ───────────────────────────────────────────────────────────

/** Longest a timed sändning may run: a day. Anything longer is "tills vidare". */
const MAX_BROADCAST_MINUTES = 1440;

/**
 * Turn a chosen duration into the moment the notice stops.
 *
 * `null` (or a nonsense value) means "until someone stops it". Clamping here,
 * on the server, is what makes the duration real: the browser could post any
 * number, and an unchecked one would either expire instantly or run for a year.
 */
function broadcastEndsAt(minutes: number | null | undefined): Date | null {
  if (minutes === null || minutes === undefined) return null;
  const m = Math.round(Number(minutes));
  if (!Number.isFinite(m) || m <= 0) return null;
  return new Date(Date.now() + Math.min(m, MAX_BROADCAST_MINUTES) * 60_000);
}

/** "tills vidare" or "10 min", for the log line. */
function describeDuration(minutes: number | null | undefined, until: Date | null): string {
  return until && minutes ? `${minutes} min` : "tills vidare";
}

/**
 * The one place a broadcast is written and cleared, shared by the owner and
 * admin actions so the two consoles can never disagree about what an empty
 * message or a duration means.
 */
async function applyBroadcast(tag: string, text: string, minutes: number | null | undefined): Promise<Res> {
  const existing = await prisma.adminSettings.findFirst();
  if (!existing) return { ok: false, info: GENERIC_FAILURE };

  const clean = (text ?? "").trim();

  // Empty text means "stop it", the same as pressing the stop button. That is
  // what the old clear button posted, and a half-typed message should never
  // turn into a blank banner nobody can dismiss.
  if (!clean) {
    await prisma.adminSettings.update({
      where: { id: existing.id },
      data: { broadcast: null, broadcastUntil: null },
    });
    await log(tag, "stoppade sändningen");
    return { ok: true, info: "Sändningen är stoppad." };
  }

  const until = broadcastEndsAt(minutes);
  await prisma.adminSettings.update({
    where: { id: existing.id },
    data: { broadcast: clean, broadcastUntil: until },
  });
  await log(tag, `sändning (${describeDuration(minutes, until)}): "${clean.slice(0, 50)}"`);
  return {
    ok: true,
    info: until ? `Sänt! Slutar om ${minutes} min.` : "Sänt! Den ligger kvar tills du stoppar den.",
  };
}

export async function setBroadcast(s: S, text: string, minutes: number | null = null) {
  return withAuth("OWNER", s, () => applyBroadcast("[OWNER]", text, minutes));
}

export async function stopBroadcast(s: S) {
  return withAuth("OWNER", s, () => applyBroadcast("[OWNER]", "", null));
}


export async function setShutdown(s: S, on: boolean) {
  return withAuth("OWNER", s, async () => {
    const existing = await prisma.adminSettings.findFirst();
    if (existing) await prisma.adminSettings.update({ where: { id: existing.id }, data: { shutdown: on } });
    await log("[OWNER]", on ? "STÄNGDE sajten" : "öppnade sajten");
    return { ok: true, info: on ? "Sajten är STÄNGD." : "Sajten är öppen igen." };
  });
}

export async function changeCodes(s: S, o: string, a: string, sec: string) {
  return withAuth("OWNER", s, async () => {
    const codes = [o, a, sec].map((c) => (c || "").trim());
    if (codes.some((c) => c.length !== 8)) return { ok: false, info: "Alla koder måste vara 8 tecken." };
    const existing = await prisma.adminSettings.findFirst();
    if (!existing) return { ok: false, info: GENERIC_FAILURE };
    await prisma.adminSettings.update({
      where: { id: existing.id },
      data: { ownerCode: codes[0], adminCode: codes[1], securityCode: codes[2] },
    });
    await log("[OWNER]", "uppdaterade koder");
    return { ok: true, info: "Koderna är sparade.", newOwner: codes[0] };
  });
}

export async function approveBanRequest(s: S, id: string, minutes: number) {
  return withAuth("OWNER", s, async () => {
    const req = await prisma.banRequest.findUnique({ where: { id } });
    if (!req) return { ok: false, info: "Begäran finns inte längre." };
    const mins = whole(minutes, 0);
    const until = mins <= 0 ? new Date("2099-01-01") : new Date(Date.now() + mins * 60000);
    await prisma.profile.update({ where: { username: req.targetUsername }, data: { bannedUntil: until } });
    await prisma.banRequest.update({ where: { id }, data: { status: "APPROVED" } });
    await log("[OWNER]", `godkände ban-request för ${req.targetUsername} (${mins <= 0 ? "FÖR ALLTID" : mins + " min"})`);
    return { ok: true, info: `${req.targetUsername} bannad.` };
  });
}

export async function rejectBanRequest(s: S, id: string) {
  return withAuth("OWNER", s, async () => {
    await prisma.banRequest.update({ where: { id }, data: { status: "REJECTED" } });
    await log("[OWNER]", "avslog ban-request");
    return { ok: true, info: "Begäran avslogs." };
  });
}

export async function resetXP(s: S, id: string, username: string) {
  return withAuth("OWNER", s, async () => {
    await prisma.profile.update({ where: { id }, data: { xp: 0 } });
    await log("[OWNER]", `reset XP på ${username}`);
    return { ok: true, info: `${username}: XP nollställt.` };
  });
}

export async function resetCoins(s: S, id: string, username: string) {
  return withAuth("OWNER", s, async () => {
    await prisma.profile.update({ where: { id }, data: { coins: 0 } });
    await log("[OWNER]", `reset mynt på ${username}`);
    return { ok: true, info: `${username}: mynt nollställda.` };
  });
}

export async function resetAll(s: S, id: string, username: string) {
  return withAuth("OWNER", s, async () => {
    await prisma.profile.update({ where: { id }, data: { xp: 0, coins: 0, warnings: 0 } });
    await log("[OWNER]", `TOTAL-RESET på ${username}`);
    return { ok: true, info: `${username}: allt nollställt.` };
  });
}

export async function setLevel(s: S, id: string, username: string, lvl: number) {
  return withAuth("OWNER", s, async () => {
    const level = Math.max(1, Math.min(999, Math.floor(lvl) || 1));
    await prisma.profile.update({ where: { id }, data: { xp: (level - 1) * 100 } });
    await log("[OWNER]", `satte nivå ${level} på ${username}`);
    return { ok: true, info: `${username} är nu nivå ${level}.` };
  });
}

export async function sendPersonalNote(s: S, id: string, username: string, text: string) {
  return withAuth("OWNER", s, async () => {
    const body = text.trim();
    if (!body) return { ok: false, info: "Skriv ett meddelande först." };
    await prisma.profile.update({ where: { id }, data: { passwordNote: body } });
    await log("[OWNER]", `skickade popup till ${username}`);
    return { ok: true, info: `Popup skickad till ${username}.` };
  });
}

export async function clearPersonalNote(s: S, id: string, username: string) {
  return withAuth("OWNER", s, async () => {
    await prisma.profile.update({ where: { id }, data: { passwordNote: null } });
    await log("[OWNER]", `rensade popup på ${username}`);
    return { ok: true, info: `Popup rensad för ${username}.` };
  });
}

export async function requestRename(s: S, id: string, username: string) {
  return withAuth("STAFF", s, async () => {
    await prisma.profile.update({ where: { id }, data: { renameRequested: true } });
    await log(`[${s.role}]`, `begärde namnbyte från ${username}`);
    return { ok: true, info: `${username} måste byta namn!` };
  });
}

export async function requestLive(s: S, id: string, username: string, pid: string) {
  return withAuth("STAFF", s, async () => {
    await prisma.profile.update({ where: { id }, data: { liveRequested: true, livePeerId: pid } });
    await log(`[${s.role}]`, `begärde LIVE från ${username}`);
    return { ok: true, info: `LIVE-förfrågan skickad till ${username}.` };
  });
}

export async function toggleShadow(s: S, id: string, username: string) {
  return withAuth("OWNER", s, async () => {
    const u = await prisma.profile.findUnique({ where: { id } });
    if (!u) return { ok: false, info: GENERIC_FAILURE };
    const next = !u.shadowed;
    await prisma.profile.update({ where: { id }, data: { shadowed: next } });
    await log("[OWNER]", next ? `shadow PÅ ${username}` : `shadow AV ${username}`);
    return { ok: true, info: next ? `${username}: osynlig på topplistan!` : `${username}: synlig igen!` };
  });
}

export async function toggleFreezeCoins(s: S, id: string, username: string) {
  return withAuth("OWNER", s, async () => {
    const u = await prisma.profile.findUnique({ where: { id } });
    if (!u) return { ok: false, info: GENERIC_FAILURE };
    const next = !u.coinsFrozen;
    await prisma.profile.update({ where: { id }, data: { coinsFrozen: next } });
    await log("[OWNER]", next ? `FRYSTE mynt på ${username}` : `TINADE mynt på ${username}`);
    return { ok: true, info: next ? `${username}: kan inte spendera mynt!` : `${username}: mynt upplåsta!` };
  });
}

export async function setSecretNote(s: S, id: string, username: string, text: string) {
  return withAuth("STAFF", s, async () => {
    const body = text.trim();
    await prisma.profile.update({ where: { id }, data: { secretNote: body || null } });
    await log(`[${s.role}]`, body ? `hemlig anteckning på ${username}` : `rensade hemlig anteckning på ${username}`);
    return { ok: true, info: body ? `Hemlig anteckning sparad på ${username}!` : "Hemlig anteckning rensad!" };
  });
}

export async function forceRelogin(s: S, id: string, username: string) {
  return withAuth("OWNER", s, async () => {
    await prisma.profile.update({ where: { id }, data: { forceRelogin: true } });
    await log("[OWNER]", `tvingade ${username} att logga in igen`);
    return { ok: true, info: `${username} kastas ut — måste logga in igen!` };
  });
}

export async function getTimeMachine(s: S, username: string, minutesAgo: number) {
  return withAuth("OWNER", s, async () => {
    const since = new Date(Date.now() - Math.max(1, minutesAgo) * 60000);
    const visits = await prisma.pageVisit.findMany({
      where: { username, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    if (visits.length === 0) return { ok: true, info: `${username} besökte inga sidor de senaste ${minutesAgo} min!` };
    const lines = visits.map((v) => `${new Date(v.createdAt).toLocaleTimeString("sv-SE")} → ${v.path}`).join(" · ");
    return { ok: true, info: `${username} senaste ${minutesAgo} min: ${lines}` };
  });
}

export async function peekIP(s: S, id: string, username: string) {
  return withAuth("OWNER", s, async () => {
    // Used to read `user_metadata.ip`, which nothing ever wrote, so every
    // answer was "okänd". The student app's presence ping now records the
    // address, the country and the city; this only formats them.
    const p = await prisma.profile.findUnique({
      where: { id },
      select: { lastIp: true, ipCountry: true, ipCountryCode: true, ipCity: true, ipAt: true, lastSeenAt: true },
    });
    if (!p) return { ok: false, info: "Användaren finns inte längre." };
    const where = describeLocation(p);
    const when = p.ipAt ? ` · uppdaterad ${new Date(p.ipAt).toLocaleString("sv-SE")}` : "";
    await log("[OWNER]", `plats-peek på ${username}`);
    return { ok: true, info: `${username}: ${where}${when}` };
  });
}

export async function toggleDailyBonus(s: S, id: string, username: string) {
  return withAuth("OWNER", s, async () => {
    const u = await prisma.profile.findUnique({ where: { id } });
    if (!u) return { ok: false, info: GENERIC_FAILURE };
    const next = !u.dailyBonusDisabled;
    await prisma.profile.update({ where: { id }, data: { dailyBonusDisabled: next } });
    await log("[OWNER]", next ? `stängde daglig bonus för ${username}` : `öppnade daglig bonus för ${username}`);
    return { ok: true, info: next ? `${username}: ingen daglig belöning!` : `${username}: får bonus igen!` };
  });
}

// ─── staff powers ────────────────────────────────────────────────────────

/** The same ladder as bans: security an hour, admin a day, owner forever. */
function maxMuteMinutes(role: string): number {
  if (role === "OWNER") return 0;
  if (role === "ADMIN") return 1440;
  return 60;
}

export async function muteChat(s: S, id: string, username: string, minutes: number) {
  return withAuth("STAFF", s, async () => {
    const guard = await targetGuard(s.role, username);
    if (!guard.ok) return guard;
    let mins = whole(minutes, 0);
    const cap = maxMuteMinutes(s.role);
    // Every staff console could ask for a permanent mute here, while the
    // in-app panel refuses it for anyone but the owner. One rule now.
    if (mins <= 0 && s.role !== "OWNER") return { ok: false, info: "Bara ägaren kan tysta för alltid." };
    if (cap > 0 && mins > cap) {
      if (mins === 0) return { ok: false, info: "Bara ägaren kan tysta för alltid." };
      mins = cap;
    }
    const until = mins <= 0 ? new Date("2099-01-01") : new Date(Date.now() + mins * 60000);
    await prisma.profile.update({ where: { id }, data: { chatMutedUntil: until } });
    await log(`[${s.role}]`, `mute chat på ${username} (${mins <= 0 ? "FOREVER" : mins + " min"})`);
    return { ok: true, info: `${username}: chat tystad (${mins <= 0 ? "FÖR ALLTID" : mins + " min"})!` };
  });
}

export async function unmuteChat(s: S, id: string, username: string) {
  return withAuth("STAFF", s, async () => {
    await prisma.profile.update({ where: { id }, data: { chatMutedUntil: null } });
    await log(`[${s.role}]`, `unmute chat på ${username}`);
    return { ok: true, info: `${username}: chat öppnad igen!` };
  });
}

export async function togglePin(s: S, id: string, username: string) {
  return withAuth("STAFF", s, async () => {
    const u = await prisma.profile.findUnique({ where: { id } });
    if (!u) return { ok: false, info: GENERIC_FAILURE };
    const next = !u.pinned;
    await prisma.profile.update({ where: { id }, data: { pinned: next } });
    await log(`[${s.role}]`, next ? `pin PÅ ${username}` : `pin AV ${username}`);
    return { ok: true, info: next ? `${username}: fäst högst upp!` : `${username}: avfäst!` };
  });
}

export async function toggleGhost(s: S, id: string, username: string) {
  return withAuth("SECURITY", s, async () => {
    const guard = await targetGuard(s.role, username);
    if (!guard.ok) return guard;
    const u = await prisma.profile.findUnique({ where: { id } });
    if (!u) return { ok: false, info: GENERIC_FAILURE };
    const next = !u.ghostMode;
    await prisma.profile.update({ where: { id }, data: { ghostMode: next } });
    await log(`[${s.role}]`, next ? `ghostmode PÅ ${username}` : `ghostmode AV ${username}`);
    return {
      ok: true,
      info: next
        ? `${username}: meddelanden osynliga i gemensamma chattar (direkta samtal fungerar som vanligt)!`
        : `${username}: synlig igen!`,
    };
  });
}

// ─── admin powers ────────────────────────────────────────────────────────

export async function adminBan(s: S, username: string, minutes: number, reason: string) {
  return withAuth("ADMIN", s, async () => {
    const guard = await targetGuard(s.role, username);
    if (!guard.ok) return guard;
    const mins = whole(minutes, 10);
    if (mins <= 0) return { ok: false, info: "Bara ägaren kan banna för alltid." };
    if (mins > 1440) return { ok: false, info: "Max 1 dag — be ägaren om mer!" };
    const until = new Date(Date.now() + mins * 60000);
    await prisma.profile.update({ where: { username }, data: { bannedUntil: until, banMessage: reason || null } });
    await log("[ADMIN]", `bannade ${username} (${mins} min)`);
    return { ok: true, info: `${username} bannad ${mins} min!` };
  });
}

export async function adminUnban(s: S, username: string) {
  return withAuth("ADMIN", s, async () => {
    const guard = await targetGuard(s.role, username);
    if (!guard.ok) return guard;
    await prisma.profile.update({ where: { username }, data: { bannedUntil: null, banMessage: null } });
    await log("[ADMIN]", `unbannade ${username}`);
    return { ok: true, info: `${username} är fri!` };
  });
}

export async function adminGiveXP(s: S, id: string, username: string, amt: number) {
  return withAuth("ADMIN", s, async () => {
    const amtClean = whole(amt, 0);
    if (!amtClean) return { ok: false, info: "Skriv ett antal XP." };
    if (amtClean > 500 || amtClean < -500) return { ok: false, info: "Max ±500 XP!" };
    const u = await prisma.profile.findUnique({ where: { id } });
    if (!u) return { ok: false, info: GENERIC_FAILURE };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (u.lastGiftAt && new Date(u.lastGiftAt) > today) return { ok: false, info: "Redan belönad idag!" };
    await prisma.profile.update({ where: { id }, data: { xp: { increment: amtClean }, lastGiftAt: new Date() } });
    await log("[ADMIN]", `gav ${amtClean} XP till ${username}`);
    return { ok: true, info: `+${amtClean} XP till ${username}!` };
  });
}

export async function adminRequestBan(s: S, target: string, minutes: number, reason: string) {
  return withAuth("ADMIN", s, async () => {
    if (!target.trim()) return { ok: false, info: "Välj en användare först." };
    // This used to pick `findFirst({ role: "ADMIN" })` — i.e. whichever admin
    // happened to be first in the table — and attribute the request to them.
    const adminLabel = s.role === "OWNER" ? "OWNER" : "ADMIN";
    await prisma.banRequest.create({
      data: {
        targetUsername: target,
        adminUsername: adminLabel,
        minutes: Math.max(0, whole(minutes, 0)),
        reason: reason || null,
      },
    });
    await log("[ADMIN]", `begärde ban på ${target} (${minutes} min) från ägaren`);
    return { ok: true, info: "Begäran skickad till ägaren!" };
  });
}

export async function adminSetBroadcast(s: S, text: string, minutes: number | null = null) {
  return withAuth("ADMIN", s, () => applyBroadcast("[ADMIN]", text, minutes));
}

export async function adminStopBroadcast(s: S) {
  return withAuth("ADMIN", s, () => applyBroadcast("[ADMIN]", "", null));
}

// ─── security powers ─────────────────────────────────────────────────────

export async function secWarn(s: S, id: string, username: string) {
  return withAuth("SECURITY", s, async () => {
    const guard = await targetGuard(s.role, username);
    if (!guard.ok) return guard;
    const u = await prisma.profile.findUnique({ where: { id } });
    if (!u) return { ok: false, info: GENERIC_FAILURE };
    const next = (u.warnings || 0) + 1;
    if (next >= 3) {
      // Three warnings used to mean a permanent ban, handed out by the lowest
      // staff role and impossible to undo from the student app. A day is
      // enough to make the point; the owner can still ban for life.
      await prisma.profile.update({
        where: { id },
        data: { warnings: next, bannedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), banMessage: "3 varningar" },
      });
      await log("[SECURITY]", `varnade ${username} (3/3 — bannad 24 tim)`);
      return { ok: true, info: `${username} har 3 varningar — bannad i 24 timmar.` };
    }
    await prisma.profile.update({ where: { id }, data: { warnings: next } });
    await log("[SECURITY]", `varnade ${username} (nu ${next}/3)`);
    return { ok: true, info: `${username} varnad (${next}/3)!` };
  });
}

export async function secBan(s: S, username: string, minutes: number) {
  return withAuth("SECURITY", s, async () => {
    const guard = await targetGuard(s.role, username);
    if (!guard.ok) return guard;
    const mins = whole(minutes, 10);
    if (mins <= 0) return { ok: false, info: "Bara ägaren kan banna för alltid." };
    if (mins > 60) return { ok: false, info: "Max 1 timme — be ägaren!" };
    const until = new Date(Date.now() + mins * 60000);
    await prisma.profile.update({ where: { username }, data: { bannedUntil: until } });
    await log("[SECURITY]", `bannade ${username} (${mins} min)`);
    return { ok: true, info: `${username} bannad ${mins} min!` };
  });
}

/**
 * Coins from the console.
 *
 * The console cannot tell one admin from another (it only holds a shared code),
 * so every console grant shares one 1000/day budget per target. The in-app
 * panel, which knows exactly who is clicking, keeps a per-admin budget.
 */
export async function adminGiveCoins(s: S, id: string, username: string, amt: number) {
  return withAuth("ADMIN", s, async () => {
    const amount = whole(amt, 0);
    if (amount <= 0) return { ok: false, info: "Skriv ett antal mynt, minst 1." };
    if (amount > ADMIN_COIN_DAILY_CAP) return { ok: false, info: `Max ${ADMIN_COIN_DAILY_CAP} mynt per person och dag.` };

    const used = await prisma.coinGrant.aggregate({
      where: { staffId: "console:ADMIN", targetId: id, createdAt: { gte: startOfDay() } },
      _sum: { amount: true },
    });
    const given = used._sum.amount ?? 0;
    const left = ADMIN_COIN_DAILY_CAP - given;
    if (left <= 0) return { ok: false, info: `${username} har redan fått ${ADMIN_COIN_DAILY_CAP} mynt idag.` };
    if (amount > left) return { ok: false, info: `Bara ${left} mynt kvar till ${username} idag.` };

    await prisma.profile.update({ where: { id }, data: { coins: { increment: amount } } });
    await prisma.coinGrant.create({
      data: { staffId: "console:ADMIN", staffName: "ADMIN", targetId: id, targetName: username, amount },
    });
    await log("[ADMIN]", `gav ${amount} mynt till ${username}`);
    return { ok: true, info: `+${amount} mynt till ${username}. ${left - amount} kvar idag.` };
  });
}

/** Was returning ok:false even on success, so the UI always claimed failure. */
export async function secUnban(s: S, username: string) {
  return withAuth("SECURITY", s, async () => {
    const guard = await targetGuard(s.role, username);
    if (!guard.ok) return guard;
    const target = await prisma.profile.findUnique({
      where: { username },
      select: { bannedUntil: true },
    });
    const allowed = secCanUndo(target?.bannedUntil ?? null);
    if (!allowed.ok) return allowed;
    await prisma.profile.update({ where: { username }, data: { bannedUntil: null, banMessage: null } });
    await log("[SECURITY]", `unbannade ${username}`);
    return { ok: true, info: `${username} är fri!` };
  });
}

// ─── the Admin Keen ──────────────────────────────────────────────────────

/**
 * Give the Admin Keen to one person.
 *
 * ADMIN and above, like every other power in this console, and the whole thing
 * is logged with the [ADMIN] tag so the owner can see who handed one out. The
 * delivery itself lives in `lib/keen-grant.ts` — it writes the row straight
 * into the shared database, because QuizKeen Command and QuizKeen are separate
 * deployments. Clicking twice is safe: the helper reports "already owned"
 * instead of adding a second one.
 */
export async function adminGiveAdminKeen(s: S, profileId: string, username: string) {
  return withAuth("ADMIN", s, async () => {
    const res = await giveAdminKeen(profileId, username);
    if (!res.ok) {
      return { ok: false, info: res.error === "missing" ? "Användaren finns inte längre." : GENERIC_FAILURE };
    }
    if (res.alreadyOwned) {
      await log("[ADMIN]", `försökte ge ${ADMIN_KEEN_NAME} till ${username}, som redan hade den`);
      return { ok: true, info: `${username} har redan ${ADMIN_KEEN_NAME}.` };
    }
    await log("[ADMIN]", `gav ${ADMIN_KEEN_NAME} till ${username}`);
    return { ok: true, info: `${username} fick ${ADMIN_KEEN_NAME}! Den ligger i samlingen nu.` };
  });
}

/** Profile ids that already own the Admin Keen, for the picker's badges. */
export async function adminKeenHoldersList(s: S) {
  return withAuth("ADMIN", s, async () => ({ ok: true, info: "", holders: await adminKeenHolders() }));
}

// ─── superpowers (owner) ─────────────────────────────────────────────────
//
// The tools in this block act on *many* people at once, which is why they sit
// behind the owner code and nowhere else. Two rules run through all of them:
//
//   1. the owner's own account is never in the set — a mass reset can be
//      pressed by mistake, and locking the last owner out of the console
//      would need a database edit to undo;
//   2. every action logs how many people it touched, not just that it ran.
//      "23 konton" in the log is the difference between a tool that worked
//      and a tool that quietly matched nobody.

/** Who a mass action reaches. `ALL` means everyone except the owner. */
type MassRole = "ALL" | "STUDENT" | "TEACHER" | "ADMIN" | "SECURITY";

const MASS_ROLES: MassRole[] = ["ALL", "STUDENT", "TEACHER", "ADMIN", "SECURITY"];

/** A Prisma filter for "everyone in this group", with a safe fallback. */
function massWhere(role: MassRole) {
  const clean = MASS_ROLES.includes(role) ? role : "STUDENT";
  if (clean === "ALL") return { role: { not: "OWNER" as const } };
  return { role: clean as any };
}

/** "23 konton", "1 konto" — plural matters when the number is read aloud. */
const people = (n: number) => `${n} ${n === 1 ? "konto" : "konton"}`;

/**
 * Everything the superpower tab shows, in one round trip.
 *
 * The alt detector groups the stored (masked-at-display) addresses: two
 * accounts that keep appearing from the same connection are worth a look, but
 * it is a hint, not proof — siblings share a home network.
 */
export async function getOwnerPowers(s: S) {
  try {
    if (!(await ok(s, "OWNER"))) return null;
    const dayStart = startOfDay();
    const now = new Date();
    const onlineSince = new Date(now.getTime() - 120_000);

    const [total, newToday, online, banned, muted, ghosted, frozen, shadowed, coinsToday, grantsToday, visitsToday] =
      await Promise.all([
        prisma.profile.count(),
        prisma.profile.count({ where: { createdAt: { gte: dayStart } } }),
        prisma.profile.count({ where: { lastSeenAt: { gte: onlineSince } } }),
        prisma.profile.count({ where: { bannedUntil: { gt: now } } }),
        prisma.profile.count({ where: { chatMutedUntil: { gt: now } } }),
        prisma.profile.count({ where: { ghostMode: true } }),
        prisma.profile.count({ where: { coinsFrozen: true } }),
        prisma.profile.count({ where: { shadowed: true } }),
        prisma.coinGrant.aggregate({ where: { createdAt: { gte: dayStart } }, _sum: { amount: true } }),
        prisma.coinGrant.count({ where: { createdAt: { gte: dayStart } } }),
        prisma.pageVisit.count({ where: { createdAt: { gte: dayStart } } }),
      ]);

    const [flagRows, visitRows, assigned] = await Promise.all([
      prisma.profile.findMany({
        where: { OR: [{ shadowed: true }, { ghostMode: true }, { coinsFrozen: true }, { pinned: true }, { chatMutedUntil: { gt: now } }] },
        select: { id: true, username: true, shadowed: true, ghostMode: true, coinsFrozen: true, pinned: true, chatMutedUntil: true },
        orderBy: { username: "asc" },
        take: 300,
      }),
      prisma.pageVisit.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
      prisma.profile.findMany({
        where: { lastIp: { not: null } },
        select: { id: true, username: true, role: true, lastIp: true, lastSeenAt: true, bannedUntil: true },
      }),
    ]);

    const byIp = new Map<string, typeof assigned>();
    for (const p of assigned) {
      if (!p.lastIp) continue;
      const list = byIp.get(p.lastIp) ?? [];
      list.push(p);
      byIp.set(p.lastIp, list);
    }
    const alts = [...byIp.entries()]
      .filter(([, list]) => list.length > 1)
      .map(([ip, list]) => ({
        ip: maskIp(ip),
        ids: list.map((p) => p.id),
        count: list.length,
        users: list.map((p) => ({
          id: p.id,
          username: p.username,
          role: p.role,
          banned: Boolean(p.bannedUntil && p.bannedUntil > now),
          lastSeenAt: p.lastSeenAt ? p.lastSeenAt.toISOString() : null,
        })),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    return {
      pulse: {
        total,
        newToday,
        online,
        banned,
        muted,
        ghosted,
        frozen,
        shadowed,
        coinsToday: coinsToday._sum.amount ?? 0,
        grantsToday,
        visitsToday,
      },
      flags: flagRows.map((p) => ({
        id: p.id,
        username: p.username,
        shadowed: p.shadowed,
        ghostMode: p.ghostMode,
        coinsFrozen: p.coinsFrozen,
        pinned: p.pinned,
        mutedUntil: p.chatMutedUntil ? p.chatMutedUntil.toISOString() : null,
      })),
      visits: visitRows.map((v) => ({ id: v.id, username: v.username, path: v.path, at: time(v.createdAt) })),
      alts,
    };
  } catch {
    return null;
  }
}

/**
 * One wave of XP and/or coins to a whole group.
 *
 * Each value is clamped per person: a mass tool is for "everyone gets a
 * reward", not for writing a million into an account by accident.
 */
export async function ownerMassGrant(s: S, role: MassRole, xp: number, coins: number) {
  return withAuth("OWNER", s, async () => {
    const x = Math.max(-10_000, Math.min(10_000, whole(xp, 0)));
    const c = Math.max(-10_000, Math.min(10_000, whole(coins, 0)));
    if (!x && !c) return { ok: false, info: "Skriv XP eller mynt först." };

    const data: any = {};
    if (x) data.xp = { increment: x };
    if (c) data.coins = { increment: c };
    const res = await prisma.profile.updateMany({ where: massWhere(role), data });

    const bits = [x ? `${x > 0 ? "+" : ""}${x} XP` : "", c ? `${c > 0 ? "+" : ""}${c} mynt` : ""]
      .filter(Boolean)
      .join(" och ");
    await log("[OWNER]", `massvåg ${role}: ${bits} till ${people(res.count)}`);
    return { ok: true, info: `${bits} till ${people(res.count)}.` };
  });
}

/** Wipe a counter for a whole group. The owner's own row is never included. */
export async function ownerMassReset(s: S, role: MassRole, what: "XP" | "MYNT" | "VARNINGAR" | "ALLT") {
  return withAuth("OWNER", s, async () => {
    const data: any =
      what === "XP"
        ? { xp: 0 }
        : what === "MYNT"
          ? { coins: 0 }
          : what === "VARNINGAR"
            ? { warnings: 0 }
            : { xp: 0, coins: 0, warnings: 0, chatMutedUntil: null, shadowed: false, ghostMode: false };
    const res = await prisma.profile.updateMany({ where: massWhere(role), data });
    await log("[OWNER]", `mass-reset ${what.toLowerCase()} för ${role} (${people(res.count)})`);
    return { ok: true, info: `${what} nollställt för ${people(res.count)}.` };
  });
}

/**
 * The panic button.
 *
 * Stops whatever is on the banner, ends every live session and throws everyone
 * out to the login — the three things you want in one press when something is
 * spreading. It deliberately does not ban or mute anybody: that stays a
 * decision, not a reflex.
 */
export async function ownerPanic(s: S) {
  return withAuth("OWNER", s, async () => {
    const existing = await prisma.adminSettings.findFirst();
    if (existing) {
      await prisma.adminSettings.update({
        where: { id: existing.id },
        data: { broadcast: null, broadcastUntil: null },
      });
    }
    const res = await prisma.profile.updateMany({
      where: { role: { not: "OWNER" } },
      data: { forceRelogin: true, liveRequested: false, livePeerId: null, livePath: null },
    });
    await log("[OWNER]", `NÖDBROMS: kastade ut ${people(res.count)} och stoppade sändningen`);
    return { ok: true, info: `NÖDBROMS: ${people(res.count)} kastades ut, sändningen är stoppad.` };
  });
}

/** Undo the panic: let everyone back in and end the live requests. */
export async function ownerAllClear(s: S) {
  return withAuth("OWNER", s, async () => {
    const res = await prisma.profile.updateMany({
      where: {},
      data: { forceRelogin: false, liveRequested: false, livePeerId: null },
    });
    await log("[OWNER]", `släppte in alla igen (${people(res.count)})`);
    return { ok: true, info: `${people(res.count)} är insläppta igen och alla LIVE-förfrågningar är avslutade.` };
  });
}

/** End every live session without touching anyone's access. */
export async function ownerKickLive(s: S) {
  return withAuth("OWNER", s, async () => {
    const res = await prisma.profile.updateMany({
      where: {},
      data: { liveRequested: false, livePeerId: null, livePath: null },
    });
    await log("[OWNER]", `stängde alla LIVE-sessioner (${people(res.count)})`);
    return { ok: true, info: `Alla LIVE-sessioner är stängda.` };
  });
}

/**
 * Empty one chat store.
 *
 * Split into named boxes on purpose: clearing the staff channel by accident
 * while trying to empty the global one is the kind of mistake that cannot be
 * undone, so each box has to be chosen by name.
 */
export async function ownerPurgeChat(s: S, scope: "global" | "inbox" | "staff" | "all") {
  return withAuth("OWNER", s, async () => {
    const gone: string[] = [];
    let total = 0;
    if (scope === "global" || scope === "all") {
      const r = await prisma.chatMessage.deleteMany({});
      total += r.count;
      gone.push(`${r.count} globala`);
    }
    if (scope === "inbox" || scope === "all") {
      const r = await prisma.ownerMessage.deleteMany({});
      total += r.count;
      gone.push(`${r.count} inkorg`);
    }
    if (scope === "staff" || scope === "all") {
      const r = await prisma.staffChat.deleteMany({});
      total += r.count;
      gone.push(`${r.count} stabs`);
    }
    if (!gone.length) return { ok: false, info: "" };
    await log("[OWNER]", `RENSADE chatt (${gone.join(" · ")})`);
    return { ok: true, info: `${total} meddelanden borta (${gone.join(" · ")}).` };
  });
}

/** Remove one person's messages from the shared chats, keeping the rest. */
export async function ownerPurgeChatFrom(s: S, username: string) {
  return withAuth("OWNER", s, async () => {
    const r = await prisma.chatMessage.deleteMany({ where: { name: username } });
    await log("[OWNER]", `rensade ${r.count} meddelanden från ${username}`);
    return { ok: true, info: `${r.count} meddelanden från ${username} borta.` };
  });
}

/** Throw a whole group out to the login. */
export async function ownerKick(s: S, ids: string[]) {
  return withAuth("OWNER", s, async () => {
    const clean = (ids || []).filter((id) => typeof id === "string").slice(0, 200);
    if (!clean.length) return { ok: false, info: "Ingen att kasta ut." };
    const res = await prisma.profile.updateMany({
      where: { id: { in: clean }, role: { not: "OWNER" } },
      data: { forceRelogin: true, liveRequested: false, livePeerId: null },
    });
    await log("[OWNER]", `kastade ut ${people(res.count)}`);
    return { ok: true, info: `${people(res.count)} måste logga in igen.` };
  });
}

/**
 * A popup to everyone in one group, written in one go.
 *
 * Same field as the personal popup, so it lands exactly where the person
 * already looks. Sent to staff too if that is the group chosen — the owner's
 * own account is the only one left out.
 */
export async function ownerRoleNote(s: S, role: MassRole, text: string) {
  return withAuth("OWNER", s, async () => {
    const body = (text || "").trim().slice(0, 300);
    if (!body) return { ok: false, info: "Skriv ett meddelande först." };
    const res = await prisma.profile.updateMany({ where: massWhere(role), data: { passwordNote: body } });
    await log("[OWNER]", `popup till ${role} (${people(res.count)}): "${body.slice(0, 40)}"`);
    return { ok: true, info: `Popup skickad till ${people(res.count)} (${role}).` };
  });
}

/** Amnesty: every ban in the database lifted at once. */
export async function ownerUnbanAll(s: S) {
  return withAuth("OWNER", s, async () => {
    const res = await prisma.profile.updateMany({
      where: { bannedUntil: { not: null } },
      data: { bannedUntil: null, banMessage: null },
    });
    await log("[OWNER]", `AMNESTI: tog bort alla bannlysningar (${people(res.count)})`);
    return { ok: true, info: `Alla bannlysningar borta (${people(res.count)}).` };
  });
}

/** Warn amnesty: every warning counter back to zero. */
export async function ownerWarnAmnesty(s: S) {
  return withAuth("OWNER", s, async () => {
    const res = await prisma.profile.updateMany({ where: { warnings: { gt: 0 } }, data: { warnings: 0 } });
    await log("[OWNER]", `AMNESTI: nollställde varningar (${people(res.count)})`);
    return { ok: true, info: `Varningarna är nollställda (${people(res.count)}).` };
  });
}

/** Delete log rows older than N days. Keeps the console fast as the log grows. */
export async function ownerPruneLog(s: S, days: number) {
  return withAuth("OWNER", s, async () => {
    const d = Math.max(1, Math.min(365, whole(days, 30)));
    const before = new Date(Date.now() - d * 24 * 60 * 60_000);
    const res = await prisma.activity.deleteMany({ where: { createdAt: { lt: before } } });
    await log("[OWNER]", `städade loggen: ${res.count} rader äldre än ${d} dagar`);
    return { ok: true, info: `${res.count} loggrader äldre än ${d} dagar är borta.` };
  });
}

/** Delete page-visit history older than N days (the time machine's raw data). */
export async function ownerPruneVisits(s: S, days: number) {
  return withAuth("OWNER", s, async () => {
    const d = Math.max(1, Math.min(365, whole(days, 14)));
    const before = new Date(Date.now() - d * 24 * 60 * 60_000);
    const res = await prisma.pageVisit.deleteMany({ where: { createdAt: { lt: before } } });
    await log("[OWNER]", `städade besökshistoriken: ${res.count} rader äldre än ${d} dagar`);
    return { ok: true, info: `${res.count} besök äldre än ${d} dagar är borta.` };
  });
}

// ─── extra tools (admin) ─────────────────────────────────────────────────
//
// One size smaller than the owner's: a fixed, once-a-day reward wave, a popup
// to students and teachers only, and read-only sight of the coin ledger. No
// resets, no purges, no panic button — those stay upstairs.

export async function adminRewardWave(s: S) {
  return withAuth("ADMIN", s, async () => {
    // The log is the ledger: today's wave leaves a row, and the next press
    // finds it. One per day, whichever admin presses first.
    const already = await prisma.activity.findFirst({
      where: { username: "[ADMIN]", action: { startsWith: "våg:" }, createdAt: { gte: startOfDay() } },
      select: { id: true },
    });
    if (already) return { ok: false, info: "Dagens våg är redan skickad — nästa går imorgon." };

    const res = await prisma.profile.updateMany({
      where: { role: "STUDENT", bannedUntil: null },
      data: { xp: { increment: 25 } },
    });
    await log("[ADMIN]", `våg: +25 XP till alla elever (${people(res.count)})`);
    return { ok: true, info: `+25 XP till ${people(res.count)}. En våg per dag.` };
  });
}

/** Popup to students/teachers only — staff rows stay the owner's business. */
export async function adminRoleNote(s: S, role: "STUDENT" | "TEACHER", text: string) {
  return withAuth("ADMIN", s, async () => {
    const body = (text || "").trim().slice(0, 300);
    if (!body) return { ok: false, info: "Skriv ett meddelande först." };
    if (role !== "STUDENT" && role !== "TEACHER") return { ok: false, info: "Välj elever eller lärare." };
    const res = await prisma.profile.updateMany({ where: { role }, data: { passwordNote: body } });
    await log("[ADMIN]", `popup till ${role} (${people(res.count)}): "${body.slice(0, 40)}"`);
    return { ok: true, info: `Popup skickad till ${people(res.count)} (${role}).` };
  });
}

/** Today's coin grants, read-only. Lets an admin see the shared daily budget. */
export async function adminCoinLedger(s: S) {
  try {
    if (!(await ok(s, "ADMIN"))) return null;
    const rows = await prisma.coinGrant.findMany({
      where: { createdAt: { gte: startOfDay() } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const byStaff = new Map<string, number>();
    let total = 0;
    for (const r of rows) {
      total += r.amount;
      byStaff.set(r.staffName, (byStaff.get(r.staffName) ?? 0) + r.amount);
    }
    return {
      total,
      count: rows.length,
      byStaff: [...byStaff.entries()]
        .map(([name, sum]) => ({ name, sum }))
        .sort((a, b) => b.sum - a.sum),
      rows: rows.slice(0, 40).map((r) => ({
        id: r.id,
        staff: r.staffName,
        target: r.targetName,
        amount: r.amount,
        at: time(r.createdAt),
      })),
    };
  } catch {
    return null;
  }
}

// ─── amnesty (security) ──────────────────────────────────────────────────

/**
 * Clear one person's warnings.
 *
 * Security hands out the warnings, so security may take them back for someone
 * who behaved afterwards — one person at a time, never a whole group. Admins
 * and the owner keep their own, larger tools.
 */
export async function secClearWarnings(s: S, id: string, username: string) {
  return withAuth("SECURITY", s, async () => {
    const guard = await targetGuard(s.role, username);
    if (!guard.ok) return guard;
    await prisma.profile.update({ where: { id }, data: { warnings: 0 } });
    await log("[SECURITY]", `nollställde varningar på ${username}`);
    return { ok: true, info: `${username}: varningarna är borta (0/3).` };
  });
}
