import { prisma } from "@/lib/prisma";

/**
 * The site-wide announcement, as the rest of the app sees it.
 *
 * `until` is an ISO timestamp when the notice stops by itself, or null when it
 * stays until somebody stops it. The expiry is enforced here, on the read side,
 * rather than by a cron job: a notice whose time has passed simply is not a
 * notice any more, no matter who asks or how long they left the tab open.
 */
export type LiveBroadcast = { text: string; until: string | null };

export function isBroadcastLive(text: string | null | undefined, until: Date | null | undefined, now = Date.now()): boolean {
  if (!text || !text.trim()) return false;
  return !until || until.getTime() > now;
}

/**
 * One query, no auth. Deliberately independent of Supabase: the banner has to
 * show up for visitors who are signed out (and for everyone if auth is having a
 * bad day), so nothing in this path may depend on a session.
 */
export async function readBroadcast(): Promise<LiveBroadcast | null> {
  try {
    const s = await prisma.adminSettings.findUnique({
      where: { id: 1 },
      select: { broadcast: true, broadcastUntil: true },
    });
    if (!s || !isBroadcastLive(s.broadcast, s.broadcastUntil)) return null;
    return {
      text: s.broadcast!.trim(),
      until: s.broadcastUntil ? s.broadcastUntil.toISOString() : null,
    };
  } catch {
    // A database hiccup must not take the page down with it. No notice, no crash.
    return null;
  }
}
