import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/viewer";
import KeenAvatar from "@/components/keens/keen-avatar";
import { WornBuddy } from "@/components/keens/worn-keen";
import DeckDueBadge from "@/components/deck-due-badge";
import PageHeader, { HeaderStat } from "@/components/page-header";
import Spotlight from "@/components/motion/spotlight";
import { Badge } from "@/components/ui/badge";
import { KEEN_BY_ID } from "@/lib/keens";
import { ArrowRight, BookOpen, Layers, Sparkles, Brain, RotateCw, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Study — the solo mode.
 *
 * Everything else in the app is a room full of people. This page is the quiet
 * one: the quizzes and decks you can practise on your own, with no PIN, no
 * lobby and nothing to lose. What it gained this pass is a *reason to come
 * back*: the decks show how many cards are due, and both kinds of run pay XP
 * when they are finished.
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
        include: { flashcards: { select: { id: true } } },
        orderBy: { createdAt: "desc" },
        take: 24,
      })
      .catch(() => []),
  ]);

  const mascot = KEEN_BY_ID["crewmate"] ?? KEEN_BY_ID[Object.keys(KEEN_BY_ID)[0]];
  const totalCards = decks.reduce((sum, d) => sum + d.flashcards.length, 0);

  return (
    <div data-accent="violet" className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        accent="violet"
        eyebrow="Study"
        icon={BookOpen}
        title={
          <>
            Plugga i <span className="text-shine">ditt eget tempo</span>
          </>
        }
        lead="Ingen lobby, ingen timer och ingen som rånar dig. Välj ett quiz eller en kortlek, svara och se direkt vad som satt — och kör om det du missade. Passet ger XP när det är klart."
        chips={
          <>
            <HeaderStat icon={Sparkles} label="quizar" value={quizzes.length} tone="violet" />
            <HeaderStat icon={Layers} label="kortlekar" value={decks.length} tone="sky" />
            <HeaderStat icon={Brain} label="kort" value={totalCards} tone="emerald" />
          </>
        }
        actions={
          <Link
            href="/quests"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white hover:border-white/20"
          >
            <Trophy className="h-4 w-4 text-amber-300" /> Dagens uppdrag
          </Link>
        }
      >
        <WornBuddy label="Din Keen pluggar med dig" />
      </PageHeader>

      <section className="mt-8">
        <h2 className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-300" />
          <span className="section-title">Quiz ({quizzes.length})</span>
        </h2>
        <div className="stagger-list mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <Spotlight key={quiz.id} className="surface card-hover">
              <Link href={`/study/quiz/${quiz.id}`} className="group flex h-full flex-col justify-between p-5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold leading-snug text-white">{quiz.title}</h3>
                    {mascot && (
                      <KeenAvatar
                        keen={mascot}
                        size={40}
                        className="shrink-0 transition-transform group-hover:scale-105"
                      />
                    )}
                  </div>
                  {quiz.description && <p className="mt-2 line-clamp-2 text-xs text-slate-400">{quiz.description}</p>}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Badge tone="violet">{quiz._count.questions} frågor</Badge>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-300 group-hover:text-violet-200">
                    Plugga
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </Spotlight>
          ))}
          {quizzes.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-500">
              Inga quiz än.{" "}
              <Link href="/dashboard/quizzes/new" className="font-semibold text-violet-300 hover:text-violet-200">
                Bygg ett
              </Link>{" "}
              så dyker det upp här.
            </div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-sky-300" />
          <span className="section-title">Gloskort ({decks.length})</span>
        </h2>
        <div className="stagger-list mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Spotlight key={deck.id} className="surface card-hover">
              <Link href={`/flashcards/${deck.id}`} className="group flex h-full flex-col justify-between p-5">
                <div>
                  <h3 className="text-base font-bold leading-snug text-white">{deck.title}</h3>
                  {deck.description && <p className="mt-2 line-clamp-2 text-xs text-slate-400">{deck.description}</p>}
                  <div className="mt-3">
                    <DeckDueBadge collectionId={deck.id} cardIds={deck.flashcards.map((f) => f.id)} />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Badge tone="sky">{deck.flashcards.length} kort</Badge>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-300 group-hover:text-sky-200">
                    Vänd kort
                    <RotateCw className="h-3.5 w-3.5 transition-transform group-hover:rotate-45" />
                  </span>
                </div>
              </Link>
            </Spotlight>
          ))}
          {decks.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-500">
              Inga kortlekar än.{" "}
              <Link href="/flashcards" className="font-semibold text-sky-300 hover:text-sky-200">
                Skapa en
              </Link>{" "}
              och öva härifrån.
            </div>
          )}
        </div>
      </section>

      <p className="mt-10 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-slate-600">
        <Brain className="h-3.5 w-3.5" />
        Repetitionen planeras per enhet — åtta pass per dag ger XP, sedan räknas det imorgon igen.
      </p>
    </div>
  );
}
