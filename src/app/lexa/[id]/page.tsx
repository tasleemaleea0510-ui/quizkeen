"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getLexa, completeLexa } from "@/app/classroom/actions";
import { CheckCircle2, FileText, Clock, Play, Trophy, Zap } from "lucide-react";

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

  if (!data) return <div className="py-20 text-center text-slate-400">Laddar läxa...</div>;

  if (!started && data.doneScore !== null)
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-white">Redan slutförd</h1>
        <p className="mt-2 text-slate-300">Du fick <b className="text-emerald-400">{data.doneScore}%</b> på {data.title}</p>
      </div>
    );

  if (!started)
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <FileText className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-3xl font-extrabold text-white">{data.title}</h1>
        <div className="mt-2 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <span>{data.questions.length} frågor</span>
          <span>·</span>
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <Zap className="h-3.5 w-3.5" /> +{data.bonusXP} bonus-XP
          </span>
          {data.provlage && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-600/20 px-3 py-1 text-xs font-bold text-amber-400">
              <Clock className="h-3 w-3" /> Prov-läge: 1 försök
            </span>
          )}
        </div>
        <button 
          onClick={() => setStarted(true)} 
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-base font-extrabold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Play className="h-4 w-4" />
          <span>Starta läxa</span>
        </button>
      </div>
    );

  if (result)
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Trophy className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-3xl font-extrabold text-white">{result.score}% rätt!</h1>
        <p className="mt-2 text-lg text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
          <Zap className="h-4 w-4" /> +{result.xp} XP intjänat
        </p>
      </div>
    );

  const q = data.questions[i];

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
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="text-sm font-bold text-slate-500">Fråga {i + 1} / {data.questions.length}</p>
      <h1 className="mt-2 text-2xl font-extrabold text-white">{q.text}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {q.answers.map((a) => (
          <button
            key={a.id}
            onClick={() => pick(a)}
            disabled={!!picked}
            className={`rounded-xl border px-4 py-4 text-left font-bold transition ${
              picked === a.id
                ? a.isCorrect
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                  : "border-red-500 bg-red-500/20 text-red-300"
                : "border-slate-700 bg-slate-900/60 text-white hover:border-indigo-400"
            }`}
          >
            {a.text}
          </button>
        ))}
      </div>
    </div>
  );
}