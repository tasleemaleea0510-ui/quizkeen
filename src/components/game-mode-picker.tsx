"use client";
import type { ComponentType } from "react";
import KeenAvatar from "@/components/keens/keen-avatar";
import { KEEN_BY_ID } from "@/lib/keens";
import { MODE_IDENTITY, MODE_RULES, type ModeId } from "@/lib/game-modes";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Anchor, Check, Coins, Cpu, Sparkles } from "lucide-react";

/**
 * Choosing how a quiz is played, as a wall of posters.
 *
 * Each poster answers the three questions a host actually has: what do I earn,
 * what does a move cost, and what makes this mode different from the other two?
 * The numbers are read out of `MODE_RULES`, so a balance change updates the
 * poster without anyone remembering to update the copy.
 */

export type ModeCard = {
  id: ModeId;
  /** The three-beat summary of the loop, above the name. */
  kicker: string;
  keen: string;
  bg: string;
  /** The tint behind the whole lobby once this mode is picked. */
  glow: string;
  icon: ComponentType<{ className?: string }>;
};

export const MODE_CARDS: ModeCard[] = [
  {
    id: "classic",
    kicker: "Rätt · snabbt · streak",
    keen: "crewmate",
    bg: "from-slate-600 via-slate-800 to-slate-950",
    glow: "bg-indigo-500/20",
    icon: Sparkles,
  },
  {
    id: "vault",
    kicker: "Kista · valv · larm",
    keen: "chubbypig",
    bg: "from-amber-400 via-amber-600 to-amber-950",
    glow: "bg-amber-500/20",
    icon: Coins,
  },
  {
    id: "crypto",
    kicker: "Spår · hack · avslöjad",
    keen: "invader",
    bg: "from-emerald-400 via-emerald-700 to-slate-950",
    glow: "bg-emerald-500/20",
    icon: Cpu,
  },
  {
    id: "pirate",
    kicker: "Tärning · byte · guld",
    keen: "doodlekraken",
    bg: "from-rose-400 via-rose-700 to-slate-950",
    glow: "bg-rose-500/20",
    icon: Anchor,
  },
];

/** The colour wash the lobby should wear for a mode. */
export function modeGlow(mode: ModeId): string {
  return MODE_CARDS.find((c) => c.id === mode)?.glow ?? MODE_CARDS[0].glow;
}

const CLASSIC_NUMBERS = [
  { label: "Per rätt", value: "+100 p" },
  { label: "Fart", value: "max +50" },
  { label: "Streak", value: "max +75" },
];

export default function GameModePicker({
  value,
  onChange,
  disabled,
}: {
  value: ModeId;
  onChange: (mode: ModeId) => void;
  disabled?: boolean;
}) {
  const lang = useLang();
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {MODE_CARDS.map((card, i) => {
        const active = value === card.id;
        const keen = KEEN_BY_ID[card.keen];
        const rules = card.id === "classic" ? null : MODE_RULES[card.id];
        const identity = card.id === "classic" ? null : MODE_IDENTITY[card.id];
        const Icon = card.icon;
        const styles = rules?.styles ?? [];
        const numbers = rules
          ? [
              { label: "Start", value: rules.startBalance.toLocaleString("sv-SE") },
              { label: "Per rätt", value: `+${rules.correctBalance}` },
              styles.length > 0
                ? {
                    label: "Besättning + guld",
                    value: `${rules.raidCost} + ${styles[0].cost}–${styles[styles.length - 1].cost}`,
                  }
                : {
                    label: rules.id === "crypto" ? "Ett hack" : "Ett rån",
                    value: `${rules.raidCost} ${rules.energyName.toLowerCase()}`,
                  },
            ]
          : CLASSIC_NUMBERS;

        return (
          <button
            key={card.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(card.id)}
            aria-pressed={active}
            style={{ animationDelay: `${i * 60}ms` }}
            className={cn(
              "group relative animate-fade-up overflow-hidden rounded-[24px] border-2 text-left transition-all duration-200",
              active
                ? "border-white/90 shadow-raise ring-4 ring-white/15"
                : "border-white/10 hover:-translate-y-0.5 hover:border-white/40"
            )}
          >
            <span className={cn("absolute inset-0 bg-gradient-to-br", card.bg)} aria-hidden />
            <span
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(255,255,255,0.22),transparent_55%)]"
            />
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/20 blur-2xl" />

            <span className="relative flex h-full min-h-[196px] flex-col p-4">
              <span className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white/75">
                  <Icon className="h-3 w-3" />
                  {card.kicker}
                </span>
                {active ? (
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-slate-900 shadow-md">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white/45">
                    Välj
                  </span>
                )}
              </span>

              <span className="mt-3 flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block font-display text-xl font-extrabold leading-tight text-white drop-shadow">
                    {rules?.name ?? "Klassisk quiz"}
                  </span>
                  <span className="mt-1 block max-w-[30rem] text-[11px] font-semibold leading-snug text-white/80">
                    {rules?.tagline ??
                      "Alla får samma frågor. Hastighet ger poäng; en rättstreak bygger en lagom stor bonus."}
                  </span>
                </span>
                {keen && (
                  <KeenAvatar
                    keen={keen}
                    size={54}
                    className="shrink-0 drop-shadow-lg transition-transform duration-200 group-hover:scale-105"
                  />
                )}
              </span>

              <span className="mt-3 grid grid-cols-3 gap-1.5">
                {numbers.map((n) => (
                  <span key={n.label} className="rounded-lg bg-black/25 px-1.5 py-1">
                    <span className="block truncate font-mono text-[11px] font-extrabold leading-tight text-white" data-no-translate>
                      {n.value}
                    </span>
                    <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[0.1em] text-white/45">
                      {n.label}
                    </span>
                  </span>
                ))}
              </span>

              <span className="mt-auto flex items-start gap-1.5 pt-3 text-[10px] font-bold leading-snug text-white/65">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-white/50" />
                <span>
                  {identity
                    ? identity.twist[lang]
                    : lang === "sv"
                      ? "Streakbonus: +15 per rätt i rad, max +75."
                      : "Streak bonus: +15 per correct answer in a row, max +75."}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
