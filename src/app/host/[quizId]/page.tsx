"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateGamePin } from "@/lib/utils";
import { getQuiz, awardXP } from "./actions";
import { Users, Play, Clock, CheckCircle2, ArrowRight, Trophy } from "lucide-react";

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

  const supabaseRef = useRef(createClient());
  const lobbyRef = useRef<any>(null);
  const gameRef = useRef<any>(null);
  const answersRef = useRef<Record<string, { choice: number; t: number }>>({});
  const accountRef = useRef<Record<string, string>>({});
  const startRef = useRef(0);
  const scoresRef = useRef<Record<string, number>>({});
  const phaseRef = useRef(phase);
  const qIndexRef = useRef(qIndex);
  const quizRef = useRef<{ title: string; questions: Q[] } | null>(null);
  const startedRef = useRef(false);

  useEffect(() => { scoresRef.current = scores; }, [scores]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);
  useEffect(() => { quizRef.current = quiz; }, [quiz]);

  useEffect(() => {
    getQuiz(quizId).then((q) => setQuiz(q));
  }, [quizId]);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const lobby = supabase.channel(`lobby-${pin}`);
    lobby.on("presence", { event: "sync" }, () => {
      setPlayers(Object.keys(lobby.presenceState()));
    });
    lobby.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        lobby.track({ role: "host" });
      }
    });
    lobbyRef.current = lobby;

    const game = supabase.channel(`game-${pin}`);
    game.on("broadcast", { event: "answer" }, (msg) => {
      const { name, choice, acc } = msg.payload as { name: string; choice: number; acc?: string };
      answersRef.current[name] = { choice, t: Date.now() };
      if (acc) accountRef.current[name] = acc;
    });
    game.on("broadcast", { event: "sync" }, () => {
      const qz = quizRef.current;
      if (!qz) return;
      const ph = phaseRef.current;
      const i = qIndexRef.current;
      const q = qz.questions[i];
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
    if (!quiz) return;
    const q = quiz.questions[i];
    answersRef.current = {};
    startRef.current = Date.now();
    broadcast("question", { index: i, text: q.text, options: q.options });
    setPhase("question");
  }

  function startGame() {
    if (startedRef.current) return;
    startedRef.current = true;
    lobbyRef.current?.send({ type: "broadcast", event: "start", payload: {} });
    setQIndex(0);
    setTimeout(() => sendQuestion(0), 3000);
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
      .map(([display, s], i) => ({
        username: accountRef.current[display] || display,
        xp: s,
        coins: [50, 30, 20][i] || 10,
      }));
    awardXP(top);
    setPhase("end");
  }

  if (!quiz) return <div className="py-20 text-center text-slate-400">Laddar frågesport...</div>;

  const leaderboard = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="text-center">
        <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Spel-PIN — dela denna kod</p>
        <p className="text-6xl font-mono font-extrabold tracking-widest text-indigo-400 my-1">{pin}</p>
        <p className="text-sm font-medium text-slate-400">{quiz.title}</p>
      </div>

      {phase === "lobby" && (
        <Card className="mt-8 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" />
              <span>Spelare i lobbyn ({players.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              {players.length === 0 && (
                <span className="text-sm text-slate-500 self-center">Väntar på att spelare ansluter...</span>
              )}
              {players.map((p) => (
                <span key={p} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm text-slate-200">
                  {p}
                </span>
              ))}
            </div>
            <Button size="lg" className="mt-6 w-full gap-2 bg-indigo-600 hover:bg-indigo-500" onClick={startGame}>
              <Play className="h-5 w-5 fill-current" />
              <span>STARTA SPELET</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "question" && (
        <Card className="mt-8 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800/80">
            <span className="text-sm font-semibold text-slate-400">
              Fråga {qIndex + 1} av {quiz.questions.length}
            </span>
            <div className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-mono font-bold text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              <span>{timer}s</span>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-white leading-relaxed">{quiz.questions[qIndex].text}</p>
          </CardContent>
        </Card>
      )}

      {phase === "reveal" && (
        <Card className="mt-8 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2 text-emerald-400 text-lg font-bold">
              <CheckCircle2 className="h-5 w-5" />
              <span>Rätt svar: {quiz.questions[qIndex].options[quiz.questions[qIndex].correctIndex]}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-2">Topp 5 ställning</p>
            {leaderboard.slice(0, 5).map(([name, s], i) => (
              <div key={name} className="flex justify-between items-center rounded-xl bg-slate-900/80 border border-slate-800 px-4 py-2.5">
                <span className="font-medium text-slate-200">{i + 1}. {name}</span>
                <span className="font-mono text-sm text-indigo-300 font-bold">{s} poäng</span>
              </div>
            ))}
            <Button className="mt-6 w-full gap-2 bg-indigo-600 hover:bg-indigo-500" onClick={next}>
              {qIndex + 1 < quiz.questions.length ? (
                <>
                  <span>Nästa fråga</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Visa slutresultat</span>
                  <Trophy className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "end" && (
        <Card className="mt-8 border-slate-800">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Slutresultat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {leaderboard.map(([name, s], i) => (
              <div key={name} className="flex justify-between items-center rounded-xl bg-slate-900/80 border border-slate-800 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className={`w-6 font-mono font-bold text-sm ${
                    i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-500"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="font-medium text-slate-200">{name}</span>
                </div>
                <span className="font-mono text-sm text-indigo-300 font-bold">{s} poäng</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}