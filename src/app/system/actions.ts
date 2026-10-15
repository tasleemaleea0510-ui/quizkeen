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
  await prisma.staffChat.create({ data: { channel: `STU|${targetRole}`, fromRole: p.username, text: text.trim().slice(0, 500) } });
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
    where: { channel: `STU|${targetRole}`, OR: [{ fromRole: p.username }, { fromRole: targetRole }] },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return msgs.map((m) => ({ id: m.id, from: m.fromRole, text: m.text, createdAt: m.createdAt.toISOString() }));
}
// One round-trip for the whole overlay chrome. The individual getters below are
// still exported, but the banner polls this instead: each server action costs a
// Supabase auth round-trip, so three of them per tick made the banner feel slow.
export async function getOverlayState() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [settings, profile] = await Promise.all([
    prisma.adminSettings.findUnique({ where: { id: 1 }, select: { broadcast: true } }),
    user
      ? prisma.profile.findUnique({
          where: { id: user.id },
          select: { passwordNote: true, renameRequested: true, forceRelogin: true },
        })
      : Promise.resolve(null),
  ]);

  // "Tvinga ny inloggning" from the owner console. This is the one place that
  // runs as a server action on a timer for every signed-in user, so it is where
  // the flag can actually end the session: clear it first (so a failure can't
  // lock someone in a sign-out loop) and then drop the auth cookies.
  if (profile?.forceRelogin && user) {
    await prisma.profile.update({ where: { id: user.id }, data: { forceRelogin: false } }).catch(() => {});
    await supabase.auth.signOut().catch(() => {});
    return { broadcast: settings?.broadcast ?? null, passwordNote: null, renameRequested: false, signedOut: true };
  }

  return {
    broadcast: settings?.broadcast ?? null,
    passwordNote: profile?.passwordNote ?? null,
    renameRequested: !!profile?.renameRequested,
    signedOut: false,
  };
}

export async function getRenameRequest() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const p = await prisma.profile.findUnique({ where: { id: user.id } });
  return !!p?.renameRequested;
}
export async function acceptRename(newName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, info: "Inte inloggad." };
  const n = newName.trim();
  if (n.length < 3 || n.length > 20) return { ok: false, info: "Användarnamnet måste vara mellan 3 och 20 tecken." };
  const existing = await prisma.profile.findUnique({ where: { username: n } });
  if (existing && existing.id !== user.id) return { ok: false, info: "Namnet är redan upptaget." };
  await prisma.profile.update({ where: { id: user.id }, data: { username: n, renameRequested: false } });
  return { ok: true, info: "Nytt namn har sparats!" };
}
export async function pingPresence(path: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await prisma.profile.update({ where: { id: user.id }, data: { lastSeenAt: new Date(), livePath: path } });
  return { ok: true };
}
export async function getLiveState() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const p = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!p) return null;
  return { tos: !!p.tosAccepted, live: { requested: !!p.liveRequested, staffPeerId: p.livePeerId } };
}

export async function acceptTos() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await prisma.profile.update({ where: { id: user.id }, data: { tosAccepted: true } });
  return { ok: true };
}

export async function declineLive() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await prisma.profile.update({ where: { id: user.id }, data: { liveRequested: false, livePeerId: null } });
  return { ok: true };
}