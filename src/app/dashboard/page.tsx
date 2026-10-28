import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CopyButton from "@/components/copy-button";
import PageHeader, { ActionTile, HeaderStat } from "@/components/page-header";
import Leaderboard from "@/components/leaderboard";
import LevelRing from "@/components/motion/level-ring";
import Spotlight from "@/components/motion/spotlight";
import { readBoard } from "@/lib/leaderboard";
import { levelFor, levelProgress, levelTitle, nextTitle } from "@/lib/levels";
import { ROLE_THEME } from "@/lib/roles";
import { OBTAINABLE_KEEN_IDS, TOTAL_KEENS } from "@/lib/keens";
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
  Sparkles,
  ArrowRight,
  Flame,
  TrendingUp,
  Target,
  CalendarDays,
} from "lucide-react";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  icon: any;
  tone: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <Spotlight className="surface-flat card-hover h-full p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="stat-label">{label}</span>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <p className={`mt-2 font-display text-3xl font-extrabold ${tone} tabular`} data-no-translate>
        {typeof value === "number" ? value.toLocaleString("sv-SE") : value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Spotlight>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default async function DashboardPage() {
  const { user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (!profile) redirect("/register");

  const theme = ROLE_THEME[profile.role] ?? ROLE_THEME.STUDENT;
  const progress = levelProgress(profile.xp);
  // Derived from XP, never read off the row: after a staff reset the stored
  // level used to lag behind, which is the "it shows wrong" that kept coming
  // back on the board and on this card.
  const level = levelFor(profile.xp);
  const upcoming = nextTitle(level);

  // Everything below the session cookie in one round trip: the two lists the
  // page draws, the board (top five plus *my* row, which is the row a student
  // actually reads) and how many Keens this account has found.
  const [quizzes, board, keenCount] = await Promise.all([
    prisma.quiz.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    readBoard({ scope: "alla", limit: 5, viewerId: user.id, viewerName: profile.username }),
    prisma.profileKeen
      .count({ where: { profileId: user.id, keenId: { in: OBTAINABLE_KEEN_IDS } } })
      .catch(() => 0),
  ]);

  const subtitle =
    profile.role === "OWNER"
      ? "ÄGARE — Portalansvarig"
      : profile.role === "ADMIN"
        ? "ADMIN — Systemoperatör"
        : profile.role === "SECURITY"
          ? "SÄKERHET — Kontotillsyn"
          : `${levelTitle(level)} · Nivå ${level}`;

  // ── Lärare och personal ────────────────────────────────────────────────
  if (profile.role === "TEACHER" || profile.role === "OWNER" || profile.role === "ADMIN") {
    const rooms = await prisma.classroom
      .findMany({
        where: { OR: [{ ownerId: user.id }, { coTeacherId: user.id }] },
        include: {
          enrollments: { include: { student: true } },
          assignments: { include: { _count: { select: { completions: true } } } },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []);
    const students = rooms.reduce((a, r) => a + r.enrollments.length, 0);
    const laxor = rooms.reduce((a, r) => a + r.assignments.length, 0);
    const varningar = rooms.reduce(
      (a, r) => a + r.enrollments.reduce((b, e) => b + e.student.warnings, 0),
      0
    );
    const klara = rooms.reduce(
      (a, r) => a + r.assignments.reduce((b, x) => b + x._count.completions, 0),
      0
    );

    return (
      <div data-accent="sky" className="mx-auto max-w-6xl px-4 py-10">
        <PageHeader
          accent="sky"
          eyebrow="Lärarpanel"
          icon={GraduationCap}
          title={
            <>
              Klassrumsöversikt, <span className="text-shine" data-no-translate>{profile.username}</span>
            </>
          }
          lead="Allt du behöver för att driva en klass: rummen, läxorna, hur många som är klara och vilka som behöver en knuff."
          chips={
            <>
              <HeaderStat icon={School} label="klassrum" value={rooms.length} />
              <HeaderStat icon={Users} label="elever" value={students} tone="violet" />
              <HeaderStat icon={BookOpen} label="läxor" value={laxor} tone="sky" />
              <HeaderStat icon={AlertTriangle} label="varningar" value={varningar} tone="amber" />
              <HeaderStat icon={Target} label="inlämnade" value={klara} tone="emerald" />
            </>
          }
          actions={
            <>
              <Link href="/dashboard/quizzes/new">
                <Button className="gap-1.5">
                  <Plus className="h-4 w-4" /> Ny quiz
                </Button>
              </Link>
              <Link href="/classroom">
                <Button variant="secondary" className="gap-1.5">
                  <School className="h-4 w-4" /> Klassrum
                </Button>
              </Link>
              <Link href="/classroom/analytics">
                <Button variant="outline" className="gap-1.5">
                  <BarChart3 className="h-4 w-4" /> Analys
                </Button>
              </Link>
            </>
          }
        />

        <div className="mt-6 grid gap-5 lg:grid-cols-[300px_1fr]">
          <section className="surface p-5">
            <p className="stat-label">Din nivå</p>
            <LevelRing xp={profile.xp} size={104} className="mt-3" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="surface-flat p-3">
                <p className="stat-label">Mynt</p>
                <p className="stat-value text-amber-300 tabular" data-no-translate>
                  {profile.coins.toLocaleString("sv-SE")}
                </p>
              </div>
              <div className="surface-flat p-3">
                <p className="stat-label">Keens</p>
                <p className="stat-value text-violet-300 tabular" data-no-translate>
                  {keenCount}/{TOTAL_KEENS}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <ActionTile
                href="/quests"
                emoji="🔥"
                title="Dagens uppdrag"
                subtitle="Tre uppdrag — XP att hämta"
                accent="amber"
                right={<ArrowRight className="h-4 w-4" />}
              />
              <ActionTile
                href="/progress"
                emoji="📈"
                title="Framsteg"
                subtitle="Se hur klassen utvecklas"
                accent="emerald"
                right={<ArrowRight className="h-4 w-4" />}
              />
            </div>
          </section>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-white/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <School className="h-5 w-5 text-sky-400" />
                    <span>Dina klassrum</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rooms.length === 0 && (
                    <p className="text-sm text-slate-400">
                      Inga klassrum än — skapa ditt första för att bjuda in elever.
                    </p>
                  )}
                  <div className="stagger-list space-y-3">
                    {rooms.map((r) => (
                      <div key={r.id} className="surface-flat card-hover p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-bold text-white">{r.name}</p>
                          <span className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {r.enrollments.length}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" /> {r.assignments.length}
                            </span>
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-slate-500">Join-kod:</span>
                          <span className="rounded border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 font-mono font-bold tracking-widest text-sky-300">
                            {r.joinCode}
                          </span>
                          <CopyButton text={r.joinCode} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-indigo-400" />
                    <span>Dina quizar</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quizzes.length === 0 && <p className="text-sm text-slate-400">Inga quizar än — skapa din första!</p>}
                  <div className="stagger-list space-y-3">
                    {quizzes.map((q) => (
                      <div key={q.id} className="surface-flat card-hover flex items-center justify-between gap-3 p-3">
                        <span className="truncate font-medium text-white">{q.title}</span>
                        <Link href={`/host/${q.id}`}>
                          <Button size="sm" className="gap-1.5">
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span className="hidden sm:inline">Starta</span>
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Leaderboard initial={board} scope="alla" limit={5} title="Topplista" />
          </div>
        </div>
      </div>
    );
  }

  // ── Elev (och allt annat) ──────────────────────────────────────────────
  const collections = await prisma.flashcardCollection.findMany({
    where: { creatorId: user.id },
    include: { _count: { select: { flashcards: true } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const dueToday = await prisma.flashcard
    .count({ where: { collection: { creatorId: user.id } } })
    .catch(() => 0);

  return (
    <div data-accent="indigo" className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        accent="indigo"
        eyebrow="Din översikt"
        icon={Sparkles}
        title={
          <>
            Hej, <span className={theme.color} data-no-translate>{profile.username}</span>
          </>
        }
        lead={subtitle}
        chips={
          <>
            <HeaderStat icon={Award} label="nivå" value={level} tone="violet" />
            <HeaderStat icon={Zap} label="XP" value={profile.xp.toLocaleString("sv-SE")} tone="emerald" />
            <HeaderStat icon={Coins} label="mynt" value={profile.coins.toLocaleString("sv-SE")} tone="amber" />
            <HeaderStat
              icon={Trophy}
              label="placering"
              value={board.meRow ? `#${board.meRow.rank}` : "–"}
              tone="sky"
            />
          </>
        }
        actions={
          <>
            <Link href="/play">
              <Button size="lg" className="gap-2">
                <Gamepad2 className="h-4 w-4" />
                <span>Gå med i ett spel</span>
              </Button>
            </Link>
            <Link href="/study">
              <Button variant="secondary" className="gap-1.5">
                <BookOpen className="h-4 w-4" />
                <span>Plugga</span>
              </Button>
            </Link>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <div className="surface-flat p-4">
            <LevelRing xp={profile.xp} size={112} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="surface-flat p-4">
              <p className="stat-label">Nästa nivå</p>
              <p className="stat-value mt-1 text-indigo-300 tabular" data-no-translate>
                {progress.toNext} XP
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {upcoming ? `Nästa titel: ${upcoming.title} (nivå ${upcoming.at})` : "Du är på toppnivå — snyggt!"}
              </p>
            </div>
            <div className="surface-flat p-4">
              <p className="stat-label">Gloskort i dina set</p>
              <p className="stat-value mt-1 text-sky-300 tabular" data-no-translate>
                {dueToday}
              </p>
              <p className="mt-1 text-xs text-slate-500">Repetera dem för XP och bättre minne.</p>
            </div>
            <div className="surface-flat p-4">
              <p className="stat-label">Keens</p>
              <p className="stat-value mt-1 text-violet-300 tabular" data-no-translate>
                {keenCount}/{TOTAL_KEENS}
              </p>
              <p className="mt-1 text-xs text-slate-500">Nya paket varje dag.</p>
            </div>
          </div>
        </div>
      </PageHeader>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Nivå" value={level} icon={Award} tone="text-violet-400" hint={levelTitle(level)} />
        <StatCard label="Erfarenhet" value={profile.xp} icon={Zap} tone="text-emerald-400" hint={`${progress.toNext} XP till nästa nivå`} href="/progress" />
        <StatCard label="Mynt" value={profile.coins} icon={Coins} tone="text-amber-400" hint="Handla Keens för dem" href="/keens/market" />
        <StatCard
          label="Ledartavlan"
          value={board.meRow ? `#${board.meRow.rank}` : "–"}
          icon={Trophy}
          tone="text-sky-400"
          hint={`av ${board.stats.players} spelare`}
          href="/leaderboard"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionTile href="/quests" emoji="🔥" title="Dagens uppdrag" subtitle="Tre uppdrag, XP att hämta" accent="amber" right={<ArrowRight className="h-4 w-4" />} />
        <ActionTile href="/leaderboard" emoji="🏆" title="Ledartavlan" subtitle="Se vem som leder just nu" accent="sky" right={<ArrowRight className="h-4 w-4" />} />
        <ActionTile href="/progress" emoji="📈" title="Framsteg" subtitle="Träffsäkerhet och mål" accent="emerald" right={<ArrowRight className="h-4 w-4" />} />
        <ActionTile href="/keens/packs" emoji="✨" title="Öppna paket" subtitle={`${keenCount}/${TOTAL_KEENS} Keens samlade`} accent="violet" right={<ArrowRight className="h-4 w-4" />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-indigo-400" />
              <span>Dina quizar</span>
            </CardTitle>
            <Link href="/dashboard/quizzes" className="text-xs font-bold text-indigo-300 hover:underline">
              Alla →
            </Link>
          </CardHeader>
          <CardContent>
            {quizzes.length === 0 && (
              <p className="text-sm text-slate-400">
                Inga quizar än —{" "}
                <Link href="/dashboard/quizzes/new" className="font-bold text-indigo-300 hover:underline">
                  skapa din första
                </Link>{" "}
                för att utmana vänner!
              </p>
            )}
            <div className="stagger-list space-y-3">
              {quizzes.map((q) => (
                <div key={q.id} className="surface-flat card-hover flex items-center justify-between gap-3 p-3">
                  <span className="truncate font-medium text-white">{q.title}</span>
                  <Link href={`/host/${q.id}`}>
                    <Button size="sm" className="gap-1.5">
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Starta</span>
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Leaderboard initial={board} scope="alla" limit={5} title="Topplista" />

        <Card className="border-white/5 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-sky-400" />
              <span>Dina gloskort</span>
            </CardTitle>
            <Link href="/flashcards" className="text-xs font-bold text-sky-300 hover:underline">
              Repetera →
            </Link>
          </CardHeader>
          <CardContent>
            {collections.length === 0 && (
              <p className="text-sm text-slate-400">
                Inga gloskort än —{" "}
                <Link href="/flashcards" className="font-bold text-sky-300 hover:underline">
                  skapa din första uppsättning
                </Link>{" "}
                för att träna!
              </p>
            )}
            <div className="stagger-list grid gap-3 sm:grid-cols-2">
              {collections.map((c) => (
                <div key={c.id} className="surface-flat card-hover flex items-center justify-between gap-3 p-3.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="truncate font-medium text-white">{c.title}</span>
                    <Badge tone="sky">{c._count.flashcards} kort</Badge>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link href={`/flashcards/${c.id}`}>
                      <Button size="sm" className="gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Plugga</span>
                      </Button>
                    </Link>
                    <Link href={`/host/deck/${c.id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <Swords className="h-3.5 w-3.5 text-slate-400" />
                        <span className="hidden sm:inline">Strid</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-amber-400" /> XP varje dag
        </span>
        <span className="inline-flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Nivåer & titlar
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-sky-400" /> Gratispaket dagligen
        </span>
      </p>
    </div>
  );
}
