"use client";

import { useRef, useState, type ComponentType, type ReactNode } from "react";

/**
 * The console's shared look.
 *
 * Admin and Security grew the same way: a row of a dozen tiny, unlabelled,
 * differently-coloured chips crammed against a username. Every one of them
 * worked, and none of them said what it did. This kit replaces that with three
 * rules the whole console follows:
 *
 *   1. a control says what it does in words, with an icon beside it;
 *   2. controls that belong together sit in a labelled group, with room to
 *      breathe, so "ban for an hour" is not one pixel away from "give 500 XP";
 *   3. colour means something — emerald rewards, red removes, sky watches,
 *      slate is a tool that changes nothing on its own.
 *
 * Nothing here is required to read the page: the panels are plain markup, and
 * the motion (tilt, hero glow) collapses for reduced-motion users.
 */

export type Tone = "red" | "sky" | "emerald" | "amber" | "violet" | "rose" | "indigo" | "slate";
export type IconType = ComponentType<{ className?: string }>;

/** Filled: the one thing you probably came to do in a group. */
const SOLID: Record<Tone, string> = {
  red: "bg-red-600 text-white shadow-lg shadow-red-950/40 hover:bg-red-500",
  sky: "bg-sky-600 text-white shadow-lg shadow-sky-950/40 hover:bg-sky-500",
  emerald: "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500",
  amber: "bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/40 hover:bg-amber-400",
  violet: "bg-violet-600 text-white shadow-lg shadow-violet-950/40 hover:bg-violet-500",
  rose: "bg-rose-600 text-white shadow-lg shadow-rose-950/40 hover:bg-rose-500",
  indigo: "bg-indigo-600 text-white shadow-lg shadow-indigo-950/40 hover:bg-indigo-500",
  slate: "bg-slate-700 text-white hover:bg-slate-600",
};

/** Quiet: secondary and reversible actions, still coloured by intent. */
const SOFT: Record<Tone, string> = {
  red: "border border-red-500/35 bg-red-500/10 text-red-200 hover:border-red-400/60 hover:bg-red-500/20",
  sky: "border border-sky-500/35 bg-sky-500/10 text-sky-200 hover:border-sky-400/60 hover:bg-sky-500/20",
  emerald:
    "border border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/60 hover:bg-emerald-500/20",
  amber:
    "border border-amber-500/35 bg-amber-500/10 text-amber-200 hover:border-amber-400/60 hover:bg-amber-500/20",
  violet:
    "border border-violet-500/35 bg-violet-500/10 text-violet-200 hover:border-violet-400/60 hover:bg-violet-500/20",
  rose: "border border-rose-500/35 bg-rose-500/10 text-rose-200 hover:border-rose-400/60 hover:bg-rose-500/20",
  indigo:
    "border border-indigo-500/35 bg-indigo-500/10 text-indigo-200 hover:border-indigo-400/60 hover:bg-indigo-500/20",
  slate: "border border-slate-600/60 bg-white/[0.04] text-slate-200 hover:border-slate-500 hover:bg-white/[0.08]",
};

const TEXT: Record<Tone, string> = {
  red: "text-red-300",
  sky: "text-sky-300",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  violet: "text-violet-300",
  rose: "text-rose-300",
  indigo: "text-indigo-300",
  slate: "text-slate-400",
};

const GLOW: Record<Tone, string> = {
  red: "text-red-500",
  sky: "text-sky-500",
  emerald: "text-emerald-500",
  amber: "text-amber-500",
  violet: "text-violet-500",
  rose: "text-rose-500",
  indigo: "text-indigo-500",
  slate: "text-slate-500",
};

