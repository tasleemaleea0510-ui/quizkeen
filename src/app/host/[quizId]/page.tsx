"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, generateGamePin } from "@/lib/utils";
import {
  HOST_PRESENCE_CONFIG,
  LOBBY_PING,
  LOBBY_PONG,
  onlinePlayerEntries,
} from "@/lib/presence";
import Link from "next/link";
import { getQuiz, awardXP } from "./actions";
import { isExactAnswer } from "@/lib/quiz-draft";
import { Users, Play, Clock, CheckCircle2, ArrowRight, Trophy, Crown, SkipForward, Zap, Coins, Shield, LogOut, BookOpen, Hourglass, Flag, ListChecks } from "lucide-react";
import KeenAvatar from "@/components/keens/keen-avatar";
import { ActionWindowChip, MatchClock, MatchClockChip } from "@/components/match-clock";
import { ChestReveal } from "@/components/chest-pick";
import FullscreenButton from "@/components/fullscreen-button";
import GameStage from "@/components/game/game-stage";
import GameModePicker, { MODE_CARDS } from "@/components/game-mode-picker";
import { ANSWER_TINTS } from "@/lib/answer-tints";
import { KEEN_BY_ID } from "@/lib/keens";
import {
  ACTION_WINDOW_CHOICES,
  DEFAULT_ACTION_WINDOW_SECONDS,
  DEFAULT_MATCH_MINUTES,
  MATCH_LENGTHS,
  MODE_IDENTITY,
  MODE_RULES,
  addCorrect,
  advancePlayer,
  applyAction,
  approxBalance,
  breakStreak,
  mintPayout,
  newHeist,
  nextRound,
  standings,
  classicStreakBonus,
  type ChestReveal as ChestRevealData,
  type EndStat,
  type HeistAction,
  type HeistState,
  type ModeId,
} from "@/lib/game-modes";

type Q = { id: string; text: string; options: string[]; correctIndexes: number[] };

// How long a question stays open when nobody answers. The host can always end
// it sooner, and it ends by itself the moment every player has answered.
const QUESTION_SECONDS = 20;

/**
 * The race layer.
 *
 * In the three heist modes nobody waits for the class: a seat that answers
 * gets scored on the spot and moves straight to its own next question, and
 * the match itself ends when the shared clock runs out — Blooket-style. The
 * host stays the one authority: it checks every answer, advances one seat at
 * a time, and settles every raid.
 */
