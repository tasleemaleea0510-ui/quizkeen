"use server";
import { prisma } from "@/lib/prisma";

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
      const correctIndex = q.answers.findIndex((a) => a.isCorrect);
      return { id: q.id, text: q.text, options, correctIndex };
    }),
  };
}

export async function awardXP(winners: { username: string; xp: number; coins: number }[]) {
  for (const w of winners) {
    try {
      const p = await prisma.profile.findUnique({ where: { username: w.username } });
      if (!p) continue;
      const xp = p.xp + w.xp;
      const level = Math.floor(xp / 100) + 1;
      await prisma.profile.update({
        where: { username: w.username },
        data: { xp, coins: p.coins + w.coins, level },
      });
    } catch {}
  }
}