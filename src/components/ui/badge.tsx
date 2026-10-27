import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Small labelled pills, in one place.
 *
 * `tone` chooses a colour pair; the neutral one is for facts ("48 Keens"), the
 * rest are for states that mean something (a streak, a due-count, a rarity).
 * Keeping them here stopped every page inventing its own "rounded bg-white/5
 * px-2 text-xs" and drifting apart.
 */
export type BadgeTone =
  | "neutral"
  | "accent"
  | "emerald"
  | "sky"
  | "amber"
  | "rose"
  | "violet"
  | "slate";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-white/10 bg-white/[0.06] text-slate-200",
  accent: "border-[var(--accent-line)] bg-[var(--accent-soft)] text-white",
  emerald: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  sky: "border-sky-400/30 bg-sky-500/15 text-sky-200",
  amber: "border-amber-400/30 bg-amber-500/15 text-amber-200",
  rose: "border-rose-400/30 bg-rose-500/15 text-rose-200",
  violet: "border-violet-400/30 bg-violet-500/15 text-violet-200",
  slate: "border-white/5 bg-slate-800/70 text-slate-400",
};

export function Badge({
  children,
  tone = "neutral",
  icon: Icon,
  className = "",
  title,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
        TONES[tone],
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

export default Badge;
