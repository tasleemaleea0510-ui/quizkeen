/**
 * The door list.
 *
 * An address the owner has blocked must be refused everywhere in QuizKeen, not
 * just on the account that misbehaved: the point of blocking an address is that
 * a new account from the same connection gets nowhere either. That check runs
 * on every request that renders the app, so the answers are cached in memory
 * for a few seconds — long enough that a page render costs no database round
 * trip, short enough that a block lands while the person is still on the site.
 *
 * The cache is per process. The console runs as a separate deployment, so a
 * change there reaches this one through the database within CACHE_MS.
 */
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/geo";

export type IpBlock = {
  ip: string;
  reason: string | null;
  until: Date | null;
};

/** How long a blocked list may be reused before the database is asked again. */
const CACHE_MS = 10_000;

let cache: { at: number; map: Map<string, IpBlock> } | null = null;

async function blockedList(): Promise<Map<string, IpBlock>> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.map;

  try {
    const rows = await prisma.blockedIp.findMany();
    const map = new Map<string, IpBlock>();
    for (const r of rows) {
      // A timed block that has run out is not a block. Enforced on read, so a
      // forgotten row can never outlive its sentence.
      if (r.until && r.until.getTime() <= now) continue;
      map.set(r.ip, { ip: r.ip, reason: r.reason, until: r.until });
    }
    cache = { at: now, map };
    return map;
  } catch {
    // A database hiccup must not lock everybody out of the site: fall back to
    // whatever was last known (empty on a cold start).
    return cache?.map ?? new Map();
  }
}

/** Is this one address blocked? Used by the ping and by the tests. */
export async function blockForIp(ip: string | null | undefined): Promise<IpBlock | null> {
  if (!ip) return null;
  return (await blockedList()).get(ip) ?? null;
}

/**
 * Is the caller of the current request blocked?
 *
 * Loopback and unknown addresses return null: a laptop is not an address a
 * block can meaningfully name, and `clientIp` already drops those.
 */
export async function blockedVisitor(h?: Headers): Promise<IpBlock | null> {
  let head: Headers;
  try {
    head = h ?? headers();
  } catch {
    return null;
  }
  return blockForIp(clientIp(head));
}

/** The Swedish sentence a blocked visitor reads, with the reason when there is one. */
export function blockReasonText(block: IpBlock): string {
  const reason = block.reason?.trim();
  if (reason) return reason;
  return "Den här uppkopplingen är blockerad från QuizKeen.";
}

/** "fram till 2026-10-23 09:00", or null for a block with no end. */
export function blockUntilText(block: IpBlock): string | null {
  if (!block.until) return null;
  return new Date(block.until).toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Forget the cached list — the app's own unblock path uses it in development. */
export function clearBlockCache() {
  cache = null;
}
