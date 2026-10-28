import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { prisma } from "@/lib/prisma";
import { readBoard } from "@/lib/leaderboard";
import Leaderboard from "@/components/leaderboard";
import PageHeader, { HeaderStat } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { levelProgress, levelTitle } from "@/lib/levels";
import { Trophy, Users, Sparkles, Zap, ArrowRight, Flame, Target, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Ledartavlan — the whole list, not the five rows on a dashboard card.
 *
 * Above it, the honest answer to "am I doing anything?": your rank, your title,
 * how far the next level is, and the three things that actually move you up
 * (play, practise, keep the streak). Below it, the school.
 */
export default async function LeaderboardPage() {
  const { user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (!profile) redirect("/register");

  const board = await readBoard({
    scope: "alla",
    limit: 50,
    viewerId: user.id,
    viewerName: profile.username,
  });

  const yourLevel = levelProgress(profile.xp);
  const gapToTop = board.rows[0] ? Math.max(0, board.rows[0].xp - profile.xp) : 0;

  // How many people are within one good game of you: the pack you are actually
  // racing, rather than a number at the top of the page nobody can reach.
  const nearby = await prisma.profile
    .count({
      where: {
        shadowed: false,
        xp: { gte: Math.max(0, profile.xp - 200), lte: profile.xp + 200 },
      },
    })
    .catch(() => 0);

  return (
    <div data-accent="amber" className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        accent="amber"
        eyebrow="Ledartavlan"
        icon={Trophy}
        title={
          <>
            Vem leder <span className="text-shine">QuizKeen</span>?
          </>
        }
        lead="XP kommer från frågor du svarar rätt på, gloskort du repeterar och matcher du spelar klart. Tavlan uppdaterar sig själv var femtonde sekund — inget att ladda om."
        chips={
          <>
            <HeaderStat icon={Users} label="spelare" value={board.stats.players} />
            <HeaderStat icon={Zap} label="XP utdelat" value={board.stats.xp.toLocaleString("sv-SE")} tone="emerald" />
            <HeaderStat
              icon={Trophy}
              label="ditt läge"
              value={board.meRow ? `#${board.meRow.rank}` : "–"}
              tone="amber"
            />
            <HeaderStat icon={Target} label="inom 200 XP" value={nearby} tone="violet" />
          </>
        }
        actions={
          <>
            <Link href="/dashboard">
              <Button variant="secondary">Översikten</Button>
            </Link>
            <Link href="/play">
              <Button className="gap-1.5">
                <Flame className="h-4 w-4" /> Tjäna XP nu
              </Button>
            </Link>
          </>
        }
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
        <Leaderboard initial={board} scope="alla" limit={50} showScopeTabs title="Hela skolan" />

        <aside className="space-y-5">
          <section className="surface p-5">
            <h2 className="section-title flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-300" /> Du
            </h2>
            <p className="mt-3 font-display text-2xl font-extrabold text-white" data-no-translate>
              {profile.username}
            </p>
            <p className="text-sm text-slate-400" data-no-translate>
              {levelTitle(yourLevel.level)} · Nivå {yourLevel.level}
            </p>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-400">
                <span data-no-translate>Nivå {yourLevel.level}</span>
                <span className="tabular" data-no-translate>
                  {yourLevel.into}/{yourLevel.span} XP
                </span>
              </div>
              <div className="bar">
                <span className="bar-fill" style={{ width: `${Math.round(yourLevel.ratio * 100)}%` }} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3 w-3" /> {yourLevel.toNext} XP till nivå {yourLevel.level + 1}
              </p>
            </div>

            {gapToTop > 0 ? (
              <p className="mt-4 rounded-xl border border-white/5 bg-slate-900/50 p-3 text-xs text-slate-400">
                <b className="text-white tabular">{gapToTop.toLocaleString("sv-SE")} XP</b> upp till förstaplatsen —
                ungefär {Math.max(1, Math.ceil(gapToTop / 60))} bra matcher.
              </p>
            ) : (
              <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs font-bold text-amber-200">
                Du leder hela skolan. 🏆
              </p>
            )}
          </section>

          <section className="surface p-5">
            <h2 className="section-title">Så klättrar du</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-300">
              {[
                { icon: Flame, text: "Svara rätt i ett live-spel — snabbhet ger mer XP." },
                { icon: Sparkles, text: "Repetera gloskort: varje kort du klarar ger XP." },
                { icon: Target, text: "Läs en läxa klart för bonus-XP i klassrummet." },
              ].map((row) => (
                <li key={row.text} className="flex gap-2.5">
                  <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <span>{row.text}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/quests"
              className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-white hover:border-white/20"
            >
              Dagens uppdrag
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
