"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const supabaseRef = useRef(
    createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  );
  const gameRef = useRef<any>(null);

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

    game.subscribe();
    gameRef.current = game;

    return () => {
      supabase.removeChannel(game);
    };
  }, [pin]);

  function answer(i: number) {
    if (choice !== null) return;
    setChoice(i);
    gameRef.current?.send({ type: "broadcast", event: "answer", payload: { name, choice: i } });
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
        <Card>
          <CardHeader>
            <CardTitle>{choice === correctIndex ? "🎉 CORRECT!" : "❌ Not this time!"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-slate-300">
              Correct answer: <span className="font-bold text-emerald-400">{question.options[correctIndex!]}</span>
            </p>
            <p className="text-slate-400">Your score: {scores[name] ?? 0} pts</p>
          </CardContent>
        </Card>
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