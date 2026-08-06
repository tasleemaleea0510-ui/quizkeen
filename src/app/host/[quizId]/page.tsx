"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateGamePin } from "@/lib/utils";
import { getQuiz, awardXP } from "./actions";

type Q = { id: string; text: string; options: string[]; correctIndex: number };

export default function HostPage() {
  const params = useParams();
  const quizId = params.quizId as string;

  const [pin] = useState(() => generateGamePin());
  const [quiz, setQuiz] = useState<{ title: string; questions: Q[] } | null>(null);
  const [phase, setPhase] = useState<"lobby" | "question" | "reveal" | "end">("lobby");
  const [qIndex, setQIndex] = useState(0);
  const [players, setPlayers] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [timer, setTimer] = useState(20);

  const supabaseRef = useRef(
    createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  );
  const lobbyRef = useRef<any>(null);
  const gameRef = useRef<any>(null);
  const answersRef = useRef<Record<string, { choice: number; t: number }>>({});
  const startRef = useRef(0);
  const scoresRef = useRef<Record<string, number>>({});

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  useEffect(() => {
    getQuiz(quizId).then((q) => setQuiz(q));
  }, [quizId]);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const lobby = supabase.channel(`lobby-${pin}`);
    lobby.on("presence", { event: "sync" }, () => {
      setPlayers(Object.keys(lobby.presenceState()));
    });
    lobby.subscribe();
    lobbyRef.current = lobby;

    const game = supabase.channel(`game-${pin}`);
    game.on("broadcast", { event: "answer" }, (msg) => {
      const { name, choice } = msg.payload as { name: string; choice: number };
      answersRef.current[name] = { choice, t: Date.now() };
    });
    game.subscribe();
    gameRef.current = game;

    return () => {
      supabase.removeChannel(lobby);
      supabase.removeChannel(game);
    };
  }, [pin]);

  useEffect(() => {
    if (phase !== "question") return;
    setTimer(20);
    const iv = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(iv);
          setTimeout(reveal, 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, qIndex]);

  function broadcast(event: string, payload: unknown) {
    gameRef.current?.send({ type: "broadcast", event, payload });
  }

  function sendQuestion(i: number) {
    if (!quiz) return;
    const q = quiz.questions[i];
    answersRef.current = {};
    startRef.current = Date.now();
    broadcast("question", { index: i, text: q.text, options: q.options });
    setPhase("question");
  }

  function startGame() {
    lobbyRef.current?.send({ type: "broadcast", event: "start", payload: {} });
    setQIndex(0);
    sendQuestion(0);
  }

  function reveal() {
    if (!quiz) return;
    const q = quiz.questions[qIndex];
    const newScores = { ...scoresRef.current };
    Object.entries(answersRef.current).forEach(([name, a]) => {
      if (a.choice === q.correctIndex) {
        const speed = Math.max(0, 50 - Math.floor((a.t - startRef.current) / 400));
        newScores[name] = (newScores[name] || 0) + 100 + speed;
      }
    });
    setScores(newScores);
    broadcast("reveal", { correctIndex: q.correctIndex, scores: newScores });
    setPhase("reveal");
  }

  function next() {
    if (!quiz) return;
    const n = qIndex + 1;
    if (n < quiz.questions.length) {
      setQIndex(n);
      sendQuestion(n);
    } else {
      finish();
    }
  }

  function finish() {
    broadcast("end", { scores: scoresRef.current });
    const top = Object.entries(scoresRef.current)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([username, s], i) => ({ username, xp: s, coins: [50, 30, 20][i] || 10 }));
    awardXP(top);
    setPhase("end");
  }

  if (!quiz) return <div className="py-20 text-center text-slate-400">Loading quiz...</div>;

  const leaderboard = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="text-center">
        <p className="text-slate-400">Game PIN — share this!</p>
        <p className="text-6xl font-extrabold tracking-widest text-indigo-400">{pin}</p>
        <p className="mt-2 text-slate-400">{quiz.title}</p>
      </div>

      {phase === "lobby" && (
        <Card className="mt-8">
          <CardHeader><CardTitle>👥 Players in lobby ({players.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {players.map((p) => (
                <span key={p} className="rounded-full bg-slate-800 px-3 py-1">{p}</span>
              ))}
            </div>
            <Button size="lg" className="mt-6 w-full" onClick={startGame}>
              🚀 START GAME
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "question" && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Question {qIndex + 1}/{quiz.questions.length} — ⏱️ {timer}s</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{quiz.questions[qIndex].text}</p>
          </CardContent>
        </Card>
      )}

      {phase === "reveal" && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>✅ Answer: {quiz.questions[qIndex].options[quiz.questions[qIndex].correctIndex]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.slice(0, 5).map(([name, s], i) => (
              <div key={name} className="flex justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                <span>{i + 1}. {name}</span>
                <span>{s} pts</span>
              </div>
            ))}
            <Button className="mt-4 w-full" onClick={next}>
              {qIndex + 1 < quiz.questions.length ? "➡️ Next Question" : "🏁 Finish"}
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "end" && (
        <Card className="mt-8">
          <CardHeader><CardTitle>🏆 Final Results</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.map(([name, s], i) => (
              <div key={name} className="flex justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {name}</span>
                <span>{s} pts</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}