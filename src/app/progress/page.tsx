import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { prisma } from "@/lib/prisma";
import { readBoard } from "@/lib/leaderboard";
import { readStreak } from "@/lib/quests-server";
import { dayKey } from "@/lib/quests";
import PageHeader, { HeaderStat } from "@/components/page-header";
import KnowledgeSummary from "@/components/knowledge-summary";
import LevelRing from "@/components/motion/level-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { levelFor, levelProgress, levelTitle, nextTitle, XP_PER_LEVEL } from "@/lib/levels";
import {
  TrendingUp,
  Flame,
  Target,
  Trophy,
  Zap,
  BookOpen,
  School,
  Activity as ActivityIcon,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

/** The titles a player passes, so the ladder is visible rather than implied. */
const LADDER = [
  { at: 1, title: "Nybörjare" },
  { at: 3, title: "Upptäckare" },
  { at: 5, title: "Lärling" },
  { at: 8, title: "Kännare" },
  { at: 12, title: "Vetgirig" },
  { at: 16, title: "Mästare" },
  { at: 20, title: "Legendar" },
];

/**
 * Framsteg — the page that answers "am I getting better?".
 *
 * Everything here is measured from what the app already knows: homework scores,
 * matches played, study runs logged, the days you showed up, and the memory
 * schedule kept in the browser. No number is decorative, and nothing can be
 * inflated by pressing a button.
 */
export default async function ProgressPage() {
  const { user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (!profile) redirect("/register");

  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const [completions, participations, studyRuns, activity, visits, board, streak] = await Promise.all([
    prisma.assignmentCompletion
      .findMany({
        where: { studentId: user.id },
        include: { assignment: { select: { title: true, classroomId: true } } },
        orderBy: { completedAt: "desc" },
        take: 60,
      })
      .catch(() => []),
    prisma.participant
      .findMany({
        where: { studentId: user.id },
        select: { score: true, joinedAt: true },
        orderBy: { joinedAt: "desc" },
        take: 40,
      })
      .catch(() => []),
    prisma.activity
      .count({ where: { username: profile.username, action: { startsWith: "PLUGGADE" } } })
      .catch(() => 0),
    prisma.activity
      .findMany({ where: { username: profile.username }, orderBy: { createdAt: "desc" }, take: 12 })
      .catch(() => []),
    prisma.pageVisit
      .findMany({ where: { username: profile.username, createdAt: { gte: since } }, select: { createdAt: true } })
      .catch(() => []),
    readBoard({ scope: "alla", limit: 10, viewerId: user.id, viewerName: profile.username }),
    readStreak(profile.username),
  ]);

  // ── Accuracy, from homework ────────────────────────────────────────────
  const scores = completions.map((c) => c.score);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const best = scores.length ? Math.max(...scores) : 0;

  // ── Per-class mastery, so "how am I doing" has a subject next to it ────
  const byClass = new Map<string, { total: number; count: number }>();
  for (const c of completions) {
    const key = c.assignment.classroomId;
    const entry = byClass.get(key) ?? { total: 0, count: 0 };
    entry.total += c.score;
    entry.count += 1;
    byClass.set(key, entry);
  }
  const rooms = byClass.size
    ? await prisma.classroom
        .findMany({ where: { id: { in: Array.from(byClass.keys()) } }, select: { id: true, name: true } })
        .catch(() => [])
    : [];
  const mastery = rooms
    .map((room) => {
      const entry = byClass.get(room.id)!;
      return { name: room.name, score: Math.round(entry.total / entry.count), count: entry.count };
    })
    .sort((a, b) => b.score - a.score);

  // ── The last fourteen days, as a strip ─────────────────────────────────
  const perDay = new Map<string, number>();
  for (const visit of visits) {
    const key = dayKey(visit.createdAt);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const days: { key: string; label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    days.push({
      key,
      label: d.toLocaleDateString("sv-SE", { weekday: "narrow" }),
      count: perDay.get(key) ?? 0,
    });
  }
  const busiest = Math.max(1, ...days.map((d) => d.count));

  const progress = levelProgress(profile.xp);
  // Derived, so the ladder and the title can never disagree with the XP total
  // after a staff reset.
  const level = levelFor(profile.xp);
  const upcoming = nextTitle(level);
  const wonMatches = participations.filter((p) => p.score > 0).length;

  return (
    <div data-accent="emerald" className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        accent="emerald"
        eyebrow="Framsteg"
        icon={TrendingUp}
        title={
          <>
            Din utveckling, <span className="text-shine">{levelTitle(level)}</span>
          </>
        }
        lead="Allt som räknas: hur mycket du tränat, hur rätt du svarar och hur många dagar i rad du dykt upp. Siffrorna kommer från dina egna matcher, läxor och studiepass."
        chips={
          <>
            <HeaderStat icon={Trophy} label="placering" value={board.meRow ? `#${board.meRow.rank}` : "–"} tone="amber" />
            <HeaderStat icon={Flame} label="dagar i rad" value={streak} tone="rose" />
            <HeaderStat icon={Target} label="snitt på läxor" value={`${average}%`} tone="emerald" />
            <HeaderStat icon={BookOpen} label="studiepass" value={studyRuns} tone="sky" />
          </>
        }
        actions={
          <>
            <Link href="/leaderboard">
              <Button variant="secondary" className="gap-1.5">
                <Trophy className="h-4 w-4" /> Ledartavlan
              </Button>
            </Link>
            <Link href="/quests">
              <Button className="gap-1.5">
                <Flame className="h-4 w-4" /> Dagens uppdrag
              </Button>
            </Link>
          </>
        }
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5">
          <section className="surface p-5">
            <p className="stat-label">Nivå</p>
            <LevelRing xp={profile.xp} size={116} className="mt-3" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="surface-flat p-3">
                <p className="stat-label">XP</p>
                <p className="stat-value text-emerald-300 tabular" data-no-translate>
                  {profile.xp.toLocaleString("sv-SE")}
                </p>
              </div>
              <div className="surface-flat p-3">
                <p className="stat-label">Mynt</p>
                <p className="stat-value text-amber-300 tabular" data-no-translate>
                  {profile.coins.toLocaleString("sv-SE")}
                </p>
              </div>
            </div>
            {upcoming && (
              <p className="mt-3 text-xs text-slate-500">
                {progress.toNext} XP till nivå {progress.level + 1} — då blir du{" "}
                <b className="text-slate-300">{upcoming.title}</b>.
              </p>
            )}
          </section>

          <KnowledgeSummary />

          <section className="surface p-5">
            <h2 className="section-title flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-300 flame" /> Senaste 14 dagarna
            </h2>
            <div className="mt-4 flex items-end gap-1">
              {days.map((d) => (
                <span key={d.key} className="flex flex-1 flex-col items-center gap-1" title={`${d.count} besök`}>
                  <span
                    className="w-full rounded-t bg-gradient-to-t from-emerald-600/60 to-emerald-400"
                    style={{ height: `${Math.max(4, (d.count / busiest) * 56)}px` }}
                  />
                  <span className="text-[9px] uppercase text-slate-600">{d.label}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              En stapel per dag — högre stapel betyder fler sidor du besökte.
            </p>
          </section>
        </div>

        <div className="space-y-5">
          <section className="surface p-5">
            <h2 className="section-title flex items-center gap-2">
              <School className="h-5 w-5 text-sky-300" /> Så går det per klass
            </h2>
            {mastery.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                Inga inlämnade läxor än. När du lämnat in en läxa dyker klassens resultat upp här.
              </p>
            ) : (
              <div className="stagger-list mt-4 space-y-4">
                {mastery.map((row) => (
                  <div key={row.name}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-bold text-white">{row.name}</span>
                      <span className="text-xs font-bold text-slate-400 tabular" data-no-translate>
                        {row.score}% · {row.count} läxor
                      </span>
                    </div>
                    <div className="bar h-2">
                      <span className="bar-fill" style={{ width: `${row.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="surface-flat p-4">
              <p className="stat-label">Matcher</p>
              <p className="stat-value text-indigo-300 tabular" data-no-translate>
                {participations.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">{wonMatches} med poäng</p>
            </div>
            <div className="surface-flat p-4">
              <p className="stat-label">Bästa läxa</p>
              <p className="stat-value text-emerald-300 tabular" data-no-translate>
                {best}%
              </p>
              <p className="mt-1 text-xs text-slate-500">av {scores.length} inlämnade</p>
            </div>
            <div className="surface-flat p-4">
              <p className="stat-label">Nästa nivå</p>
              <p className="stat-value text-violet-300 tabular" data-no-translate>
                {progress.toNext}
              </p>
              <p className="mt-1 text-xs text-slate-500">{XP_PER_LEVEL} XP per nivå</p>
            </div>
          </div>

          <section className="surface p-5">
            <h2 className="section-title flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-300" /> Nivåtrappan
            </h2>
            <ol className="stagger-list mt-4 grid gap-2 sm:grid-cols-2">
              {LADDER.map((step) => {
                const reached = level >= step.at;
                const current = levelTitle(level) === step.title && reached;
                return (
                  <li
                    key={step.title}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                      current
                        ? "border-violet-400/45 bg-violet-500/15 text-white"
                        : reached
                          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                          : "border-white/5 bg-slate-900/40 text-slate-500"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {reached ? <Check className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                      {step.title}
                    </span>
                    <span className="tabular" data-no-translate>
                      Nivå {step.at}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="surface p-5">
            <h2 className="section-title flex items-center gap-2">
              <ActivityIcon className="h-5 w-5 text-sky-300" /> Senaste aktivitet
            </h2>
            {activity.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                Inget loggat än — spela en match, lämna in en läxa eller plugga ett set.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm text-slate-400">
                {activity.map((row, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 rounded-xl bg-slate-950/50 px-3 py-2">
                    <span data-no-translate>{row.action}</span>
                    <span className="shrink-0 text-xs text-slate-600 tabular">
                      {row.createdAt.toLocaleDateString("sv-SE")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="emerald" icon={Check}>
              XP kommer bara från spel, läxor och plugg
            </Badge>
            <Link href="/study" className="flex items-center gap-1.5 text-sm font-bold text-emerald-300 hover:underline">
              Plugga vidare <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