/** A button with room around it, a word on it, and a focus ring you can see. */
export function ToolButton({
  label,
  Icon,
  onClick,
  tone = "slate",
  variant = "soft",
  title,
  disabled = false,
  className = "",
}: {
  label: string;
  Icon: IconType;
  onClick: () => void;
  tone?: Tone;
  variant?: "solid" | "soft";
  /** Longer explanation for the tooltip; the visible label is the fallback. */
  title?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={title ?? label}
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold leading-none ${
        variant === "solid" ? SOLID[tone] : SOFT[tone]
      } disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

/**
 * A labelled cluster of related tools.
 *
 * The caption is the whole point: before pressing anything, you can see that
 * this box is about rewards and that one is about bans.
 */
export function ToolGroup({
  title,
  Icon,
  tone = "slate",
  children,
  className = "",
}: {
  title: string;
  Icon?: IconType;
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.07] bg-slate-950/40 p-3 transition-colors hover:border-white/[0.12] ${className}`}
    >
      <p
        className={`mb-2.5 flex items-center gap-1.5 px-0.5 text-[10px] font-extrabold uppercase tracking-[0.16em] ${TEXT[tone]}`}
      >
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {title}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/**
 * The banner at the top of a console screen.
 *
 * Checkerboard tiles, a receding grid floor and a pool of the console's own
 * colour: the same "space with a pattern in it" language as the app, without a
 * single image to load.
 */
export function ConsoleHero({
  tone,
  Icon,
  eyebrow,
  title,
  lead,
  chips,
  aside,
}: {
  tone: Tone;
  Icon: IconType;
  eyebrow: string;
  title: string;
  lead: ReactNode;
  chips?: { Icon: IconType; label: string; value: ReactNode; tone?: Tone }[];
  aside?: ReactNode;
}) {
  return (
    <section
      className={`relative isolate overflow-hidden rounded-[2rem] border bg-slate-950/70 p-6 shadow-2xl sm:p-8 ${
        tone === "red" ? "border-red-500/30" : tone === "sky" ? "border-sky-500/30" : "border-amber-500/30"
      }`}
    >
      <span aria-hidden className={`cmd-checkers-tint absolute inset-0 ${GLOW[tone]}`} />
      <span aria-hidden className={`cmd-checkers-floor absolute ${GLOW[tone]} opacity-[0.5]`} />
      <span aria-hidden className={`cmd-hero-glow absolute ${GLOW[tone]}`} />

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className={`flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em] ${TEXT[tone]}`}>
            <span className="relative grid h-2 w-2 place-items-center">
              <span className="absolute inset-0 animate-cmd-pulse-ring rounded-full border border-current" />
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            {eyebrow}
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-current sm:h-14 sm:w-14 ${SOFT[tone]}`}
            >
              <Icon className="h-6 w-6" />
            </span>
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{lead}</p>

          {chips && chips.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2.5">
              {chips.map((chip) => (
                <span
                  key={chip.label}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold ${
                    SOFT[chip.tone ?? "slate"]
                  }`}
                >
                  <chip.Icon className="h-4 w-4" />
                  <span className="tabular-nums text-white">{chip.value}</span>
                  <span className="font-semibold opacity-80">{chip.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </section>
  );
}

/** The heading of a panel: icon, title, one line of context. */
export function SectionHead({
  Icon,
  tone = "slate",
  title,
  note,
  right,
}: {
  Icon: IconType;
  tone?: Tone;
  title: string;
  note?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2.5 text-xl font-extrabold text-white">
          <Icon className={`h-5 w-5 ${TEXT[tone]}`} />
          {title}
        </h2>
        {note && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{note}</p>}
      </div>
      {right}
    </div>
  );
}

/** The search box used by the user lists, sized for a fingertip. */
export function SearchField({
  value,
  onChange,
  placeholder = "Sök användare…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex w-full max-w-xs items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 transition-colors focus-within:border-indigo-400/60">
      <SearchGlyph />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
      />
    </label>
  );
}

function SearchGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-slate-500">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** The panel a console section lives in, patterned just enough to have depth. */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative isolate overflow-hidden rounded-[2rem] border border-white/[0.07] bg-slate-900/50 p-5 shadow-xl backdrop-blur-xl sm:p-6 ${className}`}>
      <span aria-hidden className="cmd-checkers pointer-events-none absolute inset-0 -z-10 opacity-[0.55]" />
      {children}
    </div>
  );
}

/** A card you can nudge with the pointer; used for the console's tiles. */
export function Tilt({
  children,
  className = "",
  max = 6,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const node = ref.current;
    if (!node) return;
    if (!enabled) setEnabled(true);
    const box = node.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width;
    const py = (event.clientY - box.top) / box.height;
    node.style.setProperty("--tilt-ry", `${(px - 0.5) * 2 * max}deg`);
    node.style.setProperty("--tilt-rx", `${-(py - 0.5) * 2 * max}deg`);
    node.style.setProperty("--tilt-mx", `${px * 100}%`);
    node.style.setProperty("--tilt-my", `${py * 100}%`);
  }

  function reset() {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--tilt-ry", "0deg");
    node.style.setProperty("--tilt-rx", "0deg");
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={`cmd-tilt ${className}`}
      data-tilting={enabled ? "on" : "off"}
    >
      <span aria-hidden className="cmd-tilt-glare" />
      {children}
    </div>
  );
}
