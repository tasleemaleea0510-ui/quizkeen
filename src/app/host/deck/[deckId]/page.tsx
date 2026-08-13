"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateGamePin } from "@/lib/utils";
import { getDeck, awardXP } from "./actions";

type BQ = { text: string; options: string[]; correctIndex: number };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HostDeckPage() {
  const params = useParams();
  const deckId = params.deckId as string;

  const [pin] = useState(() => generateGamePin());
  const [deck, setDeck] = useState<{ title: string; cards: { front: string; back: string }[] } | null>(null);
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
  const questionsRef = useRef<BQ[]>([]);
  const answersRef = useRef<Record<string, { choice: number; t: number }>>({});
  const accountRef = useRef<Record<string, string>>({});
  const startRef = useRef(0);
  const scoresRef = useRef<Record<string, number>>({});
  const phaseRef = useRef(phase);
  const qIndexRef = useRef(qIndex);
  const startedRef = useRef(false);

  useEffect(() => { scoresRef.current = scores; }, [scores]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);

  useEffect(() => {
    getDeck(deckId).then((d) => {
      if (!d) return;
      setDeck(d);
      questionsRef.current = shuffle(d.cards).map((c) => {
        const wrong = shuffle(d.cards.filter((o) => o.back !== c.back).map((o) => o.back)).slice(0, 3);
        const options = shuffle([c.back, ...wrong]);
        return { text: c.front, options, correctIndex: options.indexOf(c.back) };
      });
    });
  }, [deckId]);

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
      const { name, choice, acc } = msg.payload as { name: string; choice: number; acc?: string };
      answersRef.current[name] = { choice, t: Date.now() };
      if (acc) accountRef.current[name] = acc;
    });
    game.on("broadcast", { event: "sync" }, () => {
      const ph = phaseRef.current;
      const i = qIndexRef.current;
      const q = questionsRef.current[i];
      if (!q) return;
      if (ph === "question") {
        gameRef.current?.send({
          type: "broadcast", event: "state",
          payload: { kind: "question", index: i, text: q.text, options: q.options },
        });
      } else if (ph === "reveal") {
        gameRef.current?.send({
          type: "broadcast", event: "state",
          payload: { kind: "reveal", index: i, text: q.text, options: q.options, correctIndex: q.correctIndex, scores: scoresRef.current },
        });
      } else if (ph === "end") {
        gameRef.current?.send({
          type: "broadcast", event: "state",
          payload: { kind: "end", scores: scoresRef.current },
        });
      }
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
    const q = questionsRef.current[i];
    if (!q) return;
    answersRef.current = {};
    startRef.current = Date.now();
    broadcast("question", { index: i, text: q.text, options: q.options });
    setPhase("question");
  }

  function startGame() {
    if (startedRef.current || questionsRef.current.length === 0) return;
    startedRef.current = true;
    lobbyRef.current?.send({ type: "broadcast", event: "start", payload: {} });
    setQIndex(0);
    setTimeout(() => sendQuestion(0), 3000);
  }

  function reveal() {
    const q = questionsRef.current[qIndex];
    if (!q) return;
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
    const n = qIndex + 1;
    if (n < questionsRef.current.length) {
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
      .map(([display, s], i) => ({
        username: accountRef.current[display] || display,
        xp: s,
        coins: [50, 30, 20][i] || 10,
      }));
    awardXP(top);
    setPhase("end");
  }

  if (!deck) return <div className="py-20 text-center text-slate-400">Loading deck...</div>;

  const leaderboard = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const q = questionsRef.current[qIndex];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="text-center">
        <p className="text-slate-400">⚔️ FLASHCARD BATTLE — Game PIN!</p>
        <p className="text-6xl font-extrabold tracking-widest text-purple-400">{pin}</p>
        <p className="mt-2 text-slate-400">{deck.title}</p>
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
            <Button size="lg" className="mt-6 w-full" onClick={startGame} disabled={questionsRef.current.length === 0}>
              ⚔️ START BATTLE
            </Button>
            {questionsRef.current.length === 0 && (
              <p className="mt-2 text-center text-slate-500">Add some cards to this deck first!</p>
            )}
          </CardContent>
        </Card>
      )}

      {phase === "question" && q && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Card {qIndex + 1}/{questionsRef.current.length} — ⏱️ {timer}s</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">❓ {q.text}</p>
          </CardContent>
        </Card>
      )}

      {phase === "reveal" && q && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>✅ Answer: {q.options[q.correctIndex]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.slice(0, 5).map(([name, s], i) => (
              <div key={name} className="flex justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                <span>{i + 1}. {name}</span>
                <span>{s} pts</span>
              </div>
            ))}
            <Button className="mt-4 w-full" onClick={next}>
              {qIndex + 1 < questionsRef.current.length ? "➡️ Next Card" : "🏁 Finish"}
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