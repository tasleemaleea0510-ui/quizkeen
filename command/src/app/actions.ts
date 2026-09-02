import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

type S = { role: string; code: string };

async function ok(s: S, min: "STAFF" | "SECURITY" | "ADMIN" | "OWNER"): Promise<boolean> {
  if (!s) return false;
  const settings = await prisma.adminSettings.findFirst();
  if (!settings) return false;
  if (min === "STAFF") return s.code === settings.ownerCode || s.code === settings.adminCode || s.code === settings.securityCode;
  if (min === "SECURITY") return s.code === settings.ownerCode || s.code === settings.securityCode;
  if (min === "ADMIN") return s.code === settings.ownerCode || s.code === settings.adminCode;
  if (min === "OWNER") return s.code === settings.ownerCode;
  return false;
}

async function log(username: string, action: string) {
  await prisma.activity.create({ data: { username, action } });
}

// ─── EXISTING: GET DATA ───
export async function getOwnerData(s: S) {
  if (!(await ok(s, "OWNER"))) return null;
  const [users, settings, log, quizzes, decks, games, teachers] = await Promise.all([
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
    users: users.map((u) => ({
      id: u.id, username: u.username, role: u.role, level: u.level, xp: u.xp, coins: u.coins,
      bannedUntil: u.bannedUntil ? u.bannedUntil.toISOString() : null, warnings: u.warnings,
      lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null, livePath: u.livePath,
      secretNote: u.secretNote,
    })),
    settings: settings || { ownerCode: "", adminCode: "", securityCode: "", broadcast: "", shutdown: false },
    log,
    stats: { users: users.length, teachers, quizzes, decks, games, totXP, totCoins },
  };
}

export async function getAdminData(s: S) {
  if (!(await ok(s, "ADMIN"))) return null;
  const [users, log] = await Promise.all([
    prisma.profile.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return {
    users: users.map((u) => ({
      id: u.id, username: u.username, role: u.role, level: u.level, xp: u.xp, coins: u.coins,
      bannedUntil: u.bannedUntil ? u.bannedUntil.toISOString() : null,
      lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null, livePath: u.livePath,
      secretNote: u.secretNote,
    })),
    log,
  };
}

export async function getSecurityData(s: S) {
  if (!(await ok(s, "SECURITY"))) return null;
  const [users, log] = await Promise.all([
    prisma.profile.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return {
    users: users.map((u) => ({
      id: u.id, username: u.username, role: u.role, level: u.level, xp: u.xp, warnings: u.warnings,
      bannedUntil: u.bannedUntil ? u.bannedUntil.toISOString() : null,
      lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null, livePath: u.livePath,
      secretNote: u.secretNote,
    })),
    log,
  };
}

// ─── EXISTING: OWNER ACTIONS ───
export async function banUser(s: S, username: string, minutes: number, msg: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const until = minutes <= 0 ? new Date("2099-01-01") : new Date(Date.now() + minutes * 60000);
  await prisma.profile.update({ where: { username }, data: { bannedUntil: until, banMessage: msg || null } });
  await log("[OWNER]", `bannade ${username} (${minutes <= 0 ? "FÖR ALLTID" : minutes + " min"})`);
  return { ok: true, info: `⛔ ${username} bannad!` };
}

export async function unbanUser(s: S, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.update({ where: { username }, data: { bannedUntil: null, banMessage: null } });
  await log("[OWNER]", `unbannade ${username}`);
  return { ok: true, info: `✅ ${username} är fri!` };
}

export async function giveXP(s: S, id: string, username: string, amt: number) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { xp: { increment: amt } } });
  await log("[OWNER]", `gav ${amt} XP till ${username}`);
  return { ok: true };
}

export async function giveCoins(s: S, id: string, username: string, amt: number) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { coins: { increment: amt } } });
  await log("[OWNER]", `gav ${amt} mynt till ${username}`);
  return { ok: true };
}

