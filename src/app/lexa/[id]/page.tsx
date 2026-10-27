"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLexa, completeLexa } from "@/app/classroom/actions";
import { CheckCircle2, FileText, Clock, Play, Trophy, Zap, ArrowRight, RotateCcw } from "lucide-react";

/**
 * En läxa, i den nya designen.
 *
 * Tre saker som gör att sidan känns som resten av appen:
 *
 * 1. **En riktig startskärm.** Vad läxan heter, hur många frågor den har och vad
 *    den är värd — innan klockan börjar gå. Prov-läget säger till att det bara
 *    finns ett försök, i stället för att avslöja det efteråt.
 * 2. **Framsteg hela vägen.** En räknare och en bar överst, så eleven vet hur
 *    mycket som är kvar. Frågan reser in, svaren kommer en efter en.
 * 3. **Ett avslut som säger något.** Procent, XP och en ärlig rad om hur det
 *    gick — plus vägen tillbaka till klassrummet.
 */

type Q = { id: string; text: string; answers: { id: string; text: string; isCorrect: boolean }[] };

export default function LexaPage() {
  const params = useParams();
  const [data, setData] = useState<{ title: string; provlage: boolean; bonusXP: number; questions: Q[]; doneScore: number | null } | null>(null);
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; xp: number } | null>(null);
  const lock = useRef(false);
  const sent = useRef(false);

  useEffect(() => {
    getLexa(params.id as string).then((d) => setData(d));
  }, [params.id]);

  if (!data)
    return (
      <div data-accent="indigo" className="mx-auto max-w-xl px-4 py-20 text-center">
        <span className="mx-auto grid h-14 w-14 animate-pulse place-items-center rounded-2xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-300">
          <FileText className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm font-bold text-slate-400">Hämtar läxan...</p>
      </div>
    );

  if (!started && data.doneScore !== null)
    return (
      <div data-accent="emerald" className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="surface animate-pop p-8">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-white">Redan slutförd</h1>
          <p className="mt-2 text-slate-300">
            Du fick <b className="text-emerald-400 tabular">{data.doneScore}%</b> på {data.title}
          </p>
          <Link
            href="/classroom"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-500"
          >
            Till klassrummet <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );

  if (!started)
    return (
      <div data-accent="indigo" className="mx-auto max-w-xl px-4 py-14">
        <div className="surface animate-fade-up relative overflow-hidden p-8 text-center">
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-accent-soft" />
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-bright)] to-transparent" />

          <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-300 animate-float">
            <FileText className="h-8 w-8" />
          </span>
          <h1 className="relative mt-4 font-display text-3xl font-extrabold text-white">{data.title}</h1>

          <div className="relative mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-slate-400">
            <span className="surface-flat px-3 py-1.5 font-bold text-slate-300">{data.questions.length} frågor</span>
            <span className="surface-flat flex items-center gap-1 px-3 py-1.5 font-bold text-emerald-300">
              <Zap className="h-3.5 w-3.5" /> +{data.bonusXP} bonus-XP
            </span>
            {data.provlage && (
              <span className="flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-1.5 text-xs font-extrabold text-amber-300">
                <Clock className="h-3 w-3" /> Prov-läge · 1 försök
              </span>
            )}
          </div>

          <button
            onClick={() => setStarted(true)}
            className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-8 py-3 text-base font-extrabold text-white shadow-glow-sm ring-1 ring-inset ring-white/15 transition hover:from-indigo-400 hover:to-indigo-500"
          >
            <Play className="h-4 w-4" />
            <span>Starta läxa</span>
          </button>

          <p className="relative mt-4 text-xs text-slate-500">
            Du svarar en fråga i taget. Rätt svar ger XP direkt — fel svar visar det rätta innan du går vidare.
          </p>
        </div>
      </div>
    );

  if (result)
    return (
      <div data-accent="amber" className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="surface animate-pop p-8">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-300 animate-keen-wiggle">
            <Trophy className="h-8 w-8" />
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-white tabular">{result.score}%</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-wider text-slate-400">rätt på {data.title}</p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-1.5 text-sm font-extrabold text-emerald-300">
            <Zap className="h-4 w-4" /> +{result.xp} XP
          </p>
          <p className="mx-auto mt-5 max-w-sm text-sm text-slate-400">
            {result.score >= 80
              ? "Starkt jobbat — det här sitter. Repetera gloskorten i morgon så fastnar det för gott."
              : result.score >= 50
                ? "Halvvägs. Läs igenom de du missade en gång till, sedan tar du om läxan och slår ditt resultat."
                : "Ta det i lugn och ro: gör gloskorten först, sedan läxan igen. Nästa försök går bättre."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="/classroom"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-400"
            >
              Till klassrummet <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/flashcards"
              className="surface-flat inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-200 hover:border-white/20"
            >
              <RotateCcw className="h-4 w-4" /> Repetera gloskort
            </Link>
          </div>
        </div>
      </div>
    );

  const q = data.questions[i];
  const pct = Math.round((i / Math.max(1, data.questions.length)) * 100);

  function pick(a: Q["answers"][number]) {
    if (lock.current) return;
    lock.current = true;
    setPicked(a.id);
    const ok = a.isCorrect;
    const newCorrect = correct + (ok ? 1 : 0);
    if (ok) setCorrect(newCorrect);
    setTimeout(async () => {
      lock.current = false;
      setPicked(null);
      if (i + 1 < data!.questions.length) {
        setI(i + 1);
      } else if (!sent.current) {
        sent.current = true;
        const r = await completeLexa(params.id as string, newCorrect, data!.questions.length);
        setResult({ score: r?.score ?? 0, xp: r?.xp ?? 0 });
      }
    }, 900);
  }

  return (
    <div data-accent="indigo" className="mx-auto max-w-2xl px-4 py-14">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-400 tabular" data-no-translate>
          Fråga {i + 1} / {data.questions.length}
        </p>
        <span className="flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-extrabold text-emerald-300 tabular" data-no-translate>
          <CheckCircle2 className="h-3 w-3" /> {correct} rätt
        </span>
      </div>

      {/* How far the run has come. The bar moves on every question, so the end
          of a long homework is never a surprise. */}
      <div className="bar mt-3">
        <span className="bar-fill transition-[width] duration-500" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>

      <div key={q.id} className="surface mt-5 animate-rise-in p-6">
        <h1 className="font-display text-2xl font-extrabold leading-snug text-white">{q.text}</h1>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {q.answers.map((a, oi) => {
            const state =
              picked === a.id ? (a.isCorrect ? "right" : "wrong") : picked && a.isCorrect ? "reveal" : "idle";
            return (
              <button
                key={a.id}
                onClick={() => pick(a)}
                disabled={!!picked}
                style={{ animationDelay: `${60 + oi * 70}ms` }}
                className={`animate-rise-in rounded-2xl border px-4 py-4 text-left font-bold transition ${
                  state === "right"
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-[0_0_24px_-8px_rgba(52,211,153,0.8)]"
                    : state === "wrong"
                      ? "border-rose-400 bg-rose-500/20 text-rose-200"
                      : state === "reveal"
                        ? "border-emerald-400/40 bg-emerald-500/[0.07] text-emerald-200/80"
                        : "border-white/10 bg-slate-950/50 text-white hover:-translate-y-0.5 hover:border-indigo-400/60 hover:bg-white/[0.06]"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.05] font-mono text-[11px] text-slate-300">
                    {String.fromCharCode(65 + oi)}
                  </span>
                  {a.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        {data.provlage ? "Prov-läge: du har ett försök — ta god tid på dig." : "Svara i din takt. Du kan göra om läxan efteråt."}
      </p>
    </div>
  );
}
