"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateGamePin } from "@/lib/utils";
import {
  HOST_PRESENCE_CONFIG,
  LOBBY_PING,
  LOBBY_PONG,
  onlinePlayerEntries,
} from "@/lib/presence";
import Link from "next/link";
import { getQuiz, awardXP } from "./actions";
import { isExactAnswer } from "@/lib/quiz-draft";
import { Users, Play, Clock, CheckCircle2, ArrowRight, Trophy, Crown, SkipForward, Zap } from "lucide-react";
import KeenAvatar from "@/components/keens/keen-avatar";
import { KEEN_BY_ID } from "@/lib/keens";
import {
  HEIST_MODES,
  MODE_RULES,
  addCorrect,
  applyAction,
  mintPayout,
  newHeist,
  nextRound,
  standings,
  type HeistAction,
  type HeistState,
  type ModeId,
} from "@/lib/game-modes";

type Q = { id: string; text: string; options: string[]; correctIndexes: number[] };

// How long a question stays open when nobody answers. The host can always end
// it sooner, and it ends by itself the moment every player has answered.
const QUESTION_SECONDS = 20;

export default function HostPage() {
  const params = useParams();
  const quizId = params.quizId as string;

  const [pin] = useState(() => generateGamePin());
  const [quiz, setQuiz] = useState<{ title: string; questions: Q[] } | null>(null);
  const [phase, setPhase] = useState<"lobby" | "question" | "reveal" | "end">("lobby");
  const [qIndex, setQIndex] = useState(0);
  const [players, setPlayers] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [timer, setTimer] = useState(QUESTION_SECONDS);
  // A deleted or mistyped quiz id used to leave the host on "Laddar…" forever.
  const [missing, setMissing] = useState(false);
  // Live count of answers on the current question (the ref above does not
  // re-render, so the screen would otherwise sit on "0 har svarat").
  const [answered, setAnswered] = useState(0);
  // Who the game started with. The lobby empties the moment players move to
  // the game screen, so the presence list cannot be the yardstick for
  // "everyone has answered" — this frozen roster is.
  const [roster, setRoster] = useState<string[]>([]);
  // Which economy the match runs. Classic is the plain quiz; the other three
  // add the heist layer, and the host picks before the game starts.
  const [mode, setMode] = useState<ModeId>("classic");
  const [heist, setHeist] = useState<HeistState | null>(null);

  const supabaseRef = useRef(createClient());
  const lobbyRef = useRef<any>(null);
  const gameRef = useRef<any>(null);
  const answersRef = useRef<Record<string, { choices: number[]; t: number }>>({});
  // Set while a question is being revealed, so the clock and the
  // "everyone answered" watcher cannot score the same question twice.
  const revealedRef = useRef(false);
  const revealRef = useRef<() => void>(() => {});
  const accountRef = useRef<Record<string, string>>({});
  const startRef = useRef(0);
  const scoresRef = useRef<Record<string, number>>({});
  const phaseRef = useRef(phase);
  const qIndexRef = useRef(qIndex);
  const quizRef = useRef<{ title: string; questions: Q[] } | null>(null);
  const startedRef = useRef(false);
  const modeRef = useRef<ModeId>("classic");
  const heistRef = useRef<HeistState | null>(null);
  // The Keen each lobby player wears, so the heist board draws real characters.
  const keensRef = useRef<Record<string, string | null>>({});

  useEffect(() => { scoresRef.current = scores; }, [scores]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);
  useEffect(() => { quizRef.current = quiz; }, [quiz]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    getQuiz(quizId)
      .then((q) => (q ? setQuiz(q) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [quizId]);

  /** Push a heist snapshot to this screen and to every device in the game. */
  function publishHeist(next: HeistState, note?: { to: string; text: string }) {
    heistRef.current = next;
    setHeist(next);
    gameRef.current?.send({ type: "broadcast", event: "heist", payload: next });
    if (note) gameRef.current?.send({ type: "broadcast", event: "heist-note", payload: note });
  }

  useEffect(() => {
    const supabase = supabaseRef.current;

    let disposed = false;
    const lobby = supabase.channel(`lobby-${pin}`, { config: HOST_PRESENCE_CONFIG });
    const syncPlayers = () => {
      const entries = onlinePlayerEntries(lobby.presenceState());
      const keens: Record<string, string | null> = {};
      for (const e of entries) keens[e.name] = e.keen;
      keensRef.current = keens;
      setPlayers(entries.map((e) => e.name));
    };
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
      // `choices` is the current shape — a question may have several right
      // answers — while `choice` is what the flashcard battle still sends.
      const picked = Array.isArray(choices) ? choices : typeof choice === "number" ? [choice] : [];
      answersRef.current[name] = { choices: picked, t: Date.now() };
      if (acc) accountRef.current[name] = acc;
      // Link the seat to the account as soon as we learn it, so the Mint at the
      // end reaches a real profile even though the roster only held nicknames.
      const h = heistRef.current;
      if (acc && h?.players[name]) {
        h.players[name].account = acc;
      }
      setAnswered(Object.keys(answersRef.current).length);
    });
    // A player raiding, fortifying or saving. The host is the only authority on
    // the economy: the browser sends an intention, this decides the outcome.
    game.on("broadcast", { event: "heist-action" }, (msg) => {
      const { name, action } = (msg.payload ?? {}) as { name?: string; action?: HeistAction };
      const h = heistRef.current;
      if (!h || !name || !action) return;
      if (phaseRef.current !== "question" && phaseRef.current !== "reveal") {
        game.send({ type: "broadcast", event: "heist-note", payload: { to: name, text: "Matchen är inte igång." } });
        return;
      }
      const result = applyAction(h, name, action, Date.now());
      if (!result.ok) {
        game.send({ type: "broadcast", event: "heist-note", payload: { to: name, text: result.error } });
        return;
      }
      publishHeist(result.state);
    });
    game.on("broadcast", { event: "sync" }, () => {
      const qz = quizRef.current;
      if (heistRef.current) {
        game.send({ type: "broadcast", event: "heist", payload: heistRef.current });
      }
      if (!qz) return;
      const ph = phaseRef.current;
      const i = qIndexRef.current;
      const q = qz.questions[i];
      if (!q) return;
      if (ph === "question") {
        gameRef.current?.send({
          type: "broadcast", event: "state",
          payload: { kind: "question", index: i, text: q.text, options: q.options, correctCount: q.correctIndexes.length },
        });
      } else if (ph === "reveal") {
        gameRef.current?.send({
          type: "broadcast", event: "state",
          payload: { kind: "reveal", index: i, text: q.text, options: q.options, correctIndexes: q.correctIndexes, scores: scoresRef.current },
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

  // The clock still runs down, but it is no longer the only way out.
  useEffect(() => {
    if (phase !== "question") return;
    setTimer(QUESTION_SECONDS);
    const iv = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(iv);
  }, [phase, qIndex]);

  useEffect(() => {
    if (phase === "question" && timer === 0) revealRef.current();
  }, [phase, timer]);

  useEffect(() => {
    if (phase !== "question") return;
    if (roster.length === 0 || answered < roster.length) return;
    // Everyone who started has answered: a short beat so the last click
    // lands, then the result — nobody has to sit out the rest of the clock.
    const t = setTimeout(() => revealRef.current(), 600);
    return () => clearTimeout(t);
  }, [phase, answered, roster.length]);

  function broadcast(event: string, payload: unknown) {
    gameRef.current?.send({ type: "broadcast", event, payload });
  }

  function sendQuestion(i: number) {
    if (!quiz) return;
    const q = quiz.questions[i];
    if (!q) return;
    answersRef.current = {};
    revealedRef.current = false;
    setAnswered(0);
    // Reset the clock in the same render that opens the question, otherwise the
    // "timer hit 0" watcher sees the previous question's 0 and reveals at once.
    setTimer(QUESTION_SECONDS);
    startRef.current = Date.now();
    // A new round is when heist energy refills: the next correct answer pays.
    if (heistRef.current) publishHeist(nextRound(heistRef.current));
    broadcast("question", { index: i, text: q.text, options: q.options, correctCount: q.correctIndexes.length });
    setPhase("question");
  }

  function startGame() {
    if (startedRef.current) return;
    startedRef.current = true;
    // Freeze the player list now: everyone about to leave the lobby for the
    // game screen is exactly who the first question should wait for.
    setRoster(players);
    const chosen = modeRef.current;
    if (chosen !== "classic" && players.length > 0) {
      // Every seat starts equal — the mode rules say so, and it is what makes a
      // classroom match fair to someone who joined five seconds ago.
      publishHeist(newHeist(chosen, players.map((name) => ({ name, keen: keensRef.current[name] ?? null }))));
    }
    lobbyRef.current?.send({ type: "broadcast", event: "start", payload: { mode: chosen } });
    setQIndex(0);
    setTimeout(() => sendQuestion(0), 3000);
  }

  function reveal() {
    if (phaseRef.current !== "question" || revealedRef.current) return;
    const q = quizRef.current?.questions[qIndexRef.current];
    if (!q) return;
    revealedRef.current = true;

    const newScores = { ...scoresRef.current };
    let nextHeist = heistRef.current;
    Object.entries(answersRef.current).forEach(([name, a]) => {
      // An exact set: on a multi-answer question, choosing some of the right
      // answers is not the same as knowing which ones they are.
      if (isExactAnswer(a.choices, q.correctIndexes)) {
        const speed = Math.max(0, 50 - Math.floor((a.t - startRef.current) / 400));
        newScores[name] = (newScores[name] || 0) + 100 + speed;
        if (nextHeist) nextHeist = addCorrect(nextHeist, name);
      }
    });
    setScores(newScores);
    broadcast("reveal", { correctIndexes: q.correctIndexes, scores: newScores });
    if (nextHeist) publishHeist(nextHeist);
    setPhase("reveal");
  }

  // The clock and the watcher run outside React's render, so they ask this ref
  // for the newest reveal rather than capturing an old question.
  useEffect(() => {
    revealRef.current = reveal;
  });

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
    const finished = heistRef.current;
    // Mint per display name, so the player's own screen can show what it earned.
    const mintByName: Record<string, number> = {};
    if (finished) {
      // A heist match pays Mint by placement plus a capped raid bonus. The XP
      // still comes from the quiz points, because those are the answers.
      const payout = mintPayout(finished);
      for (const [display, seat] of Object.entries(finished.players)) {
        const paid = payout.find((p) => p.username === (seat.account ?? seat.name));
        if (paid) mintByName[display] = paid.mint;
      }
      awardXP(
        payout.map((p) => {
          const seat = Object.values(finished.players).find((s) => (s.account ?? s.name) === p.username);
          return { username: p.username, xp: seat ? scoresRef.current[seat.name] ?? 0 : 0, coins: p.mint };
        })
      );
    } else {
      const top = Object.entries(scoresRef.current)
        .sort((a, b) => b[1] - a[1])
        .map(([display, s], i) => ({
          username: accountRef.current[display] || display,
          xp: s,
          coins: [50, 30, 20][i] || 10,
        }));
      awardXP(top);
    }
    broadcast("end", { scores: scoresRef.current, mint: mintByName });
    setPhase("end");
  }

  if (missing) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-lg font-bold text-white">Quizzen hittades inte</p>
        <p className="mt-1 text-sm text-slate-400">Den kan ha tagits bort. Välj en annan quiz i listan.</p>
        <Link href="/dashboard/quizzes">
          <Button className="mt-5">Mina quizar</Button>
        </Link>
      </div>
    );
  }

  if (!quiz) return <div className="py-20 text-center text-slate-400">Laddar frågesport...</div>;

  const leaderboard = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const total = quiz.questions.length;
  const progress = total > 0 ? ((qIndex + (phase === "lobby" ? 0 : 1)) / total) * 100 : 0;
  const heistBoard = heist ? standings(heist) : [];
  const heistRules = heist ? MODE_RULES[heist.mode] : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Spel-PIN — dela denna kod</p>
        <p className="my-1 font-mono text-6xl font-extrabold tracking-[0.2em] text-transparent sm:text-7xl">
          <span className="text-gradient animate-gradient-pan bg-[length:200%_auto]">{pin}</span>
        </p>
        <p className="text-sm font-medium text-slate-400">{quiz.title}</p>
      </div>

      {phase !== "lobby" && (
        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Fråga {Math.min(qIndex + 1, total)} av {total}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {phase === "lobby" && (
        <Card className="mt-8">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-indigo-400" />
              <span>Spelare i lobbyn ({players.length})</span>
            </CardTitle>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-glow-sm" />
          </CardHeader>
          <CardContent>
            {/* Mode: the plain quiz, or one of the three heist economies. */}
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Spelläge</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => setMode("classic")}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  mode === "classic"
                    ? "border-indigo-400/60 bg-indigo-500/15"
                    : "border-white/10 bg-slate-950/50 hover:border-white/25"
                }`}
              >
                <span className="block text-sm font-extrabold text-white">Klassisk quiz</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">Bara frågor och poäng.</span>
              </button>
              {HEIST_MODES.map((m) => {
                const r = MODE_RULES[m];
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? "border-indigo-400/60 bg-indigo-500/15"
                        : "border-white/10 bg-slate-950/50 hover:border-white/25"
                    }`}
                  >
                    <span className="block text-sm font-extrabold text-white">{r.name}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">{r.tagline}</span>
                  </button>
                );
              })}
            </div>
            {mode !== "classic" && (
              <p className="mt-2 text-[11px] text-slate-500">
                Alla börjar med {MODE_RULES[mode as keyof typeof MODE_RULES].startBalance} i{" "}
                {MODE_RULES[mode as keyof typeof MODE_RULES].currency.toLowerCase()}. Rätt svar ger{" "}
                {MODE_RULES[mode as keyof typeof MODE_RULES].correctBalance} — och matchen slutar med Mint.
              </p>
            )}

            <div className="mt-4 flex min-h-[72px] flex-wrap gap-2 rounded-xl border border-white/5 bg-slate-950/60 p-4">
              {players.length === 0 && (
                <span className="self-center text-sm text-slate-500">Väntar på att spelare ansluter...</span>
              )}
              {players.map((p) => {
                const keen = keensRef.current[p] ? KEEN_BY_ID[keensRef.current[p] as string] : undefined;
                return (
                  <span
                    key={p}
                    className="flex animate-pop items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-sm font-medium text-slate-200"
                  >
                    {keen && <KeenAvatar keen={keen} size={22} />}
                    {p}
                  </span>
                );
              })}
            </div>
            <Button
              size="lg"
              className="mt-6 w-full gap-2"
              onClick={startGame}
              disabled={quiz.questions.length === 0}
            >
              <Play className="h-5 w-5 fill-current" />
              <span>STARTA SPELET</span>
            </Button>
            {quiz.questions.length === 0 && (
              <p className="mt-3 text-center text-sm font-medium text-amber-300">
                Quizzen har inga frågor än. Lägg till minst en innan du startar.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {phase === "question" && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-3">
            <span className="text-sm font-semibold text-slate-400">
              Fråga {qIndex + 1} av {total}
            </span>
            <div className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 font-mono text-xs font-bold text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              <span>{timer}s</span>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${timer <= 5 ? "bg-rose-500" : "bg-amber-400"}`}
                style={{ width: `${(timer / QUESTION_SECONDS) * 100}%` }}
              />
            </div>
            <p className="text-2xl font-bold leading-relaxed text-white sm:text-3xl">{quiz.questions[qIndex].text}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-sm text-slate-400">
                <Users className="h-4 w-4" />
                <span>
                  <b className="text-slate-200" data-no-translate>
                    {answered}
                  </b>
                  {roster.length > 0 ? ` av ${roster.length}` : ""} har svarat
                </span>
              </p>
              {roster.length > 0 && answered >= roster.length && (
                <span className="flex animate-fade-in items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
                  <Zap className="h-3 w-3" />
                  Alla har svarat
                </span>
              )}
            </div>

            <Button className="mt-5 w-full gap-2" variant="secondary" onClick={() => revealRef.current()}>
              <SkipForward className="h-4 w-4" />
              <span>Visa rätt svar nu</span>
            </Button>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Går vidare av sig själv när alla har svarat — eller direkt när du trycker. Annars avslutas frågan
              när klockan når 0.
            </p>
          </CardContent>
        </Card>
      )}

      {phase === "reveal" && (
        <Card className="mt-6">
          <CardHeader className="border-b border-white/5 pb-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>{quiz.questions[qIndex].correctIndexes.length > 1 ? "Rätta svar" : "Rätt svar"}</span>
              </span>
              <span className="flex flex-wrap gap-1.5">
                {quiz.questions[qIndex].correctIndexes.map((ci) => (
                  <span
                    key={ci}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-sm font-bold text-emerald-200"
                  >
                    {quiz.questions[qIndex].options[ci]}
                  </span>
                ))}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Topp 5 ställning</p>
            {leaderboard.slice(0, 5).map(([name, s], i) => (
              <div key={name} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/60 px-4 py-2.5">
                <span className="flex items-center gap-2.5 font-medium text-slate-200">
                  <span className={`w-5 font-mono text-sm font-bold ${i === 0 ? "text-amber-400" : "text-slate-500"}`}>{i + 1}</span>
                  {name}
                </span>
                <span className="font-mono text-sm font-bold text-indigo-300">{s} poäng</span>
              </div>
            ))}
            <Button className="mt-6 w-full gap-2" onClick={next}>
              {qIndex + 1 < total ? (
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

      {/* The heist board: what the room is actually competing over. */}
      {heist && heistRules && phase !== "lobby" && (
        <Card className="mt-6 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-3">
            <CardTitle className="text-sm font-bold">{heistRules.name} — ekonomi</CardTitle>
            <span className="text-[11px] font-semibold text-slate-500">{heistRules.currency}</span>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-3">
            {heistBoard.map((p, i) => {
              const seat = heist.players[p.name];
              const keen = p.keen ? KEEN_BY_ID[p.keen] : undefined;
              return (
                <div key={p.name} className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-slate-900/60 px-3 py-2">
                  <span className={`w-4 font-mono text-xs font-bold ${i === 0 ? "text-amber-400" : "text-slate-500"}`}>
                    {i + 1}
                  </span>
                  {keen ? (
                    <KeenAvatar keen={keen} size={28} />
                  ) : (
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-800 text-[10px] font-extrabold text-slate-400">
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">{p.name}</span>
                  {seat?.defenses.length > 0 && (
                    <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 text-[10px] font-bold text-emerald-200">
                      {seat.defenses.length} försvar
                    </span>
                  )}
                  {heistRules.trace && seat && seat.trace >= heistRules.trace.exposed && (
                    <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 text-[10px] font-bold text-rose-200">
                      avslöjad
                    </span>
                  )}
                  <span className="font-mono text-sm font-extrabold text-amber-300" data-no-translate>
                    {p.balance.toLocaleString("sv-SE")}
                  </span>
                </div>
              );
            })}
            {heist.events.length > 0 && (
              <ul className="mt-2 space-y-0.5 border-t border-white/5 pt-2">
                {heist.events.slice(0, 5).map((e) => (
                  <li key={e.id} className="truncate text-[11px] text-slate-500">
                    {e.text}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {phase === "end" && (
        <Card className="mt-6">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/20 text-amber-400">
              <Trophy className="h-7 w-7" />
            </div>
            <CardTitle className="font-display text-2xl font-bold">Slutresultat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {leaderboard.map(([name, s], i) => (
              <div
                key={name}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${
                  i === 0
                    ? "border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-transparent"
                    : "border border-white/5 bg-slate-900/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-5 text-center font-mono text-sm font-bold ${
                    i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-500"
                  }`}>
                    {i + 1}
                  </span>
                  {i === 0 && <Crown className="h-4 w-4 text-amber-400" />}
                  <span className="font-medium text-slate-200">{name}</span>
                </div>
                <span className="font-mono text-sm font-bold text-indigo-300">{s} poäng</span>
              </div>
            ))}
            {heist && (
              <p className="pt-3 text-center text-[11px] text-slate-500">
                Mint betalas ut efter placering — {MODE_RULES[heist.mode].mint.first} till vinnaren.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
