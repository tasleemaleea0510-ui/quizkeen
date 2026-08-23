"use server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function clearPasswordNote() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await prisma.profile.update({ where: { id: user.id }, data: { passwordNote: null } });
}

export async function getPasswordNote() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const p = await prisma.profile.findUnique({ where: { id: user.id }, select: { passwordNote: true } });
  return p?.passwordNote ?? null;
}

export async function getBanStatus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const p = await prisma.profile.findUnique({ where: { id: user.id }, select: { bannedUntil: true, banMessage: true } });
  if (!p?.bannedUntil || p.bannedUntil <= new Date()) return { banned: false };
  return { banned: true, until: p.bannedUntil.toISOString(), message: p.banMessage };
}

export async function getProfileStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const p = await prisma.profile.findUnique({ where: { id: user.id }, select: { xp: true, coins: true, level: true } });
  if (!p) return null;
  return { xp: p.xp, coins: p.coins, level: p.level };
}

export async function logActivity(username: string, action: string) {
  await prisma.activity.create({ data: { username, action } });
}
export async function getBroadcast() {
  const s = await prisma.adminSettings.findUnique({ where: { id: 1 } });
  return s?.broadcast ?? null;
}
export async function studentSendChat(targetRole: string, text: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const p = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!p) return { ok: false };
  if (!["OWNER", "ADMIN", "SECURITY"].includes(targetRole)) return { ok: false };
  if (!text.trim()) return { ok: false };
  await prisma.staffChat.create({ data: { channel: `STU|${targetRole}`, fromRole: `🎓 ${p.username}`, text: text.trim().slice(0, 500) } });
  return { ok: true };
}
export async function studentGetChats(targetRole: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const p = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!p) return null;
  if (!["OWNER", "ADMIN", "SECURITY"].includes(targetRole)) return null;
  const msgs = await prisma.staffChat.findMany({
    where: { channel: `STU|${targetRole}`, OR: [{ fromRole: `🎓 ${p.username}` }, { fromRole: targetRole }] },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return msgs.map((m) => ({ id: m.id, from: m.fromRole, text: m.text, createdAt: m.createdAt.toISOString() }));
}