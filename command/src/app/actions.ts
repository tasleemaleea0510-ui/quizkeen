"use server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type S = { role: string; code: string };

async function ok(s: S, need: "OWNER" | "ADMIN" | "SECURITY" | "STAFF") {
  const st = await prisma.adminSettings.findUnique({ where: { id: 1 } });
  if (!st || !s) return false;
  if (s.role === "OWNER" && s.code === st.ownerCode) return need === "OWNER" || need === "STAFF";
  if (s.role === "ADMIN" && s.code === st.adminCode) return need === "ADMIN" || need === "STAFF";
  if (s.role === "SECURITY" && s.code === st.securityCode) return need === "SECURITY" || need === "STAFF";
  return false;
}

export async function unlock(code: string, kind: "OWNER" | "ADMIN" | "SECURITY") {
  const s = await prisma.adminSettings.findUnique({ where: { id: 1 } });
  if (!s) return { ok: false as const };
  if (kind === "OWNER" && code.trim() === s.ownerCode) return { ok: true as const, role: "OWNER" as const, code: s.ownerCode };
  if (kind === "ADMIN" && code.trim() === s.adminCode) return { ok: true as const, role: "ADMIN" as const, code: s.adminCode };
  if (kind === "SECURITY" && code.trim() === s.securityCode) return { ok: true as const, role: "SECURITY" as const, code: s.securityCode };
  return { ok: false as const };
}

async function log(who: string, action: string) {
  await prisma.activity.create({ data: { username: who, action } });
}

export async function getOwnerData(s: S) {
  if (!(await ok(s, "OWNER"))) return null;
  const [users, quizzes, decks, games, inbox, act, settings] = await Promise.all([
    prisma.profile.findMany({ orderBy: { xp: "desc" } }),
    prisma.quiz.count(),
    prisma.flashcardCollection.count(),
    prisma.gameSession.count(),
    prisma.ownerMessage.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.adminSettings.findUnique({ where: { id: 1 } }),
  ]);
  return {
    stats: {
      users: users.length,
      teachers: users.filter((u) => u.role === "TEACHER").length,
      quizzes,
      decks,
      games,
      totXP: users.reduce((a, u) => a + u.xp, 0),
      totCoins: users.reduce((a, u) => a + u.coins, 0),
    },
    users: users.map((u) => ({
      id: u.id, username: u.username, role: u.role, level: u.level, xp: u.xp, coins: u.coins,
      bannedUntil: u.bannedUntil ? u.bannedUntil.toISOString() : null, warnings: u.warnings,
    })),
    inbox: inbox.map((m) => ({ id: m.id, from: m.fromUsername, about: m.aboutUsername, message: m.message, resolved: m.resolved, createdAt: m.createdAt.toISOString() })),
    log: act.map((l) => ({ username: l.username, action: l.action, createdAt: l.createdAt.toISOString() })),
    settings: {
      ownerCode: settings!.ownerCode, adminCode: settings!.adminCode, securityCode: settings!.securityCode,
      broadcast: settings!.broadcast, shutdown: settings!.shutdown,
    },
  };
}

export async function banUser(s: S, username: string, minutes: number, message: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const until = minutes <= 0 ? new Date("2099-01-01") : new Date(Date.now() + minutes * 60000);
  await prisma.profile.updateMany({
    where: { username },
    data: { bannedUntil: until, banMessage: message || `Du har blivit bannad av ägaren Abdullah Shafi${minutes > 0 ? ` i ${minutes} minuter` : " FÖR ALLTID"}.` },
  });
  await log("[OWNER]", `⛔ bannade ${username} (${minutes <= 0 ? "FOREVER" : minutes + " min"})`);
  return { ok: true };
}

export async function unbanUser(s: S, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.updateMany({ where: { username }, data: { bannedUntil: null, banMessage: null } });
  await log("[OWNER]", `✅ unbannade ${username}`);
  return { ok: true };
}

export async function giveXP(s: S, id: string, username: string, amt: number) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const u = await prisma.profile.findUnique({ where: { id } });
  if (!u) return { ok: false };
  const xp = Math.max(0, u.xp + amt);
  await prisma.profile.update({ where: { id }, data: { xp, level: Math.floor(xp / 100) + 1 } });
  await log("[OWNER]", `💰 gav ${amt} XP till ${username}`);
  return { ok: true };
}

export async function giveCoins(s: S, id: string, username: string, amt: number) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const u = await prisma.profile.findUnique({ where: { id } });
  if (!u) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { coins: Math.max(0, u.coins + amt) } });
  await log("[OWNER]", `🪙 gav ${amt} mynt till ${username}`);
  return { ok: true };
}

export async function renameUser(s: S, id: string, oldName: string, newName: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  if (newName.trim().length < 3) return { ok: false, info: "❌ Minst 3 tecken!" };
  await prisma.profile.update({ where: { id }, data: { username: newName.trim() } });
  await log("[OWNER]", `✏️ döpte om ${oldName} → ${newName.trim()}`);
  return { ok: true };
}

export async function setRole(s: S, id: string, username: string, role: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.update({ where: { id }, data: { role: role as any } });
  await log("[OWNER]", `🎭 gjorde ${username} till ${role}`);
  return { ok: true };
}

