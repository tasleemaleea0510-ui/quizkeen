import { prisma } from "@/lib/prisma";
import { dayKey, type QuestMetric } from "@/lib/quests";

/**
 * How far along a student is with today's quests.
 *
 * Every number here comes from a table the app already writes for its own sake:
 * participants join a game, a pack records an open, a study run logs an
 * activity, homework records a completion, a page visit is written by the
 * presence ping, and a new Keen records when it was first found. No separate
 * quest tracking exists to drift out of sync — if the app forgot it, the quest
 * is simply not ticked, which is the failure a student can understand.
 */
export type QuestProgress = Record<QuestMetric, number>;

function startOfDay(day = dayKey()): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export async function readQuestProgress(
  profileId: string,
  username: string,
  day = dayKey()
): Promise<QuestProgress> {
  const since = startOfDay(day);
  const [matches, packs, study, homework, explored, collected] = await Promise.all([
    prisma.participant
      .count({ where: { studentId: profileId, joinedAt: { gte: since } } })
      .catch(() => 0),
    prisma.keenOpen
      .count({ where: { profileId, createdAt: { gte: since } } })
      .catch(() => 0),
    prisma.activity
      .count({ where: { username, action: { startsWith: "PLUGGADE" }, createdAt: { gte: since } } })
      .catch(() => 0),
    prisma.assignmentCompletion
      .count({ where: { studentId: profileId, completedAt: { gte: since } } })
      .catch(() => 0),
    prisma.pageVisit
      .count({ where: { username, path: { startsWith: "/progress" }, createdAt: { gte: since } } })
      .catch(() => 0),
    prisma.profileKeen
      .count({ where: { profileId, firstAt: { gte: since } } })
      .catch(() => 0),
  ]);

  return {
    match: matches,
    pack: packs,
    study,
    homework,
    explore: explored,
    collect: collected,
  };
}

/**
 * Consecutive days this account has done something.
 *
 * A day counts when the presence ping recorded a visit to a *page*, or when any
 * activity was logged. Two sources because they cover different sessions: the
 * ping catches browsing, the log catches a game finished from a page that was
 * already open. Walking back from today, the streak stops at the first gap —
 * which is the number a student actually recognises.
 */
export async function readStreak(username: string, days = 60): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const [visits, acts] = await Promise.all([
    prisma.pageVisit
      .findMany({ where: { username, createdAt: { gte: since } }, select: { createdAt: true } })
      .catch(() => [] as { createdAt: Date }[]),
    prisma.activity
      .findMany({ where: { username, createdAt: { gte: since } }, select: { createdAt: true } })
      .catch(() => [] as { createdAt: Date }[]),
  ]);

  const seen = new Set<string>();
  for (const row of [...visits, ...acts]) seen.add(dayKey(row.createdAt));

  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < days; i++) {
    const key = dayKey(cursor);
    if (seen.has(key)) {
      streak++;
    } else if (i > 0) {
      // Yesterday missing means the streak ends here. Today missing is not a
      // break yet — it is still the morning.
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Which of today's quests have already been paid out. */
export async function readClaimedQuestIds(username: string, day = dayKey()): Promise<string[]> {
  const rows = await prisma.activity
    .findMany({
      where: { username, action: { startsWith: `QUEST:${day}:` } },
      select: { action: true },
    })
    .catch(() => [] as { action: string }[]);
  return rows
    .map((r) => r.action.split(":")[2])
    .filter((value): value is string => Boolean(value));
}
