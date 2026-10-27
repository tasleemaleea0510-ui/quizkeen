import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { grantXp } from "@/lib/xp";
import { isStaffRole } from "@/lib/moderation";

/**
 * Paying out a finished game — and only the person running it.
 *
 * Both game modes used to import a server action that took a list of
 * `{ username, xp, coins }` and wrote it with no questions asked: no session, no
 * ownership, no bounds. A server action is a public endpoint, so anyone could
 * POST their own name with a million XP and own the leaderboard — which is the
 * honest explanation for a top list that "shows wrong".
 *
 * What this does instead:
 *
 *   - the caller must be signed in;
 *   - the caller must own the quiz or the deck being played (staff may host any
 *     of them, which is how a teacher runs someone else's quiz);
 *   - each payout is clamped to what a real game can produce;
 *   - the wallet is written through `grantXp`, so XP, coins and level move
 *     together and the board can never show a level the XP does not justify.
 *
 * Winners are matched by username, which is what the host screen knows: it only
 * ever has display names, and it resolves them through the account each seat
 * claimed when joining the lobby.
 */

/** The most a single game can pay one player. Well above a long quiz. */
export const MAX_GAME_XP = 5_000;
/** …and the most coins, which come from placement rather than answers. */
export const MAX_GAME_COINS = 500;
/** A lobby bigger than this is not a classroom. */
const MAX_WINNERS = 100;

export type GameWinner = { username: string; xp: number; coins: number };

export type AwardResult = { ok: boolean; awarded: number; reason?: "auth" | "not-owner" | "not-found" };

function clamp(value: unknown, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(max, n);
}

export async function awardGameXp(
  game: { quizId: string } | { deckId: string },
  winners: GameWinner[]
): Promise<AwardResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, awarded: 0, reason: "auth" };

    const [me, quiz, deck] = await Promise.all([
      prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } }),
      "quizId" in game
        ? prisma.quiz.findUnique({ where: { id: game.quizId }, select: { creatorId: true } })
        : Promise.resolve(null),
      "deckId" in game
        ? prisma.flashcardCollection.findUnique({ where: { id: game.deckId }, select: { creatorId: true } })
        : Promise.resolve(null),
    ]);

    const ownerId = ("quizId" in game ? quiz?.creatorId : deck?.creatorId) ?? null;
    if (!ownerId) return { ok: false, awarded: 0, reason: "not-found" };
    if (ownerId !== user.id && !isStaffRole(me?.role)) {
      return { ok: false, awarded: 0, reason: "not-owner" };
    }

    if (!Array.isArray(winners) || !winners.length) return { ok: true, awarded: 0 };

    // One lookup for the whole lobby instead of one per player.
    const names = Array.from(
      new Set(
        winners
          .slice(0, MAX_WINNERS)
          .map((w) => (typeof w?.username === "string" ? w.username.trim() : ""))
          .filter(Boolean)
      )
    );
    if (!names.length) return { ok: true, awarded: 0 };

    const profiles = await prisma.profile.findMany({
      where: { username: { in: names } },
      select: { id: true, username: true },
    });
    const byName = new Map(profiles.map((p) => [p.username, p.id] as const));

    let awarded = 0;
    for (const winner of winners.slice(0, MAX_WINNERS)) {
      const id = byName.get(typeof winner?.username === "string" ? winner.username.trim() : "");
      if (!id) continue;
      const xp = clamp(winner?.xp, MAX_GAME_XP);
      const coins = clamp(winner?.coins, MAX_GAME_COINS);
      if (!xp && !coins) continue;
      const wallet = await grantXp(id, xp, coins);
      if (wallet) awarded++;
    }

    return { ok: true, awarded };
  } catch {
    return { ok: false, awarded: 0 };
  }
}
