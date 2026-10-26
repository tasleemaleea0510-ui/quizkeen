"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyUsername } from "@/app/settings/actions";
import { CheckCircle2, XCircle, Trophy, Loader2, Layers3 } from "lucide-react";
import { isExactAnswer } from "@/lib/quiz-draft";
import { WornBuddy } from "@/components/keens/worn-keen";
import CountUp from "@/components/motion/count-up";
import HeistPanel from "@/components/heist-panel";
import FullscreenButton from "@/components/fullscreen-button";
import { ANSWER_TINTS as COLORS } from "@/lib/answer-tints";
import type { HeistAction, HeistState } from "@/lib/game-modes";

const SHAPES = [
  <svg key="t" viewBox="0 0 24 24" className="h-6 w-6 opacity-90" fill="currentColor"><path d="M12 3l9 17H3z" /></svg>,
  <svg key="d" viewBox="0 0 24 24" className="h-6 w-6 opacity-90" fill="currentColor"><path d="M12 2l10 10-10 10L2 12z" /></svg>,
  <svg key="c" viewBox="0 0 24 24" className="h-6 w-6 opacity-90" fill="currentColor"><circle cx="12" cy="12" r="9" /></svg>,
  <svg key="s" viewBox="0 0 24 24" className="h-6 w-6 opacity-90" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>,
];

