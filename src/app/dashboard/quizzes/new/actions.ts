"use server";
import { prisma } from "@/lib/prisma";

export async function createQuiz(
  creatorId: string,
  title: string,
  questions: { text: string; options: string[]; correct: number }[]
) {
  const quiz = await prisma.quiz.create({
    data: {
      creatorId,
      title,
      questions: {
        create: questions.map((q) => ({
          text: q.text,
          options: q.options,
          correctIndex: q.correct,
        })),
      },
    },
  });
  return quiz.id;
}