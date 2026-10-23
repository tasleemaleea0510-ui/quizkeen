/**
 * The spike layout in the lobby race.
 *
 * One course per lobby, identical on every screen. That used to be done with a
 * seeded random stream, but a stream has memory: the moment one player hit a
 * spike and their course was rebuilt, the stream had advanced differently from
 * everybody else's, and the two players were running through different maps —
 * spikes on one screen standing where the other had clear ground. Here the
 * position of spike `i` depends on nothing but the lobby's seed and `i`, so
 * rebuilding, joining late or resetting after a crash cannot move a spike.
 *
 * The seed is the game PIN, which every player already has and which the server
 * picks at random for each game — so the course is random per lobby, and shared.
 */

/** Where the first spike sits. */
export const OBSTACLE_START_X = 600;
/** Smallest gap from one spike to the next; wide enough to land a jump. */
const BASE_GAP = 440;
/** Extra distance, 0–239 px, so the course does not look ruled. */
const JITTER = 240;
/** The second spike of a pair sits this far behind the first. */
export const DOUBLE_OFFSET = 46;
/** How far ahead of the runner spikes are created. */
export const SPAWN_AHEAD = 1200;
/** The goal area stays clear. */
export const CLEAR_BEFORE_GOAL = 400;

/** FNV-1a over the PIN: one 32-bit seed everybody computes the same way. */
export function seedFromPin(pin: string): number {
  let h = 0x811c9dc5;
  const text = String(pin ?? "");
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A well-mixed 32-bit number from (seed, index, salt). */
function mix(seed: number, index: number, salt: number): number {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Where spike number `index` stands. Strictly increasing: the jitter of one
 * spike is smaller than the base gap, so spike N+1 is always at least 201 px
 * further along than spike N.
 */
export function obstacleX(seed: number, index: number): number {
  return OBSTACLE_START_X + index * BASE_GAP + (mix(seed, index, 1) % JITTER);
}

/** Roughly three spikes in ten are a pair, making a wider thing to jump. */
export function isDoubleSpike(seed: number, index: number): boolean {
  return mix(seed, index, 2) % 10 < 3;
}
