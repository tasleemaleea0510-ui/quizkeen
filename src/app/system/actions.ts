"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isBroadcastLive, readBroadcast } from "@/lib/broadcast";
import { clientIp, resolveGeo, type Geo } from "@/lib/geo";
import { blockForIp } from "@/lib/ip-block";

/** How long a resolved country is trusted before it is looked up again. */
const GEO_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * How often the same address's "last seen" is refreshed.
 *
 * The ping runs every 15 seconds per tab. Writing an address row that often
 * would be four updates a minute per player for a number nobody reads at that
 * resolution; five minutes keeps "senast sedd" honest at a fraction of the
 * writes. A *new* address is always written at once.
 */
const ADDRESS_TOUCH_MS = 5 * 60 * 1000;
const lastAddressWrite = new Map<string, number>();

/**
 * One row per (person, address), forever.
 *
 * `Profile.lastIp` only remembers the current connection, so an account that
 * moved from one network to another left no trace of the first one. This keeps
 * every address the person has ever been seen from, with when it started and
 * when it was last used — the history the owner console reads.
 */
async function recordAddress(
  profileId: string,
  username: string,
  ip: string,
  geo: Geo | null,
  now: Date
) {
  const place = geo
    ? { country: geo.country, countryCode: geo.countryCode, city: geo.city }
    : {};
  try {
    await prisma.profileIp.upsert({
      where: { profileId_ip: { profileId, ip } },
      create: { profileId, username, ip, firstAt: now, lastAt: now, ...place },
      update: { username, lastAt: now, hits: { increment: 1 }, ...place },
    });
    lastAddressWrite.set(`${profileId}|${ip}`, now.getTime());
  } catch {
    // Address history is a nicety. The heartbeat still has to land.
  }
}

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

/**
 * Who the navbar is looking at — name, role and wallet, one row.
 *
 * The Browser used to read the Profile table straight with the anon key, which
 * row level security refuses: a 403 on every page and a teacher's nav that never
 * learned it was dealing with a teacher. The server has the session cookie, so it
 * can answer this without loosening a policy.
 *
 * XP and coins ride along because the header shows both: a second round trip to
 * draw two numbers would be a second auth check for the same person, and it
 * would let the header and the dashboard disagree for a moment about the same
 * account.
 */
export async function getNavUser(): Promise<{
  username: string;
  role: string;
  accentColor: string | null;
  xp: number;
  coins: number;
} | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const p = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { username: true, role: true, accentColor: true, xp: true, coins: true },
  });
  return p
    ? { username: p.username, role: p.role, accentColor: p.accentColor, xp: p.xp, coins: p.coins }
    : null;
}
/** The live notice, or null once its time is up. No auth needed. */
export async function getBroadcast() {
  return (await readBroadcast())?.text ?? null;
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
    prisma.adminSettings.findUnique({ where: { id: 1 }, select: { broadcast: true, broadcastUntil: true } }),
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
  // Expiry is applied on every read: once `broadcastUntil` has passed the
  // notice is simply gone, whether or not anybody remembered to clear it.
  const live = isBroadcastLive(settings?.broadcast, settings?.broadcastUntil);
  const broadcast = live ? settings!.broadcast!.trim() : null;
  const broadcastUntil = live && settings?.broadcastUntil ? settings.broadcastUntil.toISOString() : null;

  if (profile?.forceRelogin && user) {
    await prisma.profile.update({ where: { id: user.id }, data: { forceRelogin: false } }).catch(() => {});
    await supabase.auth.signOut().catch(() => {});
    return { broadcast, broadcastUntil, passwordNote: null, renameRequested: false, signedOut: true };
  }

  return {
    broadcast,
    broadcastUntil,
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
/**
 * Heartbeat + location, once every 15 seconds per open tab.
 *
 * The heartbeat is what makes "online now" work. It is also the only place
 * that knows the caller's address, so it records that too — but only when the
 * address changed or the answer is old, so the geo lookup runs a handful of
 * times a day instead of on every tick.
 *
 * It writes PageVisit on a page change as well: the owner's "time machine"
 * reads that table, and until now nothing in the student app ever filled it,
 * which is why every lookup came back empty.
 */
export async function pingPresence(path: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const now = new Date();
  const before = await prisma.profile
    .findUnique({
      where: { id: user.id },
      select: { username: true, role: true, livePath: true, lastIp: true, ipAt: true },
    })
    .catch(() => null);

  let head: Headers | null = null;
  try {
    head = headers();
  } catch {
    // No headers (or no network): the heartbeat still has to land.
  }
  const ip = head ? clientIp(head) : null;

  // The door list is checked on every tick, not only on a page load. A block
  // placed while a tab is open has to end the session in seconds — otherwise
  // the person keeps playing until they happen to navigate. A signed-in owner
  // is exempt: an owner sharing a network with a blocked student must still be
  // able to run the site.
  const blocked = before?.role === "OWNER" ? null : await blockForIp(ip);
  if (blocked) {
    await supabase.auth.signOut().catch(() => {});
    return { ok: false, blocked: true, until: blocked.until ? blocked.until.toISOString() : null };
  }

  if (before && before.livePath !== path) {
    const p = path && path.startsWith("/") ? path.slice(0, 200) : "/";
    await prisma.pageVisit.create({ data: { username: before.username, path: p } }).catch(() => {});
  }

  let location: { lastIp?: string; ipAt?: Date; ipCountry?: string | null; ipCountryCode?: string | null; ipCity?: string | null } = {};
  if (ip && before) {
    const stale = !before.ipAt || now.getTime() - before.ipAt.getTime() > GEO_TTL_MS;
    const moved = ip !== before.lastIp;
    if (moved || stale) {
      const geo = await resolveGeo(head!, ip);
      location = {
        lastIp: ip,
        ipAt: now,
        ...(geo ? { ipCountry: geo.country, ipCountryCode: geo.countryCode, ipCity: geo.city } : {}),
      };
      await recordAddress(user.id, before.username, ip, geo, now);
    } else {
      // Same connection: refresh the history row now and then so "senast sedd"
      // does not freeze at the first day somebody used this network.
      const key = `${user.id}|${ip}`;
      if (now.getTime() - (lastAddressWrite.get(key) ?? 0) > ADDRESS_TOUCH_MS) {
        await recordAddress(user.id, before.username, ip, null, now);
      }
    }
  }

  await prisma.profile.update({
    where: { id: user.id },
    data: { lastSeenAt: now, livePath: path, ...location },
  });
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