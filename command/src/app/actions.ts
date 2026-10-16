"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_KEEN_NAME, adminKeenHolders, giveAdminKeen } from "@/lib/keen-grant";

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
      settings: settings || { ownerCode: "", adminCode: "", securityCode: "", broadcast: "", shutdown: false },
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
    const until = minutes <= 0 ? new Date("2099-01-01") : new Date(Date.now() + minutes * 60000);
    await prisma.profile.update({ where: { username }, data: { bannedUntil: until, banMessage: msg || null } });
    await log("[OWNER]", `bannade ${username} (${minutes <= 0 ? "FÖR ALLTID" : minutes + " min"})`);
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
    await prisma.profile.update({ where: { id }, data: { xp: { increment: amt } } });
    await log("[OWNER]", `gav ${amt} XP till ${username}`);
    return { ok: true, info: `${amt > 0 ? "+" : ""}${amt} XP till ${username}` };
  });
}

export async function giveCoins(s: S, id: string, username: string, amt: number) {
  return withAuth("OWNER", s, async () => {
    await prisma.profile.update({ where: { id }, data: { coins: { increment: amt } } });
    await log("[OWNER]", `gav ${amt} mynt till ${username}`);
    return { ok: true, info: `${amt > 0 ? "+" : ""}${amt} mynt till ${username}` };
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
    await prisma.profile.update({ where: { id }, data: { role: role as any } });
    await log("[OWNER]", `satte roll ${role} på ${username}`);
    return { ok: true, info: `${username} är nu ${role}.` };
  });
}

export async function resetPassword(s: S, id: string, username: string, notify: boolean, customPw: string) {
  return withAuth("OWNER", s, async () => {
    const newPw = customPw.trim() || Math.random().toString(36).slice(-8);
    await supabaseAdmin.auth.admin.updateUserById(id, { password: newPw });
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
    await supabaseAdmin.auth.admin.deleteUser(id);
    await prisma.profile.delete({ where: { id } });
    await log("[OWNER]", `RADERADE ${username}`);
    return { ok: true, info: `${username} raderad.` };
  });
}

