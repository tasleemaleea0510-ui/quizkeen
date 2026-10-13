"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyUsername } from "@/app/settings/actions";
import { CheckCircle2, XCircle, Trophy, Loader2, Award, Clock } from "lucide-react";

const COLORS = [
  "bg-rose-600 hover:bg-rose-500",
  "bg-blue-600 hover:bg-blue-500",
  "bg-amber-600 hover:bg-amber-500",
  "bg-emerald-600 hover:bg-emerald-500",
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {phase === "waiting" && (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          <p className="text-slate-400 font-medium">Väntar på att spelledaren ska starta nästa fråga...</p>
        </div>
      )}

      {phase === "question" && question && (
        <Card className="border-slate-800 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 mb-1 block">Fråga #{question.index + 1}</span>
            <CardTitle className="text-2xl font-bold leading-tight">{question.text}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={choice !== null}
                className={`rounded-2xl p-6 text-lg font-bold text-white transition-all duration-200 ${COLORS[i]} ${
                  choice === i ? "ring-4 ring-white scale-95 shadow-lg" : "hover:scale-[1.02] active:scale-95"
                }`}
              >
                {opt}
              </button>
            ))}
          </CardContent>
          {choice !== null && (
            <div className="py-4 text-center flex items-center justify-center gap-2 text-sm text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>Svaret är registrerat! Väntar på resultatet...</span>
            </div>
          )}
        </Card>
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
          
          <div className="flex items-center justify-center gap-2">
            {choice === correctIndex ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-base font-bold text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>RÄTT SVAR!</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-base font-bold text-rose-400">
                <XCircle className="h-5 w-5" />
                <span>INTE RIKTIGT DEN HÄR GÅNGEN</span>
              </div>
            )}
          </div>

          <div className="qk-scene mx-auto w-full max-w-xl">
            <div className={`qk-card3d relative h-64 w-full ${revealFlip ? "qk-flipped" : ""}`}>
              <div className="qk-face absolute inset-0 flex items-center justify-center rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-indigo-600/30 via-slate-900 to-purple-600/30 p-6 shadow-xl">
                <div className="text-center">
                  <p className="mb-2 text-xs uppercase tracking-widest text-indigo-300 font-semibold">Fråga</p>
                  <p className="text-xl font-bold text-white">{question.text}</p>
                </div>
              </div>
              <div className="qk-face qk-back absolute inset-0 flex items-center justify-center rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-600/30 via-slate-900 to-teal-600/30 p-6 shadow-xl">
                <div className="text-center">
                  <p className="mb-2 text-xs uppercase tracking-widest text-emerald-300 font-semibold">Rätt svar</p>
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
        <Card className="border-slate-800">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Slutresultat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {leaderboard.map(([n, s], i) => (
              <div
                key={n}
                className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors ${
                  n === name ? "bg-indigo-600 text-white font-bold" : "bg-slate-900/80 border border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 font-mono font-bold text-sm ${
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