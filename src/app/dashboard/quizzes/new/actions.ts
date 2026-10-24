"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/viewer";
import { draftProblem, type Draft, type CreateQuizResult } from "@/lib/quiz-draft";

const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");

/**
 * Saving a quiz.
 *
 * The browser sends only what it drafted — never who it is. The creator comes
 * from the session, and every rule the builder shows is checked again here,
 * because a server action is a public endpoint and the form is only a hint.
 */
export async function createQuiz(draft: Draft): Promise<CreateQuizResult> {
  const { user, profile } = await getViewer();
  if (!user) return { ok: false, error: "Du är inte inloggad längre. Logga in och försök igen." };
  if (!profile) return { ok: false, error: "Ditt konto saknar en profil. Registrera dig först." };

  const problem = draftProblem(draft);
  if (problem) return { ok: false, error: problem };

  try {
    const quiz = await prisma.quiz.create({
      data: {
        creatorId: user.id,
        title: clean(draft.title),
        questions: {
          create: draft.questions.map((q) => ({
            text: clean(q.text),
            answers: {
              create: q.options.map((o) => ({
                text: clean(o.text),
                // Several answers may be correct: the player then has to pick
                // all of them, and the game scores an exact match.
                isCorrect: !!o.correct,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });

    revalidatePath("/dashboard/quizzes");
    revalidatePath("/dashboard");
    return { ok: true, id: quiz.id };
  } catch (err) {
    console.error("[quiz] create failed", err);
    return { ok: false, error: "Quizzen kunde inte sparas just nu. Försök igen om en stund." };
  }
}
