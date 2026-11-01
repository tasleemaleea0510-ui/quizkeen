"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import KeenAvatar from "@/components/keens/keen-avatar";
import { KEEN_BY_ID } from "@/lib/keens";
import {
  MODE_RULES,
  approxBalance,
  defenseById,
  exposureAt,
  maxedOut,
  powerUsed,
  projectedSteal,
  protectedGold,
  raidCostFor,
  type HeistAction,
  type HeistState,
} from "@/lib/game-modes";
import { Coins, Crosshair, Flame, Gift, Loader2, Rocket, Shield, Sparkles, Swords, Zap } from "lucide-react";

/**
 * The heist panel — what a player does between two questions.
 *
 * Deliberately narrow: your own purse at the top, the rivals you can rob in the
 * middle, the shop underneath and a short feed of what just happened. The host
 * owns the truth, so every button here only sends an intention; nothing is
 * subtracted locally except the disabled state that stops double clicks.
 */
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
  const [style, setStyle] = useState(rules.styles?.[1]?.id ?? rules.styles?.[0]?.id ?? "");
  const [openShop, setOpenShop] = useState(false);

  if (!profile) return null;

  const rivals = Object.values(state.players)
    .filter((p) => p.name !== me)
    .sort((a, b) => b.balance - a.balance);
  const chosenStyle = rules.styles?.find((s) => s.id === style) ?? rules.styles?.[1] ?? rules.styles?.[0];
  const keenOf = (id: string | null) => (id ? KEEN_BY_ID[id] : undefined);

  const energyFull = profile.maxEnergy > 0 && profile.energy >= profile.maxEnergy;
  const safeguarded = protectedGold(state.mode, profile);
  const exposedAt = exposureAt(state.mode);
  const exhausted = Boolean(exposedAt !== null && profile.trace >= exposedAt);
  const raidCost = raidCostFor(state.mode, profile);
  // A raid you cannot pay for is disabled rather than a button that turns into
  // an error note: the panel should never offer a move the rules will refuse.
  const raidUnaffordable = rules.styles
    ? profile.balance < (chosenStyle?.cost ?? 0)
    : profile.energy < raidCost;
  const raidCostLabel = rules.styles
    ? `${chosenStyle?.cost ?? 0} ${rules.currencyShort}`
    : `${raidCost} ${rules.energyName.toLowerCase()}`;
  // A two-charge wall or decoy is two ids in the same array; group them for the
  // chips so a wall reads "×2" instead of appearing twice under one key.
  const held = Object.entries(
    profile.defenses.reduce<Record<string, number>>((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {})
  );

  return (
    /* The panel is a HUD column, not a card in a corner: it takes the height it
       is given and the feed sinks to the bottom, so the rail never ends in a
       stripe of nothing. */
    <Card className="flex h-full min-h-full flex-col overflow-hidden border-white/10">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Swords className="h-4 w-4 text-indigo-300" />
          <span>{rules.name}</span>
        </CardTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-extrabold text-amber-200">
            <Coins className="h-3.5 w-3.5" />
            <span data-no-translate>{profile.balance.toLocaleString("sv-SE")}</span>
            <span className="font-semibold text-amber-200/70">{rules.currencyShort}</span>
          </span>
          {profile.maxEnergy > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-xs font-extrabold text-indigo-200">
              <Zap className="h-3.5 w-3.5" />
              <span data-no-translate>
                {profile.energy}/{profile.maxEnergy}
              </span>
            </span>
          )}
          {safeguarded > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-extrabold text-emerald-200">
              <Shield className="h-3.5 w-3.5" />
              <span data-no-translate>{safeguarded.toLocaleString("sv-SE")}</span>
              <span className="font-semibold text-emerald-200/70">skyddat</span>
            </span>
          )}
          {profile.streak > 1 && (
            <span className="flex items-center gap-1 rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 text-xs font-extrabold text-orange-200">
              <Flame className="h-3.5 w-3.5" />
              <span data-no-translate>{profile.streak}</span>
              <span>i rad</span>
            </span>
          )}
          {profile.raidDiscount > 0 && (
            <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-xs font-extrabold text-sky-200">
              billigt nästa rån
            </span>
          )}
          {rules.trace && (
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${
                exhausted
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                  : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              Spår {profile.trace}
              {exhausted && " · avslöjad"}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pt-3">
        {/* Gold Quest: one face-down chest a round. The pull itself is the
            full-screen `ChestPick` overlay, so this is a status line rather
            than a second, smaller set of chest buttons that duplicated it. */}
        {rules.chests && (
          <p className="flex items-start gap-1.5 rounded-xl border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200">
            <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {profile.chestRound === state.round
              ? "Kistan är öppnad — nästa fråga ger en ny."
              : chestAllowed
                ? "Kistan är öppen: välj en av tre i rutan ovanför."
                : "En kista per fråga — den öppnas när frågan är avgjord."}
          </p>
        )}

        {/* Crypto's heat, against the line where it starts costing you tools. */}
        {exposedAt !== null && (
          <div>
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider">
              <span className="text-slate-400">Spår</span>
              <span className={exhausted ? "text-rose-300" : "text-slate-500"}>
                <span data-no-translate>
                  {profile.trace}/{exposedAt}
                </span>
                {exhausted ? " · avslöjad" : " · avslöjad vid " + exposedAt}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={exhausted ? "h-full rounded-full bg-rose-400" : "h-full rounded-full bg-sky-400"}
                style={{ width: `${Math.min(100, (profile.trace / exposedAt) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] font-semibold text-slate-500">
              {exhausted
                ? "Avslöjad: varje hack kostar ett verktyg mer."
                : "Ett lyckat hack ger +15 spår, ett stoppat +25. Spåret svalnar 10 per fråga."}
            </p>
          </div>
        )}

        {/* Cyber Hack: the once-per-match wallet overdrive. */}
        {rules.powers && (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {rules.powers.map((p) => {
              const used = p.once && powerUsed(profile, p);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={pending || used || profile.balance < p.cost}
                  onClick={() => onAction({ kind: "power", power: p.id })}
                  className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-2.5 py-2 text-left transition-colors hover:border-sky-300/60 hover:bg-sky-500/20 disabled:opacity-45"
                >
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-sky-100">
                    <Rocket className="h-3.5 w-3.5" />
                    {p.name}
                    {used && <span className="text-[10px] font-bold text-slate-400">använd</span>}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-sky-200/60">{p.blurb}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Targets */}
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Crosshair className="h-3.5 w-3.5" />
            {rules.id === "crypto" ? "Hacka en rival" : "Råna en rival"}
          </p>
          {rules.raidCost > 0 && (
            <p className="mb-1.5 text-[10px] font-semibold text-slate-500">
              {rules.id === "crypto" ? "Hack kostar" : "Rån kostar"}{" "}
              <span data-no-translate className="text-slate-300">
                {raidCost}
              </span>{" "}
              {rules.energyName.toLowerCase()}
              {exhausted && <span className="text-rose-300"> · avslöjad, +1</span>}
            </p>
          )}
          {raidUnaffordable && (
            <p className="mb-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-200">
              {rules.styles
                ? `Du har ${profile.balance} ${rules.currencyShort} — ${chosenStyle?.name ?? "rånet"} kostar ${raidCostLabel}.`
                : `Du behöver ${raidCostLabel} — du har ${profile.energy}/${profile.maxEnergy}.`}
            </p>
          )}
          {/* Pirate Heist picks the risk first, then the ship. */}
          {rules.styles && (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {rules.styles.map((s) => {
                const active = chosenStyle?.id === s.id;
                const afford = profile.balance >= s.cost;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    className={`flex-1 rounded-xl border px-2 py-1.5 text-left text-[11px] transition-colors ${
                      active
                        ? "border-amber-400/60 bg-amber-500/15 text-amber-100"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
                    } ${afford ? "" : "opacity-50"}`}
                  >
                    <span className="block font-extrabold">{s.name}</span>
                    <span className="block text-[10px] text-slate-400">
                      {s.cost} {rules.currencyShort} · {Math.round(s.chance * 100)} % · {s.pct} % (max {s.cap})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="grid gap-1.5 sm:grid-cols-2">
            {rivals.map((p) => {
              const keen = keenOf(p.keen);
              const shielded = p.protectedUntil > Date.now();
              const blocked = rules.defenses.some((d) => d.kind === "block" && p.defenses.includes(d.id));
              const guarded = protectedGold(state.mode, p) > 0;
              // What this move would actually take, so the choice between a cheap
              // sneak and an all-out attack is made on numbers, not guesswork.
              const take = projectedSteal(state.mode, p, chosenStyle);
              const takeShown = rules.id === "crypto" ? approxBalance(take) : take.toLocaleString("sv-SE");
              return (
                <button
                  key={p.name}
                  type="button"
                  disabled={pending || shielded || raidUnaffordable}
                  onClick={() => onAction({ kind: "raid", target: p.name, style: chosenStyle?.id })}
                  title={
                    shielded
                      ? `${p.name} är tillfälligt skyddad`
                      : raidUnaffordable
                        ? `Du har inte råd: ${raidCostLabel}`
                        : `Råna ${p.name} — tar cirka ${take} ${rules.currencyShort}`
                  }
                  className="group flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-2 py-1.5 text-left transition-colors hover:border-rose-400/40 hover:bg-rose-500/10 disabled:opacity-45"
                >
                  {keen ? (
                    <KeenAvatar keen={keen} size={30} />
                  ) : (
                    <span className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-slate-800 text-xs font-extrabold text-slate-400">
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-200">{p.name}</span>
                    <span className="block text-[10px] font-semibold text-slate-500">
                      {rules.id === "crypto" ? approxBalance(p.balance) : p.balance.toLocaleString("sv-SE")}{" "}
                      {rules.currencyShort}
                      {blocked && " · sköld"}
                      {guarded && " · lastutrymme"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-md bg-rose-500/15 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-rose-200">
                    +<span data-no-translate>{takeShown}</span>
                  </span>
                  <Shield className="h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-rose-300" />
                </button>
              );
            })}
            {rivals.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-xs text-slate-500 sm:col-span-2">
                Ingen rival än — vänta på fler spelare.
              </p>
            )}
          </div>
        </div>

        {/* Shop */}
        <div>
          <button
            type="button"
            onClick={() => setOpenShop((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition-colors hover:border-white/25"
          >
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-300" />
              Försvara dig
              {profile.defenses.length > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-1.5 text-[10px] text-emerald-200">
                  {profile.defenses.length}
                </span>
              )}
            </span>
            <span className="text-slate-500">{openShop ? "Dölj" : "Visa"}</span>
          </button>

          {held.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {held.map(([id, count]) => {
                const d = defenseById(state.mode, id);
                if (!d) return null;
                return (
                  <span
                    key={id}
                    className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200"
                  >
                    {d.name}
                    {count > 1 && <span data-no-translate> ×{count}</span>}
                  </span>
                );
              })}
            </div>
          )}

          {openShop && (
            <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
              {rules.defenses.map((d) => {
                const owned = maxedOut(state.mode, profile, d);
                const disabled = pending || owned || profile.balance < d.cost || (d.kind === "energy" && energyFull);
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onAction({ kind: "fortify", defense: d.id })}
                    className="rounded-xl border border-white/10 bg-slate-950/50 px-2.5 py-1.5 text-left transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/10 disabled:opacity-45"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-200">{d.name}</span>
                      <span className="font-mono text-[10px] font-bold text-amber-300">
                        {d.cost} {rules.currencyShort}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">{d.blurb}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {note && (
          <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-200">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
            {note}
          </p>
        )}

        {state.events.length > 0 && (
          <ul className="mt-auto space-y-0.5 pt-0.5">
            {state.events.slice(0, 4).map((e) => (
              <li key={e.id} className="truncate text-[11px] text-slate-500">
                {e.text}
              </li>
            ))}
          </ul>
        )}
        {pending && (
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Skickar...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
