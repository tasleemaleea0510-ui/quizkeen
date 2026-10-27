import { prisma } from "@/lib/prisma";
import { levelFor, levelProgress } from "@/lib/levels";

/**
 * The top list, computed in one place.
 *
 * What was wrong before, and why this file exists:
 *
 * - The dashboard read `level` off the row and printed it next to `xp`. When a
 *   staff grant or a reset moved XP without touching the level, the board said
 *   "Lv 27 • 0 XP" — which is exactly the "it shows wrong" that kept coming back.
 *   Here the level is **derived from XP** the moment the row is read, so the two
 *   numbers cannot disagree, whoever wrote them.
 * - Nobody was excluded but the owner's own "skugga" flag, and the ordering was
 *   `xp desc` alone, so equal totals came back in whatever order the database
 *   felt like. Now: XP, then level, then name — a stable board.
 * - The board was a server-rendered blob with no idea who was reading it. Every
 *   row now carries the rank, and the caller's own position comes back too, so a
 *   student can see themselves even when they are 41st.
 */

export type BoardScope = "alla" | "elever" | "klass";

export type BoardRow = {
  rank: number;
  username: string;
  role: string;
  xp: number;
  coins: number;
  /** Derived from `xp` on read, never read from the row. */
  level: number;
  /** 0–1 through the current level, for the bar under the name. */
  progress: number;
  xpToNext: number;
  /** True for the row that belongs to whoever is asking. */
  me: boolean;
};

const PLAYER_ROLES = ["STUDENT", "TEACHER"];

function shape(row: {
  username: string;
  role: string;
  xp: number;
  coins: number;
}, rank: number, viewerId: string | null, viewerName: string | null): BoardRow {
  const level = levelFor(row.xp);
  const progress = levelProgress(row.xp);
  return {
    rank,
    username: row.username,
    role: row.role,
    xp: row.xp,
    coins: row.coins,
    level,
    progress: progress.ratio,
    xpToNext: progress.toNext,
    me: Boolean(viewerId && viewerName && row.username === viewerName),
  };
}

export type Board = {
  scope: BoardScope;
  rows: BoardRow[];
  /** The caller's own row, even when it is outside `rows`. */
  meRow: BoardRow | null;
  total: number;
  /** School-wide totals, for the strip above the list. */
  stats: { players: number; xp: number; coins: number };
  /** Set when the scope is "klass" and the caller is in no class. */
  noClass?: boolean;
};

/**
 * Read the board.
 *
 * `limit` rows are returned, ranked by XP and then by name so the list is stable
 * between two reads of the same data — a board that shuffles rows on every poll
 * looks broken even when the numbers are right.
 */
export async function readBoard({
  scope = "alla",
  limit = 10,
  viewerId = null,
  viewerName = null,
}: {
  scope?: BoardScope;
  limit?: number;
  viewerId?: string | null;
  viewerName?: string | null;
}): Promise<Board> {
  const safeScope: BoardScope = scope === "elever" || scope === "klass" ? scope : "alla";

  let classroomId: string | null = null;
  if (safeScope === "klass" && viewerId) {
    const enrollment = await prisma.enrollment
      .findFirst({ where: { studentId: viewerId }, select: { classroomId: true } })
      .catch(() => null);
    classroomId = enrollment?.classroomId ?? null;
  }

  const where: any = { shadowed: false };
  if (safeScope === "elever") where.role = { in: PLAYER_ROLES };
  if (safeScope === "klass") {
    if (!classroomId) {
      return {
        scope: safeScope,
        rows: [],
        meRow: null,
        total: 0,
        stats: { players: 0, xp: 0, coins: 0 },
        noClass: true,
      };
    }
    where.enrollments = { some: { classroomId } };
  }

  const [rows, total, players] = await Promise.all([
    prisma.profile
      .findMany({
        where,
        // XP first, then name. Deliberately *not* the stored level: a level that
        // an older build left behind must not be able to reorder the board.
        orderBy: [{ xp: "desc" }, { username: "asc" }],
        take: Math.max(1, Math.min(100, limit)),
        select: { username: true, role: true, xp: true, coins: true },
      })
      .catch(() => []),
    prisma.profile.count({ where }).catch(() => 0),
    prisma.profile
      .aggregate({
        where,
        _count: { _all: true },
        _sum: { xp: true, coins: true },
      })
      .catch(() => null),
  ]);

  const board = rows.map((row, i) => shape(row, i + 1, viewerId, viewerName));

  // The caller's row, looked up separately: it is usually not in the top `limit`
  // and it is the one row a student actually scrolls to find.
  let meRow: BoardRow | null = board.find((r) => r.me) ?? null;
  if (!meRow && viewerId) {
    const mine = await prisma.profile
      .findUnique({ where: { id: viewerId }, select: { username: true, role: true, xp: true, coins: true } })
      .catch(() => null);
    if (mine) {
      // "How many rows sort before me", using the same order as the list: XP,
      // then level, then name. Counting only `xp > mine` put two people with the
      // same total on the same rank and pushed everyone below them up one.
      const ahead = await prisma.profile
        .count({
          where: {
            ...where,
            AND: [
              {
                OR: [
                  { xp: { gt: mine.xp } },
                  { xp: mine.xp, username: { lt: mine.username } },
                ],
              },
            ],
          },
        })
        .catch(() => 0);
      meRow = shape(mine, ahead + 1, viewerId, viewerName ?? mine.username);
    }
  }

  return {
    scope: safeScope,
    rows: board,
    meRow,
    total,
    stats: {
      players: players?._count?._all ?? total,
      xp: players?._sum?.xp ?? 0,
      coins: players?._sum?.coins ?? 0,
    },
  };
}
