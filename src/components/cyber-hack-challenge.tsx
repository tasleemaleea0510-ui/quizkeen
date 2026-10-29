"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Check, Delete, LockKeyhole, Radio, RotateCcw, ShieldAlert, Signal, Sparkles, Square, Triangle, Circle, Diamond } from "lucide-react";
import { cn } from "@/lib/utils";
import { hackChallengeFor, type HeistAction } from "@/lib/game-modes";

const SHAPE_ICONS = { triangle: Triangle, diamond: Diamond, circle: Circle, square: Square } as const;
const SIGNAL_COLORS = [
  "border-rose-300 bg-rose-500 text-white shadow-[0_0_24px_rgba(244,63,94,0.7)]",
  "border-sky-300 bg-sky-500 text-white shadow-[0_0_24px_rgba(14,165,233,0.7)]",
  "border-amber-200 bg-amber-400 text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.7)]",
  "border-emerald-300 bg-emerald-500 text-white shadow-[0_0_24px_rgba(16,185,129,0.7)]",
];

/**
 * One small Cyber Hack challenge, after each quiz prompt.
 *
 * Each round rotates through five different kinds of thinking: aim, visual
 * matching, short-term memory, code entry and a timed hold. The host still
 * validates the final answer; this component only gathers the player's input.
 */
