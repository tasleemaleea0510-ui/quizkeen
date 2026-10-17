"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyUsername } from "@/app/settings/actions";
import { CheckCircle2, XCircle, Trophy, Loader2 } from "lucide-react";
import { WornBuddy } from "@/components/keens/worn-keen";

const COLORS = [
  "from-rose-500 to-rose-600 shadow-rose-900/40",
  "from-sky-500 to-blue-600 shadow-blue-900/40",
  "from-amber-400 to-amber-600 shadow-amber-900/40",
  "from-emerald-500 to-emerald-600 shadow-emerald-900/40",
];

const SHAPES = [
  <svg key="t" viewBox="0 0 24 24" className="h-6 w-6 opacity-90" fill="currentColor"><path d="M12 3l9 17H3z" /></svg>,
  <svg key="d" viewBox="0 0 24 24" className="h-6 w-6 opacity-90" fill="currentColor"><path d="M12 2l10 10-10 10L2 12z" /></svg>,
  <svg key="c" viewBox="0 0 24 24" className="h-6 w-6 opacity-90" fill="currentColor"><circle cx="12" cy="12" r="9" /></svg>,
  <svg key="s" viewBox="0 0 24 24" className="h-6 w-6 opacity-90" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>,
];

type Question = { index: number; text: string; options: string[] };

