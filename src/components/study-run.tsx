"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WornBuddy } from "@/components/keens/worn-keen";
import { claimStudyReward } from "@/app/study/actions";
import { playCorrect, playWrong, playCoin } from "@/components/keens/sounds";
import Confetti from "@/components/keens/confetti";
import { levelProgress } from "@/lib/levels";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Sparkles,
  X,
  Flame,
  Lightbulb,
  Trophy,
} from "lucide-react";

/**
 * Study — the solo mode.
 *
 * The same questions a match would ask, with none of the pressure: no lobby, no
 * clock, no rival opening a chest behind your back. What it does have is the
 * part a match never has time for — you answer, you find out immediately why the
 * right answer is right, and the ones you missed come back before you leave. At
 * the end the run is worth XP, claimed on the server.
 */
export type StudyQuestion = { id: string; text: string; options: string[]; correctIndexes: number[] };

/** A set comparison, because a multi-answer question needs all of them. */
function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.every((v, i) => v === right[i]);
}

export default function StudyRun({
  title,
  questions,
  quizId,
}: {
  title: string;
  questions: StudyQuestion[];
  quizId: string;
}) {
  const [queue, setQueue] = useState<StudyQuestion[]>(questions);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [lastRight, setLastRight] = useState(false);
  const [right, setRight] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [missed, setMissed] = useState<StudyQuestion[]>([]);
  const [reward, setReward] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [fire, setFire] = useState(0);

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-slate-400">Det här quizet har inga frågor än.</p>
        <Link href="/study" className="mt-4 inline-flex text-sm font-bold text-indigo-300 hover:text-indigo-200">
          Tillbaka till Study
        </Link>
      </div>
    );
  }

  async function claim(finalRight: number, total: number) {
    if (claiming || claimed) return;
    setClaiming(true);
    try {
      const result = await claimStudyReward({ kind: "quiz", id: quizId, right: finalRight, total });
      setReward(result.info);
      if (result.ok) {
        setClaimed(true);
        playCoin();
        setFire((n) => n + 1);
      }
    } catch {
      setReward("Kunde inte hämta XP — försök igen.");
    } finally {
      setClaiming(false);
    }
  }

  // ── Finished: score, the XP, then the mistakes — which are the point ────
  if (index >= queue.length) {
    const total = queue.length;
    const perfect = missed.length === 0;
    const accuracy = answered ? Math.round((right / answered) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Confetti fire={fire} colors={["#818cf8", "#34d399", "#fbbf24"]} count={perfect ? 130 : 70} />

        <div className="surface p-6 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500 to-violet-600 ring-1 ring-inset ring-white/20">
            <Sparkles className="h-6 w-6 text-white" />
          </span>
          <h1 className="page-title">Passet klart!</h1>
          <p className="mt-2 text-sm text-slate-400">
            <span className="font-extrabold tabular text-white">{right}</span> av{" "}
            <span className="font-extrabold tabular text-white">{total}</span> rätt · {accuracy}%
            {perfect ? " — allt satt." : "."}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
            <div className="surface-flat p-3">
              <p className="stat-label">Bästa svit</p>
              <p className="stat-value text-amber-300 tabular" data-no-translate>
                {bestStreak}
              </p>
            </div>
            <div className="surface-flat p-3">
              <p className="stat-label">Att repetera</p>
              <p className="stat-value text-rose-300 tabular" data-no-translate>
                {missed.length}
              </p>
            </div>
            <div className="surface-flat p-3">
              <p className="stat-label">Frågor kvar</p>
              <p className="stat-value text-sky-300 tabular" data-no-translate>
                {queue.length - index}
              </p>
            </div>
          </div>

          {reward ? (
            <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200">
              {reward}
            </p>
          ) : (
            <Button onClick={() => claim(right, total)} disabled={claiming || answered === 0} className="mt-4 gap-2">
              <Trophy className="h-4 w-4" />
              {claiming ? "Hämtar…" : "Hämta XP för passet"}
            </Button>
          )}
        </div>

        <div className="mt-5">
          <WornBuddy label={perfect ? "Helt perfekt" : "Nu tar vi om det svåra"} />
        </div>

        {missed.length > 0 && (
          <div className="mt-5 space-y-2">
            <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">
              <Lightbulb className="h-3.5 w-3.5 text-amber-300" /> Repetera ({missed.length})
            </h2>
            <div className="stagger-list space-y-2">
              {missed.map((q) => (
                <div key={q.id} className="surface-flat p-4">
                  <p className="text-sm font-semibold text-white">{q.text}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                    {q.correctIndexes.map((i) => q.options[i]).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          {missed.length > 0 && (
            <Button
              onClick={() => {
                setQueue(missed);
                setMissed([]);
                setIndex(0);
                setRight(0);
                setAnswered(0);
                setStreak(0);
                setBestStreak(0);
                setPicked([]);
                setChecked(false);
                setReward(null);
                setClaimed(false);
              }}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Öva på fel svar
            </Button>
          )}
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => {
              setQueue(questions);
              setMissed([]);
              setIndex(0);
              setRight(0);
              setAnswered(0);
              setStreak(0);
              setBestStreak(0);
              setPicked([]);
              setChecked(false);
              setReward(null);
              setClaimed(false);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Börja om
          </Button>
          <Link href="/study">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Study
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const question = queue[index];
  const multi = question.correctIndexes.length > 1;
  const correct = checked && sameSet(picked, question.correctIndexes);
  const progress = levelProgress(answered * 4);

  function toggle(i: number) {
    if (checked) return;
    setPicked((prev) => {
      if (multi) return prev.includes(i) ? prev.filter((p) => p !== i) : [...prev, i];
      return [i];
    });
  }

  function check() {
    if (checked || picked.length === 0) return;
    const ok = sameSet(picked, question.correctIndexes);
    setLastRight(ok);
    setChecked(true);
    setAnswered((a) => a + 1);
    if (ok) {
      setRight((r) => r + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
      playCorrect();
    } else {
      setStreak(0);
      playWrong();
      setMissed((m) => [...m, question]);
    }
  }

  function next() {
    setIndex((i) => i + 1);
    setPicked([]);
    setChecked(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/study"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Study
        </Link>
        <div className="flex items-center gap-2">
          {streak >= 2 && (
            <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-200">
              <Flame className="h-3.5 w-3.5 flame" /> {streak} i rad
            </span>
          )}
          <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-bold tabular text-indigo-200">
            {index + 1} / {queue.length}
          </span>
        </div>
      </div>

      <h1 className="mt-4 text-center font-display text-xl font-extrabold tracking-tight text-white">{title}</h1>

      <div className="bar mt-4">
        <span className="bar-fill" style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>

      <div className="mt-5">
        <WornBuddy
          label={
            checked
              ? lastRight
                ? "Rätt! Bra jobbat."
                : "Inte riktigt — rätt svar är grönt"
              : "Ingen timer. Ta den tid du behöver."
          }
        />
      </div>

      <div className="surface mt-5 p-5">
        <p className="text-base font-bold leading-snug text-white">{question.text}</p>
        {multi && (
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
            Flera rätta svar — välj alla
          </p>
        )}

        <div className="mt-4 space-y-2">
          {question.options.map((option, i) => {
            const isCorrect = checked && question.correctIndexes.includes(i);
            const isWrongPick = checked && picked.includes(i) && !question.correctIndexes.includes(i);
            const isPicked = !checked && picked.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                disabled={checked}
                className={[
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all",
                  isCorrect
                    ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100 answer-right"
                    : isWrongPick
                      ? "border-rose-400/60 bg-rose-500/15 text-rose-100 answer-wrong"
                      : isPicked
                        ? "border-indigo-400/70 bg-indigo-500/20 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/25 hover:bg-white/[0.06]",
                ].join(" ")}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-black/25 text-xs font-extrabold">
                  {isCorrect ? (
                    <Check className="h-4 w-4" />
                  ) : isWrongPick ? (
                    <X className="h-4 w-4" />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className="min-w-0 flex-1">{option}</span>
              </button>
            );
          })}
        </div>

        {checked && (
          <div
            className={`mt-3 rounded-xl border px-3 py-2.5 text-xs ${
              correct
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/25 bg-amber-500/10 text-amber-100"
            }`}
          >
            {correct ? (
              <p className="flex items-center gap-1.5 font-bold">
                <Check className="h-3.5 w-3.5" /> Rätt!
                {multi ? " Alla rätta svar var med." : ""}
              </p>
            ) : (
              <>
                <p className="flex items-center gap-1.5 font-bold">
                  <Lightbulb className="h-3.5 w-3.5" /> Rätt svar
                </p>
                <p className="mt-1">
                  {question.correctIndexes.map((i) => (
                    <span key={i} className="mr-2 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-200">
                      {question.options[i]}
                    </span>
                  ))}
                </p>
                {picked.length > 0 && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Du svarade: {picked.map((i) => question.options[i]).join(" · ")}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            {answered > 0 ? `Den här sessionen är värd ~${progress.into} XP så här långt` : "Rätt svar ger XP i slutet"}
          </p>
          {checked ? (
            <Button onClick={next} className="gap-2">
              {index + 1 >= queue.length ? "Visa resultat" : "Nästa"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={check} disabled={picked.length === 0} className="gap-2">
              <Check className="h-4 w-4" />
              Kontrollera
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