export async function setBroadcast(s: S, text: string) {
  return withAuth("OWNER", s, async () => {
    const existing = await prisma.adminSettings.findFirst();
    if (existing) await prisma.adminSettings.update({ where: { id: existing.id }, data: { broadcast: text } });
    await log("[OWNER]", text ? `sändning: "${text.slice(0, 50)}..."` : "rensade sändning");
    return { ok: true, info: text ? "Sänt!" : "Rensat!" };
  });
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
    const until = minutes <= 0 ? new Date("2099-01-01") : new Date(Date.now() + minutes * 60000);
    await prisma.profile.update({ where: { username: req.targetUsername }, data: { bannedUntil: until } });
    await prisma.banRequest.update({ where: { id }, data: { status: "APPROVED" } });
    await log("[OWNER]", `godkände ban-request för ${req.targetUsername} (${minutes <= 0 ? "FÖR ALLTID" : minutes + " min"})`);
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
    const { data } = await supabaseAdmin.auth.admin.getUserById(id);
    const ip = data?.user?.user_metadata?.ip || "okänd";
    await log("[OWNER]", `IP-peek på ${username}`);
    return {
      ok: true,
      info: `${username} IP-fragment: ${String(ip).split(".").slice(0, 2).join(".")}.x.x (full IP loggas aldrig)`,
    };
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

export async function muteChat(s: S, id: string, username: string, minutes: number) {
  return withAuth("STAFF", s, async () => {
    const until = minutes <= 0 ? new Date("2099-01-01") : new Date(Date.now() + minutes * 60000);
    await prisma.profile.update({ where: { id }, data: { chatMutedUntil: until } });
    await log(`[${s.role}]`, `mute chat på ${username} (${minutes <= 0 ? "FOREVER" : minutes + " min"})`);
    return { ok: true, info: `${username}: chat tystad (${minutes <= 0 ? "FÖR ALLTID" : minutes + " min"})!` };
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
    if (minutes > 1440) return { ok: false, info: "Max 1 dag — be ägaren om mer!" };
    const until = new Date(Date.now() + Math.max(1, minutes) * 60000);
    await prisma.profile.update({ where: { username }, data: { bannedUntil: until, banMessage: reason || null } });
    await log("[ADMIN]", `bannade ${username} (${minutes} min)`);
    return { ok: true, info: `${username} bannad ${minutes} min!` };
  });
}

export async function adminUnban(s: S, username: string) {
  return withAuth("ADMIN", s, async () => {
    await prisma.profile.update({ where: { username }, data: { bannedUntil: null, banMessage: null } });
    await log("[ADMIN]", `unbannade ${username}`);
    return { ok: true, info: `${username} är fri!` };
  });
}

export async function adminGiveXP(s: S, id: string, username: string, amt: number) {
  return withAuth("ADMIN", s, async () => {
    if (amt > 500 || amt < -500) return { ok: false, info: "Max ±500 XP!" };
    const u = await prisma.profile.findUnique({ where: { id } });
    if (!u) return { ok: false, info: GENERIC_FAILURE };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (u.lastGiftAt && new Date(u.lastGiftAt) > today) return { ok: false, info: "Redan belönad idag!" };
    await prisma.profile.update({ where: { id }, data: { xp: { increment: amt }, lastGiftAt: new Date() } });
    await log("[ADMIN]", `gav ${amt} XP till ${username}`);
    return { ok: true, info: `+${amt} XP till ${username}!` };
  });
}

export async function adminRequestBan(s: S, target: string, minutes: number, reason: string) {
  return withAuth("ADMIN", s, async () => {
    if (!target.trim()) return { ok: false, info: "Välj en användare först." };
    const admin = await prisma.profile.findFirst({ where: { role: "ADMIN" } });
    await prisma.banRequest.create({
      data: {
        targetUsername: target,
        adminUsername: admin?.username || s.role || "admin",
        minutes: Math.max(0, Math.floor(minutes) || 0),
        reason: reason || null,
      },
    });
    await log("[ADMIN]", `begärde ban på ${target} (${minutes} min) från ägaren`);
    return { ok: true, info: "Begäran skickad till ägaren!" };
  });
}

export async function adminSetBroadcast(s: S, text: string) {
  return withAuth("ADMIN", s, async () => {
    const existing = await prisma.adminSettings.findFirst();
    if (!existing) return { ok: false, info: GENERIC_FAILURE };
    await prisma.adminSettings.update({ where: { id: existing.id }, data: { broadcast: text } });
    await log("[ADMIN]", text ? `sändning: "${text.slice(0, 50)}..."` : "rensade sändning");
    return { ok: true, info: text ? "Sänt!" : "Rensat!" };
  });
}

// ─── security powers ─────────────────────────────────────────────────────

export async function secWarn(s: S, id: string, username: string) {
  return withAuth("SECURITY", s, async () => {
    const u = await prisma.profile.findUnique({ where: { id } });
    if (!u) return { ok: false, info: GENERIC_FAILURE };
    const next = (u.warnings || 0) + 1;
    if (next >= 3) {
      await prisma.profile.update({
        where: { id },
        data: { warnings: next, bannedUntil: new Date("2099-01-01"), banMessage: "3 varningar från säkerhet" },
      });
      await log("[SECURITY]", `varnade ${username} (3/3 — bannad)`);
      return { ok: true, info: `${username} har 3 varningar — BANNAD FÖR ALLTID!` };
    }
    await prisma.profile.update({ where: { id }, data: { warnings: next } });
    await log("[SECURITY]", `varnade ${username} (nu ${next}/3)`);
    return { ok: true, info: `${username} varnad (${next}/3)!` };
  });
}

export async function secBan(s: S, username: string, minutes: number) {
  return withAuth("SECURITY", s, async () => {
    if (minutes > 60) return { ok: false, info: "Max 1 timme — be ägaren!" };
    const until = new Date(Date.now() + Math.max(1, minutes) * 60000);
    await prisma.profile.update({ where: { username }, data: { bannedUntil: until } });
    await log("[SECURITY]", `bannade ${username} (${minutes} min)`);
    return { ok: true, info: `${username} bannad ${minutes} min!` };
  });
}

/** Was returning ok:false even on success, so the UI always claimed failure. */
export async function secUnban(s: S, username: string) {
  return withAuth("SECURITY", s, async () => {
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
