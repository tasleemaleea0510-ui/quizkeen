"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import KeenAvatar from "@/components/keens/keen-avatar";
import { KEEN_BY_ID } from "@/lib/keens";
import {
  EXPOSED_HACK,
  EXPOSED_TARGET_MULTIPLIER,
  INSIDER_HACK,
  MODE_RULES,
  TRACE_DECAY,
  approxBalance,
  attackTuning,
  defenseById,
  exposedBonus,
  exposureAt,
  maxedOut,
  powerUsed,
  projectedSteal,
  protectedGold,
  raidCostFor,
  reachableGold,
  type Defense,
  type HeistAction,
  type HeistMode,
  type HeistState,
  type RaidStyle,
} from "@/lib/game-modes";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Crosshair,
  Crown,
  EyeOff,
  Flame,
  Gift,
  Loader2,
  Radar,
  Rocket,
  Shield,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";

/**
 * The heist console — what a player does between two questions.
 *
 * The screen has one job: make the mode's single decision obvious. So it is
 * three tabs rather than one long scroll — the move, the shop, and (in Crypto)
 * the powers — with the purse and the action points always visible above them.
 * A tab carries a dot when it holds something the player can actually do, so
 * "I never bought a defense" stops being an accident of scrolling past it.
 *
 * Every number here is read from `game-modes.ts` through `attackTuning`,
 * `projectedSteal` and `exposedBonus` — the same helpers `applyAction` resolves
 * with — so a button can never promise a raid the rules would refuse or a haul
 * they would not pay.
 */

const PANEL_TONE: Record<
  HeistMode,
  { wash: string; border: string; text: string; pip: string; glow: string; ring: string; tab: string }
> = {
  vault: {
    wash: "from-amber-500/25 via-amber-500/[0.07]",
    border: "border-amber-400/25",
    text: "text-amber-200",
    pip: "bg-amber-400",
    glow: "bg-amber-500/30",
    ring: "hover:border-amber-300/50 hover:bg-amber-500/10",
    tab: "border-amber-300 text-amber-200",
  },
  crypto: {
    wash: "from-emerald-500/25 via-emerald-500/[0.07]",
    border: "border-emerald-400/25",
    text: "text-emerald-200",
    pip: "bg-emerald-400",
    glow: "bg-emerald-500/30",
    ring: "hover:border-emerald-300/50 hover:bg-emerald-500/10",
    tab: "border-emerald-300 text-emerald-200",
  },
  pirate: {
    wash: "from-rose-500/25 via-rose-500/[0.07]",
    border: "border-rose-400/25",
    text: "text-rose-200",
    pip: "bg-rose-400",
    glow: "bg-rose-500/30",
    ring: "hover:border-rose-300/50 hover:bg-rose-500/10",
    tab: "border-rose-300 text-rose-200",
  },
};

type Tab = "action" | "shop" | "powers";

function Pips({ value, max, tone }: { value: number; max: number; tone: string }) {
  return (
    <span className="flex items-center justify-end gap-1" aria-hidden>
      {Array.from({ length: Math.max(0, max) }).map((_, i) => (
        <span
          key={i}
          className={cn("h-3.5 w-2.5 rounded-[3px] transition-colors", i < value ? tone : "bg-white/15")}
        />
      ))}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1">
      <span className="block font-mono text-[11px] font-extrabold leading-tight text-white" data-no-translate>
        {value}
      </span>
      <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wider text-white/40">{label}</span>
    </div>
  );
}

function Chip({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider",
        tone
      )}
    >
      {children}
    </span>
  );
}

