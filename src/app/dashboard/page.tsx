import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile) redirect("/register");

  const isTeacher = profile.role === "TEACHER";

  const quizzes = await prisma.quiz.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const collections = await prisma.flashcardCollection.findMany({
    where: { creatorId: user.id },
    include: { _count: { select: { flashcards: true } } },
    orderBy: { createdAt: "desc" },
  });

  const topPlayers = await prisma.profile.findMany({
    orderBy: { xp: "desc" },
    take: 5,
    select: { username: true, xp: true, level: true },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">
            Hej, {profile.username}! {isTeacher ? "🍎" : "🎒"}
          </h1>
          <p className="text-slate-400">
            {isTeacher ? "Lärarpanel" : `Nivå ${profile.level}-elev`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isTeacher && (
            <Link href="/play">
              <Button size="lg">🎮 Gå med i ett spel</Button>
            </Link>
          )}
          <Link href="/dashboard/quizzes/new">
            <Button>➕ Ny quiz</Button>
          </Link>
          <Link href="/dashboard/quizzes">
            <Button variant="outline">Mina quizar</Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>⭐ Nivå</CardTitle></CardHeader>
          <CardContent className="text-4xl font-extrabold text-indigo-400">{profile.level}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>✨ XP</CardTitle></CardHeader>
          <CardContent className="text-4xl font-extrabold text-emerald-400">{profile.xp}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>🪙 Mynt</CardTitle></CardHeader>
          <CardContent className="text-4xl font-extrabold text-amber-400">{profile.coins}</CardContent>
        </Card>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>🎯 Dina quizar</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {quizzes.length === 0 && (
              <p className="text-slate-400">Inga quizar än — skapa din första!</p>
            )}
            {quizzes.map((q) => (
              <div key={q.id} className="flex items-center justify-between rounded-lg border border-slate-800 p-3">
                <span className="font-semibold">{q.title}</span>
                <Link href={`/host/${q.id}`}>
                  <Button size="sm">▶ Starta</Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>🏆 Toppspelare</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topPlayers.map((p, i) => (
              <div key={p.username} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                <span>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {p.username}
                </span>
                <span className="text-slate-400">Lv {p.level} · {p.xp} XP</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>🃏 Dina gloskort</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {collections.length === 0 && (
              <p className="text-slate-400">Inga gloskort än — skapa dina första! 🃏</p>
            )}
            {collections.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-800 p-3">
                <span className="font-semibold">
                  {c.title}
                  <span className="ml-2 rounded-full bg-indigo-600/20 px-2 py-0.5 text-xs font-bold text-indigo-300">{c._count.flashcards} kort</span>
                </span>
                <div className="flex gap-2">
                  <Link href={`/flashcards/${c.id}`}>
                    <Button size="sm">🎴 Plugga</Button>
                  </Link>
                  <Link href={`/host/deck/${c.id}`}>
                    <Button size="sm" variant="outline">⚔️ Strid</Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}