import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CopyButton from "@/components/copy-button";
import {
  GraduationCap,
  School,
  Users,
  BookOpen,
  AlertTriangle,
  Plus,
  Play,
  Gamepad2,
  Award,
  Zap,
  Coins,
  Trophy,
  Layers,
  Swords,
  BarChart3,
  Lock,
} from "lucide-react";

function roleTheme(role: string) {
  if (role === "OWNER") return { cls: "text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.9)]", badge: "ÄGARE", label: "ÄGARE" };
  if (role === "ADMIN") return { cls: "text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.7)]", badge: "ADMIN", label: "ADMIN" };
  if (role === "SECURITY") return { cls: "text-sky-300 drop-shadow-[0_0_5px_rgba(125,211,252,0.7)]", badge: "SÄKERHET", label: "SÄKERHET" };
  if (role === "TEACHER") return { cls: "text-blue-400", badge: "LÄRARE", label: "LÄRARE" };
  return { cls: "text-slate-300", badge: "ELEV", label: "ELEV" };
}

function rowTheme(i: number, role: string) {
  if (role === "OWNER" || role === "ADMIN" || role === "SECURITY" || role === "TEACHER") return roleTheme(role);
  if (i === 0) return { cls: "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]", badge: "1:a", label: "" };
  if (i === 1) return { cls: "text-purple-400", badge: "2:a", label: "" };
  if (i === 2) return { cls: "text-amber-500", badge: "3:e", label: "" };
  return roleTheme("STUDENT");
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${tone}`} />
      </CardHeader>
      <CardContent className={`font-display text-3xl font-extrabold ${tone}`}>{value}</CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const { user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (!profile) redirect("/register");

  const me = roleTheme(profile.role);

  // both queries are independent, so they go out together instead of in series
  const [quizzes, topPlayers] = await Promise.all([
    prisma.quiz.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.profile.findMany({
      // "Skugga" in the owner console: the account plays normally but is left
      // out of the top list, and the next player takes its place.
      where: { shadowed: false },
      orderBy: { xp: "desc" },
      take: 5,
      select: { username: true, xp: true, level: true, role: true },
    }),
  ]);

  const Leaderboard = () => (
    <Card className="border-white/5">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <span>Topplista</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {topPlayers.map((p, i) => {
          const t = rowTheme(i, p.role);
          return (
            <div key={p.username} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className={`w-6 text-center font-mono text-sm font-bold ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-500"}`}>
                  {i + 1}
                </span>
                <span className={`font-semibold ${t.cls}`}>{p.username}</span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">{t.badge}</span>
              </div>
              <span className="font-mono text-xs text-slate-400">Lv {p.level} • {p.xp} XP</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

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
        <div className="rounded-3xl border border-blue-500/25 bg-blue-500/[0.06] p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/20 text-blue-400">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-extrabold text-white">Lärarpanel — {profile.username}</h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-400">
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <span>Klassrumsöversikt och administrativ kontroll.</span>
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href="/classroom">
              <Button className="gap-1.5">
                <School className="h-4 w-4" />
                <span>Klassrum</span>
              </Button>
            </Link>
            <Link href="/classroom/analytics">
              <Button variant="secondary" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                <span>Analys</span>
              </Button>
            </Link>
            <Link href="/dashboard/quizzes/new">
              <Button variant="outline" className="gap-1.5">
                <Plus className="h-4 w-4 text-blue-400" />
                <span>Ny quiz</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-4">
          <StatCard label="Klassrum" value={rooms.length} icon={School} tone="text-blue-400" />
          <StatCard label="Elever" value={students} icon={Users} tone="text-indigo-400" />
          <StatCard label="Läxor" value={laxor} icon={BookOpen} tone="text-violet-400" />
          <StatCard label="Varningar" value={varningar} icon={AlertTriangle} tone="text-amber-400" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="border-white/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5 text-blue-400" />
                <span>Dina klassrum</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rooms.length === 0 && <p className="text-sm text-slate-400">Inga klassrum än — skapa ditt första för att bjuda in elever.</p>}
              {rooms.map((r) => (
                <div key={r.id} className="card-hover rounded-xl border border-white/5 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white">{r.name}</p>
                    <span className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {r.enrollments.length}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {r.assignments.length}</span>
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Join-kod:</span>
                    <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-mono font-bold tracking-widest text-blue-300">
                      {r.joinCode}
                    </span>
                    <CopyButton text={r.joinCode} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-indigo-400" />
                <span>Dina quizar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quizzes.length === 0 && <p className="text-sm text-slate-400">Inga quizar än — skapa din första!</p>}
              {quizzes.map((q) => (
                <div key={q.id} className="card-hover flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 p-3">
                  <span className="font-medium text-white">{q.title}</span>
                  <Link href={`/host/${q.id}`}>
                    <Button size="sm" className="gap-1.5">
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Starta</span>
                    </Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Leaderboard />
          </div>
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
    profile.role === "OWNER" ? "ÄGARE — Portalansvarig" :
    profile.role === "ADMIN" ? "ADMIN — Systemoperatör" :
    profile.role === "SECURITY" ? "SÄKERHET — Kontotillsyn" :
    `Nivå ${profile.level} • Elev`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white">
            Hej, <span className={me.cls}>{profile.username}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/play">
            <Button size="lg" className="gap-2">
              <Gamepad2 className="h-4 w-4" />
              <span>Gå med i ett spel</span>
            </Button>
          </Link>
          <Link href="/dashboard/quizzes/new">
            <Button variant="secondary" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Ny quiz</span>
            </Button>
          </Link>
          <Link href="/dashboard/quizzes">
            <Button variant="outline">Mina quizar</Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <StatCard label="Nivå" value={profile.level} icon={Award} tone="text-indigo-400" />
        <StatCard label="Erfarenhet (XP)" value={profile.xp} icon={Zap} tone="text-emerald-400" />
        <StatCard label="Mynt" value={profile.coins} icon={Coins} tone="text-amber-400" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-indigo-400" />
              <span>Dina quizar</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quizzes.length === 0 && (
              <p className="text-sm text-slate-400">Inga quizar än — skapa din första för att utmana vänner!</p>
            )}
            {quizzes.map((q) => (
              <div key={q.id} className="card-hover flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 p-3">
                <span className="font-medium text-white">{q.title}</span>
                <Link href={`/host/${q.id}`}>
                  <Button size="sm" className="gap-1.5">
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Starta</span>
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Leaderboard />

        <Card className="border-white/5 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              <span>Dina gloskort</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {collections.length === 0 && (
              <p className="text-sm text-slate-400">Inga gloskort än — skapa din första uppsättning för att träna!</p>
            )}
            {collections.map((c) => (
              <div key={c.id} className="card-hover flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-medium text-white">{c.title}</span>
                  <span className="rounded-full border border-indigo-500/20 bg-indigo-600/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                    {c._count.flashcards} kort
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/flashcards/${c.id}`}>
                    <Button size="sm" className="gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Plugga</span>
                    </Button>
                  </Link>
                  <Link href={`/host/deck/${c.id}`}>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Swords className="h-3.5 w-3.5 text-slate-400" />
                      <span>Strid</span>
                    </Button>
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
