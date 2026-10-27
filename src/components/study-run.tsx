"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WornBuddy } from "@/components/keens/worn-keen";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles, X } from "lucide-react";

/**
 * Study — the solo mode.
 *
 * The same questions a match would ask, with none of the pressure: no lobby, no
 * clock, no rival opening a chest behind your back. You answer, you find out
 * immediately whether you were right, and the ones you missed come back as a
 * second run at the end. It is the mode for the night before a test, which is
 * where a class actually needs help.
 */
export type StudyQuestion = { id: string; text: string; options: string[]; correctIndexes: number[] };

/** A set comparison, because a multi-answer question needs all of them. */
function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.every((v, i) => v === right[i]);
}

export default function StudyRun({ title, questions }: { title: string; questions: StudyQuestion[] }) {
  const [queue, setQueue] = useState<StudyQuestion[]>(questions);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [lastRight, setLastRight] = useState(false);
  const [right, setRight] = useState(0);
  const [missed, setMissed] = useState<StudyQuestion[]>([]);

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

  // ── Finished: score, then the mistakes, which are the point of studying ──
  if (index >= queue.length) {
    const total = queue.length;
    const perfect = missed.length === 0;
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_14px_34px_-14px_rgba(99,102,241,0.95)] ring-1 ring-inset ring-white/20">
            <Sparkles className="h-6 w-6 text-white" />
          </span>
          <h1 className="page-title">Klart!</h1>
          <p className="mt-2 text-sm text-slate-400">
            Du hade <span className="font-extrabold text-white">{right}</span> av{" "}
            <span className="font-extrabold text-white">{total}</span> rätt
            {perfect ? " — allt satt." : "."}
          </p>
        </div>

        <div className="mt-6">
          <WornBuddy label={perfect ? "Helt perfekt" : "Nu tar vi om det svåra"} />
        </div>

        {missed.length > 0 && (
          <div className="mt-6 space-y-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Repetera ({missed.length})
            </h2>
            {missed.map((q) => (
              <div key={q.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">{q.text}</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-300">
                  <Check className="h-3.5 w-3.5" />
                  {q.correctIndexes.map((i) => q.options[i]).join(" · ")}
                </p>
              </div>
            ))}
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
                setPicked([]);
                setChecked(false);
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
              setPicked([]);
              setChecked(false);
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
    if (ok) setRight((r) => r + 1);
    else setMissed((m) => [...m, question]);
  }

  function next() {
    setIndex((i) => i + 1);
    setPicked([]);
    setChecked(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/study" className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Study
        </Link>
        <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-200">
          {index + 1} / {queue.length}
        </span>
      </div>

      <h1 className="mt-4 text-center font-display text-xl font-extrabold tracking-tight text-white">{title}</h1>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-[width] duration-500 ease-out"
          style={{ width: `${(index / queue.length) * 100}%` }}
        />
      </div>

      <div className="mt-5">
        <WornBuddy
          label={checked ? (lastRight ? "Rätt!" : "Inte riktigt — rätt svar är grönt") : "Ingen timer. Ta den tid du behöver."}
        />
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
        <p className="text-base font-bold leading-snug text-white">{question.text}</p>
        {multi && <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-indigo-300">Flera rätta svar</p>}

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
                    ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                    : isWrongPick
                      ? "border-rose-400/60 bg-rose-500/15 text-rose-100"
                      : isPicked
                        ? "border-indigo-400/70 bg-indigo-500/20 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/25 hover:bg-white/[0.06]",
                ].join(" ")}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-black/25 text-xs font-extrabold">
                  {isCorrect ? <Check className="h-4 w-4" /> : isWrongPick ? <X className="h-4 w-4" /> : String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0 flex-1">{option}</span>
              </button>
            );
          })}
        </div>

        {checked && !correct && (
          <p className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">
            Rätt svar: {question.correctIndexes.map((i) => question.options[i]).join(" · ")}
          </p>
        )}

        <div className="mt-4 flex justify-end">
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
