import { prisma } from "@/lib/prisma";
import { XP_PER_LEVEL, clampLevel, xpForLevel } from "@/lib/levels";

/**
 * The only place the app is allowed to move XP, coins or levels.
 *
 * Two rules, both learned the hard way:
 *
 * 1. **XP and level move together.** Doing it in two statements (or worse, only
 *    one of them) is how a profile ended up at "Lv 27 • 0 XP" after a reset, and
 *    how a staff grant of +500 XP left the level behind. The level is computed
 *    in the same SQL statement that changes the XP, so no reader can ever catch
 *    the row in between.
 * 2. **Clamped at the edge.** Values arrive from modals, so they are read as
 *    numbers, floored, and bounded before they reach the database. A `NaN` here
 *    used to become a Prisma validation error and, in the console, a generic
 *    "Något gick fel".
 *
 * `updateMany` can only set or increment a column, never derive one from
 * another, which is why these are parameterised statements rather than a
 * Prisma `update`.
 */

/** A single grant may not exceed this, however it was typed. */
export const MAX_XP_PER_GRANT = 100_000;
export const MAX_COINS_PER_GRANT = 100_000;

function clampInt(value: unknown, min = -MAX_XP_PER_GRANT, max = MAX_XP_PER_GRANT): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

export type Wallet = { xp: number; coins: number; level: number };

/**
 * Move XP and coins, and keep the level exact.
 *
 * Both deltas are applied in one statement, clamped at zero on the way out, so
 * a mass conversion can never leave somebody at level 9 with 0 XP.
 */
export async function grantXp(profileId: string, xp: number, coins = 0): Promise<Wallet | null> {
  const addXp = clampInt(xp, -MAX_XP_PER_GRANT, MAX_XP_PER_GRANT);
  const addCoins = clampInt(coins, -MAX_COINS_PER_GRANT, MAX_COINS_PER_GRANT);
  if (!addXp && !addCoins) return null;

  try {
    const rows = await prisma.$queryRaw<Wallet[]>`
      UPDATE "Profile"
         SET xp = GREATEST(0, xp + ${addXp}),
             coins = GREATEST(0, coins + ${addCoins}),
             level = (FLOOR(GREATEST(0, xp + ${addXp}) / ${XP_PER_LEVEL}) + 1)::int,
             "updatedAt" = NOW()
       WHERE id = ${profileId}
      RETURNING xp, coins, level`;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** The same movement for many profiles at once, for a staff "wave". */
export async function grantXpMany(profileIds: string[], xp: number, coins = 0): Promise<number> {
  const addXp = clampInt(xp);
  const addCoins = clampInt(coins);
  if (!profileIds.length || (!addXp && !addCoins)) return 0;
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE "Profile"
         SET xp = GREATEST(0, xp + ${addXp}),
             coins = GREATEST(0, coins + ${addCoins}),
             level = (FLOOR(GREATEST(0, xp + ${addXp}) / ${XP_PER_LEVEL}) + 1)::int,
             "updatedAt" = NOW()
       WHERE id = ANY(${profileIds}::text[])
      RETURNING id`;
    return rows.length;
  } catch {
    return 0;
  }
}

/** Put a profile on an exact level, with the XP that level implies. */
export async function setLevel(profileId: string, level: number): Promise<Wallet | null> {
  const clean = clampLevel(level);
  const xp = xpForLevel(clean);
  try {
    const rows = await prisma.$queryRaw<Wallet[]>`
      UPDATE "Profile"
         SET xp = ${xp}, level = ${clean}, "updatedAt" = NOW()
       WHERE id = ${profileId}
      RETURNING xp, coins, level`;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** An exact level for a whole group. */
export async function setLevelMany(profileIds: string[], level: number): Promise<number> {
  if (!profileIds.length) return 0;
  const clean = clampLevel(level);
  const xp = xpForLevel(clean);
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE "Profile"
         SET xp = ${xp}, level = ${clean}, "updatedAt" = NOW()
       WHERE id = ANY(${profileIds}::text[])
      RETURNING id`;
    return rows.length;
  } catch {
    return 0;
  }
}

export type WipeTarget = "XP" | "MYNT" | "NIVÅ" | "VARNINGAR" | "ALLT";

/**
 * A reset that actually resets.
 *
 * The old console resets cleared XP but left `level` — which is why a reset
 * "didn't work": the XP went to zero and the row still read Lv 27, so the list
 * looked untouched. Every branch here writes level whenever XP moves, and `NIVÅ`
 * puts an account back on level 1 with the XP that implies.
 */
export async function resetStats(profileId: string, what: WipeTarget): Promise<boolean> {
  try {
    if (what === "XP" || what === "NIVÅ") {
      await prisma.$executeRaw`
        UPDATE "Profile" SET xp = 0, level = 1, "updatedAt" = NOW() WHERE id = ${profileId}`;
    } else if (what === "MYNT") {
      await prisma.$executeRaw`
        UPDATE "Profile" SET coins = 0, "updatedAt" = NOW() WHERE id = ${profileId}`;
    } else if (what === "VARNINGAR") {
      await prisma.$executeRaw`
        UPDATE "Profile" SET warnings = 0, "updatedAt" = NOW() WHERE id = ${profileId}`;
    } else {
      await prisma.$executeRaw`
        UPDATE "Profile"
           SET xp = 0, coins = 0, warnings = 0, level = 1, "updatedAt" = NOW()
         WHERE id = ${profileId}`;
    }
    return true;
  } catch {
    return false;
  }
}

/** The same wipe for a whole group, in one statement. */
export async function resetStatsMany(profileIds: string[], what: WipeTarget): Promise<number> {
  if (!profileIds.length) return 0;
  try {
    if (what === "XP" || what === "NIVÅ") {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        UPDATE "Profile" SET xp = 0, level = 1, "updatedAt" = NOW()
         WHERE id = ANY(${profileIds}::text[]) RETURNING id`;
      return rows.length;
    }
    if (what === "MYNT") {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        UPDATE "Profile" SET coins = 0, "updatedAt" = NOW()
         WHERE id = ANY(${profileIds}::text[]) RETURNING id`;
      return rows.length;
    }
    if (what === "VARNINGAR") {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        UPDATE "Profile" SET warnings = 0, "updatedAt" = NOW()
         WHERE id = ANY(${profileIds}::text[]) RETURNING id`;
      return rows.length;
    }
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE "Profile" SET xp = 0, coins = 0, warnings = 0, level = 1, "updatedAt" = NOW()
       WHERE id = ANY(${profileIds}::text[]) RETURNING id`;
    return rows.length;
  } catch {
    return 0;
  }
}

/** Repairs every stored level that its XP does not justify. Returns rows fixed. */
export async function syncLevels(): Promise<number> {
  try {
    const result = await prisma.$executeRaw`
      UPDATE "Profile"
         SET level = (FLOOR(GREATEST(0, xp) / ${XP_PER_LEVEL}) + 1)::int, "updatedAt" = NOW()
       WHERE level <> (FLOOR(GREATEST(0, xp) / ${XP_PER_LEVEL}) + 1)::int`;
    return Number(result) || 0;
  } catch {
    return 0;
  }
}
