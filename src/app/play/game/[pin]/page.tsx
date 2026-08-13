"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyUsername } from "@/app/settings/actions";

const COLORS = [
  "bg-red-500 hover:bg-red-400",
  "bg-blue-500 hover:bg-blue-400",
  "bg-yellow-500 hover:bg-yellow-400",
  "bg-green-500 hover:bg-green-400",
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

  const supabaseRef = useRef(
    createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  );
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
      setCorrectIndex(null);
      setPhase("question");
    });

    game.on("broadcast", { event: "reveal" }, (msg) => {
      const { correctIndex: ci, scores: s } = msg.payload as {
        correctIndex: number;
        scores: Record<string, number>;
      };
      setCorrectIndex(ci);
      setScores(s);
      setPhase("reveal");
    });

    game.on("broadcast", { event: "end" }, (msg) => {
      setScores((msg.payload as { scores: Record<string, number> }).scores);
      setPhase("end");
    });

    game.on("broadcast", { event: "state" }, (msg) => {
      const p = msg.payload as any;
      if (p.kind === "question") {
        if (questionRef.current && questionRef.current.index === p.index) return;
        setQuestion({ index: p.index, text: p.text, options: p.options });
        setChoice(null);
        setCorrectIndex(null);
        setPhase("question");
      } else if (p.kind === "reveal") {
        if (phaseRef.current === "reveal" || phaseRef.current === "end") return;
        setQuestion({ index: p.index, text: p.text, options: p.options });
        setCorrectIndex(p.correctIndex);
        setScores(p.scores);
        setPhase("reveal");
      } else if (p.kind === "end") {
        setScores(p.scores);
        setPhase("end");
      }
    });

    game.subscribe((status) => {
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
    gameRef.current?.send({ type: "broadcast", event: "answer", payload: { name, choice: i, acc: accountRef.current } });
  }

  const leaderboard = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {phase === "waiting" && (
        <div className="py-20 text-center text-slate-400">Waiting for the host to start... 🎮</div>
      )}

      {phase === "question" && question && (
        <Card>
          <CardHeader><CardTitle>{question.text}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={choice !== null}
                className={`rounded-xl p-6 text-lg font-bold text-white transition-transform ${COLORS[i]} ${
                  choice === i ? "ring-4 ring-white scale-95" : "hover:scale-105"
                }`}
              >
                {opt}
              </button>
            ))}
          </CardContent>
          {choice !== null && (
            <p className="py-4 text-center text-slate-400">✅ Answer locked in! Waiting for others...</p>
          )}
        </Card>
      )}

      {phase === "reveal" && question && (
        <div className="space-y-4">
          <style>{`
            .qk-scene { perspective: 1200px; }
            .qk-card3d { transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1); }
            .qk-card3d.qk-flipped { transform: rotateY(180deg); }
            .qk-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
            .qk-back { transform: rotateY(180deg); }
          `}</style>
          <p className="text-center text-2xl font-extrabold text-white">
            {choice === correctIndex ? "🎉 CORRECT!" : "❌ Not this time!"}
          </p>
          <div className="qk-scene mx-auto w-full max-w-xl">
            <div className={`qk-card3d relative h-64 w-full ${revealFlip ? "qk-flipped" : ""}`}>
              <div className="qk-face absolute inset-0 flex items-center justify-center rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-indigo-600/30 via-slate-900 to-purple-600/30 p-6">
                <div className="text-center">
                  <p className="mb-2 text-xs uppercase tracking-widest text-indigo-300">Question</p>
                  <p className="text-xl font-bold text-white">{question.text}</p>
                </div>
              </div>
              <div className="qk-face qk-back absolute inset-0 flex items-center justify-center rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-600/30 via-slate-900 to-teal-600/30 p-6">
                <div className="text-center">
                  <p className="mb-2 text-xs uppercase tracking-widest text-emerald-300">Answer</p>
                  <p className="text-2xl font-bold text-white">{question.options[correctIndex!]}</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-slate-400">Your score: {scores[name] ?? 0} pts</p>
        </div>
      )}

      {phase === "end" && (
        <Card>
          <CardHeader><CardTitle>🏆 Final Results</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.map(([n, s], i) => (
              <div
                key={n}
                className={`flex justify-between rounded-lg px-3 py-2 ${n === name ? "bg-indigo-600" : "bg-slate-800/50"}`}
              >
                <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {n}</span>
                <span>{s} pts</span>
              </div>
            ))}
            <p className="pt-4 text-center text-slate-400">Thanks for playing QuizKeen! 🎮</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading game...</div>}>
      <GameInner />
    </Suspense>
  );
}