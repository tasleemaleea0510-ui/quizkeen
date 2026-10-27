"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Brain,
  Sparkles,
  ArrowRight,
  X,
  Check,
  Clock,
} from "lucide-react";
import { WornBuddy } from "@/components/keens/worn-keen";
import { BOX_DAYS, dueLabel, loadDeck, planDeck, review, saveDeck, type Deck } from "@/lib/srs";
import { claimStudyReward } from "@/app/study/actions";
import { playCorrect, playWrong, playCoin } from "@/components/keens/sounds";
import Confetti from "@/components/keens/confetti";
import SparkBurst from "@/components/motion/spark-burst";

type CardT = { id: string; front: string; back: string };

/**
 * The flashcards, with a memory.
 *
 * Swiping a deck in order, forever, is the difference between *reading* and
 * *learning* — which is why this runner is built around `lib/srs`:
 *
 *   - the cards you got wrong come back first, the ones you know fade away;
 *   - "Igen" drops a card to the first box and it is due again immediately,
 *     "Kan det" moves it up a box and it returns in one, three, seven or sixteen
 *     days;
 *   - the session has an end: when the queue is empty you get a score and XP.
 *
 * The schedule is per device in `localStorage` (see `lib/srs.ts` for the
 * reasoning); the XP is claimed on the server, which re-checks the deck's size.
 */