export default function HeistPanel({
  state,
  me,
  note,
  pending,
  chestAllowed,
  onAction,
}: {
  state: HeistState;
  me: string;
  note?: string | null;
  pending: boolean;
  /** Chests open between questions, when the host is on the reveal screen. */
  chestAllowed: boolean;
  onAction: (action: HeistAction) => void;
}) {
  const rules = MODE_RULES[state.mode];
  const profile = state.players[me];
  // Quick raid is the sensible default, but the choice must survive a mode with
  // no styles at all, so the id is resolved against the current rules.
  const [styleId, setStyleId] = useState(rules.styles?.[1]?.id ?? rules.styles?.[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("action");
  // Protection is wall-clock, not a host broadcast: without a tick a rival would
  // stay greyed out (and a countdown would freeze) until the next question.
  const [, setClock] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClock((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!profile) return null;

  const tone = PANEL_TONE[state.mode];
  const chosenStyle = rules.styles?.find((s) => s.id === styleId) ?? rules.styles?.[0];
  const tuning = attackTuning(state.mode, profile, chosenStyle);
  const exposedAt = exposureAt(state.mode);
  const exposed = exposedAt !== null && profile.trace >= exposedAt;
  const actionCost = raidCostFor(state.mode, profile);
  const fee = chosenStyle?.cost ?? 0;
  const hasAction = profile.energy >= actionCost;
  const hasFee = profile.balance >= fee;
  const blockedByBudget = !hasAction || !hasFee;
  const verb = state.mode === "crypto" ? "Hacka" : "Råna";

  const takeAgainst = (targetName: string) =>
    projectedSteal(state.mode, state.players[targetName], { raider: profile, style: chosenStyle });

  const rivals = Object.values(state.players)
    .filter((p) => p.name !== me)
    .sort((a, b) => takeAgainst(b.name) - takeAgainst(a.name));
  const richest = Math.max(0, ...Object.values(state.players).map((p) => p.balance));

  // The richest rival is the yardstick the Pirate dice are priced against:
  // "what does this style earn in an average round" is the question the choice
  // is actually asking, and a single number settles it better than three dice.
  const benchmark = Object.values(state.players)
    .filter((p) => p.name !== me)
    .sort((a, b) => b.balance - a.balance)[0];
  const averageFor = (style: RaidStyle) =>
    benchmark ? Math.round(style.chance * projectedSteal(state.mode, benchmark, { raider: profile, style }) - style.cost) : 0;

  // What a defense is worth to *this* purse: the biggest raid that could land on
  // me right now, so the shop stops selling a 120-coin door against a 60-coin
  // theft without saying so.
  const myReachable = reachableGold(state.mode, profile);
  const myExposure = exposedBonus(state.mode, profile);
  const worstTake = Math.max(
    projectedSteal(state.mode, profile),
    rules.trace
      ? Math.min(
          Math.floor(EXPOSED_HACK.cap * myExposure),
          Math.floor((myReachable * EXPOSED_HACK.pct * myExposure) / 100)
        )
      : 0,
    ...(rules.styles?.map((s) => projectedSteal(state.mode, profile, { style: s })) ?? [0])
  );

  function defenseValue(defense: Defense): number | null {
    // A wall with two charges saves twice, so the shop says so instead of
    // advertising half its value.
    const charges = defense.charges ?? 1;
    if (defense.kind === "reduce") return Math.floor((worstTake * (defense.value ?? 0) * charges) / 100);
    if (defense.kind === "block") return worstTake * charges;
    if (defense.kind === "protect") return Math.min(defense.value ?? 0, profile.balance);
    return null;
  }

  // Two charged walls are two ids in the same array; group them for the chips
  // so a wall reads "×2" instead of appearing twice under one key.
  const held = Object.entries(
    profile.defenses.reduce<Record<string, number>>((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {})
  );

  // Does the shop hold a purchase this player can make and does not own? That
  // is the only thing the tab dot is allowed to mean.
  const shopReady = rules.defenses.some((d) => {
    if (maxedOut(state.mode, profile, d)) return false;
    if (d.kind === "energy" && profile.energy >= profile.maxEnergy) return false;
    return profile.balance >= d.cost;
  });
  const powersReady = (rules.powers ?? []).some(
    (p) => !powerUsed(profile, p) && profile.balance >= p.cost && !(p.effect === "untrace" && profile.trace === 0)
  );

  const tabs: { id: Tab; label: string; icon: typeof Crosshair; dot: boolean }[] = [
    { id: "action", label: state.mode === "crypto" ? "Hacka" : "Råna", icon: Crosshair, dot: false },
    { id: "shop", label: "Försvar", icon: Shield, dot: shopReady },
    ...(rules.powers ? [{ id: "powers" as Tab, label: "Power-ups", icon: Sparkles, dot: powersReady }] : []),
  ];

  const chestText =
    profile.chestRound === state.round
      ? "Kistan är öppnad — nästa fråga ger en ny."
      : chestAllowed
        ? "Kistan är öppen: säker, mot ledaren eller 50/50."
        : "En kista per fråga — den öppnas när frågan är avgjord.";

  return (
    <Card className="flex h-full min-h-full flex-col overflow-hidden border-white/10">
      {/* ── What I have ───────────────────────────────────────────────────── */}
      <div className={cn("relative shrink-0 overflow-hidden border-b bg-gradient-to-br to-transparent p-4", tone.wash, tone.border)}>
        <span aria-hidden className={cn("pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full blur-3xl", tone.glow)} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em]", tone.text)}>
              <Swords className="h-3 w-3" />
              {rules.name}
            </p>
            <p className="mt-1.5 flex items-baseline gap-1.5">
              <span
                data-no-translate
                className="font-display text-[32px] font-extrabold leading-none text-white tabular-nums"
              >
                {profile.balance.toLocaleString("sv-SE")}
              </span>
              <span className="text-[11px] font-bold text-white/55">{rules.currencyShort}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <Pips value={profile.energy} max={profile.maxEnergy} tone={tone.pip} />
            <p className="mt-1.5 text-[10px] font-bold text-white/55">
              <span data-no-translate className="text-white/90">
                {profile.energy}/{profile.maxEnergy}
              </span>{" "}
              {rules.energyName.toLowerCase()}
            </p>
          </div>
        </div>

        <div className="relative mt-3 grid grid-cols-3 gap-1.5">
          <MiniStat label="Per rätt svar" value={`+${rules.correctBalance}`} />
          <MiniStat
            label={state.mode === "pirate" ? "Besättning per rån" : state.mode === "crypto" ? "Ett hack" : "Ett rån"}
            value={actionCost}
          />
          <MiniStat label="Streak" value={profile.streak > 1 ? `×${profile.streak}` : "—"} />
        </div>

        <div className="relative mt-2 flex flex-wrap gap-1">
          {exposed && (
            <Chip tone="border-rose-400/40 bg-rose-500/15 text-rose-200">
              Avslöjad · alla ser dig
            </Chip>
          )}
          {profile.insider && (
            <Chip tone="border-emerald-400/40 bg-emerald-500/15 text-emerald-200">Insider redo</Chip>
          )}
          {profile.raidDiscount > 0 && (
            <Chip tone="border-sky-400/30 bg-sky-500/10 text-sky-200">Nästa rån billigare</Chip>
          )}
          {profile.streak > 1 && (
            <Chip tone="border-orange-400/30 bg-orange-500/10 text-orange-200">
              <Flame className="h-2.5 w-2.5" /> {profile.streak} i rad
            </Chip>
          )}
          {held.length === 0 && (
            <Chip tone="border-white/10 bg-white/[0.04] text-white/45">
              <Shield className="h-2.5 w-2.5" /> Inget försvar
            </Chip>
          )}
        </div>
      </div>

      {/* ── The three tabs ────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Heist-panel"
        className="flex shrink-0 border-b border-white/10 bg-slate-950/40"
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-[11px] font-extrabold uppercase tracking-wider transition-colors",
                active
                  ? cn("bg-white/[0.04]", tone.tab)
                  : "border-transparent text-white/40 hover:bg-white/[0.02] hover:text-white/70"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.id === "shop" && held.length > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-1.5 text-[9px] font-extrabold text-emerald-200">
                  {held.length}
                </span>
              )}
              {t.dot && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)]" />
              )}
            </button>
          );
        })}
      </div>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4">
        {tab === "action" && (
          <>
            <p className="flex items-start gap-1.5 text-[10px] font-bold leading-snug text-white/45">
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />
              {chestAllowed
                ? state.mode === "crypto"
                  ? "Mellan frågor: hacka, handla försvar — och kör sidohacket."
                  : state.mode === "pirate"
                    ? "Mellan frågor: råna, handla försvar — nu syns din chans."
                    : "Mellan frågor: råna, handla försvar — och välj kista."
                : state.mode === "crypto"
                  ? "Frågan rullar: hacka nu, eller spara verktygen till pausen."
                  : state.mode === "pirate"
                    ? "Frågan rullar: råna nu, eller spara besättningen till pausen."
                    : "Frågan rullar: råna nu, eller spara energin till pausen."}
            </p>

            {/* Crypto: the trace, against the line where it changes the hack */}
            {exposedAt !== null && (
              <section
                className={cn(
                  "rounded-2xl border p-2.5",
                  exposed ? "border-rose-400/40 bg-rose-500/[0.09]" : "border-white/10 bg-slate-950/40"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white/55">
                    <Radar className="h-3 w-3" /> Spår
                  </p>
                  <Chip
                    tone={
                      exposed
                        ? "border-rose-400/40 bg-rose-500/20 text-rose-200"
                        : "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                    }
                  >
                    {exposed ? "Avslöjad" : "Lugn"}
                  </Chip>
                </div>
                <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn("h-full rounded-full transition-[width]", exposed ? "bg-rose-400" : "bg-emerald-400")}
                    style={{ width: `${Math.min(100, profile.trace)}%` }}
                  />
                  <span
                    aria-hidden
                    className="absolute inset-y-0 w-px bg-white/70"
                    style={{ left: `${exposedAt}%` }}
                    title={`Avslöjad vid ${exposedAt}`}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[9px] font-bold text-white/35">
                  <span data-no-translate>{profile.trace}/100</span>
                  <span data-no-translate>avslöjad vid {exposedAt}</span>
                </div>
                <p className="mt-1.5 text-[10px] leading-snug text-white/60">
                  {profile.insider
                    ? `Insider: ${INSIDER_HACK.tools} verktyg · ${INSIDER_HACK.pct} % (max ${INSIDER_HACK.cap}).`
                    : exposed
                      ? `Högljutt hack: ${actionCost} verktyg · ${EXPOSED_HACK.pct} % (max ${EXPOSED_HACK.cap}).`
                      : `Tyst hack: ${rules.raidCost} verktyg · ${rules.raidPct} % (max ${rules.raidCap}).`}{" "}
                  +{rules.trace?.success} spår, −{TRACE_DECAY} per fråga.
                </p>
                {exposed && (
                  <p className="mt-1.5 rounded-lg bg-rose-500/10 px-2 py-1 text-[10px] font-bold leading-snug text-rose-100">
                    Alla ser ditt saldo och tar {Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)} % mer av dig.
                  </p>
                )}
              </section>
            )}

            {/* Vault: the chest is a three-way choice, not a button */}
            {rules.chests && (
              <p className="flex items-start gap-1.5 rounded-xl border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-100">
                <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{chestText}</span>
              </p>
            )}

            <section>
              <div className="mb-1.5 flex items-end justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white/60">
                  <Crosshair className="h-3.5 w-3.5" />
                  {verb} en rival
                </h3>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                  {rivals.length} {rivals.length === 1 ? "rival" : "rivaler"}
                </span>
              </div>

              {blockedByBudget && (
                <p className="mb-1.5 flex items-start gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-100">
                  <Zap className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    {!hasAction
                      ? `Du behöver ${actionCost} ${rules.energyName.toLowerCase()} — du har ${profile.energy}.`
                      : `Du har ${profile.balance.toLocaleString("sv-SE")} ${rules.currencyShort} — ${chosenStyle?.name ?? "rånet"} kostar ${fee}.`}
                  </span>
                </p>
              )}

              {/* Pirate picks the dice first, so the risk is on screen before the
                  target: chance, share, cap and what it averages against the
                  leader — the number the choice is really about. */}
              {rules.styles && (
                <div className="mb-2 grid grid-cols-3 gap-1">
                  {rules.styles.map((style, index) => {
                    const active = chosenStyle?.id === style.id;
                    const afford = profile.balance >= style.cost;
                    const average = averageFor(style);
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setStyleId(style.id)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-xl border px-1.5 py-1.5 text-left transition-colors",
                          active ? cn(tone.border, "bg-white/10") : "border-white/10 bg-white/[0.03] hover:border-white/25",
                          !afford && "opacity-45"
                        )}
                      >
                        <span className="flex items-center justify-between gap-1">
                          <span className="truncate text-[10px] font-extrabold text-white">{style.name}</span>
                          <span className="flex shrink-0 gap-0.5" aria-hidden>
                            {[0, 1, 2].map((dot) => (
                              <span
                                key={dot}
                                className={cn("h-1.5 w-1.5 rounded-full", dot <= index ? tone.pip : "bg-white/15")}
                              />
                            ))}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[9px] font-bold text-white/50">
                          <span data-no-translate>{Math.round(style.chance * 100)} %</span> · {style.pct} % · max{" "}
                          <span data-no-translate>{style.cap}</span>
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-1 font-mono text-[9px] font-bold">
                          <span className="text-amber-200/80">
                            {style.cost} {rules.currencyShort}
                          </span>
                          <span className={average >= 0 ? "text-emerald-300/80" : "text-rose-300/80"}>
                            ≈ {average >= 0 ? "+" : "−"}
                            {Math.abs(average)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid gap-1.5">
                {rivals.map((p) => {
                  const take = takeAgainst(p.name);
                  const left = Math.max(0, Math.ceil((p.protectedUntil - Date.now()) / 1000));
                  const shielded = left > 0;
                  const blocked = rules.defenses.some((d) => d.kind === "block" && p.defenses.includes(d.id));
                  const guarded = protectedGold(state.mode, p) > 0;
                  const bonus = exposedBonus(state.mode, p);
                  const exact = rules.id !== "crypto" || !rules.trace || p.trace >= rules.trace.exposed;
                  const shownBalance = exact ? p.balance.toLocaleString("sv-SE") : approxBalance(p.balance);
                  const shownTake = exact ? take.toLocaleString("sv-SE") : approxBalance(take);
                  const disabled = pending || shielded || blockedByBudget || take <= 0;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      disabled={disabled}
                      onClick={() => onAction({ kind: "raid", target: p.name, style: chosenStyle?.id })}
                      title={
                        shielded
                          ? `${p.name} är skyddad i ${left} s`
                          : take <= 0
                            ? `${p.name} har inget oskyddat kvar`
                            : blockedByBudget
                              ? "Du har inte råd med det här rånet"
                              : `${verb} ${p.name} — tar ${take} ${rules.currencyShort}`
                      }
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-colors",
                        disabled
                          ? "border-white/[0.06] bg-white/[0.02]"
                          : cn("border-white/10 bg-slate-950/50", tone.ring),
                        shielded && "opacity-50"
                      )}
                    >
                      {p.keen && KEEN_BY_ID[p.keen] ? (
                        <KeenAvatar keen={KEEN_BY_ID[p.keen]} size={32} className="shrink-0" />
                      ) : (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-800 text-[11px] font-extrabold text-slate-400">
                          {p.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1">
                          <span className="truncate text-xs font-bold text-white">{p.name}</span>
                          {p.balance === richest && richest > 0 && (
                            <Crown className="h-3 w-3 shrink-0 text-amber-300" />
                          )}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0 text-[9px] font-bold text-white/45">
                          <span data-no-translate>{shownBalance}</span>
                          <span>{rules.currencyShort}</span>
                          {shielded && <span className="text-sky-300">· skyddad {left}s</span>}
                          {blocked && <span className="text-emerald-300">· sköld</span>}
                          {guarded && <span className="text-violet-300">· lastutrymme</span>}
                          {bonus > 1 && (
                            <span className="text-rose-300">
                              · avslöjad +{Math.round((bonus - 1) * 100)} %
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-xs font-extrabold tabular-nums text-rose-200" data-no-translate>
                          +{shownTake}
                        </span>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-white/30">
                          {tuning.chance < 1 ? `${Math.round(tuning.chance * 100)} % chans` : "vid träff"}
                        </span>
                      </span>
                    </button>
                  );
                })}

                {rivals.length === 0 && (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-white/40">
                    Ingen rival än — vänta på fler spelare.
                  </p>
                )}
              </div>
            </section>
          </>
        )}

        {tab === "shop" && (
          <>
            <p className="flex items-start gap-1.5 text-[10px] font-bold leading-snug text-white/45">
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />
              Försvar är försäkring: det som skyddar mest är det som svarar mot ett rån mot dig just nu.
            </p>

            {held.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {held.map(([id, count]) => {
                  const d = defenseById(state.mode, id);
                  if (!d) return null;
                  return (
                    <span
                      key={id}
                      className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-200"
                    >
                      {d.name}
                      {count > 1 && <span data-no-translate> ×{count}</span>}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-[11px] text-white/40">
                Du har inget försvar. Ett {state.mode === "crypto" ? "hack" : "rån"} tar upp till{" "}
                <b className="text-rose-200" data-no-translate>
                  {worstTake.toLocaleString("sv-SE")}
                </b>{" "}
                {rules.currencyShort} av dig.
              </p>
            )}

            <div className="grid gap-1.5">
              {rules.defenses.map((d) => {
                const owned = maxedOut(state.mode, profile, d);
                const energyFull = d.kind === "energy" && profile.maxEnergy > 0 && profile.energy >= profile.maxEnergy;
                const reason = owned
                  ? "Redan köpt"
                  : profile.balance < d.cost
                    ? `Behöver ${d.cost}`
                    : energyFull
                      ? "Redan full"
                      : null;
                const value = defenseValue(d);
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={pending || reason !== null}
                    onClick={() => onAction({ kind: "fortify", defense: d.id })}
                    title={reason ?? d.blurb}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-2.5 py-2 text-left transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/10 disabled:opacity-40"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-white">{d.name}</span>
                      <span className="font-mono text-[10px] font-bold text-amber-200">
                        {d.cost} {rules.currencyShort}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[9px] leading-snug text-white/45">{d.blurb}</span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold text-emerald-300/80">
                        {value !== null && value > 0
                          ? `Sparar upp till ${value.toLocaleString("sv-SE")} ${rules.currencyShort}`
                          : "Uppgradering"}
                      </span>
                      {reason && <span className="text-[9px] font-bold text-white/30">{reason}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {tab === "powers" && rules.powers && (
          <>
            <p className="flex items-start gap-1.5 text-[10px] font-bold leading-snug text-white/45">
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />
              Två svar på samma fråga: sudda spåret, eller spendera det på ett stort hack.
            </p>
            <div className="grid gap-1.5">
              {rules.powers.map((power) => {
                const used = power.once && powerUsed(profile, power);
                const armed = power.effect === "insider" && profile.insider;
                const wasted = power.effect === "untrace" && profile.trace === 0;
                return (
                  <button
                    key={power.id}
                    type="button"
                    disabled={pending || used || wasted || profile.balance < power.cost}
                    onClick={() => onAction({ kind: "power", power: power.id })}
                    className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] px-2.5 py-2 text-left transition-colors hover:border-emerald-300/50 hover:bg-emerald-500/15 disabled:opacity-40"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-200">
                      {power.effect === "untrace" ? <EyeOff className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-white">
                        {power.name}
                        {(used || armed) && (
                          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-white/60">
                            {used ? "Använd" : "Redo"}
                          </span>
                        )}
                      </span>
                      <span className="block text-[9px] leading-snug text-white/45">
                        {wasted && !used ? "Du har inget spår att tvätta." : power.blurb}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] font-bold text-amber-200">
                      {used ? "—" : power.cost > 0 ? power.cost : "fri"}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {note && (
          <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-100">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
            {note}
          </p>
        )}

        {state.events.length > 0 && (
          <ul className="mt-auto space-y-1 border-t border-white/5 pt-2">
            {state.events.slice(0, 2).map((e) => (
              <li key={e.id} className="truncate text-[10px] leading-snug text-white/35">
                {e.text}
              </li>
            ))}
          </ul>
        )}

        {pending && (
          <p className="flex items-center gap-1.5 text-[10px] font-bold text-white/40">
            <Loader2 className="h-3 w-3 animate-spin" /> Skickar…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