export default function CyberHackChallenge({
  round,
  playerName,
  used,
  pending,
  onAction,
  note,
}: {
  round: number;
  playerName: string;
  used: boolean;
  pending: boolean;
  onAction: (action: HeistAction) => void;
  note?: string | null;
}) {
  const challenge = useMemo(() => hackChallengeFor(round, playerName), [round, playerName]);
  const [virusHits, setVirusHits] = useState(0);
  const [virusOffset, setVirusOffset] = useState({ x: 24, y: 60 });
  const [virusTimeLeft, setVirusTimeLeft] = useState(8);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [sequenceReady, setSequenceReady] = useState(false);
  const [sequenceInput, setSequenceInput] = useState<number[]>([]);
  const [passcode, setPasscode] = useState("");
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStart = useRef<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentRef = useRef(false);

  useEffect(() => {
    sentRef.current = false;
    setVirusHits(0);
    setVirusOffset({ x: 24, y: 60 });
    setVirusTimeLeft(8);
    setSequenceIndex(0);
    setSequenceReady(false);
    setSequenceInput([]);
    setPasscode("");
    setHoldProgress(0);

    const timers: ReturnType<typeof setTimeout>[] = [];
    if (challenge.kind === "sequence") {
      challenge.pattern.forEach((_, i) => {
        timers.push(setTimeout(() => setSequenceIndex(i), 550 + i * 700));
        timers.push(setTimeout(() => setSequenceIndex(-1), 950 + i * 700));
      });
      timers.push(setTimeout(() => setSequenceReady(true), 550 + challenge.pattern.length * 700));
    }

    if (challenge.kind === "virus") {
      const deadline = Date.now() + 8000;
      const clock = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        setVirusTimeLeft(remaining);
        if (remaining === 0) {
          clearInterval(clock);
          sentRef.current = true;
          onAction({ kind: "hack", answer: "miss" });
        }
      }, 150);
      const motion = setInterval(() => {
        setVirusOffset({ x: 10 + Math.floor(Math.random() * 80), y: 42 + Math.floor(Math.random() * 43) });
      }, 620);
      return () => {
        timers.forEach(clearTimeout);
        clearInterval(clock);
        clearInterval(motion);
      };
    }

    return () => timers.forEach(clearTimeout);
  }, [challenge]);

  useEffect(() => () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
  }, []);

  const send = (answer: string) => {
    if (used || pending || sentRef.current) return;
    sentRef.current = true;
    onAction({ kind: "hack", answer });
  };

  const disabled = used || pending;
  const footer = (
    <div className="mt-2 flex min-h-5 items-center justify-between gap-2 text-[10px]">
      {note ? (
        <span aria-live="polite" className={cn("font-bold", note.startsWith("Hack lyckades") ? "text-emerald-300" : "text-amber-200")}>
          {note}
        </span>
      ) : (
        <span className="text-slate-500">Lös utmaningen för mer crypto och lägre spår.</span>
      )}
      {used && <span className="shrink-0 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 font-extrabold text-emerald-200">KLAR</span>}
    </div>
  );


  const startHold = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || holdStart.current !== null || challenge.kind !== "reboot") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    holdStart.current = Date.now();
    holdTimer.current = setInterval(() => {
      if (holdStart.current === null || challenge.kind !== "reboot") return;
      const ratio = Math.min(1, (Date.now() - holdStart.current) / challenge.holdMs);
      setHoldProgress(ratio);
      if (ratio >= 1) {
        if (holdTimer.current) clearInterval(holdTimer.current);
        holdTimer.current = null;
        holdStart.current = null;
        send("reboot");
      }
    }, 35);
  };

  const stopHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    holdStart.current = null;
    if (!used && !sentRef.current) setHoldProgress(0);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-400/25 bg-slate-950/75 shadow-[0_18px_48px_-30px_rgba(16,185,129,0.75)] backdrop-blur-xl">
      <header className="flex items-center justify-between gap-2 border-b border-emerald-400/15 bg-emerald-500/[0.06] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
            <Radio className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">Cyber Hack · sidouppdrag</span>
            <span className="block truncate text-xs font-bold text-white">{challenge.title}</span>
          </span>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {used ? "Slutfört" : "Bonusrunda"}
        </span>
      </header>

      <div className="p-3">
        <p className="text-[11px] leading-relaxed text-slate-400">{challenge.prompt}</p>

        {challenge.kind === "virus" && (
          <div className="mt-3">
            <div className="relative h-24 overflow-hidden rounded-xl border border-emerald-400/15 bg-[#03130f]">
              <div aria-hidden className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(16,185,129,.2)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,.2)_1px,transparent_1px)] [background-size:18px_18px]" />
              <div className="absolute left-2 top-2 flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400/70"><ShieldAlert className="h-3 w-3" /> SIGNAL PURGE {virusHits}/{challenge.targetCount} · {virusTimeLeft}s</div>
              {!disabled && virusHits < challenge.targetCount && (
                <button
                  type="button"
                  aria-label={`Purge signal ${virusHits + 1}`}
                  onClick={() => {
                    const hits = virusHits + 1;
                    setVirusHits(hits);
                    setVirusOffset({ x: 10 + Math.floor(Math.random() * 80), y: 42 + Math.floor(Math.random() * 43) });
                    if (hits >= challenge.targetCount) send(String(challenge.targetCount));
                  }}
                  className="absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-emerald-300/50 bg-emerald-400/15 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.45)] transition-[left,top,transform] duration-200 hover:scale-125 active:scale-90"
                  style={{ left: `${virusOffset.x}%`, top: `${virusOffset.y}%` }}
                >
                  <ShieldAlert className="h-5 w-5" />
                </button>
              )}
              {virusHits >= challenge.targetCount && <span className="absolute inset-0 grid place-items-center font-mono text-sm font-extrabold text-emerald-300">SIGNAL CLEARED</span>}
            </div>
            <div className="mt-2 flex gap-1">{Array.from({ length: challenge.targetCount }, (_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < virusHits ? "bg-emerald-400" : "bg-white/10")} />)}</div>
            {virusTimeLeft === 0 && !used && <p className="mt-1 text-center text-[10px] font-bold text-amber-200">Signalen hann undan — försök igen nästa fråga.</p>}
          </div>
        )}

        {challenge.kind === "blueprint" && (
          <div className="mt-3 grid grid-cols-[0.75fr_1.25fr] items-stretch gap-2">
            <div className="flex flex-col items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/[0.06] py-3">
              <span className="mb-1 text-[9px] font-bold uppercase tracking-widest text-cyan-300/70">Blueprint</span>
              <span className="grid h-10 w-10 place-items-center text-cyan-200"><ShapeIcon shape={challenge.shape} className="h-9 w-9 fill-cyan-300/10" /></span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {challenge.options.map((shape) => {
                const Icon = SHAPE_ICONS[shape as keyof typeof SHAPE_ICONS];
                return <button type="button" key={shape} disabled={disabled} aria-label={`Choose ${shape}`} onClick={() => send(shape)} className="grid min-h-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-300/50 hover:bg-cyan-500/10 hover:text-cyan-100 disabled:opacity-40"><Icon className="h-5 w-5" /></button>;
              })}
            </div>
          </div>
        )}

        {challenge.kind === "sequence" && (
          <div className="mt-3">
            <div className="grid grid-cols-4 gap-1.5">
              {SIGNAL_COLORS.map((color, i) => <span key={i} aria-label={sequenceIndex === i ? "Signal flash" : undefined} className={cn("h-7 rounded-lg border opacity-35 transition-all duration-150", color, sequenceIndex === i && "scale-105 opacity-100")} />)}
            </div>
            <p className="my-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">{sequenceReady ? "Repeat the signal" : "Memorize the sequence…"}</p>
            <div className="grid grid-cols-4 gap-1.5">
              {SIGNAL_COLORS.map((color, i) => <button key={i} type="button" disabled={disabled || !sequenceReady} aria-label={`Signal ${i + 1}`} onClick={() => {
                const next = [...sequenceInput, i];
                setSequenceInput(next);
                if (next.length === challenge.pattern.length) send(next.join(","));
                else if (next.some((v, ix) => v !== challenge.pattern[ix])) send("miss");
              }} className={cn("h-9 rounded-lg border transition hover:brightness-125 active:scale-95 disabled:opacity-35", color, "opacity-80")} />)}
            </div>
            <p className="mt-1 text-center font-mono text-[9px] text-slate-500">{sequenceInput.length}/{challenge.pattern.length} signals</p>
          </div>
        )}

        {challenge.kind === "passcode" && (
          <div className="mt-3 rounded-xl border border-emerald-400/20 bg-[#03130f] p-2.5">
            <div className="mb-2 flex items-center justify-between text-[9px] font-mono font-bold text-emerald-400/80"><span>ACCESS TOKEN</span><span className="flex items-center gap-1"><LockKeyhole className="h-3 w-3" /> VISIBLE</span></div>
            <div className="mb-2 flex h-9 items-center justify-center rounded-lg border border-emerald-400/15 bg-black/40 font-mono text-xl font-black tracking-[0.35em] text-emerald-200">{challenge.code}</div>
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "clear", 0, "enter"].map((key) => <button key={key} type="button" disabled={disabled} aria-label={key === "clear" ? "Clear code" : key === "enter" ? "Submit code" : `Digit ${key}`} onClick={() => {
                if (key === "clear") { setPasscode(""); return; }
                if (key === "enter") { if (passcode.length === 4) send(passcode); return; }
                setPasscode((value) => value.length < 4 ? value + key : value);
              }} className={cn("grid h-7 place-items-center rounded-md border border-emerald-400/15 bg-emerald-500/[0.07] font-mono text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-40", (key === "clear" || key === "enter") && "text-[9px] uppercase")}>
                {key === "clear" ? <Delete className="h-3 w-3" /> : key === "enter" ? <Check className="h-3 w-3" /> : key}
              </button>)}
            </div>
            <p className="mt-1.5 text-center font-mono text-[9px] text-slate-500">INPUT: {"•".repeat(passcode.length)}{"_".repeat(4 - passcode.length)}</p>
          </div>
        )}

        {challenge.kind === "reboot" && (
          <div className="mt-3 rounded-xl border border-emerald-400/15 bg-[#03130f] p-3 text-center">
            <div className="mb-2 flex items-center justify-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-300/70"><Signal className="h-3 w-3" /> Mainframe relay</div>
            <button type="button" disabled={disabled} onPointerDown={startHold} onPointerUp={stopHold} onPointerCancel={stopHold} onPointerLeave={stopHold} className="relative h-11 w-full touch-none overflow-hidden rounded-xl border border-emerald-300/30 bg-emerald-900/30 font-mono text-xs font-extrabold uppercase tracking-widest text-emerald-100 transition hover:border-emerald-200/60 active:scale-[0.99] disabled:opacity-40"><span className="absolute inset-y-0 left-0 bg-emerald-400/25 transition-[width]" style={{ width: `${holdProgress * 100}%` }} /><span className="relative">{holdProgress > 0 ? `Rebooting ${Math.round(holdProgress * 100)}%` : "Hold to reboot"}</span></button>
          </div>
        )}

        {!used && pending && <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-300"><Sparkles className="h-3 w-3" />Checking the payload…</p>}
        {footer}
      </div>
    </section>
  );
}

function ShapeIcon({ shape, className }: { shape: string; className?: string }) {
  const Icon = SHAPE_ICONS[shape as keyof typeof SHAPE_ICONS];
  return Icon ? <Icon className={className} /> : <RotateCcw className={className} />;
}
