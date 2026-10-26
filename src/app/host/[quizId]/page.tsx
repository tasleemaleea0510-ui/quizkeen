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
import { Users, Play, Clock, CheckCircle2, ArrowRight, Trophy, Crown, SkipForward, Zap, Coins, Shield } from "lucide-react";
import KeenAvatar from "@/components/keens/keen-avatar";
import FullscreenButton from "@/components/fullscreen-button";
import GameModePicker, { MODE_CARDS } from "@/components/game-mode-picker";
import { ANSWER_TINTS } from "@/lib/answer-tints";
import { KEEN_BY_ID } from "@/lib/keens";
import {
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

/**
 * Send on a realtime channel, and never let it stop the match.
 *
 * `channel.send()` throws when the socket has not finished joining yet — which
 * happens exactly when a host opens the lobby and presses Start quickly. An
 * unguarded send there aborted the whole start, so the room sat in the lobby
 * forever. A dropped packet is recoverable (players ask for `sync` again); a
 * stuck host is not.
 */
function safeSend(channel: any, message: unknown) {
  try {
    channel?.send(message as any);
  } catch {
    // Not joined yet, or the socket dropped — the next broadcast catches up.
  }
}

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
    safeSend(gameRef.current, { type: "broadcast", event: "heist", payload: next });
    if (note) safeSend(gameRef.current, { type: "broadcast", event: "heist-note", payload: note });
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
      safeSend(lobby, { type: "broadcast", event: LOBBY_PONG, payload: { pin } });
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
        safeSend(game, { type: "broadcast", event: "heist-note", payload: { to: name, text: "Matchen är inte igång." } });
        return;
      }
      const result = applyAction(h, name, action, Date.now());
      if (!result.ok) {
        safeSend(game, { type: "broadcast", event: "heist-note", payload: { to: name, text: result.error } });
        return;
      }
      publishHeist(result.state);
    });
    game.on("broadcast", { event: "sync" }, () => {
      const qz = quizRef.current;
      if (heistRef.current) {
        safeSend(game, { type: "broadcast", event: "heist", payload: heistRef.current });
      }
      if (!qz) return;
      const ph = phaseRef.current;
      const i = qIndexRef.current;
      const q = qz.questions[i];
      if (!q) return;
      if (ph === "question") {
        safeSend(gameRef.current, {
          type: "broadcast", event: "state",
          payload: { kind: "question", index: i, text: q.text, options: q.options, correctCount: q.correctIndexes.length },
        });
      } else if (ph === "reveal") {
        safeSend(gameRef.current, {
          type: "broadcast", event: "state",
          payload: { kind: "reveal", index: i, text: q.text, options: q.options, correctIndexes: q.correctIndexes, scores: scoresRef.current },
        });
      } else if (ph === "end") {
        safeSend(gameRef.current, {
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
    safeSend(gameRef.current, { type: "broadcast", event, payload });
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
    safeSend(lobbyRef.current, { type: "broadcast", event: "start", payload: { mode: chosen } });
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

  // The mascot and colour of the mode the room is about to play.
  const art = MODE_CARDS.find((c) => c.id === mode) ?? MODE_CARDS[0];
  const mascot = KEEN_BY_ID[art.keen];
  const modeName = mode === "classic" ? "Klassisk quiz" : MODE_RULES[mode].name;
  const roundRules = mode === "classic" ? null : MODE_RULES[mode];

  /** The Keen a player is wearing, from the heist seat first, then the lobby. */
  const keenFor = (name: string) => {
    const id = heist?.players[name]?.keen ?? keensRef.current[name] ?? null;
    return id ? KEEN_BY_ID[id] : undefined;
  };

  return (
    <div className="relative min-h-screen pb-10">
      {/* The room wears the mode's colour, so the back row can see the pick. */}
      <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-[360px] opacity-60 blur-3xl ${art.glow}`} />

      {/* The site navbar and footer are hidden on this route, so this bar is the
          one thing at the top of the projector — and it stays there while the
          host scrolls the board. */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3 px-3 py-2.5 sm:px-6">
          {mascot && <KeenAvatar keen={mascot} size={32} className="shrink-0" />}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-extrabold text-white">{quiz.title}</p>
            <p className="truncate text-[11px] font-semibold text-slate-400">
              {modeName}
              {roundRules ? ` · ${roundRules.currency}` : " · frågor och poäng"}
            </p>
          </div>
          {phase !== "lobby" && (
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-slate-300 sm:inline">
              Fråga <span data-no-translate>{Math.min(qIndex + 1, total)}</span> / <span data-no-translate>{total}</span>
            </span>
          )}
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 font-mono text-xs font-extrabold tracking-widest text-indigo-200">
            <span data-no-translate>{pin}</span>
          </span>
          <FullscreenButton />
        </div>
      </header>

      <div className="relative mx-auto w-full max-w-[1500px] px-3 pt-5 sm:px-6">
        {phase === "lobby" && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* The PIN comes first on a phone: it is what the room needs to see. */}
            <aside className="order-1 lg:order-2 lg:sticky lg:top-16 lg:self-start">
              <Card className="overflow-hidden border-white/10">
                <CardContent className="pt-5">
                  <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Spel-PIN — dela denna kod
                  </p>
                  <p className="my-1 text-center font-mono text-6xl font-extrabold tracking-[0.15em]">
                    <span className="text-gradient animate-gradient-pan bg-[length:200%_auto]" data-no-translate>
                      {pin}
                    </span>
                  </p>
                  <p className="truncate text-center text-sm font-medium text-slate-400">{quiz.title}</p>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                      <Users className="h-4 w-4 text-indigo-400" />
                      <span>Spelare</span>
                      <span className="font-mono text-slate-400" data-no-translate>
                        ({players.length})
                      </span>
                    </p>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-glow-sm" />
                      Live
                    </span>
                  </div>

                  <div className="mt-2 grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {players.map((p) => {
                      const keen = keenFor(p);
                      return (
                        <span
                          key={p}
                          className="flex animate-pop items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2 py-1.5"
                        >
                          {keen ? (
                            <KeenAvatar keen={keen} size={30} />
                          ) : (
                            <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-slate-800 text-xs font-extrabold text-slate-400">
                              {p.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <span className="min-w-0 truncate text-sm font-semibold text-slate-200">{p}</span>
                        </span>
                      );
                    })}
                    {players.length === 0 && (
                      <p className="col-span-2 rounded-2xl border border-dashed border-white/10 px-3 py-6 text-center text-sm text-slate-500">
                        Väntar på att spelare ansluter...
                      </p>
                    )}
                  </div>

                  <Button
                    size="lg"
                    className="mt-4 h-14 w-full gap-2 text-base font-extrabold"
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
            </aside>

            <section className="order-2 lg:order-1">
              <div className="mb-3">
                <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Välj spel-läge</h1>
                <p className="mt-0.5 text-sm text-slate-400">
                  Samma frågor, fyra sätt att spela. Läget går att byta fram till start.
                </p>
              </div>
              <GameModePicker value={mode} onChange={setMode} />
              {roundRules && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-[12px] leading-relaxed text-slate-400">
                  <p>
                    <b className="text-slate-200">{roundRules.name}</b> — {roundRules.tagline} Alla börjar med{" "}
                    <b className="text-slate-200" data-no-translate>
                      {roundRules.startBalance.toLocaleString("sv-SE")}
                    </b>{" "}
                    {roundRules.currency.toLowerCase()}, ett rätt svar ger{" "}
                    <b className="text-slate-200" data-no-translate>
                      {roundRules.correctBalance}
                    </b>
                    {roundRules.maxEnergy > 0 && (
                      <>
                        {" "}
                        och {roundRules.energyName.toLowerCase()} laddas på till max{" "}
                        <b className="text-slate-200" data-no-translate>
                          {roundRules.maxEnergy}
                        </b>
                      </>
                    )}
                    .
                  </p>
                  <p className="mt-1">
                    Placering 1–3 ger{" "}
                    <b className="text-slate-200" data-no-translate>
                      {roundRules.mint.first}/{roundRules.mint.second}/{roundRules.mint.third}
                    </b>{" "}
                    Mint, övriga{" "}
                    <b className="text-slate-200" data-no-translate>
                      {roundRules.mint.rest}
                    </b>
                    . Ett lyckat rån mot en ny rival ger +
                    <b className="text-slate-200" data-no-translate>
                      {roundRules.mint.perRaid}
                    </b>{" "}
                    Mint, högst +
                    <b className="text-slate-200" data-no-translate>
                      {roundRules.mint.bonusCap}
                    </b>
                    .
                  </p>
                </div>
              )}
            </section>
          </div>
        )}

        {phase !== "lobby" && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
            <main className="min-w-0 space-y-4">
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">Framsteg</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="shrink-0 font-mono text-xs font-bold text-slate-400" data-no-translate>
                  {Math.round(progress)} %
                </span>
              </div>

              {phase === "question" && (
                <Card className="overflow-hidden border-white/10">
                  <div className="h-2.5 w-full bg-white/5">
                    <div
                      className={`h-full transition-[width] duration-1000 ease-linear ${
                        timer <= 5 ? "bg-rose-500" : "bg-amber-400"
                      }`}
                      style={{ width: `${(timer / QUESTION_SECONDS) * 100}%` }}
                    />
                  </div>
                  <CardContent className="px-5 py-6 sm:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-200">
                        Fråga <span data-no-translate>{qIndex + 1}</span> av <span data-no-translate>{total}</span>
                      </span>
                      <div className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 font-mono text-sm font-bold text-amber-400">
                        <Clock className="h-4 w-4" />
                        <span data-no-translate>{timer}s</span>
                      </div>
                    </div>

                    <h2 className="mt-5 text-3xl font-extrabold leading-tight text-white sm:text-4xl xl:text-5xl">
                      {quiz.questions[qIndex].text}
                    </h2>

                    {/* The four tiles, exactly as they sit on every phone. */}
                    <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                      {quiz.questions[qIndex].options.map((opt, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 rounded-2xl bg-gradient-to-br px-4 py-3.5 text-base font-bold text-white shadow-raise ${ANSWER_TINTS[i % 4]}`}
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/25 text-xs font-extrabold">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                      <p className="flex items-center gap-1.5 text-sm text-slate-400">
                        <Users className="h-4 w-4" />
                        <span>
                          <b className="text-slate-200" data-no-translate>
                            {answered}
                          </b>
                          {roster.length > 0 ? ` av ${roster.length}` : ""} har svarat
                        </span>
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {roster.length > 0 && answered >= roster.length && (
                          <span className="flex animate-fade-in items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
                            <Zap className="h-3 w-3" />
                            Alla har svarat
                          </span>
                        )}
                        <Button className="gap-2" variant="secondary" onClick={() => revealRef.current()}>
                          <SkipForward className="h-4 w-4" />
                          <span>Visa rätt svar nu</span>
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Går vidare av sig själv när alla har svarat — eller direkt när du trycker. Annars avslutas frågan
                      när klockan når 0.
                    </p>
                  </CardContent>
                </Card>
              )}

              {phase === "reveal" && (
                <Card className="overflow-hidden border-white/10">
                  <CardContent className="px-5 py-6 sm:px-8">
                    <div className="flex flex-wrap items-center gap-2">
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

                    <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                      {quiz.questions[qIndex].options.map((opt, i) => {
                        const right = quiz.questions[qIndex].correctIndexes.includes(i);
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold ${
                              right
                                ? "border-2 border-emerald-400/70 bg-emerald-500/15 text-emerald-100"
                                : "border border-white/10 bg-white/[0.04] text-slate-400"
                            }`}
                          >
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/25 text-xs font-extrabold">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="leading-snug">{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    <Button className="mt-6 h-12 w-full gap-2 text-base" onClick={next}>
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

              {phase === "end" && (
                <Card className="border-white/10">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/20 text-amber-300">
                      <Trophy className="h-8 w-8" />
                    </div>
                    <CardTitle className="font-display text-3xl font-extrabold">Slutresultat</CardTitle>
                    {heistRules && (
                      <p className="mt-1 text-sm text-slate-400">
                        {heistRules.name} — Mint betalas ut efter placering.
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {leaderboard.map(([name, s], i) => {
                      const keen = keenFor(name);
                      return (
                        <div
                          key={name}
                          className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                            i === 0
                              ? "border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-transparent"
                              : "border border-white/10 bg-white/[0.05]"
                          }`}
                        >
                          <span
                            className={`w-5 text-center font-mono text-sm font-bold ${
                              i === 0
                                ? "text-amber-400"
                                : i === 1
                                  ? "text-slate-300"
                                  : i === 2
                                    ? "text-amber-600"
                                    : "text-slate-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                          {i === 0 && <Crown className="h-4 w-4 shrink-0 text-amber-400" />}
                          {keen && <KeenAvatar keen={keen} size={30} className="shrink-0" />}
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-200">{name}</span>
                          <span className="shrink-0 font-mono text-sm font-bold text-indigo-300" data-no-translate>
                            {s} p
                          </span>
                        </div>
                      );
                    })}
                    {leaderboard.length === 0 && (
                      <p className="py-4 text-center text-sm text-slate-500">Ingen spelade den här matchen.</p>
                    )}
                    {heistRules && (
                      <p className="pt-2 text-center text-[11px] text-slate-500">
                        Mint: {heistRules.mint.first} till vinnaren, {heistRules.mint.second} till andra,{" "}
                        {heistRules.mint.third} till tredje, {heistRules.mint.rest} till övriga.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </main>

            {/* What the room is competing over: the economy, or the points. */}
            <aside className="min-w-0 space-y-4 lg:sticky lg:top-16 lg:self-start">
              {heist && heistRules ? (
                <Card className="overflow-hidden border-white/10">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 py-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <Coins className="h-4 w-4 text-amber-300" />
                      <span>{heistRules.name}</span>
                    </CardTitle>
                    <span className="text-[11px] font-semibold text-slate-500">{heistRules.currency}</span>
                  </CardHeader>
                  <CardContent className="max-h-[62vh] space-y-1.5 overflow-y-auto pt-3">
                    {heistBoard.map((p, i) => {
                      const seat = heist.players[p.name];
                      const keen = p.keen ? KEEN_BY_ID[p.keen] : undefined;
                      return (
                        <div
                          key={p.name}
                          className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2"
                        >
                          <span
                            className={`w-4 shrink-0 font-mono text-xs font-bold ${
                              i === 0 ? "text-amber-400" : "text-slate-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                          {keen ? (
                            <KeenAvatar keen={keen} size={28} />
                          ) : (
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-800 text-[10px] font-extrabold text-slate-400">
                              {p.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">{p.name}</span>
                          {seat?.defenses.length > 0 && (
                            <span className="flex shrink-0 items-center gap-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 text-[10px] font-bold text-emerald-200">
                              <Shield className="h-3 w-3" />
                              <span data-no-translate>{seat.defenses.length}</span>
                            </span>
                          )}
                          {heistRules.trace && seat && seat.trace >= heistRules.trace.exposed && (
                            <span className="shrink-0 rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 text-[10px] font-bold text-rose-200">
                              avslöjad
                            </span>
                          )}
                          <span className="shrink-0 font-mono text-sm font-extrabold text-amber-300" data-no-translate>
                            {p.balance.toLocaleString("sv-SE")}
                          </span>
                        </div>
                      );
                    })}
                    {heist.events.length > 0 && (
                      <ul className="mt-2 space-y-0.5 border-t border-white/10 pt-2">
                        {heist.events.slice(0, 6).map((e) => (
                          <li key={e.id} className="truncate text-[11px] text-slate-500">
                            {e.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden border-white/10">
                  <CardHeader className="border-b border-white/10 py-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <Trophy className="h-4 w-4 text-amber-300" />
                      <span>Ställning</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[62vh] space-y-1.5 overflow-y-auto pt-3">
                    {leaderboard.map(([name, s], i) => {
                      const keen = keenFor(name);
                      return (
                        <div
                          key={name}
                          className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2"
                        >
                          <span
                            className={`w-4 shrink-0 font-mono text-xs font-bold ${
                              i === 0 ? "text-amber-400" : "text-slate-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                          {keen ? (
                            <KeenAvatar keen={keen} size={26} />
                          ) : (
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-800 text-[10px] font-extrabold text-slate-400">
                              {name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">{name}</span>
                          <span className="shrink-0 font-mono text-sm font-bold text-indigo-300" data-no-translate>
                            {s} p
                          </span>
                        </div>
                      );
                    })}
                    {leaderboard.length === 0 && (
                      <p className="px-2 py-4 text-center text-sm text-slate-500">Inga poäng än.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
