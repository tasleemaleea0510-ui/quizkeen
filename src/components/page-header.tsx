import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { levelProgress } from "@/lib/levels";

/**
 * The band every page opens with.
 *
 * Before this, each screen invented its own hero: some had an eyebrow and no
 * chips, some had stats in a gradient card, some started straight into content.
 * One component means a new page is recognisably the same product, and changing
 * the look of the app is changing one file.
 *
 * It also sets the page's accent (`data-accent`), which every bar, ring and
 * glow below it inherits.
 */
export default function PageHeader({
  eyebrow,
  title,
  lead,
  icon: Icon,
  accent = "indigo",
  chips,
  actions,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  /** Any accent from globals.css: indigo, violet, fuchsia, amber, emerald, sky… */
  accent?: string;
  chips?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header data-accent={accent} className={cn("relative", className)}>
      <div className="surface relative overflow-hidden p-6 sm:p-8">
        {/* A soft corner of light in the accent colour, and a faint grid so the
            band reads as a lit surface rather than a flat rectangle. */}
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-accent-soft" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-[0.35] [mask-image:radial-gradient(120%_80%_at_20%_0%,#000,transparent_70%)]"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            {eyebrow && (
              <span className="eyebrow mb-3">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {eyebrow}
              </span>
            )}
            <h1 className="page-title">{title}</h1>
            {lead && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{lead}</p>}
            {chips && <div className="mt-5 flex flex-wrap items-center gap-2.5">{chips}</div>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
        </div>

        {children && <div className="relative mt-6">{children}</div>}
      </div>
    </header>
  );
}

/**
 * A number with its caption, for the chip row of a header.
 *
 * `value` is whatever the server computed, printed as-is so the real figure is
 * in the first byte of HTML; pass a `<CountUp>` inside it when the number
 * changes on the client and rolling to it is the point.
 */
export function HeaderStat({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  tone?: "slate" | "emerald" | "amber" | "sky" | "rose" | "violet";
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    sky: "text-sky-300",
    rose: "text-rose-300",
    violet: "text-violet-300",
  };
  return (
    <span className="surface-flat flex items-center gap-2.5 px-3.5 py-2">
      {Icon && <Icon className={cn("h-4 w-4", tones[tone])} />}
      <span className="font-display text-lg font-extrabold leading-none text-white tabular">{value}</span>
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
    </span>
  );
}

/**
 * A link that looks like the tile the whole product is made of.
 *
 * Used for the "go somewhere useful" strips on the dashboard and the landing
 * page; keeping it here means the emoji, the title and the arrow line up the
 * same way everywhere.
 */
export function ActionTile({
  href,
  emoji,
  title,
  subtitle,
  right,
  accent = "indigo",
}: {
  href: string;
  emoji: string;
  title: string;
  subtitle: string;
  right?: ReactNode;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      data-accent={accent}
      className="surface card-hover group flex items-center justify-between gap-4 p-4"
    >
      <span className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-soft)] text-xl animate-float">
          {emoji}
        </span>
        <span className="min-w-0">
          <span className="block font-display text-base font-extrabold text-white">{title}</span>
          <span className="block text-xs text-slate-400">{subtitle}</span>
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-sm font-bold text-slate-300 group-hover:text-white">
        {right}
      </span>
    </Link>
  );
}

/** The one number a page is about, with a bar under it when there is progress. */
export function XpSummary({ xp, coins, level }: { xp: number; coins: number; level: number }) {
  const { into, span, ratio, toNext } = levelProgress(xp);
  return (
    <div className="surface-flat p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="stat-label">Nivå {level}</span>
        <span className="text-xs font-bold text-slate-400 tabular" data-no-translate>
          {into}/{span} XP
        </span>
      </div>
      <div className="bar mt-2">
        <span className="bar-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500" data-no-translate>
        {toNext} XP kvar till nivå {level + 1} · {coins} mynt
      </p>
    </div>
  );
}
