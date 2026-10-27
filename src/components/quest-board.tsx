"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Gift, Flame, ArrowRight } from "lucide-react";
import { claimQuest } from "@/app/quests/actions";
import { progressRatio, type Quest, type QuestMetric } from "@/lib/quests";
import { playQuestDone, playError } from "@/components/keens/sounds";
import SparkBurst from "@/components/motion/spark-burst";
import Confetti from "@/components/keens/confetti";
import { cn } from "@/lib/utils";

/**
 * Today's three quests, with the claim button that actually pays.
 *
 * The board is optimistic about nothing: pressing "Hämta" calls the server, and
 * the card only turns green when the server says the XP moved. The burst of
 * confetti is the reward for watching it happen, not a substitute for it.
 */
export default function QuestBoard({
  quests,
  progress,
  claimed,
}: {
  quests: Quest[];
  progress: Record<QuestMetric, number>;
  claimed: string[];
}) {
  const router = useRouter();
  const [done, setDone] = useState<Record<string, boolean>>(
    Object.fromEntries(claimed.map((id) => [id, true]))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [info, setInfo] = useState<string>("");
  const [infoOk, setInfoOk] = useState(true);
  const [fire, setFire] = useState(0);
  const [burst, setBurst] = useState(0);

  async function claim(quest: Quest) {
    if (busy || done[quest.id]) return;
    setBusy(quest.id);
    try {
      const result = await claimQuest(quest.id);
      setInfo(result.info);
      setInfoOk(result.ok);
      if (result.ok) {
        setDone((prev) => ({ ...prev, [quest.id]: true }));
        playQuestDone();
        setFire((n) => n + 1);
        setBurst((n) => n + 1);
        router.refresh();
      } else {
        playError();
      }
    } catch {
      setInfo("Nätverksfel — försök igen.");
      setInfoOk(false);
    } finally {
      setBusy(null);
    }
  }

  const allDone = quests.every((q) => done[q.id]);

  return (
    <div>
      <Confetti fire={fire} colors={["#fbbf24", "#34d399", "#818cf8"]} count={90} />

      {info && (
        <div
          role="status"
          className={cn(
            "mb-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold animate-fade-up",
            infoOk
              ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
              : "border-amber-400/35 bg-amber-500/10 text-amber-200"
          )}
        >
          {infoOk ? <Check className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
          <span data-no-translate>{info}</span>
        </div>
      )}

      {allDone && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/35 bg-gradient-to-r from-amber-500/20 to-transparent px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-extrabold text-amber-100">
            <span className="animate-keen-wiggle text-xl">🔥</span>
            Alla tre uppdrag klara idag — snyggt jobbat!
          </p>
          <Link href="/leaderboard" className="flex items-center gap-1.5 text-sm font-bold text-amber-200 hover:underline">
            Se ledartavlan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="stagger-list grid gap-4 sm:grid-cols-3">
        {quests.map((quest) => {
          const count = progress[quest.metric] ?? 0;
          const ready = count >= quest.target;
          const isDone = done[quest.id];
          const ratio = progressRatio(count, quest.target);
          return (
            <article
              key={quest.id}
              className={cn(
                "surface relative overflow-hidden p-5 transition-colors",
                isDone ? "border-emerald-400/40" : ready ? "border-amber-400/45" : ""
              )}
            >
              <SparkBurst fire={isDone ? burst : 0} count={14} />
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "grid h-12 w-12 place-items-center rounded-2xl border text-2xl",
                    isDone
                      ? "border-emerald-400/40 bg-emerald-500/15"
                      : "border-white/10 bg-white/[0.04]"
                  )}
                >
                  {isDone ? "✅" : quest.emoji}
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                    +{quest.xp} XP
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                    +{quest.coins} mynt
                  </span>
                </span>
              </div>

              <h3 className="mt-4 font-display text-lg font-extrabold tracking-tight text-white">{quest.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{quest.hint}</p>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Framsteg</span>
                  <span className="tabular" data-no-translate>
                    {Math.min(count, quest.target)}/{quest.target}
                  </span>
                </div>
                <div className="bar">
                  <span className="bar-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
                </div>
              </div>

              <button
                type="button"
                disabled={isDone || !ready || busy === quest.id}
                onClick={() => claim(quest)}
                className={cn(
                  "mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition-colors",
                  isDone
                    ? "cursor-default bg-emerald-600/25 text-emerald-200"
                    : ready
                      ? "btn-shine bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 pulse-soft"
                      : "cursor-not-allowed bg-white/[0.05] text-slate-500"
                )}
              >
                {isDone ? (
                  <>
                    <Check className="h-4 w-4" /> Hämtad
                  </>
                ) : ready ? (
                  <>
                    <Gift className="h-4 w-4" /> {busy === quest.id ? "Hämtar…" : "Hämta belöning"}
                  </>
                ) : (
                  <>Klar {Math.min(count, quest.target)}/{quest.target}</>
                )}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
