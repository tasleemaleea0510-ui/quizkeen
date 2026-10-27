/**
 * Levels, mirrored for the console.
 *
 * This is the same curve as the student app (`quizkeen/src/lib/levels.ts`):
 * 100 XP a level, level 1 starts at 0 XP. It is duplicated rather than imported
 * because the console is its own app with its own build, and a wrong copy here
 * is exactly the bug that made a reset look like it did nothing:
 *
 *   `resetXP` wrote `xp = 0` and left `level` alone, so the user list still read
 *   "Lv 27" next to 0 XP and the owner pressed the button again. Every write in
 *   `actions.ts` now moves XP *and* level together, and the list derives the
 *   level from XP when it reads, so an old bad row cannot survive a reload.
 */

export const XP_PER_LEVEL = 100;
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 999;

/** The level a given amount of XP buys. */
export function levelFor(xp: number): number {
  const clean = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  return Math.floor(clean / XP_PER_LEVEL) + 1;
}

/** The XP total a level starts at. Inverse of `levelFor`. */
export function xpForLevel(level: number): number {
  return (clampLevel(level) - 1) * XP_PER_LEVEL;
}

export function clampLevel(level: number): number {
  const n = Math.floor(Number(level));
  if (!Number.isFinite(n)) return MIN_LEVEL;
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, n));
}