export default function StudyDeck({ cards, collectionId }: { cards: CardT[]; collectionId: string }) {
  const [deck, setDeck] = useState<Deck>({});
  const [loaded, setLoaded] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [right, setRight] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [streak, setStreak] = useState(0);
  const [reward, setReward] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [fire, setFire] = useState(0);
  const [burst, setBurst] = useState(0);
  const [leveledTo, setLeveledTo] = useState<number | null>(null);

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const ids = useMemo(() => cards.map((c) => c.id), [cards]);

  // Read the schedule once, then build the session: due cards first, then new.
  useEffect(() => {
    const stored = loadDeck(collectionId);
    const plan = planDeck(ids, stored);
    setDeck(stored);
    setQueue(plan.queue.length ? plan.queue : ids);
    setLoaded(true);
  }, [collectionId, ids]);

  const persist = useCallback(
    (next: Deck) => {
      setDeck(next);
      saveDeck(collectionId, next);
    },
    [collectionId]
  );

  const current = byId.get(queue[pos] ?? "");
  const total = queue.length;
  const done = pos >= total;

  /** What this device still owes today. */
  const stats = useMemo(() => {
    const plan = planDeck(ids, deck);
    return {
      dueNow: plan.due.length,
      fresh: plan.fresh.length,
      waiting: plan.waiting,
      mastered: plan.mastered,
    };
  }, [ids, deck]);

  /** One answer: the card moves a box and the session moves on. */
  function answer(correct: boolean) {
    if (!current) return;
    const next = { ...deck, [current.id]: review(deck[current.id], correct) };
    persist(next);
    setAnswered((a) => a + 1);
    if (correct) {
      setRight((r) => r + 1);
      setStreak((s) => s + 1);
      playCorrect();
    } else {
      setStreak(0);
      playWrong();
      // A missed card goes to the back of this session, so it is seen again
      // before the student walks away from it.
      setQueue((q) => [...q, current.id]);
    }
    setFlipped(false);
    setPos((p) => p + 1);
  }

  async function claim() {
    if (claiming || claimed || answered === 0) return;
    setClaiming(true);
    try {
      const result = await claimStudyReward({
        kind: "deck",
        id: collectionId,
        right,
        total: Math.max(answered, 1),
      });
      setReward(result.info);
      if (result.ok) {
        setClaimed(true);
        playCoin();
        setFire((n) => n + 1);
        setBurst((n) => n + 1);
        if (typeof result.level === "number") setLeveledTo(result.level);
      }
    } catch {
      setReward("Kunde inte hämta XP — försök igen.");
    } finally {
      setClaiming(false);
    }
  }

  if (cards.length === 0) {
    return (
      <p className="py-12 text-center text-slate-500">
        Inga kort än — lägg till ditt första kort nedan och börja repetera.
      </p>
    );
  }

  // ── The end of a session ───────────────────────────────────────────────
  if (loaded && done) {
    const accuracy = answered ? Math.round((right / answered) * 100) : 0;
    const nextDue = ids
      .map((id) => deck[id]?.due ?? 0)
      .filter((due) => due > Date.now())
      .sort((a, b) => a - b)[0];

    return (
      <div className="mx-auto max-w-2xl">
        <Confetti fire={fire} colors={["#818cf8", "#34d399", "#38bdf8", "#fbbf24"]} count={100} />
        <div className="surface p-6 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15">
            <Sparkles className="h-6 w-6 text-emerald-300" />
          </span>
          <h2 className="page-title">Setet är klart!</h2>
          <p className="mt-2 text-sm text-slate-400">
            <span className="font-extrabold tabular text-white">{right}</span> av{" "}
            <span className="font-extrabold tabular text-white">{answered}</span> rätt · {accuracy}%
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3 text-left">
            <div className="surface-flat p-3">
              <p className="stat-label">Kan det</p>
              <p className="stat-value text-emerald-300 tabular" data-no-translate>
                {stats.mastered}
              </p>
            </div>
            <div className="surface-flat p-3">
              <p className="stat-label">Väntar</p>
              <p className="stat-value text-sky-300 tabular" data-no-translate>
                {stats.waiting}
              </p>
            </div>
            <div className="surface-flat p-3">
              <p className="stat-label">Nya</p>
              <p className="stat-value text-violet-300 tabular" data-no-translate>
                {stats.fresh}
              </p>
            </div>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            {nextDue
              ? `Nästa kort kommer tillbaka ${dueLabel({ box: 1, due: nextDue, seen: 1, right: 1 }).toLowerCase()}.`
              : "Alla kort är schemalagda framåt — snyggt."}
          </p>

          {reward ? (
            <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200">
              {reward}
              {leveledTo && <span className="mt-1 block text-xs text-amber-200">🏆 Ny nivå: {leveledTo}!</span>}
            </p>
          ) : (
            <button
              type="button"
              onClick={claim}
              disabled={claiming || answered === 0}
              className="btn-shine mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-3 text-sm font-extrabold text-slate-950 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {claiming ? "Hämtar…" : "Hämta XP för passet"}
            </button>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => {
              const plan = planDeck(ids, deck);
              setQueue(plan.queue.length ? plan.queue : [...ids].sort(() => Math.random() - 0.5));
              setPos(0);
              setRight(0);
              setAnswered(0);
              setStreak(0);
              setReward(null);
              setClaimed(false);
              setFlipped(false);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white hover:border-white/20"
          >
            <RotateCw className="h-4 w-4" /> Kör ett pass till
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    return <p className="py-12 text-center text-slate-500">Inget kort att visa just nu.</p>;
  }

  const state = deck[current.id];
  const boxLabel = state ? `Ruta ${state.box + 1}/5 · ${dueLabel(state)}` : "Nytt kort";

  return (
    <div className="flex flex-col items-center gap-5">
      <WornBuddy
        label={streak >= 3 ? `${streak} rätt i rad!` : "Repetition med smarta intervall"}
        right={
          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold tabular text-slate-400">
            {stats.dueNow} att repetera
          </span>
        }
        className="w-full max-w-xl"
      />

      <div className="flex w-full max-w-xl items-center justify-between gap-3 text-xs">
        <span className="font-mono tabular text-slate-400" data-no-translate>
          Kort {pos + 1} av {total}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-bold text-slate-300">
          <Brain className="h-3.5 w-3.5 text-violet-300" /> {boxLabel}
        </span>
      </div>

      <div className="bar w-full max-w-xl">
        <span className="bar-fill" style={{ width: `${(pos / total) * 100}%` }} />
      </div>

      <style>{`
        .qk-scene { perspective: 1200px; }
        .qk-card3d { transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1); }
        .qk-card3d.qk-flipped { transform: rotateY(180deg); }
        .qk-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .qk-back { transform: rotateY(180deg); }
      `}</style>

      <div key={current.id} className="qk-scene w-full max-w-xl animate-keen-rise">
        <div
          role="button"
          tabIndex={0}
          aria-label={flipped ? "Visa frågan" : "Visa svaret"}
          onClick={() => setFlipped((f) => !f)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
          className="relative cursor-pointer rounded-3xl outline-none"
        >
          <SparkBurst fire={burst} />
          <div className={`qk-card3d relative h-72 w-full ${flipped ? "qk-flipped" : ""}`}>
            <div className="qk-face surface absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">Fråga</p>
                <p className="text-2xl font-bold text-white">{current.front}</p>
                <p className="mt-4 text-xs text-slate-500">Klicka för att vända</p>
              </div>
            </div>
            <div className="qk-face qk-back surface absolute inset-0 flex items-center justify-center border-emerald-400/30 p-8">
              <div className="text-center">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-300">Svar</p>
                <p className="text-2xl font-bold text-white">{current.back}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {flipped ? (
        <div className="flex w-full max-w-xl flex-wrap items-center justify-center gap-2.5 animate-fade-up">
          <button
            type="button"
            onClick={() => answer(false)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-400/40 bg-rose-500/15 px-5 py-3 text-sm font-extrabold text-rose-100 hover:bg-rose-500/25"
          >
            <X className="h-4 w-4" /> Igen (visa snart)
          </button>
          <button
            type="button"
            onClick={() => answer(true)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-5 py-3 text-sm font-extrabold text-emerald-100 hover:bg-emerald-500/25"
          >
            <Check className="h-4 w-4" /> Kan det
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setFlipped(false);
              setPos((p) => Math.max(0, p - 1));
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white hover:border-white/20"
          >
            <ChevronLeft className="h-4 w-4" /> Föregående
          </button>
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="btn-shine inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white"
          >
            <RotateCw className="h-4 w-4" /> Visa svaret
          </button>
          <button
            type="button"
            onClick={() => {
              setFlipped(false);
              setPos((p) => Math.min(total - 1, p + 1));
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white hover:border-white/20"
          >
            Hoppa över <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <p className="flex flex-wrap items-center justify-center gap-2 text-center text-xs text-slate-500">
        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
        Rätt svar ger XP när passet är klart — intervallen är {BOX_DAYS.join(" · ")} dagar.
        <ArrowRight className="h-3.5 w-3.5" />
      </p>
    </div>
  );
}
