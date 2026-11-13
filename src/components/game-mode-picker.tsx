"use client";
import type { ComponentType } from "react";
import KeenAvatar from "@/components/keens/keen-avatar";
import { KEEN_BY_ID } from "@/lib/keens";
import { MODE_IDENTITY, MODE_RULES, type ModeId } from "@/lib/game-modes";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Anchor, Check, Coins, Cpu, Crown, Sparkles, TrendingUp, TriangleAlert, Wallet } from "lucide-react";

/**
 * Choosing how a quiz is played, as a wall of posters.
 *
 * Each poster answers the three questions a host actually has: what do I earn,
 * what does a move cost, and what makes this mode different from the other
 * three? The numbers are read out of `MODE_RULES`, so a balance change updates
 * the poster without anyone remembering to update the copy.
 *
 * Under the wall sits the answer sheet for whichever poster is picked: the same
 * four facts, one line each, written as sentences rather than as numbers. The
 * modes were indistinguishable from the outside because the poster only had
 * space for figures; this is where the rule is actually said out loud.
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
  {
    id: "crown",
    kicker: "Krona · jakt · försvar",
    keen: "dragony",
    bg: "from-violet-400 via-violet-700 to-slate-950",
    glow: "bg-violet-500/20",
    icon: Crown,
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

/** The plain-quiz answer sheet, in the same shape as the modes' own. */
const CLASSIC_FACTS = {
  earns: { sv: "+100 poäng per rätt svar", en: "+100 points per correct answer" },
  spends: { sv: "Ingenting — klassisk quiz har ingen ekonomi", en: "Nothing — the classic quiz has no economy" },
  twist: { sv: "Farten ger bonus, och en rättstreak bygger en lagom stor extra bonus", en: "Speed pays a bonus, and a correct streak builds a modest extra one" },
  risk: { sv: "Låg — ett fel svar kostar bara poäng, aldrig valuta", en: "Low — a wrong answer costs points, never currency" },
};

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
  const card = MODE_CARDS.find((c) => c.id === value) ?? MODE_CARDS[0];
  const facts = value === "classic" ? CLASSIC_FACTS : MODE_IDENTITY[value];
  const rules = value === "classic" ? null : MODE_RULES[value];
  const modeName = rules?.name ?? "Klassisk quiz";

  const sheet = [
    { icon: TrendingUp, label: "Rätt svar ger", text: facts.earns[lang] },
    { icon: Wallet, label: "Ett drag kostar", text: facts.spends[lang] },
    { icon: Sparkles, label: "Det unika", text: facts.twist[lang] },
    { icon: TriangleAlert, label: "Risken", text: facts.risk[lang] },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {MODE_CARDS.map((c, i) => {
          const active = value === c.id;
          const keen = KEEN_BY_ID[c.keen];
          const r = c.id === "classic" ? null : MODE_RULES[c.id];
          const styles = r?.styles ?? [];
          const numbers = r
            ? [
                { label: "Start", value: r.startBalance.toLocaleString("sv-SE") },
                { label: "Per rätt", value: `+${r.correctBalance}` },
                styles.length > 0
                  ? {
                      label: "Besättning + guld",
                      value: `${r.raidCost} + ${styles[0].cost}–${styles[styles.length - 1].cost}`,
                    }
                  : {
                      label: r.id === "crypto" ? "Ett hack" : "Ett rån",
                      value: `${r.raidCost} ${r.energyName.toLowerCase()}`,
                    },
              ]
            : CLASSIC_NUMBERS;
          const Icon = c.icon;

          return (
            <button
              key={c.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(c.id)}
              aria-pressed={active}
              style={{ animationDelay: `${i * 60}ms` }}
              className={cn(
                "group relative animate-fade-up overflow-hidden rounded-[24px] border-2 text-left transition-all duration-200",
                active
                  ? "border-white/90 shadow-raise ring-4 ring-white/15"
                  : "border-white/10 hover:-translate-y-0.5 hover:border-white/40",
                c.id === "crown" && "md:col-span-2"
              )}
            >
              <span className={cn("absolute inset-0 bg-gradient-to-br", c.bg)} aria-hidden />
              <span
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(255,255,255,0.22),transparent_55%)]"
              />
              <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/20 blur-2xl" />

              <span className="relative flex h-full min-h-[196px] flex-col p-4">
                <span className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white/75">
                    <Icon className="h-3 w-3" />
                    {c.kicker}
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
                      {r?.name ?? "Klassisk quiz"}
                    </span>
                    <span className="mt-1 block max-w-[30rem] text-[11px] font-semibold leading-snug text-white/80">
                      {r?.tagline ??
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
                      <span
                        className="block truncate font-mono text-[11px] font-extrabold leading-tight text-white"
                        data-no-translate
                      >
                        {n.value}
                      </span>
                      <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[0.1em] text-white/45">
                        {n.label}
                      </span>
                    </span>
                  ))}
                </span>

                <span className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/45">
                    {active ? "Valt läge" : "Tryck för att välja"}
                  </span>
                  {r?.leaderOnly && (
                    <span className="rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-violet-100">
                      <Crown className="mr-1 inline h-2.5 w-2.5" />
                      Bara ledaren kan rånas
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* The answer sheet: what the poster's numbers actually mean, in words. */}
      <div
        className={cn(
          "rounded-2xl border border-white/10 bg-slate-950/50 p-3",
          "bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]"
        )}
      >
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/45">
          <Sparkles className="h-3 w-3" />
          Så funkar {modeName}
        </p>
        <dl className="grid gap-1.5 sm:grid-cols-2">
          {sheet.map((row) => {
            const RowIcon = row.icon;
            return (
              <div key={row.label} className="flex items-start gap-2 rounded-xl bg-white/[0.03] px-2.5 py-2">
                <RowIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/35" />
                <div className="min-w-0">
                  <dt className="text-[9px] font-extrabold uppercase tracking-wider text-white/40">{row.label}</dt>
                  <dd className="mt-0.5 text-[11px] font-semibold leading-snug text-white/80">{row.text}</dd>
                </div>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}
