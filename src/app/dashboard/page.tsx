import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CopyButton from "@/components/copy-button";

function roleTheme(role: string) {
  if (role === "OWNER") return { cls: "text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.9)]", badge: "👑", label: "ÄGARE" };
  if (role === "ADMIN") return { cls: "text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.7)]", badge: "🛡️", label: "ADMIN" };
  if (role === "SECURITY") return { cls: "text-sky-300 drop-shadow-[0_0_5px_rgba(125,211,252,0.7)]", badge: "🕵️", label: "SÄKERHET" };
  if (role === "TEACHER") return { cls: "text-blue-500", badge: "🍎", label: "LÄRARE" };
  return { cls: "text-slate-300", badge: "🎒", label: "ELEV" };
}

function rowTheme(i: number, role: string) {
  if (role === "OWNER" || role === "ADMIN" || role === "SECURITY" || role === "TEACHER") return roleTheme(role);
  if (i === 0) return { cls: "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]", badge: "🌟", label: "" };
  if (i === 1) return { cls: "text-purple-400", badge: "", label: "" };
  if (i === 2) return { cls: "text-yellow-600", badge: "", label: "" };
  return roleTheme("STUDENT");
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile) redirect("/register");

  const me = roleTheme(profile.role);

  const quizzes = await prisma.quiz.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const topPlayers = await prisma.profile.findMany({
    orderBy: { xp: "desc" },
    take: 5,
    select: { username: true, xp: true, level: true, role: true },
  });

  if (profile.role === "TEACHER") {
    const rooms = await prisma.classroom.findMany({
      where: { OR: [{ ownerId: user.id }, { coTeacherId: user.id }] },
      include: {
        enrollments: { include: { student: true } },
        assignments: { include: { _count: { select: { completions: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    const students = rooms.reduce((a, r) => a + r.enrollments.length, 0);
    const laxor = rooms.reduce((a, r) => a + r.assignments.length, 0);
    const varningar = rooms.reduce((a, r) => a + r.enrollments.reduce((b, e) => b + e.student.warnings, 0), 0);

    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-blue-500/40 bg-blue-500/5 p-6">
          <h1 className="text-3xl font-extrabold text-blue-500">🍎 Lärarpanel — {profile.username}</h1>
          <p className="mt-1 text-sm text-slate-400">Ditt klassrum. Dina krafter. Elever ser ALDRIG det här. 🔒</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/classroom"><Button className="bg-blue-600 hover:bg-blue-500">🏫 Klassrum</Button></Link>
            <Link href="/classroom/analytics"><Button className="bg-blue-600 hover:bg-blue-500">📊 Analys</Button></Link>
            <Link href="/dashboard/quizzes/new"><Button variant="outline">➕ Ny quiz</Button></Link>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-4">
          <Card className="border-blue-500/30">
            <CardHeader><CardTitle>🏫 Klassrum</CardTitle></CardHeader>
            <CardContent className="text-4xl font-extrabold text-blue-400">{rooms.length}</CardContent>
          </Card>
          <Card className="border-blue-500/30">
            <CardHeader><CardTitle>👥 Elever</CardTitle></CardHeader>
            <CardContent className="text-4xl font-extrabold text-blue-400">{students}</CardContent>
          </Card>
          <Card className="border-blue-500/30">
            <CardHeader><CardTitle>📝 Läxor</CardTitle></CardHeader>
            <CardContent className="text-4xl font-extrabold text-blue-400">{laxor}</CardContent>
          </Card>
          <Card className="border-blue-500/30">
            <CardHeader><CardTitle>⚠️ Varningar</CardTitle></CardHeader>
            <CardContent className="text-4xl font-extrabold text-amber-400">{varningar}</CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="border-blue-500/30">
            <CardHeader><CardTitle>🏫 Dina klassrum</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {rooms.length === 0 && <p className="text-slate-400">Inga klassrum än — skapa ditt första! 🏫</p>}
              {rooms.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white">{r.name}</p>
                    <span className="text-xs text-slate-400">👥 {r.enrollments.length} · 📝 {r.assignments.length}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Join-kod:</span>
                    <span className="font-extrabold tracking-widest text-blue-300">{r.joinCode}</span>
                    <CopyButton text={r.joinCode} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>🎯 Dina quizar</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {quizzes.length === 0 && <p className="text-slate-400">Inga quizar än — skapa din första!</p>}
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

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>🏆 Toppspelare</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {topPlayers.map((p, i) => {
                const t = rowTheme(i, p.role);
                return (
                  <div key={p.username} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                    <span className={`font-extrabold ${t.cls}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {t.badge} {p.username}
                    </span>
                    <span className="text-slate-400">Lv {p.level} · {p.xp} XP</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const collections = await prisma.flashcardCollection.findMany({
    where: { creatorId: user.id },
    include: { _count: { select: { flashcards: true } } },
    orderBy: { createdAt: "desc" },
  });

  const subtitle =
    profile.role === "OWNER" ? "👑 ÄGARE — tronens väktare" :
    profile.role === "ADMIN" ? "🛡️ ADMIN — ordningens väktare" :
    profile.role === "SECURITY" ? "🕵️ SÄKERHET — alltid på vakt" :
    `Nivå ${profile.level}-elev`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">
            Hej, <span className={`${me.cls}`}>{me.badge} {profile.username}</span>!
          </h1>
          <p className="text-slate-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/play">
            <Button size="lg">🎮 Gå med i ett spel</Button>
          </Link>
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
            {topPlayers.map((p, i) => {
              const t = rowTheme(i, p.role);
              return (
                <div key={p.username} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                  <span className={`font-extrabold ${t.cls}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {t.badge} {p.username}
                  </span>
                  <span className="text-slate-400">Lv {p.level} · {p.xp} XP</span>
                </div>
              );
            })}
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