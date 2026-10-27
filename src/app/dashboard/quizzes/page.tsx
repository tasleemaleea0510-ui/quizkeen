import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import PageHeader, { HeaderStat } from "@/components/page-header";
import Spotlight from "@/components/motion/spotlight";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, ListChecks, BookOpen, Clock, Swords, Eye, EyeOff } from "lucide-react";

export const dynamic = "force-dynamic";

/** Mina quizar — the shelf of everything you have built. */
export default async function QuizzesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const quizzes = await prisma.quiz.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true, gameSessions: true } } },
  });

  const totalQuestions = quizzes.reduce((n, q) => n + q._count.questions, 0);
  const totalGames = quizzes.reduce((n, q) => n + q._count.gameSessions, 0);
  const ready = quizzes.filter((q) => q._count.questions > 0).length;

  return (
    <div data-accent="indigo" className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        accent="indigo"
        eyebrow="Mina quizar"
        icon={ListChecks}
        title={
          <>
            Allt du har <span className="text-shine">byggt</span>
          </>
        }
        lead="Starta en quiz när som helst — du får en PIN-kod att skriva på tavlan, och klassen är med på tio sekunder."
        chips={
          <>
            <HeaderStat icon={ListChecks} label="quizar" value={quizzes.length} />
            <HeaderStat icon={BookOpen} label="frågor" value={totalQuestions} tone="violet" />
            <HeaderStat icon={Swords} label="matcher" value={totalGames} tone="emerald" />
            <HeaderStat icon={Clock} label="redo att köra" value={ready} tone="amber" />
          </>
        }
        actions={
          <Link href="/dashboard/quizzes/new">
            <Button className="btn-shine gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Ny quiz</span>
            </Button>
          </Link>
        }
      />

      <div className="stagger-list mt-8 space-y-3">
        {quizzes.length === 0 && (
          <div className="surface flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-indigo-400/30 bg-indigo-500/15 text-indigo-300">
              <Plus className="h-5 w-5" />
            </span>
            <p className="text-sm text-slate-400">
              Du har inte skapat några quizar än. Första frågan tar en minut.
            </p>
            <Link href="/dashboard/quizzes/new">
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" />
                Bygg din första
              </Button>
            </Link>
          </div>
        )}

        {quizzes.map((q) => (
          <Spotlight key={q.id} className="surface card-hover">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                  {q.title}
                  {q.isPrivate ? (
                    <Badge tone="amber" icon={EyeOff}>
                      Privat
                    </Badge>
                  ) : (
                    <Badge tone="slate" icon={Eye}>
                      Öppen
                    </Badge>
                  )}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400" data-no-translate>
                  <span>{q._count.questions} frågor</span>
                  <span>{q._count.gameSessions} matcher</span>
                  <span>{q.createdAt.toLocaleDateString("sv-SE")}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href={`/study/quiz/${q.id}`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Plugga</span>
                  </Button>
                </Link>
                <Link href={`/host/${q.id}`}>
                  <Button size="sm" className="gap-1.5">
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Starta</span>
                  </Button>
                </Link>
              </div>
            </div>
          </Spotlight>
        ))}
      </div>
    </div>
  );
}
