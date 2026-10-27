"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import KeenAvatar from "@/components/keens/keen-avatar";
import { KEEN_BY_ID } from "@/lib/keens";
import {
  MODE_RULES,
  approxBalance,
  defenseById,
  maxedOut,
  protectedGold,
  type HeistAction,
  type HeistState,
} from "@/lib/game-modes";
import { Coins, Crosshair, Gift, Loader2, Rocket, Shield, Sparkles, Swords, Zap } from "lucide-react";

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
  onAction,
}: {
  state: HeistState;
  me: string;
  note?: string | null;
  pending: boolean;
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

  return (
    <Card className="overflow-hidden border-white/10">
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
          {profile.raidDiscount > 0 && (
            <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-xs font-extrabold text-sky-200">
              billigt nästa rån
            </span>
          )}
          {rules.trace && (
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${
                profile.trace >= rules.trace.exposed
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                  : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              Spår {profile.trace}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {/* Gold Quest: one face-down chest a round, and nobody knows what is in it. */}
        {rules.chests && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Gift className="h-3.5 w-3.5" />
              Öppna en kista
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((i) => {
                const ready = profile.chestRound !== state.round;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={pending || !ready}
                    onClick={() => onAction({ kind: "chest" })}
                    className="group relative overflow-hidden rounded-xl border border-amber-400/30 bg-gradient-to-b from-amber-500/25 to-amber-900/20 px-2 py-2.5 text-center transition-all hover:border-amber-300/70 hover:from-amber-400/35 disabled:opacity-40"
                  >
                    <Gift className="mx-auto h-5 w-5 text-amber-200 transition-transform duration-200 group-hover:scale-110" />
                    <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-wider text-amber-100/80">
                      Kista {i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] font-semibold text-slate-500">
              {profile.chestRound === state.round
                ? "Öppnad — nästa fråga ger en ny kista."
                : "Mynt, stöld, byte med ledaren eller ingenting alls."}
            </p>
          </div>
        )}

        {/* Crypto Hack: the button that doubles the wallet, once. */}
        {rules.powers && (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {rules.powers.map((p) => {
              const used = p.once && profile.doubled;
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
                      {s.cost} {rules.currencyShort} · {Math.round(s.chance * 100)} % · {s.pct} %
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
              return (
                <button
                  key={p.name}
                  type="button"
                  disabled={pending || shielded}
                  onClick={() => onAction({ kind: "raid", target: p.name, style: chosenStyle?.id })}
                  title={shielded ? `${p.name} är tillfälligt skyddad` : `Råna ${p.name}`}
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

          {profile.defenses.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {profile.defenses.map((id) => {
                const d = defenseById(state.mode, id);
                if (!d) return null;
                return (
                  <span
                    key={id}
                    className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200"
                  >
                    {d.name}
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
          <ul className="space-y-0.5 pt-0.5">
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