export async function renameUser(s: S, id: string, old: string, newName: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { username: newName } });
  await log("[OWNER]", `bytte namn ${old} → ${newName}`);
  return { ok: true };
}

export async function setRole(s: S, id: string, username: string, role: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { role: role as any } });
  await log("[OWNER]", `satte roll ${role} på ${username}`);
  return { ok: true };
}

export async function resetPassword(s: S, id: string, username: string, notify: boolean, customPw: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const newPw = customPw || Math.random().toString(36).slice(-8);
  await supabaseAdmin.auth.admin.updateUserById(id, { password: newPw });
  if (notify) await prisma.profile.update({ where: { id }, data: { passwordNote: newPw } });
  await log("[OWNER]", `återställde lösenord på ${username}`);
  return { ok: true, info: `🔑 Nytt lösenord: ${newPw}` };
}

export async function getEmail(s: S, id: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const { data } = await supabaseAdmin.auth.admin.getUserById(id);
  await log("[OWNER]", `kikade email på ${data?.user?.email}`);
  return { ok: true, info: `📧 ${data?.user?.email || "okänd"}` };
}

export async function deleteUser(s: S, id: string, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await supabaseAdmin.auth.admin.deleteUser(id);
  await prisma.profile.delete({ where: { id } });
  await log("[OWNER]", `RADERADE ${username}`);
  return { ok: true };
}

export async function setBroadcast(s: S, text: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const existing = await prisma.adminSettings.findFirst();
  if (existing) await prisma.adminSettings.update({ where: { id: existing.id }, data: { broadcast: text } });
  await log("[OWNER]", text ? `sändning: "${text.slice(0, 50)}..."` : "rensade sändning");
  return { ok: true };
}

export async function setShutdown(s: S, on: boolean) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const existing = await prisma.adminSettings.findFirst();
  if (existing) await prisma.adminSettings.update({ where: { id: existing.id }, data: { shutdown: on } });
  await log("[OWNER]", on ? "STÄNGDE sajten" : "öppnade sajten");
  return { ok: true };
}

export async function changeCodes(s: S, o: string, a: string, sec: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const existing = await prisma.adminSettings.findFirst();
  if (existing) await prisma.adminSettings.update({ where: { id: existing.id }, data: { ownerCode: o, adminCode: a, securityCode: sec } });
  await log("[OWNER]", "uppdaterade koder");
  return { ok: true, newOwner: o };
}

export async function getOwnerExtra(s: S) {
  if (!(await ok(s, "OWNER"))) return null;
  const requests = await prisma.banRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return { requests };
}

export async function approveBanRequest(s: S, id: string, minutes: number) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const req = await prisma.banRequest.findUnique({ where: { id } });
  if (!req) return { ok: false };
  const until = minutes <= 0 ? new Date("2099-01-01") : new Date(Date.now() + minutes * 60000);
  await prisma.profile.update({ where: { username: req.target }, data: { bannedUntil: until } });
  await prisma.banRequest.update({ where: { id }, data: { status: "APPROVED", decidedMinutes: minutes } });
  await log("[OWNER]", `godkände ban-request för ${req.target} (${minutes <= 0 ? "FÖR ALLTID" : minutes + " min"})`);
  return { ok: true };
}

export async function rejectBanRequest(s: S, id: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.banRequest.update({ where: { id }, data: { status: "REJECTED" } });
  await log("[OWNER]", "avslog ban-request");
  return { ok: true };
}

export async function resetXP(s: S, id: string, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { xp: 0 } });
  await log("[OWNER]", `reset XP på ${username}`);
  return { ok: true };
}

export async function resetCoins(s: S, id: string, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { coins: 0 } });
  await log("[OWNER]", `reset mynt på ${username}`);
  return { ok: true };
}

export async function resetAll(s: S, id: string, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { xp: 0, coins: 0, warnings: 0 } });
  await log("[OWNER]", `TOTAL-RESET på ${username}`);
  return { ok: true };
}

