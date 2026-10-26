/**
 * The four answer colours.
 *
 * Every screen that shows the A/B/C/D tiles — the player's buttons and the
 * host's board — paints them in this order, so red is always the first answer on
 * every phone and on the projector. Kept in one file because a tile that is
 * amber on the host and green on the phone is a bug the room can see.
 */
export const ANSWER_TINTS = [
  "from-rose-500 to-rose-600 shadow-rose-900/40",
  "from-sky-500 to-blue-600 shadow-blue-900/40",
  "from-amber-400 to-amber-600 shadow-amber-900/40",
  "from-emerald-500 to-emerald-600 shadow-emerald-900/40",
] as const;