export async function resetPassword(s: S, id: string, username: string, notify: boolean, custom: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const temp = custom.trim().length >= 6 ? custom.trim() : "QK-" + Math.floor(1000 + Math.random() * 9000);
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: temp });
  if (error) return { ok: false, info: "❌ " + error.message };
  if (notify) {
    await prisma.profile.update({ where: { id }, data: { passwordNote: `Ägaren Abdullah Shafi återställde ditt lösenord. Nytt lösenord: ${temp}` } });
  }
  await log("[OWNER]", `🔑 återställde lösenord för ${username} (${notify ? "med popup" : "TYST"})`);
  return { ok: true, info: `🔑 Nytt lösenord för ${username}: ${temp} ${notify ? "(popup skickad!)" : "(tyst läge 😈)"}` };
}

export async function getEmail(s: S, id: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
  if (error) return { ok: false, info: "❌ Kunde inte hämta email" };
  return { ok: true, info: `📧 Email: ${data.user.email ?? "okänd"}` };
}

export async function deleteUser(s: S, id: string, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.profile.delete({ where: { id } });
  await log("[OWNER]", `🗑️ RADERADE ${username}`);
  return { ok: true };
}

export async function setBroadcast(s: S, text: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.adminSettings.update({ where: { id: 1 }, data: { broadcast: text.trim() || null } });
  await log("[OWNER]", text.trim() ? `📢 sände ut: "${text.trim()}"` : "📢 tog bort sändningen");
  return { ok: true };
}

export async function setShutdown(s: S, on: boolean) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  await prisma.adminSettings.update({ where: { id: 1 }, data: { shutdown: on } });
  await log("[OWNER]", on ? "🛠️ STÄNGDE NER sajten" : "🟢 ÖPPNADE sajten");
  return { ok: true };
}

export async function changeCodes(s: S, o: string, a: string, sec: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const upd: any = {};
  if (o.trim().length >= 8) upd.ownerCode = o.trim();
  if (a.trim().length >= 8) upd.adminCode = a.trim();
  if (sec.trim().length >= 8) upd.securityCode = sec.trim();
  if (Object.keys(upd).length === 0) return { ok: false, info: "❌ Koder måste vara 8+ tecken!" };
  await prisma.adminSettings.update({ where: { id: 1 }, data: upd });
  await log("[OWNER]", "🔢 bytte koder");
  return { ok: true, newOwner: upd.ownerCode ?? null, info: "✅ Koder uppdaterade!" };
}

export async function resolveMessage(s: S, id: string) {
  if (!(await ok(s, "STAFF"))) return { ok: false };
  await prisma.ownerMessage.update({ where: { id }, data: { resolved: true } });
  return { ok: true };
}

export async function approveSensitive(s: S, messageId: string, id: string, username: string) {
  if (!(await ok(s, "OWNER"))) return { ok: false };
  const { data } = await supabaseAdmin.auth.admin.getUserById(id);
  const email = data?.user?.email ?? "okänd";
  const temp = "QK-" + Math.floor(1000 + Math.random() * 9000);
  await supabaseAdmin.auth.admin.updateUserById(id, { password: temp });
  await prisma.ownerMessage.update({
    where: { id: messageId },
    data: { resolved: true, message: `🔓 GODKÄND av ägaren — 📧 ${email} · 🔑 tillfälligt lösenord: ${temp}` },
  });
  await log("[OWNER]", `🔐 godkände känslig begäran för ${username}`);
  return { ok: true };
}
export async function getAdminData(s: S) {
  if (!(await ok(s, "ADMIN"))) return null;
  const [users, act, inbox] = await Promise.all([
    prisma.profile.findMany({ orderBy: { xp: "desc" } }),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.ownerMessage.findMany({ where: { resolved: false }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return {
    users: users.map((u) => ({ id: u.id, username: u.username, role: u.role, level: u.level, xp: u.xp, coins: u.coins, bannedUntil: u.bannedUntil ? u.bannedUntil.toISOString() : null })),
    log: act.map((l) => ({ username: l.username, action: l.action, createdAt: l.createdAt.toISOString() })),
    inbox: inbox.map((m) => ({ id: m.id, from: m.fromUsername, about: m.aboutUsername, message: m.message, createdAt: m.createdAt.toISOString() })),
  };
}

export async function adminBan(s: S, username: string, minutes: number, message: string) {
  if (!(await ok(s, "ADMIN"))) return { ok: false };
  const target = await prisma.profile.findUnique({ where: { username } });
  if (!target || (target.role !== "STUDENT" && target.role !== "TEACHER")) return { ok: false, info: "❌ Admins kan inte banna staff!" };
  const until = minutes <= 0 ? new Date("2099-01-01") : new Date(Date.now() + minutes * 60000);
  await prisma.profile.updateMany({
    where: { username },
    data: { bannedUntil: until, banMessage: message || `Du har blivit bannad av en ADMIN${minutes > 0 ? ` i ${minutes} minuter` : " FÖR ALLTID"}.` },
  });
  await log("[ADMIN]", `⛔ bannade ${username} (${minutes <= 0 ? "FOREVER" : minutes + " min"})`);
  return { ok: true };
}

export async function adminUnban(s: S, username: string) {
  if (!(await ok(s, "ADMIN"))) return { ok: false };
  await prisma.profile.updateMany({ where: { username }, data: { bannedUntil: null, banMessage: null } });
  await log("[ADMIN]", `✅ unbannade ${username}`);
  return { ok: true };
}