function GameInner() {
  const params = useParams();
  const search = useSearchParams();
  const pin = params.pin as string;
  const name = search.get("name") || "Player";

  const [question, setQuestion] = useState<Question | null>(null);
  const [phase, setPhase] = useState<"waiting" | "question" | "reveal" | "end">("waiting");
  const [choice, setChoice] = useState<number | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});

  const phaseRef = useRef(phase);
  const questionRef = useRef<Question | null>(null);
  const [revealFlip, setRevealFlip] = useState(false);
  useEffect(() => {
    if (phase === "reveal") {
      setRevealFlip(false);
      const t = setTimeout(() => setRevealFlip(true), 500);
      return () => clearTimeout(t);
    }
  }, [phase]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { questionRef.current = question; }, [question]);

  const supabaseRef = useRef(createClient());
  const gameRef = useRef<any>(null);
  const accountRef = useRef("");

  useEffect(() => {
    getMyUsername().then((u) => {
      if (u) accountRef.current = u;
    });
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    const game = supabase.channel(`game-${pin}`);

    game.on("broadcast", { event: "question" }, (msg) => {
      setQuestion(msg.payload as Question);
      setChoice(null);
      setPhase("question");
    });

    game.on("broadcast", { event: "reveal" }, (msg) => {
      const p = msg.payload as { correctIndex: number; scores: Record<string, number> };
      setCorrectIndex(p.correctIndex);
      setScores(p.scores || {});
      setPhase("reveal");
    });

    game.on("broadcast", { event: "end" }, (msg) => {
      const p = msg.payload as { scores: Record<string, number> };
      setScores(p.scores || {});
      setPhase("end");
    });

    game.on("broadcast", { event: "state" }, (msg) => {
      const p = msg.payload as any;
      if (p.kind === "question") {
        setQuestion({ index: p.index, text: p.text, options: p.options });
        setPhase("question");
      } else if (p.kind === "reveal") {
        setQuestion({ index: p.index, text: p.text, options: p.options });
        setCorrectIndex(p.correctIndex);
        setScores(p.scores || {});
        setPhase("reveal");
      } else if (p.kind === "end") {
        setScores(p.scores || {});
        setPhase("end");
      }
    });

    game.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        game.send({ type: "broadcast", event: "sync", payload: {} });
      }
    });

    gameRef.current = game;
    return () => {
      supabase.removeChannel(game);
    };
  }, [pin]);

  function answer(i: number) {
    if (choice !== null) return;
    setChoice(i);
    gameRef.current?.send({
      type: "broadcast",
      event: "answer",
      payload: { name, choice: i, acc: accountRef.current || undefined },
    });
  }

  const leaderboard = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  const myScore = scores[name] ?? scores[accountRef.current] ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Who you are in this game: the Keen you wear, and your points so far. */}
      <WornBuddy
        label="Du spelar som"
        className="mb-5"
        right={
          <span data-no-translate className="shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-extrabold text-amber-200">
            {myScore} p
          </span>
        }
      />

      {phase === "waiting" && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          </span>
          <p className="font-medium text-slate-400">Väntar på att spelledaren ska starta nästa fråga...</p>
        </div>
      )}

      {phase === "question" && question && (
        <div className="animate-fade-up space-y-6">
          <div className="text-center">
            <span className="mx-auto mb-3 inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Fråga #{question.index + 1}
            </span>
            <h1 className="font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl">{question.text}</h1>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {question.options.map((opt, i) => {
              const selected = choice === i;
              const dimmed = choice !== null && !selected;
              return (
                <button
                  key={i}
                  onClick={() => answer(i)}
                  disabled={choice !== null}
                  className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br p-6 text-left text-lg font-bold text-white shadow-raise transition-all duration-200 ${COLORS[i % 4]} ${
                    selected ? "scale-[0.98] ring-4 ring-white/80" : dimmed ? "opacity-40" : "hover:-translate-y-0.5 hover:brightness-110"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/20 text-white">
                    {SHAPES[i % 4]}
                  </span>
                  <span className="leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>

          {choice !== null && (
            <div className="flex animate-fade-in items-center justify-center gap-2 text-sm font-medium text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Svaret är registrerat! Väntar på resultatet...</span>
            </div>
          )}
        </div>
      )}

      {phase === "reveal" && question && (
        <div className="space-y-6">
          <style>{`
            .qk-scene { perspective: 1200px; }
            .qk-card3d { transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1); }
            .qk-card3d.qk-flipped { transform: rotateY(180deg); }
            .qk-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
            .qk-back { transform: rotateY(180deg); }
          `}</style>

          <div className="flex items-center justify-center">
            {choice === correctIndex ? (
              <div className="inline-flex animate-pop items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-base font-bold text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>RÄTT SVAR!</span>
              </div>
            ) : (
              <div className="inline-flex animate-pop items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-5 py-2 text-base font-bold text-rose-400">
                <XCircle className="h-5 w-5" />
                <span>INTE RIKTIGT DEN HÄR GÅNGEN</span>
              </div>
            )}
          </div>

          <div className="qk-scene mx-auto w-full max-w-xl">
            <div className={`qk-card3d relative h-64 w-full ${revealFlip ? "qk-flipped" : ""}`}>
              <div className="qk-face absolute inset-0 flex items-center justify-center rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-indigo-600/30 via-slate-900 to-purple-600/30 p-6 shadow-card">
                <div className="text-center">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">Fråga</p>
                  <p className="text-xl font-bold text-white">{question.text}</p>
                </div>
              </div>
              <div className="qk-face qk-back absolute inset-0 flex items-center justify-center rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-600/30 via-slate-900 to-teal-600/30 p-6 shadow-card">
                <div className="text-center">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-300">Rätt svar</p>
                  <p className="text-2xl font-bold text-white">{question.options[correctIndex!]}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center text-sm font-mono text-slate-400">
            Din poäng: <span className="font-bold text-white">{scores[name] ?? 0}</span> poäng
          </div>
        </div>
      )}

      {phase === "end" && (
        <Card className="animate-fade-up border-white/10">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/20 text-amber-400">
              <Trophy className="h-7 w-7" />
            </div>
            <CardTitle className="font-display text-2xl font-bold">Slutresultat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {leaderboard.map(([n, s], i) => (
              <div
                key={n}
                className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors ${
                  n === name
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 font-bold text-white shadow-glow-sm"
                    : "border border-white/5 bg-slate-900/60 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 font-mono text-sm font-bold ${
                    i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-500"
                  }`}>
                    {i + 1}
                  </span>
                  <span>{n}</span>
                </div>
                <span className="font-mono">{s} poäng</span>
              </div>
            ))}
            <p className="pt-4 text-center text-xs text-slate-500">Tack för att du deltog i QuizKeen</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Laddar spelet...</div>}>
      <GameInner />
    </Suspense>
  );
}