type Question = { index: number; text: string; options: string[]; correctCount?: number };

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
  // The heist layer, when the host picked one of the three modes. The board is
  // whatever the host last broadcast — this screen never edits it itself.
  const [heist, setHeist] = useState<HeistState | null>(null);
  const [heistNote, setHeistNote] = useState<string | null>(null);
  const [heistSending, setHeistSending] = useState(false);
  const [myMint, setMyMint] = useState<number | null>(null);

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
      resetAnswer();
      setPhase("question");
    });

    game.on("broadcast", { event: "reveal" }, (msg) => {
      const p = msg.payload as { correctIndexes?: number[]; correctIndex?: number; scores: Record<string, number> };
      setCorrect(correctList(p));
      setScores(p.scores || {});
      setPhase("reveal");
    });

    game.on("broadcast", { event: "end" }, (msg) => {
      const p = msg.payload as { scores: Record<string, number>; mint?: Record<string, number> };
      setScores(p.scores || {});
      if (p.mint && typeof p.mint[name] === "number") setMyMint(p.mint[name]);
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

    game.on("broadcast", { event: "state" }, (msg) => {
      const p = msg.payload as any;
      if (p.kind === "question") {
        setQuestion({ index: p.index, text: p.text, options: p.options, correctCount: p.correctCount });
        resetAnswer();
        setPhase("question");
      } else if (p.kind === "reveal") {
        setQuestion({ index: p.index, text: p.text, options: p.options, correctCount: p.correctCount });
        setCorrect(correctList(p));
        setScores(p.scores || {});
        setPhase("reveal");
      } else if (p.kind === "end") {
        setScores(p.scores || {});
        if (p.mint && typeof p.mint[name] === "number") setMyMint(p.mint[name]);
        setPhase("end");
      }
    });

    game.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        game.send({ type: "broadcast", event: "sync", payload: {} });
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
  }

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

  return (
    <div className="min-h-screen pb-8">
      {/* A game fills the screen: the site navbar is hidden here, so your Keen,
          your score and the fullscreen switch are the whole top bar. */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-2 sm:px-4">
          <WornBuddy
            label="Du spelar som"
            className="min-w-0 border-0 bg-transparent px-0 py-0 backdrop-blur-none"
          />
          {/* The score is yours whether or not you are wearing a Keen. */}
          <span
            data-no-translate
            className="ml-auto shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-extrabold text-amber-200"
          >
            <CountUp value={myScore} duration={650} /> p
          </span>
          <FullscreenButton />
        </div>
      </header>

      <div
        className={`mx-auto grid w-full items-start gap-4 px-3 pt-4 sm:px-4 ${
          showHeist ? "max-w-6xl lg:grid-cols-[minmax(0,1fr)_360px]" : "max-w-3xl"
        }`}
      >
        <div className="min-w-0 space-y-5">

        {phase === "waiting" && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            </span>
            <p className="font-medium text-slate-400">Väntar på att spelledaren ska starta nästa fråga...</p>
          </div>
        )}

        {phase === "question" && question && (
          <div className="animate-fade-up space-y-6">
            <div className="text-center">
              <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Fråga #{question.index + 1}
                </span>
                {need > 1 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                    <Layers3 className="h-3.5 w-3.5" />
                    Välj {need} rätta svar
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl">{question.text}</h1>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
                    className={`flex animate-fade-up items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br p-6 text-left text-lg font-bold text-white shadow-raise transition-all duration-200 ${COLORS[i % 4]} ${
                      selected ? "scale-[0.98] ring-4 ring-white/80" : dimmed ? "opacity-40" : "hover:-translate-y-0.5 hover:brightness-110"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/20 text-white">
                      {SHAPES[i % 4]}
                    </span>
                    <span className="leading-snug">{opt}</span>
                  </button>
                );
              })}
            </div>

            {need > 1 && !sent && (
              <div className="space-y-2">
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={() => submit(picked)}
                  disabled={picked.length !== need}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Svara ({picked.length} av {need} valda)
                  </span>
                </Button>
                <p className="text-center text-xs text-slate-500">
                  Frågan har {need} rätta svar — markera alla innan du skickar.
                </p>
              </div>
            )}

            {sent && (
              <div className="flex animate-fade-in items-center justify-center gap-2 text-sm font-medium text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Svaret är registrerat! Väntar på resultatet...</span>
              </div>
            )}
          </div>
        )}

        {phase === "reveal" && question && (
          <div className="space-y-6">
            <style>{`
              .qk-scene { perspective: 1200px; }
              .qk-card3d { transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1); }
              .qk-card3d.qk-flipped { transform: rotateY(180deg); }
              .qk-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
              .qk-back { transform: rotateY(180deg); }
            `}</style>

            <div className="flex items-center justify-center">
              {isRight ? (
                // A hit: a ring flies out of the badge and the badge stamps in.
                <div className="relative">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 animate-ring-burst rounded-full border-2 border-emerald-400/70"
                  />
                  <div className="relative inline-flex animate-stamp items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-base font-bold text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>RÄTT SVAR!</span>
                  </div>
                </div>
              ) : (
                // A miss: the badge lands, then shakes its head once.
                <div className="answer-wrong">
                  <div className="inline-flex animate-pop items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-5 py-2 text-base font-bold text-rose-400">
                    <XCircle className="h-5 w-5" />
                    <span>INTE RIKTIGT DEN HÄR GÅNGEN</span>
                  </div>
                </div>
              )}
            </div>

            <div className="qk-scene mx-auto w-full max-w-xl">
              <div className={`qk-card3d relative h-72 w-full ${revealFlip ? "qk-flipped" : ""}`}>
                <div className="qk-face absolute inset-0 flex items-center justify-center rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-indigo-600/30 via-slate-900 to-purple-600/30 p-6 shadow-card">
                  <div className="text-center">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">Fråga</p>
                    <p className="text-xl font-bold text-white">{question.text}</p>
                  </div>
                </div>
                <div className="qk-face qk-back absolute inset-0 flex items-center justify-center rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-600/30 via-slate-900 to-teal-600/30 p-6 shadow-card">
                  <div className="text-center">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-300">
                      {correct.length > 1 ? "Rätta svar" : "Rätt svar"}
                    </p>
                    <div className="space-y-1">
                      {correct.map((ci) => (
                        <p key={ci} className="text-xl font-bold leading-tight text-white sm:text-2xl">
                          {question.options[ci]}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center text-sm font-mono text-slate-400">
              Din poäng:{" "}
              <CountUp value={scores[name] ?? 0} className="font-bold text-white" /> poäng
            </div>
          </div>
        )}

        {phase === "end" && (
          <Card className="animate-fade-up border-white/10">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/20 text-amber-400">
                <Trophy className="h-7 w-7" />
              </div>
              <CardTitle className="font-display text-2xl font-bold">Slutresultat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {leaderboard.map(([n, s], i) => (
                <div
                  key={n}
                  style={{ animationDelay: `${Math.min(i * 55, 550)}ms` }}
                  className={`flex animate-row-in items-center justify-between rounded-xl px-4 py-3 transition-colors ${
                    n === name
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 font-bold text-white shadow-glow-sm"
                      : "border border-white/5 bg-slate-900/60 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 font-mono text-sm font-bold ${
                      i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-500"
                    }`}>
                      {i + 1}
                    </span>
                    <span>{n}</span>
                  </div>
                  <span className="font-mono">{s} poäng</span>
                </div>
              ))}
              {myMint !== null && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
                  <span>Du fick</span>
                  <span data-no-translate className="font-mono text-lg">
                    {myMint}
                  </span>
                  <span>Mint</span>
                </div>
              )}
              <p className="pt-4 text-center text-xs text-slate-500">Tack för att du deltog i QuizKeen</p>
            </CardContent>
          </Card>
        )}
          </div>

        {showHeist && heist && (
          <aside className="min-w-0 lg:sticky lg:top-16 lg:self-start">
            <HeistPanel
              state={heist}
              me={name}
              note={heistNote}
              pending={heistSending}
              onAction={heistAction}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Laddar spelet...</div>}>
      <GameInner />
    </Suspense>
  );
}
