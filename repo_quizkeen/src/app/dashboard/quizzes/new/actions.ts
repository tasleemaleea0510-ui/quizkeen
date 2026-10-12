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
          answers: {
            create: q.options.map((text, i) => ({
              text,
              isCorrect: i === q.correct,
            })),
          },
        })),
      },
    },
  });
  return quiz.id;
}