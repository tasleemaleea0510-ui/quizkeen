"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { getMyUsername } from "@/app/settings/actions";
import { CheckCircle2, XCircle, Trophy, Loader2, Layers3, Swords, Coins, ArrowRight, LogOut, BookOpen, Radar, Zap } from "lucide-react";
import { isExactAnswer } from "@/lib/quiz-draft";
import { WornBuddy } from "@/components/keens/worn-keen";
import CountUp from "@/components/motion/count-up";
import HeistPanel from "@/components/heist-panel";
import CyberHackChallenge from "@/components/cyber-hack-challenge";
import { ChestPick, ChestReveal } from "@/components/chest-pick";
import FullscreenButton from "@/components/fullscreen-button";
import GameStage from "@/components/game/game-stage";
import { stageTheme } from "@/components/game/game-theme";
import { cn } from "@/lib/utils";
import { ANSWER_TINTS as COLORS } from "@/lib/answer-tints";
import {
  ACTION_WINDOW_MS,
  MODE_RULES,
  chestOpen,
  standings,
  type ChestReveal as ChestRevealData,
  type EndStat,
  type HeistAction,
  type HeistState,
} from "@/lib/game-modes";
import { MatchClockChip, ActionWindowChip } from "@/components/match-clock";

const SHAPES = [
  <svg key="t" viewBox="0 0 24 24" className="h-5 w-5 opacity-95" fill="currentColor"><path d="M12 3l9 17H3z" /></svg>,
  <svg key="d" viewBox="0 0 24 24" className="h-5 w-5 opacity-95" fill="currentColor"><path d="M12 2l10 10-10 10L2 12z" /></svg>,
  <svg key="c" viewBox="0 0 24 24" className="h-5 w-5 opacity-95" fill="currentColor"><circle cx="12" cy="12" r="9" /></svg>,
  <svg key="s" viewBox="0 0 24 24" className="h-5 w-5 opacity-95" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>,
];

type Question = { index: number; text: string; options: string[]; correctCount?: number };

/** A race question as the room receives it: no correct answers attached. */
type RaceQuestion = { text: string; options: string[]; correctCount: number };

/** The right answers, from either payload shape — the flashcard battle sends one. */
function correctList(p: { correctIndexes?: number[]; correctIndex?: number }): number[] {
  if (Array.isArray(p.correctIndexes)) return p.correctIndexes;
  return typeof p.correctIndex === "number" ? [p.correctIndex] : [];
}

