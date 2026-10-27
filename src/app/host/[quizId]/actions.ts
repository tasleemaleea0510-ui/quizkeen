"use server";
import { prisma } from "@/lib/prisma";
import { awardGameXp, type GameWinner } from "@/lib/game-xp";

export async function getQuiz(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { answers: true } } },
  });
  if (!quiz) return null;
  return {
    title: quiz.title,
    questions: quiz.questions.map((q) => {
      const options = q.answers.map((a) => a.text);
      // A question may have more than one right answer, so the whole set is
      // sent: the host scores an exact match and the game reveals all of them.
      const correctIndexes = q.answers.reduce<number[]>((acc, a, i) => {
        if (a.isCorrect) acc.push(i);
        return acc;
      }, []);
      return { id: q.id, text: q.text, options, correctIndexes };
    }),
  };
}

/**
 * Pay the players at the end of a game.
 *
 * The session check, the ownership check and the clamps all live in
 * `lib/game-xp`, because the flashcard battle needs exactly the same rules and
 * two copies would drift apart. Before this, the function wrote whatever list of
 * names and numbers it was handed — and a server action is a public endpoint, so
 * the leaderboard could be topped by anyone who knew its name.
 */
export async function awardXP(quizId: string, winners: GameWinner[]) {
  return awardGameXp({ quizId }, winners);
}