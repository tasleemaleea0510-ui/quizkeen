/**
 * Daily quests.
 *
 * Three small, achievable goals a day, the same three for everybody (that is
 * what makes it a shared ritual rather than a personal chore), chosen from a
 * pool by the date. Everything here is pure so both the server and the browser
 * can agree on which quests "today" has without a round trip.
 *
 * A quest only ever measures something the app already records — a finished
 * match, an opened pack, a study session, a homework, a page visited. Nothing is
 * tracked separately, and the reward is claimed on the server, which re-reads
 * the progress and refuses a claim that the data does not support.
 */

export type QuestMetric = "match" | "pack" | "study" | "homework" | "explore" | "collect";

export type Quest = {
  id: string;
  title: string;
  hint: string;
  metric: QuestMetric;
  target: number;
  xp: number;
  coins: number;
  /** An emoji, because these are the playful part of the app. */
  emoji: string;
};

/**
 * The pool. Targets are small on purpose: a quest that takes an evening is a
 * chore, and a chore is the fastest way to make a student stop opening the app.
 *
 * Two quests from each family are kept so the daily pick never lands on three
 * "open a pack" cards, which would feel like a shop rather than a school.
 */
export const QUEST_POOL: Quest[] = [
  { id: "match1", title: "Spela en match", hint: "Gå med i ett live-spel med PIN-kod", metric: "match", target: 1, xp: 40, coins: 15, emoji: "🎮" },
  { id: "pack1", title: "Öppna ett paket", hint: "Det dagliga gratispaketet räknas", metric: "pack", target: 1, xp: 25, coins: 10, emoji: "✨" },
  { id: "study1", title: "Plugga ett set", hint: "Ett helt varv gloskort räcker", metric: "study", target: 1, xp: 35, coins: 12, emoji: "📚" },
  { id: "explore1", title: "Kika in Framsteg", hint: "Se hur det går — och vad som är nästa mål", metric: "explore", target: 1, xp: 15, coins: 5, emoji: "📈" },
  { id: "homework1", title: "Läs en läxa", hint: "Lämna in en läxa i klassrummet", metric: "homework", target: 1, xp: 50, coins: 20, emoji: "📝" },
  { id: "collect1", title: "Hitta en ny Keen", hint: "En karaktär du inte hade förut", metric: "collect", target: 1, xp: 30, coins: 10, emoji: "🃏" },
];

/** YYYY-MM-DD in Swedish local time, the key a quest day is stored under. */
export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * The three quests for a given day.
 *
 * A tiny seeded shuffle: the date string hashed to a number picks the start,
 * then a stride that shares no factor with the pool size walks the list. Same
 * day, same quests, every reader; different day, different cards.
 */
export function questsForDay(day = dayKey()): Quest[] {
  const pool = QUEST_POOL;
  let seed = 0;
  for (const ch of day) seed = (seed * 31 + ch.charCodeAt(0)) % 100_000;

  const picked: Quest[] = [];
  const used = new Set<number>();
  // 4 and the pool size (6) share a factor, so a stride of 4 would fall into a
  // short cycle; 5 walks all six positions. Both are coprime with 6, which is
  // what keeps the three picks distinct.
  const stride = pool.length % 2 === 0 ? 5 : 2;
  let cursor = seed % pool.length;
  while (picked.length < Math.min(3, pool.length)) {
    if (!used.has(cursor)) {
      used.add(cursor);
      picked.push(pool[cursor]);
    }
    cursor = (cursor + stride) % pool.length;
  }
  return picked;
}

/** The marker written to the activity log when a quest is claimed. */
export function questClaimKey(day: string, questId: string): string {
  return `QUEST:${day}:${questId}`;
}

/** "2/3" is easier to scan than a percentage in a quest card. */
export function progressLabel(done: number, target: number): string {
  return `${Math.min(done, target)}/${target}`;
}

/** How far along, 0–1, clamped — a claim can overshoot the target. */
export function progressRatio(done: number, target: number): number {
  if (target <= 0) return 1;
  return Math.max(0, Math.min(1, done / target));
}
