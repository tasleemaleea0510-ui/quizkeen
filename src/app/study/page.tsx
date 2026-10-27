import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/viewer";
import KeenAvatar from "@/components/keens/keen-avatar";
import { WornBuddy } from "@/components/keens/worn-keen";
import { KEEN_BY_ID } from "@/lib/keens";
import { ArrowRight, BookOpen, Layers, Sparkles } from "lucide-react";

/**
 * Study — the solo mode.
 *
 * Everything else in the app is a room full of people. This page is the quiet
 * one: the quizzes and decks you can practise on your own, with no PIN, no
 * lobby and nothing to lose. It is deliberately the plainest page in the app —
 * a list of things to learn, not an arena.
 */
export default async function StudyPage() {
  const { user } = await getViewer();
  if (!user) redirect("/login");

  const enrollments = await prisma.enrollment
    .findMany({ where: { studentId: user.id }, select: { classroomId: true } })
    .catch(() => []);
  const classroomIds = enrollments.map((e) => e.classroomId);

  const [quizzes, decks] = await Promise.all([
    prisma.quiz
      .findMany({
        where: {
          OR: [
            { creatorId: user.id },
            ...(classroomIds.length ? [{ classroomId: { in: classroomIds } }] : []),
          ],
        },
        include: { _count: { select: { questions: true } } },
        orderBy: { updatedAt: "desc" },
        take: 24,
      })
      .catch(() => []),
    prisma.flashcardCollection
      .findMany({
        where: { creatorId: user.id },
        include: { _count: { select: { flashcards: true } } },
        orderBy: { createdAt: "desc" },
        take: 24,
      })
      .catch(() => []),
  ]);

  const mascot = KEEN_BY_ID["crewmate"] ?? KEEN_BY_ID[Object.keys(KEEN_BY_ID)[0]];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="text-center">
        <span className="eyebrow">
          <BookOpen className="h-3.5 w-3.5" />
          Study
        </span>
        <h1 className="page-title mt-3">
          Plugga i <span className="text-gradient">ditt eget tempo</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
          Ingen lobby, ingen timer och ingen som rånar dig. Välj ett quiz eller en kortlek, svara och se direkt vad
          som satt — och kör om det du missade.
        </p>
      </div>

      <div className="mt-6">
        <WornBuddy label="Din Keen pluggar med dig" />
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          Quiz ({quizzes.length})
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/study/quiz/${quiz.id}`}
              className="card-hover group flex animate-fade-up flex-col justify-between rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold leading-snug text-white">{quiz.title}</h3>
                  {mascot && <KeenAvatar keen={mascot} size={40} className="shrink-0 transition-transform group-hover:scale-105" />}
                </div>
                {quiz.description && <p className="mt-2 line-clamp-2 text-xs text-slate-400">{quiz.description}</p>}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full border border-indigo-500/20 bg-indigo-600/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                  {quiz._count.questions} frågor
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-300 group-hover:text-indigo-200">
                  Plugga
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
          {quizzes.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-500">
              Inga quiz än.{" "}
              <Link href="/dashboard/quizzes/new" className="font-semibold text-indigo-300 hover:text-indigo-200">
                Bygg ett
              </Link>{" "}
              så dyker det upp här.
            </div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Layers className="h-4 w-4 text-violet-400" />
          Gloskort ({decks.length})
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Link
              key={deck.id}
              href={`/flashcards/${deck.id}`}
              className="card-hover group flex animate-fade-up flex-col justify-between rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl"
            >
              <div>
                <h3 className="text-base font-bold leading-snug text-white">{deck.title}</h3>
                {deck.description && <p className="mt-2 line-clamp-2 text-xs text-slate-400">{deck.description}</p>}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full border border-violet-500/20 bg-violet-600/20 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
                  {deck._count.flashcards} kort
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-300 group-hover:text-violet-200">
                  Vänd kort
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
          {decks.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-500">
              Inga kortlekar än.{" "}
              <Link href="/flashcards" className="font-semibold text-violet-300 hover:text-violet-200">
                Skapa en
              </Link>{" "}
              och öva härifrån.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