export async function setLevel(s: S, id: string, username: string, lvl: number) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { xp: (lvl - 1) * 100 } });
  await log("[OWNER]", `satte nivå ${lvl} på ${username}`);
  return { ok: true };
}

export async function sendPersonalNote(s: S, id: string, username: string, text: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { passwordNote: text } });
  await log("[OWNER]", `skickade popup till ${username}`);
  return { ok: true };
}

export async function clearPersonalNote(s: S, id: string, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { passwordNote: null } });
  await log("[OWNER]", `rensade popup på ${username}`);
  return { ok: true };
}

export async function requestRename(s: S, id: string, username: string) {
  if (!(await ok(s, "STAFF"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { renameRequested: true } });
  await log(`[${s.role}]`, `begärde namnbyte från ${username}`);
  return { ok: true, info: `✏️ ${username} måste byta namn!` };
}

export async function requestLive(s: S, id: string, username: string, pid: string) {
  if (!(await ok(s, "STAFF"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { liveRequested: true, livePeerId: pid } });
  await log(`[${s.role}]`, `begärde LIVE från ${username}`);
  return { ok: true };
}

// ─── EXISTING: ADMIN ACTIONS ───
export async function adminBan(s: S, username: string, minutes: number, reason: string) {
  if (!(await ok(s, "ADMIN"))) return { ok: false };
  if (minutes > 1440) return { ok: false, info: "❌ Max 1 dag — be ägaren om mer!" };
  const until = new Date(Date.now() + minutes * 60000);
  await prisma.profile.update({ where: { username }, data: { bannedUntil: until, banMessage: reason || null } });
  await log("[ADMIN]", `bannade ${username} (${minutes} min)`);
  return { ok: true, info: `⛔ ${username} bannad!` };
}

export async function adminUnban(s: S, username: string) {
  if (!(await ok(s, "ADMIN"))) return { ok: false };
  await prisma.profile.update({ where: { username }, data: { bannedUntil: null, banMessage: null } });
  await log("[ADMIN]", `unbannade ${username}`);
  return { ok: true };
}

export async function adminGiveXP(s: S, id: string, username: string, amt: number) {
  if (!(await ok(s, "ADMIN"))) return { ok: false };
  if (amt > 500 || amt < -500) return { ok: false, info: "❌ Max ±500 XP!" };
  const u = await prisma.profile.findUnique({ where: { id } });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const recent = u?.lastGiftAt ? new Date(u.lastGiftAt) : null;
  if (recent && recent > today) return { ok: false, info: "❌ Redan belönad idag!" };
  await prisma.profile.update({ where: { id }, data: { xp: { increment: amt }, lastGiftAt: new Date() } });
  await log("[ADMIN]", `gav ${amt} XP till ${username}`);
  return { ok: true, info: `🎁 +${amt} XP till ${username}!` };
}

export async function adminRequestBan(s: S, target: string, minutes: number, reason: string) {
  if (!(await ok(s, "ADMIN"))) return { ok: false };
  const admin = await prisma.profile.findFirst({ where: { role: "ADMIN" } });
  await prisma.banRequest.create({ data: { target, admin: admin?.username || "admin", minutes, reason } });
  await log("[ADMIN]", `begärde ban på ${target} (${minutes} min) från ägaren`);
  return { ok: true, info: `🙏 Begäran skickad till ägaren!` };
}

export async function adminSetBroadcast(s: S, text: string) {
  if (!(await ok(s, "ADMIN"))) return { ok: false };
  const existing = await prisma.adminSettings.findFirst();
  if (existing) await prisma.adminSettings.update({ where: { id: existing.id }, data: { broadcast: text } });
  await log("[ADMIN]", text ? `sändning: "${text.slice(0, 50)}..."` : "rensade sändning");
  return { ok: true, info: text ? "📢 Sänt!" : "🧹 Rensat!" };
}

// ─── EXISTING: SECURITY ACTIONS ───
export async function secWarn(s: S, id: string, username: string) {
  if (!(await ok(s, "SECURITY"))) return { ok: false };
  const u = await prisma.profile.findUnique({ where: { id } });
  const next = (u?.warnings || 0) + 1;
  await prisma.profile.update({ where: { id }, data: { warnings: next } });
  await log("[SECURITY]", `varnade ${username} (nu ${next}/3)`);
  if (next >= 3) {
    await prisma.profile.update({ where: { id }, data: { bannedUntil: new Date("2099-01-01"), banMessage: "3 varningar från säkerhet" } });
    return { ok: true, info: `⛔ ${username} har 3 varningar — BANNAD FÖR ALLTID!` };
  }
  return { ok: true, info: `⚠️ ${username} varnad (${next}/3)!` };
}

export async function secBan(s: S, username: string, minutes: number) {
  if (!(await ok(s, "SECURITY"))) return { ok: false };
  if (minutes > 60) return { ok: false, info: "❌ Max 1 timme — be ägaren!" };
  const until = new Date(Date.now() + minutes * 60000);
  await prisma.profile.update({ where: { username }, data: { bannedUntil: until } });
  await log("[SECURITY]", `bannade ${username} (${minutes} min)`);
  return { ok: true, info: `⛔ ${username} bannad ${minutes} min!` };
}

export async function secUnban(s: S, username: string) {
  if (!(await ok(s, "SECURITY"))) return { ok: false };
  await prisma.profile.update({ where: { username }, data: { bannedUntil: null } });
  await log("[SECURITY]", `unbannade ${username}`);
  return { ok: true };
}

// ─── NEW: 11 SUPERPOWERS (BATCH 91) ───
export async function muteChat(s: S, id: string, username: string, minutes: number) {
  if (!(await ok(s, "STAFF"))) return { ok: false };
  const until = minutes <= 0 ? new Date("2099-01-01") : new Date(Date.now() + minutes * 60000);
  await prisma.profile.update({ where: { id }, data: { chatMutedUntil: until } });
  await log(`[${s.role}]`, `🔇 mute chat på ${username} (${minutes <= 0 ? "FOREVER" : minutes + " min"})`);
  return { ok: true, info: `🔇 ${username}: chat tystad (${minutes <= 0 ? "FÖR ALLTID" : minutes + " min"})!` };
}

export async function unmuteChat(s: S, id: string, username: string) {
  if (!(await ok(s, "STAFF"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { chatMutedUntil: null } });
  await log(`[${s.role}]`, `🔊 unmute chat på ${username}`);
  return { ok: true, info: `🔊 ${username}: chat öppnad igen!` };
}

export async function toggleGhost(s: S, id: string, username: string) {
  if (!(await ok(s, "OWNER")) && !(await ok(s, "SECURITY"))) return { ok: false };
  const u = await prisma.profile.findUnique({ where: { id } });
  const next = !u!.ghostMode;
  await prisma.profile.update({ where: { id }, data: { ghostMode: next } });
  await log(`[${s.role}]`, next ? `👻 ghostmode PÅ ${username}` : `👻 ghostmode AV ${username}`);
  return { ok: true, info: next ? `👻 ${username}: meddelanden osynliga för andra!` : `👻 ${username}: synlig igen!` };
}

export async function togglePin(s: S, id: string, username: string) {
  if (!(await ok(s, "STAFF"))) return { ok: false };
  const u = await prisma.profile.findUnique({ where: { id } });
  const next = !u!.pinned;
  await prisma.profile.update({ where: { id }, data: { pinned: next } });
  await log(`[${s.role}]`, next ? `📌 pin PÅ ${username}` : `📌 pin AV ${username}`);
  return { ok: true, info: next ? `📌 ${username}: pin to top!` : `📌 ${username}: unpin!` };
}

export async function toggleShadow(s: S, id: string, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const u = await prisma.profile.findUnique({ where: { id } });
  const next = !u!.shadowed;
  await prisma.profile.update({ where: { id }, data: { shadowed: next } });
  await log("[OWNER]", next ? `🕵️ shadow PÅ ${username}` : `🕵️ shadow AV ${username}`);
  return { ok: true, info: next ? `🕵️ ${username}: osynlig på topplistan!` : `🕵️ ${username}: synlig igen!` };
}

export async function toggleFreezeCoins(s: S, id: string, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const u = await prisma.profile.findUnique({ where: { id } });
  const next = !u!.coinsFrozen;
  await prisma.profile.update({ where: { id }, data: { coinsFrozen: next } });
  await log("[OWNER]", next ? `❄️ FRYSTE mynt på ${username}` : `🔥 TINADE mynt på ${username}`);
  return { ok: true, info: next ? `❄️ ${username}: kan inte spendera mynt!` : `🔥 ${username}: mynt upplåsta!` };
}

export async function setSecretNote(s: S, id: string, username: string, text: string) {
  if (!(await ok(s, "STAFF"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { secretNote: text.trim() || null } });
  await log(`[${s.role}]`, text.trim() ? `📝 hemlig anteckning på ${username}` : `📝 rensade hemlig anteckning på ${username}`);
  return { ok: true, info: text.trim() ? `📝 Hemlig anteckning sparad på ${username}!` : `📝 Hemlig anteckning rensad!` };
}

export async function forceRelogin(s: S, id: string, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { forceRelogin: true } });
  await log("[OWNER]", `🔄 tvingade ${username} att logga in igen`);
  return { ok: true, info: `🔄 ${username}: kastas ut — måste logga in igen!` };
}

export async function getTimeMachine(s: S, username: string, minutesAgo: number) {
  if (!(await ok(s, "OWNER"))) return { ok: false, info: "❌" };
  const since = new Date(Date.now() - minutesAgo * 60000);
  const visits = await prisma.pageVisit.findMany({
    where: { username, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  if (visits.length === 0) return { ok: true, info: `⏳ ${username} besökte inga sidor de senaste ${minutesAgo} min!` };
  const lines = visits.map((v) => `${new Date(v.createdAt).toLocaleTimeString("sv-SE")} → ${v.path}`).join(" · ");
  return { ok: true, info: `⏳ ${username} senaste ${minutesAgo} min: ${lines}` };
}

export async function peekIP(s: S, id: string, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const { data } = await supabaseAdmin.auth.admin.getUserById(id);
  const ip = data?.user?.user_metadata?.ip || "okänd";
  await log("[OWNER]", `🌐 IP-peek på ${username}`);
  return { ok: true, info: `🌐 ${username} IP-fragment: ${String(ip).split(".").slice(0, 2).join(".")}.x.x (full IP loggas aldrig)` };
}

export async function toggleDailyBonus(s: S, id: string, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const u = await prisma.profile.findUnique({ where: { id } });
  const next = !u!.dailyBonusDisabled;
  await prisma.profile.update({ where: { id }, data: { dailyBonusDisabled: next } });
  await log("[OWNER]", next ? `🎁 stängde daglig bonus för ${username}` : `🎁 öppnade daglig bonus för ${username}`);
  return { ok: true, info: next ? `🎁 ${username}: ingen daglig belöning!` : `🎁 ${username}: får bonus igen!` };
}

export async function spyOnChats(s: S) {
  if (!(await ok(s, "STAFF"))) return null;
  const [global, inbox, staff, reqs] = await Promise.all([
    prisma.chatMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.ownerMessage.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.staffChat.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.chatRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return {
    global: global.map((m) => ({ id: m.id, from: m.name, role: m.role, text: m.text, at: m.createdAt.toISOString() })),
    inbox: inbox.map((m) => ({ id: m.id, from: m.fromUsername, about: m.aboutUsername, text: m.message, resolved: m.resolved, at: m.createdAt.toISOString() })),
    staff: staff.map((m) => ({ id: m.id, channel: m.channel, from: m.fromRole, text: m.text, at: m.createdAt.toISOString() })),
    requests: reqs.map((r) => ({ id: r.id, from: r.fromUser, to: r.toUser, status: r.status, at: r.createdAt.toISOString() })),
  };
}