import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { dayKey, questsForDay } from "@/lib/quests";
import { readClaimedQuestIds, readQuestProgress, readStreak } from "@/lib/quests-server";
import QuestBoard from "@/components/quest-board";
import PageHeader, { HeaderStat } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Flame, CalendarDays, Gift, Sparkles, Zap, Clock, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Dagens uppdrag.
 *
 * Three quests, the same for everyone, chosen by the date. The page does the
 * expensive part on the server — three counts and the streak — and hands the
 * client a plain snapshot, so the only thing the browser can do is press claim,
 * which the server checks again.
 */
export default async function QuestsPage() {
  const { user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (!profile) redirect("/register");

  const today = dayKey();
  const quests = questsForDay(today);
  const [progress, claimed, streak] = await Promise.all([
    readQuestProgress(user.id, profile.username, today),
    readClaimedQuestIds(profile.username, today),
    readStreak(profile.username),
  ]);

  const available = quests.filter((q) => !claimed.includes(q.id));
  const earnedToday = quests
    .filter((q) => claimed.includes(q.id))
    .reduce((sum, q) => sum + q.xp, 0);

  return (
    <div data-accent="amber" className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        accent="amber"
        eyebrow="Dagens uppdrag"
        icon={Flame}
        title={
          <>
            Tre saker idag, <span className="text-shine">sedan XP</span>
          </>
        }
        lead="Samma uppdrag för hela skolan, nya varje dag. Belöningen hämtas här och läggs direkt på ditt konto — inget att komma ihåg."
        chips={
          <>
            <HeaderStat icon={Flame} label="dagar i rad" value={streak} tone="amber" />
            <HeaderStat icon={Gift} label="uppdrag kvar" value={available.length} tone="emerald" />
            <HeaderStat icon={Zap} label="XP idag" value={earnedToday} tone="violet" />
            <HeaderStat icon={CalendarDays} label="datum" value={today.slice(5).replace("-", "/")} tone="sky" />
          </>
        }
        actions={
          <>
            <Link href="/leaderboard">
              <Button variant="secondary" className="gap-1.5">
                <Sparkles className="h-4 w-4" /> Ledartavlan
              </Button>
            </Link>
            <Link href="/study">
              <Button className="gap-1.5">
                <Clock className="h-4 w-4" /> Plugga nu
              </Button>
            </Link>
          </>
        }
      />

      <div className="mt-6">
        <QuestBoard quests={quests} progress={progress} claimed={claimed} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="surface p-5">
          <h2 className="section-title flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-300 flame" /> Din svit
          </h2>
          <p className="mt-2 font-display text-4xl font-extrabold text-white tabular" data-no-translate>
            {streak} {streak === 1 ? "dag" : "dagar"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {streak === 0
              ? "Ett besök idag startar sviten. Den räknas när du gör något — pluggar, spelar eller kikar in."
              : streak < 3
                ? "Två dagar i rad är där vanan börjar. Fortsätt imorgon."
                : "Stark svit! Den här är din — missa inte imorgon."}
          </p>
          <div className="mt-4 flex gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-full ${i < Math.min(7, streak) ? "bg-amber-400" : "bg-white/10"}`}
              />
            ))}
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="section-title flex items-center gap-2">
            <Gift className="h-5 w-5 text-emerald-300" /> Så funkar det
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li className="flex gap-2">
              <span className="text-emerald-300">•</span> Uppdragen byts vid midnatt och är samma för alla.
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-300">•</span> Framstegen läses från det du redan gjort — inget extra att fylla i.
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-300">•</span> XP:en går rakt in i nivån och syns på ledartavlan.
            </li>
          </ul>
          <Link
            href="/progress"
            className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-white hover:border-white/20"
          >
            Se dina framsteg <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
