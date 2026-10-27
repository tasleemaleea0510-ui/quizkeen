"use client";
import KeenAvatar from "@/components/keens/keen-avatar";
import { KEEN_BY_ID } from "@/lib/keens";
import { HEIST_MODES, MODE_RULES, type ModeId } from "@/lib/game-modes";
import { cn } from "@/lib/utils";
import { Check, Coins, Sparkles, Trophy } from "lucide-react";

/**
 * Choosing how a quiz is played, as a wall of posters.
 *
 * One card per mode, each with its own colour, its own Keen mascot and the two
 * numbers that actually decide a host's choice: what everyone starts with and
 * what first place pays. The selected card lifts, keeps a white edge and shows a
 * check, so the room can see the pick from the back row.
 *
 * A heist mode is a real economy, not a skin, so the cards say so in one line —
 * and Classic stays first, because most quizzes are still just a quiz.
 */

export type ModeCard = {
  id: ModeId;
  kicker: string;
  keen: string;
  bg: string;
  /** The tint behind the whole lobby once this mode is picked. */
  glow: string;
  chips: string[];
};

export const MODE_CARDS: ModeCard[] = [
  {
    id: "classic",
    kicker: "Ingen ekonomi",
    keen: "crewmate",
    bg: "from-slate-500 via-slate-700 to-slate-900",
    glow: "bg-indigo-500/20",
    chips: ["Frågor och poäng"],
  },
  {
    id: "vault",
    kicker: "Kistor och rån",
    keen: "chubbypig",
    bg: "from-amber-400 via-orange-500 to-rose-600",
    glow: "bg-amber-500/20",
    chips: ["1 000 valvmynt", "100 Mint till vinnaren"],
  },
  {
    id: "crypto",
    kicker: "Hacka och dubbla",
    keen: "invader",
    bg: "from-cyan-400 via-sky-500 to-indigo-700",
    glow: "bg-sky-500/20",
    chips: ["1 000 crypto", "120 Mint till vinnaren"],
  },
  {
    id: "pirate",
    kicker: "Skepp och besättning",
    keen: "doodlekraken",
    bg: "from-emerald-400 via-teal-600 to-slate-900",
    glow: "bg-teal-500/20",
    chips: ["1 000 piratguld", "110 Mint till vinnaren"],
  },
];

/** The colour wash the lobby should wear for a mode. */
export function modeGlow(mode: ModeId): string {
  return MODE_CARDS.find((c) => c.id === mode)?.glow ?? MODE_CARDS[0].glow;
}

export default function GameModePicker({
  value,
  onChange,
  disabled,
}: {
  value: ModeId;
  onChange: (mode: ModeId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {MODE_CARDS.map((card, i) => {
        const active = value === card.id;
        const keen = KEEN_BY_ID[card.keen];
        const rules = card.id === "classic" ? null : MODE_RULES[card.id];
        return (
          <button
            key={card.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(card.id)}
            aria-pressed={active}
            style={{ animationDelay: `${i * 60}ms` }}
            className={cn(
              "group relative animate-fade-up overflow-hidden rounded-3xl border-2 text-left transition-all duration-200",
              active
                ? "border-white/90 shadow-raise ring-4 ring-white/15"
                : "border-white/10 hover:-translate-y-0.5 hover:border-white/40"
            )}
          >
            <span className={cn("absolute inset-0 bg-gradient-to-br", card.bg)} aria-hidden />
            {/* A soft highlight so the card reads as a poster, not a swatch. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/20 blur-2xl"
            />
            <span className="relative flex min-h-[136px] flex-col gap-2 p-4">
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="inline-flex rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80">
                    {card.kicker}
                  </span>
                  <span className="mt-1.5 block font-display text-lg font-extrabold leading-tight text-white drop-shadow">
                    {rules?.name ?? "Klassisk quiz"}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-medium leading-snug text-white/80">
                    {rules?.tagline ?? "Bara frågor, svar och poäng."}
                  </span>
                </span>
                {keen && (
                  <KeenAvatar
                    keen={keen}
                    size={64}
                    className="shrink-0 drop-shadow-lg transition-transform duration-200 group-hover:scale-105"
                  />
                )}
              </span>
              <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                {card.chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold text-white/90"
                  >
                    {chip.includes("Mint") ? (
                      <Trophy className="h-3 w-3" />
                    ) : card.id === "classic" ? (
                      <Sparkles className="h-3 w-3" />
                    ) : (
                      <Coins className="h-3 w-3" />
                    )}
                    <span data-no-translate>{chip}</span>
                  </span>
                ))}
              </span>
            </span>
            {active && (
              <span className="absolute bottom-3 right-3 grid h-6 w-6 place-items-center rounded-full bg-white text-slate-900 shadow-md">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
