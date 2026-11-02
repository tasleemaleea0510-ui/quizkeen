"use client";
import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The race's finish line, as seen on a wall.
 *
 * A heist match does not end at the last question — it ends when the clock
 * runs out, which is the only thing every seat in a self-paced race can agree
 * on. This component computes its remaining time locally from one shared
 * `endsAt` timestamp, so 50 phones tick together without 50 messages a second.
 */

function remainingOf(endsAt: number): { s: number; cls: string } {
  const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  return { s: left, cls: left <= 10 ? "text-rose-300" : left <= 30 ? "text-amber-300" : "text-white" };
}

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** The chip next to the score: colour-coded, never a whole card. */
export function MatchClockChip({ endsAt, minutes, className }: { endsAt: number; minutes: number; className?: string }) {
  const [left, setLeft] = useState(() => remainingOf(endsAt).s);
  useEffect(() => {
    const iv = setInterval(() => setLeft(remainingOf(endsAt).s), 250);
    return () => clearInterval(iv);
  }, [endsAt]);

  const urgency = left <= 10
    ? "border-rose-400/50 bg-rose-500/15 text-rose-200 animate-pulse"
    : left <= 30
      ? "border-amber-400/40 bg-amber-500/12 text-amber-200"
      : "border-white/15 bg-white/[0.07] text-white";
  return (
    <span
      title={`Matchklocka: ${minutes} min`}
      data-no-translate
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs font-extrabold tracking-wider transition-colors",
        urgency,
        className
      )}
    >
      <Hourglass className="h-3.5 w-3.5" />
      {fmt(left)}
    </span>
  );
}

/** The wall version: big enough for the back row, with the time already spent. */
export function MatchClock({ endsAt, minutes }: { endsAt: number; minutes: number }) {
  const [state, setState] = useState(() => remainingOf(endsAt));
  useEffect(() => {
    const iv = setInterval(() => setState(remainingOf(endsAt)), 250);
    return () => clearInterval(iv);
  }, [endsAt]);

  const spent = Math.min(100, Math.max(0, ((minutes * 60 - state.s) / (minutes * 60)) * 100));
  const danger = state.s <= 10;
  return (
    <div className={cn("flex items-center gap-5", danger && "animate-pulse")}>
      <span className="rounded-2xl border-2 border-emerald-400/40 bg-slate-900/70 p-2.5 text-emerald-300">
        <Hourglass className="h-7 w-7" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Matchklockan</p>
        <p
          data-no-translate
          className={cn(
            "font-mono text-6xl font-extrabold leading-none transition-colors sm:text-7xl",
            state.cls,
            danger && "drop-shadow-[0_0_18px_rgba(244,63,94,0.65)]"
          )}
        >
          {fmt(state.s)}
        </p>
        <div className="mt-2 h-2 w-44 overflow-hidden rounded-full bg-white/[0.07] sm:w-56">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear",
              danger ? "bg-rose-500" : state.s <= 30 ? "bg-amber-400" : "bg-emerald-400"
            )}
            style={{ width: `${spent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