type RaceQuestion = { text: string; options: string[]; correctCount: number };
type PacedProgress = { q: number; lap: number; correct: number; answered: number };

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
  const router = useRouter();
  const quizId = params.quizId as string;

  const [pin] = useState(() => generateGamePin());
  const [quiz, setQuiz] = useState<{ title: string; questions: Q[] } | null>(null);
  const [phase, setPhase] = useState<"lobby" | "question" | "reveal" | "live" | "end">("lobby");
  const [leaving, setLeaving] = useState(false);
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
  // The chest pull the room is watching right now. A chest is the one event in
  // Vault Raiders that everybody should see at the same moment, so the host
  // shows it too instead of leaving it on the puller's phone.
  const [chestReveal, setChestReveal] = useState<ChestRevealData | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // ── Race state ───────────────────────────────────────────────────────────
  // Classic keeps the shared question clock and the host advancing the room;
  // the heist modes run as a race with a match clock instead.
  const [matchMinutes, setMatchMinutes] = useState(DEFAULT_MATCH_MINUTES);
  // ── The action window ────────────────────────────────────────────────────
  // Shared seconds between questions, timestamped once and shared: the seat,
  // this projector and every other phone count the same endsAt stamp, so a
  // raid or a hack cannot slip in "one more second" on someone's watch.
  // Keyed by seat in races (every seat has its own), one stamp for the room in
  // classic (the whole room sits at the same reveal). The length is a lobby
  // setting next to the match clock, not a constant.
  const [windowSeconds, setWindowSeconds] = useState(DEFAULT_ACTION_WINDOW_SECONDS);
  const windowSecondsRef = useRef(DEFAULT_ACTION_WINDOW_SECONDS);
  const [matchEndsAt, setMatchEndsAt] = useState<number | null>(null);
  const [progress, setProgress] = useState<Record<string, PacedProgress>>({});
  const matchMinutesRef = useRef(DEFAULT_MATCH_MINUTES);
  const windowsRef = useRef<Record<string, number>>({});
  const classicWindowRef = useRef(0);
  const [classicWindowEndsAt, setClassicWindowEndsAt] = useState(0);
  const matchEndsAtRef = useRef<number | null>(null);
  const raceRef = useRef<{ list: RaceQuestion[] } | null>(null);
  // Which question each seat is on, and which seats sit between questions.
  const paceRef = useRef<Record<string, number>>({});
  const betweenRef = useRef<Set<string>>(new Set());
  // The start of each seat's current question, for the speed bonus.
  const qStartRef = useRef<Record<string, number>>({});
  const progressRef = useRef<Record<string, PacedProgress>>({});
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [endStats, setEndStats] = useState<EndStat[] | null>(null);

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
  const questionStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef<ModeId>("classic");
  const heistRef = useRef<HeistState | null>(null);
  // The Keen each lobby player wears, so the heist board draws real characters.
  const keensRef = useRef<Record<string, string | null>>({});
  const streaksRef = useRef<Record<string, number>>({});
  const awardedRef = useRef(false);

  useEffect(() => { scoresRef.current = scores; }, [scores]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);
  useEffect(() => { quizRef.current = quiz; }, [quiz]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { matchMinutesRef.current = matchMinutes; }, [matchMinutes]);
  useEffect(() => { windowSecondsRef.current = windowSeconds; }, [windowSeconds]);
  useEffect(() => { matchEndsAtRef.current = matchEndsAt; }, [matchEndsAt]);

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

  const lapOf = (index: number, len: number) => (len > 0 ? Math.floor(index / len) + 1 : 1);

  /** The projector's racer board; the same map the end screen ranks from. */
  function publishProgress() {
    setProgress({ ...progressRef.current });
    if (progressTimerRef.current) return;
    progressTimerRef.current = setTimeout(() => {
      progressTimerRef.current = null;
      broadcast("progress", progressRef.current);
    }, 350);
  }

  /** Move one seat from its window into the next question of its race. */
  function advanceSeat(name: string) {
    const race = raceRef.current;
    const h = heistRef.current;
    if (!race || !h || !h.players[name]) return;
    if (!betweenRef.current.has(name)) {
      // Not sitting between questions any more — hand back its current place.
      delete windowsRef.current[name];
      sendPace(name);
      return;
    }
    const len = race.list.length;
    const prev = paceRef.current[name] ?? 0;
    const next = advancePlayer(h, name);
    paceRef.current[name] = (prev + 1) % len;
    betweenRef.current.delete(name);
    delete windowsRef.current[name];
    heistRef.current = next;
    setHeist(next);
    publishHeist(next);
    sendPace(name);
  }

  /** One seat's own question, addressed to them — everyone else drops it. */
  function sendPace(name: string) {
    const race = raceRef.current;
    const h = heistRef.current;
    const game = gameRef.current;
    if (!race || !h || !game || !h.players[name]) return;
    const len = race.list.length;
    const q = paceRef.current[name] ?? 0;
    if (betweenRef.current.has(name)) {
      // The seat answered: send back the question it just did, so the phone
      // can show what was right and open its own between-questions window.
      const real = quizRef.current?.questions[q];
    // ── Action window ──────────────────────────────────────────────────
    // Fifteen seconds between a seat's answers in a race, timestamped the
    // same way on every screen: the seat, its neighbours and this board all
    // count the same seconds from the same endsAt stamp.
    const windowEndsAt = Date.now() + windowSecondsRef.current * 1000;
    windowsRef.current[name] = windowEndsAt;
    safeSend(game, {
      type: "broadcast", event: "pace",
      payload: {
        to: name, kind: "reveal", r: q, lap: lapOf(q, len),
        correctIndexes: real?.correctIndexes ?? [],
        scores: { [name]: scoresRef.current[name] ?? 0 },
        streak: streaksRef.current[name] ?? 0,
        windowEndsAt,
      },
    });
      return;
    }
    // The next question's speed bonus starts when the seat actually sees it.
    qStartRef.current[name] = Date.now();
    safeSend(game, {
      type: "broadcast", event: "pace",
      payload: { to: name, kind: "question", r: q, lap: lapOf(q, len) },
    });
  }

  /** Score one answered question for one seat, right now, silently. */
  function scorePacedAnswer(name: string, picked: number[], q: number, acc?: string) {
    const race = raceRef.current;
    const h = heistRef.current;
    const game = gameRef.current;
    if (!race || !h || !game) return;
    const seat = h.players[name];
    if (!seat) {
      safeSend(game, { type: "broadcast", event: "heist-note", payload: { to: name, text: "Tävlingen startade innan du kom med — du är inte med i den här omgången. Vänta på nästa." } });
      return;
    }
    if (paceRef.current[name] === undefined) paceRef.current[name] = 0;
    if (q !== paceRef.current[name]) {
      // An old screen or a double click: hand back the seat's real state.
      safeSend(game, { type: "broadcast", event: "heist-note", payload: { to: name, text: "Skärmen hade hakat upp sig — din fråga ligger här nu." } });
      sendPace(name);
      return;
    }
    if (betweenRef.current.has(name)) {
      safeSend(game, { type: "broadcast", event: "heist-note", payload: { to: name, text: "Svaret är redan räknat — fortsätt till nästa fråga." } });
      return;
    }
    const real = quizRef.current?.questions[q];
    if (!real) return;
    betweenRef.current.add(name);
    const now = Date.now();
    const start = qStartRef.current[name] ?? now;
    const correctNow = isExactAnswer(picked, real.correctIndexes);
    const newScores = { ...scoresRef.current };
    let nextHeist = h;
    if (correctNow) {
      const speed = Math.max(0, 50 - Math.floor((now - start) / 400));
      const streak = (streaksRef.current[name] ?? 0) + 1;
      streaksRef.current[name] = streak;
      newScores[name] = (newScores[name] || 0) + 100 + speed;
      nextHeist = addCorrect(nextHeist, name);
    } else {
      streaksRef.current[name] = 0;
      nextHeist = breakStreak(nextHeist, name);
    }
    if (acc && nextHeist.players[name]) nextHeist.players[name].account = acc;
    scoresRef.current = newScores;
    setScores(newScores);
    heistRef.current = nextHeist;
    setHeist(nextHeist);
    const len = race.list.length;
    const prev = progressRef.current[name];
    progressRef.current[name] = {
      q,
      lap: lapOf(q, len),
      correct: (prev?.correct ?? 0) + (correctNow ? 1 : 0),
      answered: (prev?.answered ?? 0) + 1,
    };
    publishProgress();
    publishHeist(nextHeist);
    sendPace(name);
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
      const { name, choice, choices, acc, q } = msg.payload as {
        name: string;
        choice?: number;
        choices?: number[];
        acc?: string;
        q?: number;
      };
      // `choices` is the current shape — a question may have several right
      // answers — while `choice` is what the flashcard battle still sends.
      const picked = Array.isArray(choices) ? choices : typeof choice === "number" ? [choice] : [];
      if (raceRef.current && typeof q === "number" && name) {
        // Racing: this seat's answer is scored by itself, right now — the
        // client is told what was right in a private pace reply.
        answersRef.current[name] = { choices: picked, t: Date.now() };
        if (acc) accountRef.current[name] = acc;
        scorePacedAnswer(name, picked, q, acc);
        return;
      }
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
    // A seat pressing Fortsätt between its own questions, or the window
    // sweeper doing it for a phone that pocketed itself. Idempotent: a
    // re-sent tap just hands the seat its current place back.
    game.on("broadcast", { event: "pace-next" }, (msg) => {
      const { name } = (msg.payload ?? {}) as { name?: string };
      if (!name || phaseRef.current !== "live") return;
      if (!heistRef.current?.players[name]) return;
      advanceSeat(name);
    });
    // A player raiding, fortifying or saving. The host is the only authority on
    // the economy: the browser sends an intention, this decides the outcome.
    game.on("broadcast", { event: "heist-action" }, (msg) => {
      const { name, action } = (msg.payload ?? {}) as { name?: string; action?: HeistAction };
      const h = heistRef.current;
      if (!h || !name || !action) return;
      const live = phaseRef.current === "live";
      if (!live && phaseRef.current !== "question" && phaseRef.current !== "reveal") {
        safeSend(game, { type: "broadcast", event: "heist-note", payload: { to: name, text: "Matchen är inte igång." } });
        return;
      }
      // ── The action window is the gate ──────────────────────────────────
      // Fifteen shared seconds between questions, counted from one endsAt
      // stamp on every screen. In a race the seat's window opens when its
      // reveal lands; in classic the room stands at the same reveal and
      // shares one stamp. Raids also stay live inside the classic question
      // clock, as they always did.
      const inWindow = live
        ? Date.now() <= (windowsRef.current[name] ?? 0) + 500
        : phaseRef.current === "reveal"
          ? Date.now() <= classicWindowRef.current + 500
          : true;
      if (!inWindow) {
        safeSend(game, { type: "broadcast", event: "heist-note", payload: { to: name, text: live ? "Fönstret har stängt — svara på nästa fråga för att öppna ett nytt." : "Fönstret har stängt — vänta på nästa fråga." } });
        return;
      }
      // A chest is a between-questions decision, and the Cyber Hack drill is a
      // reward for finishing one. Both are refused outside the reveal even if
      // a stale client still shows the button.
      if (!live && (action.kind === "chest" || action.kind === "hack") && phaseRef.current !== "reveal") {
        safeSend(game, {
          type: "broadcast",
          event: "heist-note",
          payload: {
            to: name,
            text: action.kind === "chest" ? "Kistan öppnas mellan frågorna." : "Hacket öppnas mellan frågorna.",
          },
        });
        return;
      }
      const result = applyAction(h, name, action, Date.now());
      if (!result.ok) {
        safeSend(game, { type: "broadcast", event: "heist-note", payload: { to: name, text: result.error } });
        return;
      }
      // A chest is the room's moment: the board goes out first, then the pull
      // goes up on every screen — the puller's, the other players', and this one.
      if (result.reveal) {
        setChestReveal(result.reveal);
        safeSend(game, { type: "broadcast", event: "heist-reveal", payload: result.reveal });
      }
      publishHeist(result.state, result.feedback ? { to: name, text: result.feedback } : undefined);
    });
    game.on("broadcast", { event: "sync" }, (msg: any) => {
      const qz = quizRef.current;
      if (heistRef.current) {
        safeSend(game, { type: "broadcast", event: "heist", payload: heistRef.current });
      }
      // A race seat rejoining mid-match gets the shared clock, the question
      // sheet (answers stripped) and its own place in the race back.
      const who = (msg?.payload as { name?: string } | null)?.name;
      const race = raceRef.current;
      if (race && who && phaseRef.current === "live") {
        safeSend(game, {
          type: "broadcast", event: "match",
          payload: { mode: modeRef.current, minutes: matchMinutesRef.current, endsAt: matchEndsAtRef.current, windowSec: windowSecondsRef.current, questions: race.list },
        });
        if (progressRef.current) safeSend(game, { type: "broadcast", event: "progress", payload: progressRef.current });
        if (heistRef.current?.players[who]) {
          sendPace(who);
        } else {
          safeSend(game, { type: "broadcast", event: "heist-note", payload: { to: who, text: "Tävlingen startade innan du kom med — du är inte med i den här omgången. Vänta på nästa." } });
        }
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
          payload: { kind: "reveal", index: i, text: q.text, options: q.options, correctIndexes: q.correctIndexes, scores: scoresRef.current, streaks: streaksRef.current, windowEndsAt: classicWindowRef.current },
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
    // A new question closes the previous action window and resets the race
    // seats' stamps, so nothing leaks across rounds.
    classicWindowRef.current = 0;
    setClassicWindowEndsAt(0);
    windowsRef.current = {};
    // Last question's chest should not still be hanging over the projector.
    setChestReveal(null);
    broadcast("question", { index: i, text: q.text, options: q.options, correctCount: q.correctIndexes.length });
    phaseRef.current = "question";
    setPhase("question");
  }

  function startGame() {
    if (startedRef.current) return;
    if (quizRef.current && quizRef.current.questions.length === 0) return;
    startedRef.current = true;
    // Freeze the player list now: everyone about to leave the lobby for the
    // game screen is exactly who the first question should wait for.
    setRoster(players);
    awardedRef.current = false;
    streaksRef.current = {};
    const chosen = modeRef.current;
    if (chosen !== "classic" && players.length > 0) {
      // Every seat starts equal — the mode rules say so, and it is what makes a
      // classroom match fair to someone who joined five seconds ago.
      publishHeist(newHeist(chosen, players.map((name) => ({ name, keen: keensRef.current[name] ?? null }))));
      // ── Race start ────────────────────────────────────────────────────
      // Hand out the question sheet once (question texts and shapes only — the
      // correct answers never leave the host), start the shared clock, and
      // pace every seat to question 1. From here the host only reacts: it
      // scores each answer as it arrives and advances that one seat.
      const list: RaceQuestion[] = (quizRef.current?.questions ?? []).map((q) => ({
        text: q.text,
        options: q.options,
        correctCount: q.correctIndexes.length,
      }));
      if (list.length === 0) { startedRef.current = false; return; }
      raceRef.current = { list };
      paceRef.current = {};
      betweenRef.current = new Set();
      windowsRef.current = {};
      qStartRef.current = {};
      progressRef.current = {};
      progressTimerRef.current = null;
      setProgress({});
      setEndStats(null);
      const minutes = Math.max(1, Math.round(matchMinutesRef.current));
      const endsAt = Date.now() + minutes * 60000;
      matchEndsAtRef.current = endsAt;
      setMatchEndsAt(endsAt);
      broadcast("match", { mode: chosen, minutes, endsAt, windowSec: windowSecondsRef.current, questions: list });
      phaseRef.current = "live";
      setPhase("live");
      return;
    }
    safeSend(lobbyRef.current, { type: "broadcast", event: "start", payload: { mode: chosen } });
    setQIndex(0);
    questionStartTimerRef.current = setTimeout(() => {
      questionStartTimerRef.current = null;
      sendQuestion(0);
    }, 3000);
  }

  function reveal() {
    if (phaseRef.current !== "question" || revealedRef.current) return;
    const q = quizRef.current?.questions[qIndexRef.current];
    if (!q) return;
    revealedRef.current = true;
    phaseRef.current = "reveal";

    const newScores = { ...scoresRef.current };
    let nextHeist = heistRef.current;
    Object.entries(answersRef.current).forEach(([name, a]) => {
      // An exact set: on a multi-answer question, choosing some of the right
      // answers is not the same as knowing which ones they are.
      if (isExactAnswer(a.choices, q.correctIndexes)) {
        const speed = Math.max(0, 50 - Math.floor((a.t - startRef.current) / 400));
        const streak = (streaksRef.current[name] ?? 0) + 1;
        streaksRef.current[name] = streak;
        const combo = modeRef.current === "classic" ? classicStreakBonus(streak) : 0;
        newScores[name] = (newScores[name] || 0) + 100 + speed + combo;
        if (nextHeist) nextHeist = addCorrect(nextHeist, name);
      } else {
        streaksRef.current[name] = 0;
        if (nextHeist) nextHeist = breakStreak(nextHeist, name);
      }
    });
    // Sitting out a question breaks the streak too; no answer is not a free pass.
    roster.forEach((name) => {
      if (!answersRef.current[name]) {
        streaksRef.current[name] = 0;
        if (nextHeist) nextHeist = breakStreak(nextHeist, name);
      }
    });
    scoresRef.current = newScores;
    setScores(newScores);
    // The room-wide action window: the reveal is when chest, hack and raids
    // between questions happen, so the whole room gets one shared fifteen
    // seconds — stamped once here, counted down identically on every screen.
    const windowEndsAt = Date.now() + windowSecondsRef.current * 1000;
    classicWindowRef.current = windowEndsAt;
    setClassicWindowEndsAt(windowEndsAt);
    broadcast("reveal", { correctIndexes: q.correctIndexes, scores: newScores, streaks: streaksRef.current, windowEndsAt });
    if (nextHeist) publishHeist(nextHeist);
    setPhase("reveal");
    phaseRef.current = "reveal";
  }

  // The clock and the watcher run outside React's render, so they ask this ref
  // for the newest reveal rather than capturing an old question.
  useEffect(() => {
    revealRef.current = reveal;
  });

  // The match clock's stop: in a race the shared clock is the finish line, so
  // an interval polls it instead of a long setTimeout that a backgrounded tab
  // would miss. Small overshoot is intentional — the exact second matters less
  // than not ending a match mid-answer.
  const finishClockRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (phase !== "live") return;
    const iv = setInterval(() => {
      const ends = matchEndsAtRef.current;
      if (ends && Date.now() >= ends + 250) finishClockRef.current();
    }, 500);
    return () => clearInterval(iv);
  }, [phase]);
  useEffect(() => {
    finishClockRef.current = () => {
      if (phaseRef.current === "live") finish();
    };
  });

  // The window sweeper: when a race seat's fifteen seconds run out without a
  // Fortsätt tap — phone asleep, pocket, walked away — the host advances that
  // seat anyway, so an idle window never stalls the rest of the match.
  useEffect(() => {
    if (phase !== "live") return;
    const iv = setInterval(() => {
      const now = Date.now();
      for (const seatName of Object.keys(windowsRef.current)) {
        if (now >= (windowsRef.current[seatName] ?? 0) + 1200) advanceSeat(seatName);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // The countdown chips read Date.now() while they render, so the board keeps
  // rendering at half a second: both the shared classic stamp and each race
  // seat's own window tick on the projector without any extra traffic.
  const [, setUiTick] = useState(0);
  useEffect(() => {
    if (phase !== "live" && phase !== "question" && phase !== "reveal") return;
    const iv = setInterval(() => setUiTick((t) => t + 1), 500);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => () => {
    if (questionStartTimerRef.current) clearTimeout(questionStartTimerRef.current);
  }, []);

  function next() {
    if (!quiz || phaseRef.current !== "reveal") return;
    const n = qIndex + 1;
    if (n < quiz.questions.length) {
      setQIndex(n);
      sendQuestion(n);
    } else {
      finish();
    }
  }

  function finish() {
    if (!startedRef.current || awardedRef.current || phaseRef.current === "end") return;
    awardedRef.current = true;
    const finished = heistRef.current;
    // A final heist snapshot, so every screen ranks on the same board.
    if (finished) publishHeist(finished);
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
      void awardXP(
        quizId,
        payout.map((p) => {
          const seat = Object.values(finished.players).find((s) => (s.account ?? s.name) === p.username);
          return { username: p.username, xp: seat ? scoresRef.current[seat.name] ?? 0 : 0, coins: p.mint };
        })
      ).catch((error) => console.error("Could not award game XP", error));
    } else {
      const top = Object.entries(scoresRef.current)
        .sort((a, b) => b[1] - a[1])
        .map(([display, s], i) => ({
          username: accountRef.current[display] || display,
          xp: s,
          coins: [50, 30, 20][i] || 10,
        }));
      void awardXP(quizId, top).catch((error) => console.error("Could not award game XP", error));
    }
    // Race matches end on the clock, so the end broadcast carries the full
    // stat sheet: placements, accuracy and the best single raid — the part
    // a class reads out loud after the timer hits zero.
    const race = raceRef.current;
    let stats: EndStat[] | null = null;
    if (race && finished) {
      const payout = mintPayout(finished);
      const payoutByName = new Map(payout.map((p) => [p.username, p.mint]));
      stats = standings(finished).map((row, i) => {
        const seat = finished.players[row.name];
        const prog = progressRef.current[row.name];
        return {
          name: row.name,
          keen: row.keen,
          place: i + 1,
          points: scoresRef.current[row.name] ?? 0,
          correct: row.correct,
          answered: prog?.answered ?? 0,
          balance: row.balance,
          bestRaid: seat?.bestRaid ?? 0,
          raids: seat?.raids ?? 0,
          mint: payoutByName.get(seat?.account || row.name) ?? undefined,
        } satisfies EndStat;
      });
      setEndStats(stats);
    }
    broadcast("end", { scores: scoresRef.current, mint: mintByName, stats });
    phaseRef.current = "end";
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
  const questionProgress = total > 0 ? ((qIndex + (phase === "lobby" ? 0 : 1)) / total) * 100 : 0;
  const heistBoard = heist ? standings(heist) : [];
  const heistRules = heist ? MODE_RULES[heist.mode] : null;
  const raceLen = raceRef.current?.list.length ?? 0;

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
    <GameStage mode={mode === "classic" ? null : mode}>
      {/* The room wears the mode's colour, so the back row can see the pick. */}
      <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-[360px] opacity-60 blur-3xl ${art.glow}`} />

      {/* The site navbar and footer are hidden on this route, so this bar is the
          one thing at the top of the projector. It sits outside the scroll area
          now: the questions move, the bar does not. */}
      <header className="relative z-20 shrink-0 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3 px-3 py-2.5 sm:px-6">
          {mascot && <KeenAvatar keen={mascot} size={32} className="shrink-0" />}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-extrabold text-white">{quiz.title}</p>
            <p className="truncate text-[11px] font-semibold text-slate-400">
              {modeName}
              {roundRules ? ` · ${roundRules.currency}` : " · frågor och poäng"}
            </p>
          </div>
          {phase !== "lobby" && phase !== "live" && (
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-slate-300 sm:inline">
              Fråga <span data-no-translate>{Math.min(qIndex + 1, total)}</span> / <span data-no-translate>{total}</span>
            </span>
          )}
          {phase === "live" && matchEndsAt && (
            <MatchClockChip endsAt={matchEndsAt} minutes={matchMinutes} className="hidden sm:inline-flex" />
          )}
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 font-mono text-xs font-extrabold tracking-widest text-indigo-200">
            <span data-no-translate>{pin}</span>
          </span>
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            aria-label="Lämna spelet"
            title="Lämna spelet"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-400/20 bg-rose-500/[0.08] px-2 text-[10px] font-extrabold text-rose-200 transition-colors hover:border-rose-400/40 hover:bg-rose-500/15 sm:px-3 sm:text-xs"
          >
            <LogOut className="h-4 w-4" />
            <span>Lämna</span>
          </button>
          <Link
            href="/manual"
            target="_blank"
            title="Spelmanual"
            aria-label="Spelmanual"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:border-white/25 hover:text-white"
          >
            <BookOpen className="h-4 w-4" />
          </Link>
          <FullscreenButton />
        </div>
      </header>

      {/* `my-auto` centres the round when it is shorter than the wall and does
          nothing at all when it is taller, so a long leaderboard still scrolls
          from the top instead of being clipped. */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-5 sm:px-6">
        <div className="mx-auto my-auto w-full max-w-[1500px]">
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
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Välj spel-läge</h1>
                  <p className="mt-0.5 text-sm text-slate-400">
                    Samma frågor. En särskild spel-loop för varje läge — välj hur klassen ska tävla.
                  </p>
                </div>
                <Link
                  href="/manual"
                  target="_blank"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:border-white/25 hover:text-white"
                >
                  Läs manualen <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <GameModePicker value={mode} onChange={setMode} />
              {mode !== "classic" && (
                <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-200">
                    <Hourglass className="h-3.5 w-3.5" />
                    Matchklocka
                  </span>
                  {MATCH_LENGTHS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMatchMinutes(m)}
                      aria-pressed={matchMinutes === m}
                      data-no-translate
                      className={cn(
                        "rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold transition-colors",
                        matchMinutes === m
                          ? "bg-amber-400 text-amber-950 shadow"
                          : "border border-white/10 bg-white/5 text-slate-300 hover:border-white/30"
                      )}
                    >
                      {m} min
                    </button>
                  ))}
                  <span className="text-[11px] text-slate-500">
                    Klassrummet tävlar på tid: alla svarar vidare i egen takt, och matchen stannar
                    när klockan tar slut.
                  </span>
                </div>
              )}
              {/* The action window applies to every mode — a race seat gets one
                  between its own questions, classic the whole room between
                  the reveals — so its length sits here for all of them. */}
              <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-violet-200">
                  <Hourglass className="h-3.5 w-3.5" />
                  Åtgärdsfönster
                </span>
                {ACTION_WINDOW_CHOICES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setWindowSeconds(s)}
                    aria-pressed={windowSeconds === s}
                    data-no-translate
                    className={cn(
                      "rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold transition-colors",
                      windowSeconds === s
                        ? "bg-violet-400 text-violet-950 shadow"
                        : "border border-white/10 bg-white/5 text-slate-300 hover:border-white/30"
                    )}
                  >
                    {s} s
                  </button>
                ))}
                <span className="text-[11px] text-slate-500">
                  Tiden mellan frågorna för rån, hack, kista och köp — {mode === "classic" ? "hela klassrummet räknar tillsammans" : "varje spelare får egna sekunder"}.
                </span>
              </div>
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
                    {roundRules.maxEnergy > 0 && (
                      <>
                        {"Varje ny fråga ger 1 "}
                        {roundRules.energyName.toLowerCase()}.{" "}
                      </>
                    )}
                    Placering 1–3 ger{" "}
                    <b className="text-slate-200" data-no-translate>
                      {roundRules.mint.first}/{roundRules.mint.second}/{roundRules.mint.third}
                    </b>{" "}
                    Mint, övriga{" "}
                    <b className="text-slate-200" data-no-translate>
                      {roundRules.mint.rest}
                    </b>
                    . Ett lyckat {roundRules.id === "crypto" ? "hack" : "rån"} mot en ny rival ger +
                    <b className="text-slate-200" data-no-translate>
                      {roundRules.mint.perRaid}
                    </b>{" "}
                    Mint, högst +
                    <b className="text-slate-200" data-no-translate>
                      {roundRules.mint.bonusCap}
                    </b>
                    .
                  </p>
                  <p className="mt-1">
                    <b className="text-slate-200">Lägets beslut:</b> {MODE_IDENTITY[roundRules.id].twist.sv}
                  </p>
                  {mode !== "classic" && (
                    <p className="mt-1">
                      <b className="text-slate-200">Tävling:</b> alla svarar vidare i egen takt — ingen väntar på
                      spelledaren — och matchen stoppas av matchklockan. Efter frågoslätsen börjar omgång 2 med samma
                      frågor igen.
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {phase !== "lobby" && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
            <main className="min-w-0 space-y-4">
              {mode === "crypto" && phase === "reveal" && heist && (
                <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-100/80">
                  <b className="text-emerald-200">SIDOHACK:</b> Mellan frågorna får spelarna en kort, roterande skillutmaning — sikta, matcha symbolen, upprepa signalen, knäck koden eller håll omstarten. Färdigheten ger crypto; kunskapsfrågorna ger fortfarande XP.
                </p>
              )}
              {mode === "classic" && phase === "reveal" && (
                <p className="rounded-xl border border-indigo-400/20 bg-indigo-500/[0.06] px-3 py-2 text-xs text-indigo-100/80">
                  <b className="text-indigo-200">KLASSISK STREAK:</b> Rätt i följd bygger en bonus på 15 per svar, upp till +75. Missa en fråga och nästa streak börjar om.
                </p>
              )}
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">Framsteg</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                    style={{ width: `${questionProgress}%` }}
                  />
                </div>
                <span className="shrink-0 font-mono text-xs font-bold text-slate-400" data-no-translate>
                  {Math.round(questionProgress)} %
                </span>
              </div>

              {phase === "live" && (
                <div className="space-y-4">
                  {/* The finish line, big enough for the back row, with the one
                      button the host still owns: stopping the race early. */}
                  <Card className="overflow-hidden border-white/10">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
                      {matchEndsAt ? (
                        <MatchClock endsAt={matchEndsAt} minutes={matchMinutes} />
                      ) : (
                        <p className="font-mono text-4xl font-extrabold text-amber-300">0:00</p>
                      )}
                      <div className="flex flex-col items-start gap-2">
                        <p className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
                          <ListChecks className="h-5 w-5 text-emerald-300" />
                          Tävlingen pågår
                        </p>
                        <p className="max-w-sm text-xs leading-relaxed text-slate-400">
                          Alla svarar vidare i egen takt — Ingen väntar på spelledaren. Räden, kistan och sidohacket\\r\\n                          fortsätter gång på gång medan klockan räknar ner.
                        </p>
                        <Button className="mt-1 gap-2" variant="secondary" onClick={finish}>
                          <Flag className="h-4 w-4" />
                          <span>Avsluta nu</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 py-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-bold">
                        <Users className="h-4 w-4 text-indigo-300" />
                        <span>Var är alla?</span>
                      </CardTitle>
                      {raceLen > 0 && (
                        <span className="text-[11px] font-semibold text-slate-500" data-no-translate>
                          {raceLen} frågor · om och om igen
                        </span>
                      )}
                    </CardHeader>
                    <CardContent className="max-h-[52vh] space-y-1.5 overflow-y-auto pt-3">
                      {roster.map((name) => {
                        const prog = progress[name];
                        const seat = heist?.players[name];
                        const keen = keenFor(name);
                        return (
                          <div
                            key={name}
                            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2"
                          >
                            {keen ? (
                              <KeenAvatar keen={keen} size={28} />
                            ) : (
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-800 text-[10px] font-extrabold text-slate-400">
                                {name.slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200" data-no-translate>
                              {name}
                            </span>
                            {prog ? (
                              <>
                                <span className="shrink-0 rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                                  Omgång <span data-no-translate>{prog.lap}</span>
                                </span>
                                <span className="shrink-0 text-xs font-bold text-slate-300" data-no-translate>
                                  Fråga <span data-no-translate>{prog.q + 1}</span>{raceLen > 0 ? <span data-no-translate>/{raceLen}</span> : null}
                                </span>
                                <span className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200" data-no-translate>
                                  {prog.correct}/{prog.answered} rätt
                                </span>
                                {windowsRef.current[name] && Date.now() <= windowsRef.current[name] ? (
                                  <ActionWindowChip endsAt={windowsRef.current[name]} seconds={windowSeconds} small />
                                ) : null}
                              </>
                            ) : (
                              <span className="shrink-0 text-[11px] text-slate-500">väntar på första svaret…</span>
                            )}
                            {seat && seat.trace > 0 && seat.trace >= (heistRules?.trace?.exposed ?? 65) && (
                              <span className="shrink-0 rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 text-[10px] font-bold text-rose-200">
                                avslöjad
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {roster.length === 0 && (
                        <p className="py-4 text-center text-sm text-slate-500">Inga spelare tävlar.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

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

                    {heist && (
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        {phase === "reveal" && classicWindowEndsAt > Date.now() && (
                          <ActionWindowChip endsAt={classicWindowEndsAt} seconds={windowSeconds} />
                        )}
                        <p className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-500/[0.07] px-3 py-2 text-center text-[11px] font-bold text-amber-100/80">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                          {heist.mode === "crypto"
                            ? "Handlingsfönster: 15 sekunder per fråga — klassen hackar, handlar och kör sidohacket i dem."
                            : heist.mode === "pirate"
                              ? "Handlingsfönster: 15 sekunder per fråga — klassen väljer tärning, rånar och handlar i dem."
                              : "Handlingsfönster: 15 sekunder per fråga — klassen rånar, handlar och väljer kista i dem."}
                        </p>
                      </div>
                    )}

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
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-slate-200">{name}</span>
                            {endStats?.find((e) => e.name === name) && (
                              <span className="text-[10px] font-semibold text-slate-500" data-no-translate>
                                {endStats.find((e) => e.name === name)!.correct}/{endStats.find((e) => e.name === name)!.answered} rätt
                                · bästa rån <span data-no-translate>{endStats.find((e) => e.name === name)!.bestRaid}</span> {heistRules?.currencyShort ?? ""}
                                {typeof endStats.find((e) => e.name === name)!.mint === "number" && ` · +${endStats.find((e) => e.name === name)!.mint} Mint`}
                              </span>
                            )}
                          </div>
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
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200" data-no-translate>
                            {p.name}
                          </span>
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
                            {/* Crypto hides exact balances until a hacker's trace
                                gives them away — on the projector too, or the
                                rule would only exist on the small screens. */}
                            {heist.mode === "crypto" &&
                            !(seat && seat.trace >= (heistRules.trace?.exposed ?? 65))
                              ? approxBalance(p.balance)
                              : p.balance.toLocaleString("sv-SE")}
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

      {/* Host leaves the match and its channels cleanly, not into a stranded
          lobby. A confirm prevents the keyboard shortcut/button from ending
          a class's live round by accident. */}
      {confirmLeave && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmLeave(false); }}
        >
          <section role="alertdialog" aria-modal="true" aria-labelledby="host-leave-title" aria-describedby="host-leave-description" className="w-full max-w-sm animate-pop rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl sm:p-6">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-rose-400/25 bg-rose-500/10 text-rose-300"><LogOut className="h-5 w-5" /></div>
            <h2 id="host-leave-title" className="font-display text-xl font-extrabold text-white">Lämna spelet?</h2>
            <p id="host-leave-description" className="mt-2 text-sm leading-relaxed text-slate-400">{phase === "lobby" ? "Lobbyn stängs eller starten avbryts; spelarna skickas tillbaka och ingen blir kvar och väntar." : "Matchen avslutas nu och alla får se slutställningen."}</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" autoFocus disabled={leaving} onClick={() => setConfirmLeave(false)} className="h-10 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50">Stanna kvar</button>
              <button type="button" disabled={leaving} onClick={async () => {
                if (leaving) return;
                setLeaving(true);
                if (phaseRef.current === "lobby" && !startedRef.current) {
                  // Cancel on both channels: a player may already have followed
                  // the start event into the game screen during the 3s countdown.
                  await Promise.allSettled([
                    lobbyRef.current?.send({ type: "broadcast", event: "cancel", payload: { pin } }),
                    gameRef.current?.send({ type: "broadcast", event: "cancel", payload: { pin } }),
                  ]);
                  if (questionStartTimerRef.current) clearTimeout(questionStartTimerRef.current);
                  questionStartTimerRef.current = null;
                  startedRef.current = true;
                  await Promise.allSettled([
                    supabaseRef.current.removeChannel(lobbyRef.current),
                    supabaseRef.current.removeChannel(gameRef.current),
                  ]);
                  router.replace("/dashboard/quizzes");
                  return;
                }
                if (phaseRef.current === "question" && !revealedRef.current) revealRef.current();
                // finish() can also run when the 3s start countdown is active
                // but the first question has not arrived yet.
                if (phaseRef.current === "lobby") {
                  await Promise.allSettled([
                    lobbyRef.current?.send({ type: "broadcast", event: "cancel", payload: { pin } }),
                    gameRef.current?.send({ type: "broadcast", event: "cancel", payload: { pin } }),
                  ]);
                  if (questionStartTimerRef.current) clearTimeout(questionStartTimerRef.current);
                } else {
                  startedRef.current = true;
                  // Publish standings and pay out before disconnecting the host.
                  finish();
                }
                if (phaseRef.current === "end") await new Promise((resolve) => setTimeout(resolve, 500));
                await Promise.allSettled([
                  supabaseRef.current.removeChannel(lobbyRef.current),
                  supabaseRef.current.removeChannel(gameRef.current),
                ]);
                router.replace("/dashboard/quizzes");
              }} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-500/90 px-4 text-sm font-extrabold text-white transition-colors hover:bg-rose-500 disabled:cursor-wait disabled:opacity-60"><LogOut className="h-4 w-4" />{leaving ? "Avslutar…" : "Lämna spelet"}</button>
            </div>
          </section>
        </div>
      )}

      {/* What the room just watched someone pull out of a chest. */}
      {chestReveal && <ChestReveal reveal={chestReveal} onClose={() => setChestReveal(null)} />}
    </GameStage>
  );
}
