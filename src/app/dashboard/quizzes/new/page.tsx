"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createQuiz } from "./actions";
import {
  draftProblem,
  questionProblem,
  MAX_OPTIONS,
  MAX_OPTION,
  MAX_QUESTION,
  MAX_QUESTIONS,
  MAX_TITLE,
  MIN_OPTIONS,
  type Draft,
} from "@/lib/quiz-draft";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

// The four answer tones the live game uses, so the builder looks like the game.
const TONES = [
  { solid: "bg-rose-500", soft: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
  { solid: "bg-blue-500", soft: "border-blue-500/30 bg-blue-500/10 text-blue-300" },
  { solid: "bg-amber-500", soft: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  { solid: "bg-emerald-500", soft: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
];

type Opt = { text: string; correct: boolean };
type Q = { id: string; text: string; options: Opt[] };

// Ids only need to be stable inside this form; a counter avoids random ids
// that would differ between the server render and hydration.
let seq = 0;
const blankQuestion = (): Q => ({
  id: `q${++seq}`,
  text: "",
  options: [0, 1, 2, 3].map(() => ({ text: "", correct: false })),
});

export default function NewQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Q[]>(() => [blankQuestion()]);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recomputed on every edit, but only shown once the builder has tried to save,
  // so a fresh form does not open covered in red.
  const problems = useMemo(
    () => questions.map((q) => questionProblem({ text: q.text, options: q.options })),
    [questions]
  );

  const correctTotal = questions.reduce(
    (sum, q) => sum + q.options.filter((o) => o.correct && o.text.trim()).length,
    0
  );
  const multiCount = questions.filter((q) => q.options.filter((o) => o.correct).length > 1).length;

  function patchQuestion(i: number, fn: (q: Q) => Q) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? fn(q) : q)));
  }
  function setQuestionText(i: number, text: string) {
    patchQuestion(i, (q) => ({ ...q, text }));
  }
  function setOptionText(i: number, oi: number, text: string) {
    patchQuestion(i, (q) => ({ ...q, options: q.options.map((o, x) => (x === oi ? { ...o, text } : o)) }));
  }
  // A question may have several right answers: the badge toggles instead of
  // picking a winner, so a correct answer can never be lost by a stray click.
  function toggleCorrect(i: number, oi: number) {
    patchQuestion(i, (q) => ({
      ...q,
      options: q.options.map((o, x) => (x === oi ? { ...o, correct: !o.correct } : o)),
    }));
  }
  function addOption(i: number) {
    patchQuestion(i, (q) =>
      q.options.length >= MAX_OPTIONS ? q : { ...q, options: [...q.options, { text: "", correct: false }] }
    );
  }
  function removeOption(i: number, oi: number) {
    patchQuestion(i, (q) =>
      q.options.length <= MIN_OPTIONS ? q : { ...q, options: q.options.filter((_, x) => x !== oi) }
    );
  }
  function addQuestion() {
    setQuestions((qs) => (qs.length >= MAX_QUESTIONS ? qs : [...qs, blankQuestion()]));
  }
  function duplicateQuestion(i: number) {
    setQuestions((qs) => {
      if (qs.length >= MAX_QUESTIONS) return qs;
      const src = qs[i];
      const copy: Q = { id: `q${++seq}`, text: src.text, options: src.options.map((o) => ({ ...o })) };
      return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)];
    });
  }
  function removeQuestion(i: number) {
    setQuestions((qs) => (qs.length <= 1 ? qs : qs.filter((_, x) => x !== i)));
  }

  async function save() {
    if (saving) return;
    setAttempted(true);
    setError(null);

    const draft: Draft = {
      title,
      questions: questions.map((q) => ({
        text: q.text,
        options: q.options.map((o) => ({ text: o.text, correct: o.correct })),
      })),
    };

    const problem = draftProblem(draft);
    if (problem) {
      setError(problem);
      document.getElementById("quiz-alert")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    try {
      const res = await createQuiz(draft);
      if (!res.ok) {
        setError(res.error);
        setSaving(false);
        return;
      }
      router.push("/dashboard/quizzes");
      router.refresh();
    } catch {
      setError("Något gick fel när quizzen skulle sparas. Kontrollera anslutningen och försök igen.");
      setSaving(false);
    }
  }

  return (
    <div data-accent="sky" className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/dashboard/quizzes"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Mina quizar</span>
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">Bygg en quiz</h1>
          <p className="mt-1 text-sm text-slate-400">
            Spara frågorna här, starta dem sedan som ett live-spel med PIN-kod.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
          <span data-no-translate>{questions.length}</span> / <span data-no-translate>{MAX_QUESTIONS}</span> frågor
        </span>
      </div>

      <div id="quiz-alert" className="mt-5 space-y-3">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <Card className="mt-5 border-white/10">
        <CardContent className="pt-5">
          <label
            htmlFor="quiz-title"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Quiztitel
          </label>
          <Input
            id="quiz-title"
            value={title}
            maxLength={MAX_TITLE}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="t.ex. Matematik kap. 2"
            aria-invalid={attempted && !title.trim()}
            className={`h-12 text-base font-semibold ${attempted && !title.trim() ? "border-rose-500/60" : ""}`}
          />
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Eleverna ser titeln när de går med i spelet.</p>
            <p className="shrink-0 text-[11px] tabular-nums text-slate-500">
              <span data-no-translate>
                {title.length}/{MAX_TITLE}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-5">
        {questions.map((q, i) => {
          const problem = problems[i];
          const correctCount = q.options.filter((o) => o.correct).length;
          const invalid = attempted && !!problem;

          return (
            <Card
              key={q.id}
              className={`border-white/10 transition-colors ${invalid ? "border-rose-500/40" : ""}`}
            >
              <CardContent className="pt-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-indigo-500/30 bg-indigo-500/15 font-mono text-xs font-bold text-indigo-300">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm font-bold text-slate-200">Fråga {i + 1}</span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                        correctCount === 0
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                          : correctCount > 1
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : "border-white/10 bg-white/5 text-slate-400"
                      }`}
                    >
                      {correctCount === 0
                        ? "Inget rätt svar"
                        : correctCount > 1
                          ? `${correctCount} rätta svar`
                          : "Ett rätt svar"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => duplicateQuestion(i)}
                      disabled={questions.length >= MAX_QUESTIONS}
                      aria-label={`Kopiera fråga ${i + 1}`}
                      title="Kopiera frågan"
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(i)}
                      disabled={questions.length <= 1}
                      aria-label={`Ta bort fråga ${i + 1}`}
                      title="Ta bort frågan"
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <textarea
                  value={q.text}
                  onChange={(e) => setQuestionText(i, e.target.value)}
                  placeholder="Skriv din fråga här…"
                  rows={2}
                  maxLength={MAX_QUESTION}
                  aria-label={`Frågetext ${i + 1}`}
                  aria-invalid={invalid}
                  className={`w-full resize-y rounded-xl border bg-slate-950/60 px-4 py-3 text-base text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    invalid ? "border-rose-500/50 focus:border-rose-400" : "border-slate-700/80 focus:border-indigo-400"
                  }`}
                />

                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {q.options.map((opt, oi) => {
                    const tone = TONES[oi % TONES.length];
                    return (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCorrect(i, oi)}
                          aria-pressed={opt.correct}
                          aria-label={`Markera alternativ ${oi + 1} som rätt svar`}
                          title={opt.correct ? "Rätt svar — tryck för att ta bort" : "Markera som rätt svar"}
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white transition-all duration-150 ${tone.solid} ${
                            opt.correct ? "scale-105 ring-4 ring-white/70" : "opacity-60 hover:opacity-100"
                          }`}
                        >
                          {opt.correct ? <Check className="h-4 w-4" /> : oi + 1}
                        </button>

                        <div className="relative min-w-0 flex-1">
                          <Input
                            value={opt.text}
                            onChange={(e) => setOptionText(i, oi, e.target.value)}
                            placeholder={`Alternativ ${oi + 1}`}
                            maxLength={MAX_OPTION}
                            aria-label={`Alternativ ${oi + 1} på fråga ${i + 1}`}
                            aria-invalid={invalid}
                            className={`${opt.correct ? "border-white/25 pr-16" : ""} ${invalid ? "border-rose-500/40" : ""}`}
                          />
                          {opt.correct && (
                            <span
                              className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.soft}`}
                            >
                              Rätt
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeOption(i, oi)}
                          disabled={q.options.length <= MIN_OPTIONS}
                          aria-label={`Ta bort alternativ ${oi + 1}`}
                          title="Ta bort alternativet"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => addOption(i)}
                    disabled={q.options.length >= MAX_OPTIONS}
                    className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-semibold text-slate-400 transition-colors hover:text-white disabled:opacity-40 disabled:hover:text-slate-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Lägg till alternativ</span>
                  </button>
                  <p className="text-[11px] text-slate-500">
                    <span data-no-translate>
                      {q.options.length}/{MAX_OPTIONS}
                    </span>{" "}
                    alternativ · tryck på siffran för rätt svar, flera går bra
                  </p>
                </div>

                {invalid && problem && (
                  <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-medium text-rose-300">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{problem}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addQuestion}
        disabled={questions.length >= MAX_QUESTIONS}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-4 text-sm font-bold text-slate-300 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/5 hover:text-white disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
        <span>Lägg till fråga</span>
      </button>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
        <div className="min-w-0 text-xs text-slate-400">
          <p className="font-bold text-slate-200">
            <span data-no-translate>{questions.length}</span>{" "}
            {questions.length === 1 ? "fråga" : "frågor"} · <span data-no-translate>{correctTotal}</span> rätta svar
          </p>
          {multiCount > 0 ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-amber-300/90">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>
                <span data-no-translate>{multiCount}</span>{" "}
                {multiCount === 1 ? "fråga kräver" : "frågor kräver"} att eleven väljer alla rätta svar.
              </span>
            </p>
          ) : (
            <p className="mt-0.5">Ett rätt svar per fråga ger snabbast spel.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/quizzes">
            <Button type="button" variant="outline">
              Avbryt
            </Button>
          </Link>
          <Button type="button" onClick={save} disabled={saving} className="gap-1.5 px-6">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sparar…</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Spara quiz</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
