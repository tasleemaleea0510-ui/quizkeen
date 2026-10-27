import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/viewer";
import StudyRun from "@/components/study-run";

/**
 * One quiz, run solo.
 *
 * The questions are shaped exactly the way the host shapes them — every right
 * answer is kept, not just the first — because a quiz can ask for several and
 * Study should mark it the same way the match would.
 */
export default async function StudyQuizPage({ params }: { params: { id: string } }) {
  const { user } = await getViewer();
  if (!user) redirect("/login");

  const quiz = await prisma.quiz
    .findUnique({
      where: { id: params.id },
      include: { questions: { include: { answers: true } } },
    })
    .catch(() => null);

  if (!quiz) redirect("/study");
  // A private quiz belongs to its author, so nobody else gets to walk it here.
  if (quiz.isPrivate && quiz.creatorId !== user.id) redirect("/study");

  const questions = quiz.questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.answers.map((a) => a.text),
    correctIndexes: q.answers.reduce<number[]>((acc, a, i) => {
      if (a.isCorrect) acc.push(i);
      return acc;
    }, []),
  }));

  return <StudyRun title={quiz.title} questions={questions} />;
}
