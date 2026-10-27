/**
 * Levels, in one place.
 *
 * `Profile.level` is stored, not only computed, because lists sort by it — but
 * it is always *derived*: every writer of XP goes through `levelFor`, so a row
 * can never claim a level its XP does not justify. The bug this file exists to
 * kill was exactly that: a staff grant or a reset moved XP and left the level
 * behind, so the console showed "Lv 27 • 0 XP" and the leaderboard looked
 * broken.
 *
 * The curve is deliberately flat — 100 XP a level — and it is public API now:
 * the progress bar, the level-up animation and the console's "sätt nivå" all
 * read it from here rather than repeating the arithmetic.
 */

export const XP_PER_LEVEL = 100;

/** The level a given amount of XP buys. Level 1 starts at 0 XP. */
export function levelFor(xp: number): number {
  const clean = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  return Math.floor(clean / XP_PER_LEVEL) + 1;
}

/** The lowest level a number can mean. */
export const MIN_LEVEL = 1;
/** The ceiling the console's "sätt nivå" clamps to. */
export const MAX_LEVEL = 999;

/** Clamp anything into the legal level range. */
export function clampLevel(level: number): number {
  const n = Math.floor(Number(level));
  if (!Number.isFinite(n)) return MIN_LEVEL;
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, n));
}

/** The XP total that a level starts at. Inverse of `levelFor`. */
export function xpForLevel(level: number): number {
  return (clampLevel(level) - 1) * XP_PER_LEVEL;
}

export type LevelProgress = {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level needs in total. */
  span: number;
  /** 0–1, for a bar or a ring. */
  ratio: number;
  /** XP still missing before the next level. */
  toNext: number;
  /** The XP total the next level starts at. */
  nextAt: number;
};

/** Everything a progress bar needs, so no page has to do the arithmetic. */
export function levelProgress(xp: number): LevelProgress {
  const clean = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  const level = levelFor(clean);
  const base = xpForLevel(level);
  const into = clean - base;
  const toNext = XP_PER_LEVEL - into;
  return {
    level,
    into,
    span: XP_PER_LEVEL,
    ratio: Math.max(0, Math.min(1, into / XP_PER_LEVEL)),
    toNext,
    nextAt: clean + toNext,
  };
}

/**
 * A rank, not a job title.
 *
 * Levels beyond 20 keep climbing but stop collecting names, so a veteran reads
 * as "Legendar" instead of a new title nobody has heard of.
 */
const TITLES: { at: number; title: string }[] = [
  { at: 1, title: "Nybörjare" },
  { at: 3, title: "Upptäckare" },
  { at: 5, title: "Lärling" },
  { at: 8, title: "Kännare" },
  { at: 12, title: "Vetgirig" },
  { at: 16, title: "Mästare" },
  { at: 20, title: "Legendar" },
];

export function levelTitle(level: number): string {
  const lv = clampLevel(level);
  let title = TITLES[0].title;
  for (const t of TITLES) if (lv >= t.at) title = t.title;
  return title;
}

/** The next title and the level it arrives at, or null at the top. */
export function nextTitle(level: number): { title: string; at: number } | null {
  const lv = clampLevel(level);
  for (const t of TITLES) if (t.at > lv) return { title: t.title, at: t.at };
  return null;
}

/** "Nivå 7", with the title when there is one worth showing. */
export function levelLabel(level: number): string {
  return `Nivå ${clampLevel(level)} · ${levelTitle(level)}`;
}
