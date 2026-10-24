"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateGamePin } from "@/lib/utils";
import { HOST_PRESENCE_CONFIG, LOBBY_PING, LOBBY_PONG, onlinePlayers } from "@/lib/presence";
import { getDeck, awardXP } from "./actions";
import { Swords, Users, Clock, HelpCircle, CheckCircle2, ArrowRight, Trophy, Flag } from "lucide-react";

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

  const supabaseRef = useRef(createClient());
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
      questionsRef.current = shuffle(d.cards).map((c, idx, arr) => {
        const parts = c.back.split("|").filter(Boolean);
        const correct = parts[0] ?? c.back;
        let wrongs = parts.slice(1);
        if (wrongs.length < 3) {
          const others = arr
            .filter((o) => o !== c)
            .map((o) => o.back.split("|")[0])
            .filter((w) => w && w !== correct && !wrongs.includes(w));
          wrongs = [...wrongs, ...shuffle(others).slice(0, 3 - wrongs.length)];
        } else {
          wrongs = shuffle(wrongs).slice(0, 3);
        }
        const options = shuffle([correct, ...wrongs]);
        return { text: c.front, options, correctIndex: options.indexOf(correct) };
      });
    });
  }, [deckId]);

  useEffect(() => {
    const supabase = supabaseRef.current;

    let disposed = false;
    const lobby = supabase.channel(`lobby-${pin}`, { config: HOST_PRESENCE_CONFIG });
    const syncPlayers = () => setPlayers(onlinePlayers(lobby.presenceState()));
    // join/leave arrive the moment someone joins, sync only afterwards
    lobby.on("presence", { event: "sync" }, syncPlayers);
    lobby.on("presence", { event: "join" }, syncPlayers);
    lobby.on("presence", { event: "leave" }, syncPlayers);
    // a player's first position packet is the earliest sign of life we get
    lobby.on("broadcast", { event: "pos" }, (msg: any) => {
      const who = (msg.payload as { name?: string } | null)?.name;
      if (who) setPlayers((prev) => (prev.includes(who) ? prev : [...prev, who]));
    });
    // Answer students who type the PIN, so joining does not depend on presence.
    lobby.on("broadcast", { event: LOBBY_PING }, () => {
      lobby.send({ type: "broadcast", event: LOBBY_PONG, payload: { pin } });
    });
    const joinLobby = () => {
      lobby.subscribe((status: string) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          lobby.track({ role: "host" });
          syncPlayers();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // dropped socket: re-join so the PIN stays visible to students
          setTimeout(joinLobby, 2000);
        }
      });
    };
    joinLobby();
    lobbyRef.current = lobby;

    const game = supabase.channel(`game-${pin}`);
    game.on("broadcast", { event: "answer" }, (msg) => {
      const { name, choice, choices, acc } = msg.payload as {
        name: string;
        choice?: number;
        choices?: number[];
        acc?: string;
      };
      // A battle card always has one answer, but the player screen now sends
      // the pick as a list (quizzes can have several right answers), so take
      // the first — or the legacy single number.
      const picked = Array.isArray(choices) ? choices[0] : choice;
      if (typeof picked !== "number") return;
      answersRef.current[name] = { choice: picked, t: Date.now() };
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
      disposed = true;
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
        <p className="flex items-center justify-center gap-2 text-slate-400 font-semibold tracking-wide uppercase text-sm">
          <Swords className="h-4 w-4 text-purple-400" />
          <span>Flashcard Battle — Game PIN</span>
        </p>
        <p className="text-6xl font-extrabold tracking-widest text-purple-400 mt-2">{pin}</p>
        <p className="mt-2 text-slate-400">{deck.title}</p>
      </div>

      {phase === "lobby" && (
        <Card className="mt-8 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <span>Deltagare i lobbyn ({players.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {players.map((p) => (
                <span key={p} className="rounded-full bg-slate-800 px-3 py-1 text-sm font-medium">{p}</span>
              ))}
            </div>
            <Button size="lg" className="mt-6 w-full gap-2 bg-purple-600 hover:bg-purple-500 font-bold" onClick={startGame} disabled={questionsRef.current.length === 0}>
              <Swords className="h-5 w-5" />
              <span>STARTA STRIDEN</span>
            </Button>
            {questionsRef.current.length === 0 && (
              <p className="mt-2 text-center text-slate-500 text-sm">Lägg till några kort i den här kortleken först!</p>
            )}
          </CardContent>
        </Card>
      )}

      {phase === "question" && q && (
        <Card className="mt-8 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Kort {qIndex + 1}/{questionsRef.current.length}</span>
              <span className="flex items-center gap-1.5 text-purple-400 font-mono text-base">
                <Clock className="h-4 w-4" /> {timer}s
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-white">{q.text}</p>
          </CardContent>
        </Card>
      )}

      {phase === "reveal" && q && (
        <Card className="mt-8 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              <span>Svar: {q.options[q.correctIndex]}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.slice(0, 5).map(([name, s], i) => (
              <div key={name} className="flex justify-between items-center rounded-xl bg-slate-800/50 px-4 py-2.5">
                <span className="font-medium text-white">{i + 1}. {name}</span>
                <span className="font-bold text-purple-400">{s} p</span>
              </div>
            ))}
            <Button className="mt-4 w-full gap-2 bg-indigo-600 hover:bg-indigo-500" onClick={next}>
              {qIndex + 1 < questionsRef.current.length ? (
                <>
                  <span>Nästa kort</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Avsluta</span>
                  <Flag className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "end" && (
        <Card className="mt-8 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-400">
              <Trophy className="h-5 w-5" />
              <span>Slutresultat</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.map(([name, s], i) => (
              <div key={name} className="flex justify-between items-center rounded-xl bg-slate-800/50 px-4 py-2.5">
                <span className="font-semibold text-white">
                  <span className={`inline-block w-6 text-xs font-bold ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-500"}`}>
                    #{i + 1}
                  </span>
                  {name}
                </span>
                <span className="font-bold text-purple-400">{s} p</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}