function GameInner() {
  const params = useParams();
  const search = useSearchParams();
  const pin = params.pin as string;
  const name = search.get("name") || "Player";

  const [question, setQuestion] = useState<Question | null>(null);
  const [phase, setPhase] = useState<"waiting" | "question" | "reveal" | "end">("waiting");
  // A question with one right answer locks in on the first tap; one with
  // several invites you to tick them all and then press Svara.
  const [picked, setPicked] = useState<number[]>([]);
  const [sent, setSent] = useState(false);
  const [correct, setCorrect] = useState<number[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [classicStreak, setClassicStreak] = useState(0);
  const classicStreakRef = useRef(0);
  // The heist layer, when the host picked one of the three modes. The board is
  // whatever the host last broadcast — this screen never edits it itself.
  const [heist, setHeist] = useState<HeistState | null>(null);
  const [heistNote, setHeistNote] = useState<string | null>(null);
  const [heistSending, setHeistSending] = useState(false);
  const [myMint, setMyMint] = useState<number | null>(null);
  // The chest pull, put on this screen by the host. Everyone gets it: the
  // person who tapped and the eleven people watching them.
  const [chestReveal, setChestReveal] = useState<ChestRevealData | null>(null);
  // The round this player waved the chest away, so the picker does not nag
  // twice about the same question.
  const [chestSkipped, setChestSkipped] = useState<number | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // ── The race ─────────────────────────────────────────────────────────────
  // In the heist modes nobody waits for the host: the match hands out the
  // question sheet once, then paces every seat on its own, and the shared
  // clock is what stops the match.
  const [race, setRace] = useState<{ minutes: number; endsAt: number; length: number } | null>(null);
  const raceListRef = useRef<RaceQuestion[] | null>(null);
  const [lap, setLap] = useState(1);
  const [endStats, setEndStats] = useState<EndStat[] | null>(null);
  const continueSentRef = useRef(false);
  const [continuing, setContinuing] = useState(false);
  // ── The action window ─────────────────────────────────────────────────
  // Fifteen shared seconds between a question's reveal and your move on —
  // the only time when raids, hacks, the chest and purchases are live. The
  // host stamps it once; this screen counts the same stamp everyone else
  // does, so nobody's raid can slip in "one more second" on their own clock.
  const [actionEndsAt, setActionEndsAt] = useState<number | null>(null);
  // The seconds left on the between-questions window, ticked down once per
  // second so the Fortsätt button can count breathing down your neck.
  const [continueIn, setContinueIn] = useState(15);

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

  const streakBonus = classicStreak > 1 ? Math.min(75, (classicStreak - 1) * 15) : 0;

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
      // A chest overlay from the previous question must not sit on top of the
      // next one while the host is already reading it out.
      setChestReveal(null);
      resetAnswer();
      setActionEndsAt(null);
      classicStreakRef.current = 0;
      setClassicStreak(0);
      setPhase("question");
    });

    game.on("broadcast", { event: "reveal" }, (msg) => {
      const p = msg.payload as { correctIndexes?: number[]; correctIndex?: number; scores: Record<string, number>; streaks?: Record<string, number>; windowEndsAt?: number };
      setCorrect(correctList(p));
      setScores(p.scores || {});
      // The room-wide window stamp: raids, hacks and chests are live until
      // it runs out, on this screen exactly as on the projector's.
      setActionEndsAt(typeof p.windowEndsAt === "number" && p.windowEndsAt > Date.now() ? p.windowEndsAt : null);
      if (typeof p.streaks?.[name] === "number") {
        classicStreakRef.current = p.streaks[name];
        setClassicStreak(p.streaks[name]);
      }
      setPhase("reveal");
    });

    game.on("broadcast", { event: "cancel" }, () => {
      window.location.replace("/play");
    });

    // ── Race events ────────────────────────────────────────────────────────
    // The match sheet arrives once; every pace is addressed to one seat and
    // silently dropped by all the others.
    game.on("broadcast", { event: "match" }, (msg) => {
      const p = msg.payload as { mode?: string; minutes: number; endsAt: number; questions: RaceQuestion[] };
      if (!Array.isArray(p?.questions) || p.questions.length === 0) return;
      raceListRef.current = p.questions;
      setRace({ minutes: p.minutes ?? 5, endsAt: p.endsAt ?? Date.now(), length: p.questions.length });
      continueSentRef.current = false;
      setContinuing(false);
      setPhase("waiting");
    });

    game.on("broadcast", { event: "pace" }, (msg) => {
      const p = msg.payload as {
        to?: string;
        kind: "question" | "reveal";
        r?: number;
        lap?: number;
        correctIndexes?: number[];
        scores?: Record<string, number>;
        streak?: number;
        windowEndsAt?: number;
      };
      if (!p || p.to !== name) return;
      const list = raceListRef.current;
      if (!list) return;
      const r = p.r ?? 0;
      const q = list[r];
      if (!q) return;
      setQuestion({ index: r, text: q.text, options: q.options, correctCount: q.correctCount });
      setLap(p.lap ?? 1);
      if (p.kind === "question") {
        resetAnswer();
        setActionEndsAt(null);
        classicStreakRef.current = 0;
        setClassicStreak(0);
        setPhase("question");
      } else {
        setCorrect(p.correctIndexes ?? []);
        setScores((prev) => ({ ...prev, ...(p.scores ?? {}) }));
        setActionEndsAt(typeof p.windowEndsAt === "number" && p.windowEndsAt > Date.now() ? p.windowEndsAt : null);
        if (typeof p.streak === "number") {
          classicStreakRef.current = p.streak;
          setClassicStreak(p.streak);
        }
        setPhase("reveal");
      }
    });

    game.on("broadcast", { event: "end" }, (msg) => {
      const p = msg.payload as { scores: Record<string, number>; mint?: Record<string, number>; stats?: EndStat[] };
      setScores(p.scores || {});
      if (p.mint && typeof p.mint[name] === "number") setMyMint(p.mint[name]);
      if (Array.isArray(p.stats)) setEndStats(p.stats);
      setPhase("end");
    });

    // Every action is answered with a fresh board from the host, so the panel
    // is never a local guess that disagrees with everyone else's screen.
    game.on("broadcast", { event: "heist" }, (msg) => {
      setHeist(msg.payload as HeistState);
      setHeistSending(false);
    });
    game.on("broadcast", { event: "heist-note" }, (msg) => {
      const p = msg.payload as { to?: string; text?: string };
      if (p?.to !== name) return;
      setHeistNote(p.text ?? null);
      setHeistSending(false);
    });
    game.on("broadcast", { event: "heist-reveal" }, (msg) => {
      setChestReveal(msg.payload as ChestRevealData);
      setHeistSending(false);
    });

    game.on("broadcast", { event: "state" }, (msg) => {
      const p = msg.payload as any;
      if (p.kind === "question") {
        setQuestion({ index: p.index, text: p.text, options: p.options, correctCount: p.correctCount });
        setChestReveal(null);
        resetAnswer();
        setActionEndsAt(null);
        classicStreakRef.current = 0;
        setClassicStreak(0);
        setPhase("question");
      } else if (p.kind === "reveal") {
        setQuestion({ index: p.index, text: p.text, options: p.options, correctCount: p.correctCount });
        setCorrect(correctList(p));
        setScores(p.scores || {});
        setActionEndsAt(typeof p.windowEndsAt === "number" && p.windowEndsAt > Date.now() ? p.windowEndsAt : null);
        if (typeof p.streaks?.[name] === "number") {
          classicStreakRef.current = p.streaks[name];
          setClassicStreak(p.streaks[name]);
        }
        setPhase("reveal");
      } else if (p.kind === "end") {
        setScores(p.scores || {});
        if (p.mint && typeof p.mint[name] === "number") setMyMint(p.mint[name]);
        if (Array.isArray(p.stats)) setEndStats(p.stats);
        setPhase("end");
      }
    });

    game.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        // The name rides along, so a race seat rejoining mid-match gets its
        // own place in the race back instead of sitting forever on waiting.
        game.send({ type: "broadcast", event: "sync", payload: { name } });
      }
    });

    gameRef.current = game;
    return () => {
      supabase.removeChannel(game);
    };
  }, [pin]);

  function resetAnswer() {
    setPicked([]);
    setSent(false);
    setCorrect([]);
    continueSentRef.current = false;
    setContinuing(false);
    setContinueIn(15);
  }

  /**
   * Fortsätt between your own questions. Only a race seat ever sends this:
   * pressed either by hand or when the shared fifteen-second window runs
   * out. Idempotent on the host, so a double tap just hands the seat its
   * current question back.
   */
  function requestNext() {
    if (continueSentRef.current) return;
    continueSentRef.current = true;
    setContinuing(true);
    gameRef.current?.send({ type: "broadcast", event: "pace-next", payload: { name } });
  }

  // The action window is also the continue clock in a race: the same stamp
  // everyone else counts is what moves you on. If the host's stamp is missing
  // (an older host, a laggy rejoin) the window still runs the local fifteen.
  useEffect(() => {
    if (!race || phase !== "reveal" || continuing) return;
    if (continueSentRef.current) return;
    const ends = actionEndsAt ?? Date.now() + ACTION_WINDOW_MS;
    const tick = setInterval(() => setContinueIn(Math.max(0, Math.ceil((ends - Date.now()) / 1000))), 500);
    const go = setTimeout(requestNext, Math.max(0, ends - Date.now()));
    return () => {
      clearInterval(tick);
      clearTimeout(go);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race, phase, continuing, actionEndsAt]);

  // Keep the countdown chips honest while a window is open: the renderer
  // re-runs at half a second so every count reads the same clock.
  const [, setUiTick] = useState(0);
  useEffect(() => {
    if (!actionEndsAt) return;
    const iv = setInterval(() => setUiTick((t) => t + 1), 500);
    return () => clearInterval(iv);
  }, [actionEndsAt]);
  const actionOpen = actionEndsAt !== null && Date.now() <= actionEndsAt + 500;

  /** Send the answer now: one tap on a single-answer question, Svara on many. */
  function submit(choices: number[]) {
    if (sent || choices.length === 0) return;
    setSent(true);
    setPicked(choices);
    gameRef.current?.send({
      type: "broadcast",
      event: "answer",
      payload: {
        name,
        choices,
        // The flashcard battle still reads a single number.
        choice: choices[0],
        acc: accountRef.current || undefined,
      },
    });
  }

  /** Send a raid or a purchase to the host. The host decides if it works. */
  function heistAction(action: HeistAction) {
    if (heistSending) return;
    setHeistNote(null);
    setHeistSending(true);
    gameRef.current?.send({ type: "broadcast", event: "heist-action", payload: { name, action } });
    // If the host's tab is asleep there is no answer at all; un-stick the
    // buttons rather than leaving the panel spinning forever.
    setTimeout(() => setHeistSending(false), 3000);
  }

  function pick(i: number) {
    if (sent) return;
    const need = question?.correctCount ?? 1;
    if (need <= 1) {
      submit([i]);
      return;
    }
    setPicked((prev) => {
      if (prev.includes(i)) return prev.filter((x) => x !== i);
      if (prev.length >= need) return prev;
      return [...prev, i];
    });
  }

  const leaderboard = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  const myScore = scores[name] ?? scores[accountRef.current] ?? 0;
  const need = question?.correctCount ?? 1;
  // Only an exact set counts: all the right answers and nothing else.
  const isRight = correct.length > 0 && isExactAnswer(picked, correct);
  // The heist panel runs beside the question on a laptop and underneath it on a
  // phone, so a match is played on one screen instead of two stacked cards.
  const showHeist = Boolean(heist) && (phase === "question" || phase === "reveal");
  // Vault Raiders hands out one chest a question. It opens between questions —
  // during the reveal, never during the clock — because a chest is the one
  // decision in a match that is yours alone, and it should not cost you an
  // answer. If you would rather open it yourself, the panel still has the
  // three boxes for the rest of the round.
  const canPickChest =
    heist !== null &&
    heist.mode === "vault" &&
    phase === "reveal" &&
    (actionEndsAt === null || actionOpen) &&
    chestOpen(heist, name) &&
    chestSkipped !== heist.round;

  const theme = stageTheme(heist?.mode ?? null);
  const modeRules = heist ? MODE_RULES[heist.mode] : null;
  // The purse is the mode's own scoreboard; the quiz points are a second one.
  // The end screen shows both, because Mint is paid by the first.
  const heistFinal = heist ? standings(heist) : [];

  return (
    <GameStage mode={heist?.mode ?? null}>
      {/* ── The HUD ─────────────────────────────────────────────────────────
          A game screen has one thin bar, not a website header: who you are,
          which mode you are in, what you have, and the way to fill the wall. */}
      <header className="relative z-20 flex shrink-0 items-center gap-2 border-b border-white/10 bg-slate-950/55 px-3 py-2 backdrop-blur-xl sm:px-5">
        <WornBuddy
          label="Du spelar som"
          className="min-w-0 border-0 bg-transparent px-0 py-0 backdrop-blur-none"
        />

        {modeRules && (
          <span
            data-no-translate
            className={cn(
              "ml-1 hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider sm:inline-flex",
              theme.chip
            )}
          >
            <Swords className="h-3.5 w-3.5" />
            {modeRules.name}
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {modeRules && (
            <span className="hidden items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-extrabold text-amber-200 sm:flex">
              <Coins className="h-3.5 w-3.5" />
              <span data-no-translate>
                {(heist?.players[name]?.balance ?? 0).toLocaleString("sv-SE")}
              </span>
            </span>
          )}
          {/* The rail below repeats these, but a phone that has scrolled past it
              should still be able to see what a raid costs. */}
          {modeRules && heist?.players[name] && (
            <span
              title={`${modeRules.energyName}: ${heist.players[name].energy}/${heist.players[name].maxEnergy}`}
              className="hidden items-center gap-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-xs font-extrabold text-indigo-200 md:flex"
            >
              <Zap className="h-3.5 w-3.5" />
              <span data-no-translate>
                {heist.players[name].energy}/{heist.players[name].maxEnergy}
              </span>
            </span>
          )}
          {modeRules?.trace && heist?.players[name] && (
            <span
              title={`Spår: ${heist.players[name].trace}`}
              className={cn(
                "hidden items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-extrabold md:flex",
                heist.players[name].trace >= (modeRules.trace.exposed ?? 65)
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                  : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              )}
            >
              <Radar className="h-3.5 w-3.5" />
              <span data-no-translate>{heist.players[name].trace}</span>
            </span>
          )}
          {race && (phase === "question" || phase === "reveal") && (
            <MatchClockChip endsAt={race.endsAt} minutes={race.minutes} className="inline-flex" />
          )}
          <span
            data-no-translate
            className="rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-xs font-extrabold text-white"
          >
            <CountUp value={myScore} duration={650} /> p
          </span>
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            title="Lämna matchen"
            aria-label="Lämna matchen"
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

      {/* ── The board ───────────────────────────────────────────────────────
          On a laptop this is two columns and neither scrolls. On a phone the
          right rail drops underneath and the whole thing scrolls, because a
          phone has one column and no wall to project onto. */}
      <div className={cn("relative z-10 grid min-h-0 flex-1 grid-cols-1", showHeist ? "overflow-y-auto lg:grid-cols-[minmax(0,1fr)_384px] lg:overflow-hidden" : "overflow-y-auto")}>
        <section className="relative flex min-h-0 flex-col lg:overflow-y-auto">
          <div className="m-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
            {phase === "waiting" && (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <span className={cn("grid h-16 w-16 place-items-center rounded-2xl border", theme.chip)}>
                  <Loader2 className="h-7 w-7 animate-spin" />
                </span>
                <p className="font-display text-xl font-bold text-white">Väntar på spelledaren…</p>
                <p className="max-w-sm text-sm text-slate-400">
                  Håll koll på projektorn — nästa fråga landar här samma sekund som den startar.
                </p>
              </div>
            )}

            {phase === "question" && question && (
              <div className="animate-fade-up space-y-7">
                <div className="text-center">
                  <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-white/80">
                      {race ? `Omgång ${lap} · Fråga ${(question.index % race.length) + 1}` : `Fråga #${question.index + 1}`}
                    </span>
                    {race && race.minutes > 1 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-400/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-200">
                        <Radar className="h-3.5 w-3.5" />
                        {lap} gånger genom listan
                      </span>
                    )}
                    {need > 1 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-200">
                        <Layers3 className="h-3.5 w-3.5" />
                        Välj {need} rätta svar
                      </span>
                    )}
                    {heist && (
                      <span
                        data-no-translate
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider sm:hidden",
                          theme.chip
                        )}
                      >
                        <Swords className="h-3.5 w-3.5" />
                        {modeRules?.name}
                      </span>
                    )}
                  </div>

                  <h1 className="text-balance font-display text-3xl font-extrabold leading-[1.15] text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.55)] sm:text-4xl lg:text-[2.6rem]">
                    {question.text}
                  </h1>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  {question.options.map((opt, i) => {
                    const selected = picked.includes(i);
                    const dimmed = sent && !selected;
                    return (
                      <button
                        key={i}
                        onClick={() => pick(i)}
                        disabled={sent}
                        aria-pressed={need > 1 ? selected : undefined}
                        style={{ animationDelay: `${i * 70}ms` }}
                        className={cn(
                          "qk-answer group relative flex min-h-[92px] animate-fade-up items-center gap-4 overflow-hidden rounded-3xl border-2 border-white/15 bg-gradient-to-br p-5 text-left font-bold text-white shadow-[0_18px_40px_-22px_rgba(0,0,0,0.9)] sm:min-h-[112px] sm:p-6",
                          COLORS[i % 4],
                          selected && "scale-[0.98] border-white ring-4 ring-white/70",
                          dimmed && "opacity-40",
                          sent && !selected && "cursor-default"
                        )}
                      >
                        <span className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-black/25 ring-1 ring-inset ring-white/20">
                          {SHAPES[i % 4]}
                        </span>
                        <span className="relative z-10 text-lg leading-snug sm:text-xl lg:text-[1.35rem]">
                          {opt}
                        </span>
                        {selected && (
                          <CheckCircle2 className="relative z-10 ml-auto h-6 w-6 shrink-0 animate-pop" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {need > 1 && !sent && (
                  <div className="space-y-2">
                    <Button
                      size="lg"
                      className="h-14 w-full gap-2 text-base"
                      onClick={() => submit(picked)}
                      disabled={picked.length !== need}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span>
                        Svara ({picked.length} av {need} valda)
                      </span>
                    </Button>
                    <p className="text-center text-xs text-slate-400">
                      Frågan har {need} rätta svar — markera alla innan du skickar.
                    </p>
                  </div>
                )}

                {sent && (
                  <div className="space-y-2">
                    <div className="flex animate-fade-in items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Svaret är registrerat!</span>
                    </div>
                    {race && (
                      <p className="text-center text-xs font-bold text-slate-400">
                        Här spelar du mot klockan — svaret räknas direkt, du väntar inte på spelledaren.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {phase === "reveal" && question && (
              <div className="space-y-7">
                <style>{`
                  .qk-scene { perspective: 1200px; }
                  .qk-card3d { transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1); }
                  .qk-card3d.qk-flipped { transform: rotateY(180deg); }
                  .qk-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
                  .qk-back { transform: rotateY(180deg); }
                `}</style>

                <div className="flex flex-col items-center gap-4">
                  {isRight ? (
                    // A hit: a ring flies out of the badge and the badge stamps in.
                    <div className="relative">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 animate-ring-burst rounded-full border-2 border-emerald-400/70"
                      />
                      <div className="relative inline-flex animate-stamp items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-6 py-2.5 text-lg font-extrabold tracking-wide text-emerald-300 shadow-[0_0_40px_-10px_rgba(16,185,129,0.9)]">
                        <CheckCircle2 className="h-6 w-6" />
                        <span>RÄTT SVAR!</span>
                      </div>
                    </div>
                  ) : (
                    // A miss: the badge lands, then shakes its head once.
                    <div className="answer-wrong">
                      <div className="inline-flex animate-pop items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/15 px-6 py-2.5 text-lg font-extrabold tracking-wide text-rose-300 shadow-[0_0_40px_-10px_rgba(244,63,94,0.9)]">
                        <XCircle className="h-6 w-6" />
                        <span>INTE DEN HÄR GÅNGEN</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="qk-scene mx-auto w-full max-w-xl">
                  <div className={`qk-card3d relative h-64 w-full sm:h-72 ${revealFlip ? "qk-flipped" : ""}`}>
                    <div className="qk-face absolute inset-0 flex items-center justify-center rounded-3xl border-2 border-white/15 bg-gradient-to-br from-indigo-600/30 via-slate-900 to-purple-600/30 p-6 shadow-card backdrop-blur-xl">
                      <div className="text-center">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">Frågan var</p>
                        <p className="font-display text-xl font-bold text-white">{question.text}</p>
                      </div>
                    </div>
                    <div className="qk-face qk-back absolute inset-0 flex items-center justify-center rounded-3xl border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-600/30 via-slate-900 to-teal-600/30 p-6 shadow-[0_0_60px_-20px_rgba(16,185,129,0.9)] backdrop-blur-xl">
                      <div className="text-center">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-300">
                          {correct.length > 1 ? "Rätta svar" : "Rätt svar"}
                        </p>
                        <div className="space-y-1">
                          {correct.map((ci) => (
                            <p key={ci} className="font-display text-xl font-bold leading-tight text-white sm:text-2xl">
                              {question.options[ci]}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {phase === "reveal" && actionEndsAt !== null && (
                  <div className="mx-auto flex w-full max-w-md flex-col items-center gap-1.5">
                    <ActionWindowChip endsAt={actionEndsAt} />
                    <p className="text-center text-[11px] font-bold text-violet-200/80">
                      {actionOpen
                        ? "Rån, hack, kista och köp är öppna tills fönstret stänger."
                        : "Fönstret har stängt — nästa fråga är på väg."}
                    </p>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Din poäng</p>
                  <p className="mt-1 font-mono text-lg font-bold text-white">
                    <CountUp value={scores[name] ?? 0} /> p
                  </p>
                  {!modeRules && classicStreak > 1 && (
                    <p className="mt-1 text-xs font-extrabold text-indigo-200">
                      {classicStreak} i rad · +{streakBonus} streakbonus denna runda
                    </p>
                  )}
                </div>

                {race && (
                  <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
                    {continuing ? (
                      <Button size="lg" className="h-14 w-full gap-2 text-base" disabled>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Nästa fråga är på väg…
                      </Button>
                    ) : (
                      <Button size="lg" className="h-14 w-full gap-2 text-base" onClick={requestNext}>
                        <ArrowRight className="h-5 w-5" />
                        Fortsätt ({continueIn} s kvar)
                      </Button>
                    )}
                    <p className="text-center text-xs text-slate-400">
                      Du spelar i din egen takt — ingen annan väntar på dig, och du väntar inte på dem.
                    </p>
                  </div>
                )}
              </div>
            )}

            {phase === "end" && (
              <div className="animate-fade-up space-y-6">
                <div className="text-center">
                  <div className="mx-auto mb-3 grid h-16 w-16 animate-stamp place-items-center rounded-2xl border border-amber-400/35 bg-amber-500/15 text-amber-300">
                    <Trophy className="h-8 w-8" />
                  </div>
                  <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">Slutresultat</h1>
                  <p className="mt-1 text-sm text-slate-400">
                    {leaderboard.length} spelare{modeRules ? ` · ${modeRules.name}` : ""}
                  </p>
                </div>

                <p className="text-center text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                  Quizpoäng
                </p>

                {/* Top three, drawn as cards rather than rows: the end of a
                    match is the part people screenshot. */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[0, 1, 2].map((i) => {
                    const row = leaderboard[i];
                    const tone =
                      i === 0 ? "border-amber-400/50 bg-amber-500/15 text-amber-200"
                        : i === 1 ? "border-slate-300/40 bg-white/10 text-slate-200"
                          : "border-orange-500/40 bg-orange-500/10 text-orange-200";
                    return (
                      <div
                        key={i}
                        style={{ animationDelay: `${i * 90}ms` }}
                        className={cn(
                          "animate-rise-in rounded-2xl border p-3 text-center backdrop-blur-md",
                          row ? tone : "border-white/10 bg-white/[0.03] text-slate-600",
                          i === 0 && "sm:-translate-y-2"
                        )}
                      >
                        <span className="block text-[10px] font-extrabold uppercase tracking-widest opacity-70">
                          {i === 0 ? "🥇 1:a" : i === 1 ? "🥈 2:a" : "🥉 3:e"}
                        </span>
                        <span
                          data-no-translate
                          className="mt-1 block truncate text-sm font-extrabold text-white"
                        >
                          {row ? row[0] : "–"}
                        </span>
                        <span className="mt-0.5 block font-mono text-xs font-bold opacity-80">
                          {row ? `${row[1]} p` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {leaderboard.length > 3 && (
                  <div className="space-y-1.5">
                    {leaderboard.slice(3).map(([n, s], i) => (
                      <div
                        key={n}
                        style={{ animationDelay: `${Math.min(i * 45, 400)}ms` }}
                        className={cn(
                          "flex animate-row-in items-center justify-between rounded-xl px-4 py-2.5 text-sm",
                          n === name
                            ? "bg-gradient-to-r from-indigo-600 to-violet-600 font-bold text-white shadow-glow-sm"
                            : "border border-white/10 bg-white/[0.04] text-slate-300"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-5 shrink-0 font-mono text-xs font-bold text-slate-500">{i + 4}</span>
                          <span data-no-translate className="truncate">{n}</span>
                        </div>
                        <span className="shrink-0 font-mono text-xs">{s} p</span>
                      </div>
                    ))}
                  </div>
                )}

                {leaderboard.length <= 3 && leaderboard.length > 0 && leaderboard.every(([n]) => n !== name) && (
                  <p className="text-center text-sm text-slate-400">
                    Du hamnade utanför pallen — nästa match är din.
                  </p>
                )}

                {endStats && endStats.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Loppet — takt och träffsäkerhet
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Vem svarade flest, och vem var bäst på det. Poängen står bredvid.
                    </p>
                    <ol className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
                      {endStats.map((s, i) => (
                        <li
                          key={s.name}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm",
                            s.name === name
                              ? "bg-indigo-500/15 text-indigo-100 ring-1 ring-inset ring-indigo-400/30"
                              : "text-slate-300"
                          )}
                        >
                          <span className="w-4 shrink-0 font-mono text-[11px] font-bold text-slate-500">
                            {s.place ?? i + 1}
                          </span>
                          <span data-no-translate className="min-w-0 flex-1 truncate font-bold">
                            {s.name}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-emerald-300" data-no-translate>
                            {s.correct}/{s.answered}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-slate-400" data-no-translate>
                            {s.points} p
                          </span>
                          {typeof s.mint === "number" && (
                            <span className="shrink-0 font-mono text-[11px] font-extrabold text-amber-300" data-no-translate>
                              +{s.mint} Mint
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {heist && modeRules && heistFinal.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="flex items-center justify-between gap-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      <span data-no-translate>{modeRules.name}</span>
                      <span>{modeRules.currency}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Matchställning — Mint betalas efter den här ordningen.
                    </p>
                    <ol className="mt-2 space-y-1">
                      {heistFinal.map((p, i) => (
                        <li
                          key={p.name}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm",
                            p.name === name
                              ? "bg-amber-500/15 text-amber-100 ring-1 ring-inset ring-amber-400/30"
                              : "text-slate-300"
                          )}
                        >
                          <span className="w-4 shrink-0 font-mono text-[11px] font-bold text-slate-500">
                            {i + 1}
                          </span>
                          <span data-no-translate className="min-w-0 flex-1 truncate font-bold">
                            {p.name}
                          </span>
                          {i === 0 && <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-300" />}
                          <span
                            data-no-translate
                            className="shrink-0 font-mono text-xs font-extrabold text-amber-200"
                          >
                            {p.balance.toLocaleString("sv-SE")}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {myMint !== null && (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
                    <span>Du fick</span>
                    <span data-no-translate className="font-mono text-lg">{myMint}</span>
                    <span>Mint</span>
                  </div>
                )}

                <p className="text-center text-xs text-slate-500">
                  Tack för att du spelade — håll kvar på skärmen, värden kan starta en omgång till.
                </p>

                {/* The way out. A finished match used to be a room with no door:
                    the site navbar is hidden on game screens, so the only escape
                    was the browser's own back button, which is not something you
                    can tell a class to use. */}
                <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:flex-row">
                  <p className="text-xs font-semibold text-slate-400">
                    Admin tiggde om den här knappen — varsågod! 😄
                  </p>
                  <Link
                    href="/play"
                    className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-600 px-5 text-sm font-bold text-white shadow-glow-sm ring-1 ring-inset ring-white/20 transition-transform hover:-translate-y-0.5 sm:w-auto"
                  >
                    Gå tillbaka till quizet
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {showHeist && heist && (
          <aside
            className={cn(
              "min-h-0 border-t border-white/10 bg-slate-950/45 backdrop-blur-xl",
              "lg:border-l lg:border-t-0 lg:overflow-y-auto",
              theme.edge
            )}
          >
            <div className="space-y-3 p-3">
              {heist.mode === "crypto" && phase === "reveal" && (
                <CyberHackChallenge
                  round={heist.round}
                  playerName={name}
                  used={heist.players[name]?.hackRound === heist.round}
                  pending={heistSending}
                  onAction={heistAction}
                  note={heistNote}
                />
              )}
              <HeistPanel
                state={heist}
                me={name}
                note={heistNote}
                pending={heistSending}
                chestAllowed={phase === "reveal"}
                onAction={heistAction}
              />
            </div>
          </aside>
        )}
      </div>

      {/* Confirm before leaving: on a phone the HUD is all thumb targets, and
          quitting in the middle of a round should be deliberate. Confirming
          routes away, which also removes the player's live Supabase channel. */}
      {confirmLeave && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmLeave(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="leave-match-title"
            aria-describedby="leave-match-description"
            className="w-full max-w-sm animate-pop rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-[0_30px_90px_-25px_rgba(0,0,0,0.9)] sm:p-6"
          >
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-rose-400/25 bg-rose-500/10 text-rose-300">
              <LogOut className="h-5 w-5" />
            </div>
            <h2 id="leave-match-title" className="font-display text-xl font-extrabold text-white">
              Lämna matchen?
            </h2>
            <p id="leave-match-description" className="mt-2 text-sm leading-relaxed text-slate-400">
              Du lämnar den här omgången och kommer tillbaka till sidan där du kan gå med i ett spel igen.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmLeave(false)}
                className="h-10 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-slate-200 transition-colors hover:bg-white/10"
              >
                Stanna kvar
              </button>
              <Link
                href="/play"
                onClick={() => setConfirmLeave(false)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-500/90 px-4 text-sm font-extrabold text-white transition-colors hover:bg-rose-500"
              >
                <LogOut className="h-4 w-4" />
                Lämna matchen
              </Link>
            </div>
          </section>
        </div>
      )}

      {/* The pick. Always on top of the question, because it is the one thing a
          player does without the rest of the room watching their answers. */}
      {canPickChest && heist && !chestReveal && (
        <ChestPick
          name={name}
          keenId={heist.players[name]?.keen ?? null}
          offers={MODE_RULES[heist.mode].chests ?? []}
          question={(question?.index ?? 0) + 1}
          pending={heistSending}
          onPick={(chest) => heistAction({ kind: "chest", chest })}
          onSkip={() => setChestSkipped(heist.round)}
        />
      )}

      {/* And what was inside, on every screen at once. */}
      {chestReveal && <ChestReveal reveal={chestReveal} onClose={() => setChestReveal(null)} />}
    </GameStage>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Laddar spelet...</div>}>
      <GameInner />
    </Suspense>
  );
}
