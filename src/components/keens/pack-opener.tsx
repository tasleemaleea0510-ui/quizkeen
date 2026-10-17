"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { KEEN_BY_ID, PACK_BY_ID, RARITY_META, RARITY_ORDER, keenBio, marketPrice, rarityChance, type Rarity } from "@/lib/keens";
import { cn } from "@/lib/utils";
import KeenAvatar from "./keen-avatar";
import PackArt from "./pack-art";
import CoinCounter from "./coin-counter";
import Confetti from "./confetti";
import { isMuted, playClick, playCoin, playReveal, playWindUp, setMuted as persistMuted } from "./sounds";

export type OpenedPull = { keenId: string; rarity: string; isNew: boolean; refund: number; owned: number };

/**
 * Rarity → the colour the reveal paints with.
 *
 * Derived from the catalogue rather than repeated: this used to be a second
 * table, which is exactly how a newly added rarity ends up with a colour of
 * `undefined` and a confetti burst that never fires.
 */
const HEX = Object.fromEntries(RARITY_ORDER.map((r) => [r, RARITY_META[r].from])) as Record<Rarity, string>;

const RAINBOW = ["#ff5f6d", "#ffc371", "#47e891", "#38bdf8", "#a855f7", "#f472b6"];

const WINDUP_MS = 900;
const REVEAL_MS = 1700;

/**
 * The reveal.
 *
 * The server has already rolled and charged for these pulls — this component
 * only performs them: the pack winds up, bursts, and the Keen lands with an
 * effect that scales with how rare it is. A tap anywhere skips to the next one;
 * "Hoppa över" jumps straight to the summary.
 */
export default function PackOpener({
  packId,
  pulls,
  coins,
  spent,
  refunded,
  onClose,
  onAgain,
}: {
  packId: string;
  pulls: OpenedPull[];
  coins: number;
  spent: number;
  refunded: number;
  onClose: () => void;
  onAgain: (count: number) => void;
}) {
  const pack = PACK_BY_ID[packId];
  const [index, setIndex] = React.useState(0);
  const [stage, setStage] = React.useState<"windup" | "reveal" | "summary">("windup");
  const [fire, setFire] = React.useState(0);
  const [colors, setColors] = React.useState<string[]>(RAINBOW);
  const [muted, setMuted] = React.useState(false);

  React.useEffect(() => {
    setMuted(isMuted());
  }, []);

  const pull = pulls[index];
  const keen = pull ? KEEN_BY_ID[pull.keenId] : undefined;
  const rarity = (pull?.rarity as Rarity) ?? "VANLIG";
  const power = RARITY_META[rarity]?.order ?? 0;
  // The real chance in this pack, not the raw table: a rarity the pack cannot
  // drop would otherwise read as a promise it never keeps.
  const chance = pull ? rarityChance(packId, rarity) : 0;

  /**
   * Land the current Keen: the flash, the chord, the confetti — everything the
   * reveal is made of. Called by the wind-up timer, or immediately when the pack
   * is tapped, and it refuses to run twice for the same pull so a tap landing on
   * the exact frame of the timer cannot double the sound and the burst.
   */
  const landedFor = React.useRef(-1);
  const land = React.useCallback(() => {
    if (!pull || landedFor.current === index) return;
    landedFor.current = index;
    setStage("reveal");
    playReveal(rarity);
    if (pull.refund > 0) setTimeout(() => playCoin(), 320);
    if (power >= 3) {
      setColors(power >= 5 ? RAINBOW : [HEX[rarity], "#ffffff", HEX[rarity]]);
      setFire((f) => f + 1);
    }
  }, [index, pull, power, rarity]);

  // Wind up, then land the Keen. Tapping the pack skips the wait.
  React.useEffect(() => {
    if (stage !== "windup" || !pull) return;
    const t = setTimeout(land, WINDUP_MS);
    playWindUp();
    return () => clearTimeout(t);
  }, [stage, index, pull, land]);

  const next = React.useCallback(() => {
    if (index + 1 < pulls.length) {
      setIndex((i) => i + 1);
      setStage("windup");
    } else {
      setStage("summary");
    }
  }, [index, pulls.length]);

  // Auto-advance so nobody has to click five times.
  React.useEffect(() => {
    if (stage !== "reveal") return;
    const t = setTimeout(next, REVEAL_MS);
    return () => clearTimeout(t);
  }, [stage, next]);

  const pricePerPack = pack?.price ?? 0;
  const againPrice = pricePerPack * pulls.length;
  const canAgain = coins >= againPrice;

  // ── what the whole opening was worth ───────────────────────────────────────
  // The reveal shows one Keen at a time, which is exciting and useless at
  // remembering: the summary adds it up, including the collector points the new
  // ones just earned (the same maths the rank ladder uses).
  const newCount = pulls.filter((p) => p.isNew).length;
  const dupeCount = pulls.length - newCount;
  const points = pulls.reduce(
    (sum, p) => (p.isNew ? sum + (RARITY_META[p.rarity as Rarity]?.order ?? 0) + 1 : sum),
    0
  );
  const worth = pulls.reduce((sum, p) => {
    const k = KEEN_BY_ID[p.keenId];
    return k ? sum + marketPrice(k) : sum;
  }, 0);
  const best = pulls.reduce<OpenedPull | null>(
    (acc, p) =>
      !acc || (RARITY_META[p.rarity as Rarity]?.order ?? 0) > (RARITY_META[acc.rarity as Rarity]?.order ?? 0) ? p : acc,
    null
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-slate-950/85 backdrop-blur-md animate-keen-fade"
      onClick={() => {
        // Tap does whatever is next: the shaking pack gives up its Keen, the
        // revealed one makes way for the next pull.
        if (stage === "windup") land();
        else if (stage === "reveal") next();
      }}
    >
      <Confetti fire={fire} colors={colors} count={power >= 5 ? 190 : 130} spread={power >= 4 ? 1.25 : 1} />

      {/* rarity flash */}
      {stage === "reveal" && (
        <span
          key={index}
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-keen-flash"
          style={{ background: `radial-gradient(circle at 50% 45%, ${HEX[rarity]}66, transparent 62%)` }}
        />
      )}

      <div className={cn("relative flex w-full max-w-lg flex-col items-center px-5", stage === "reveal" && power >= 4 && "animate-keen-screenshake")}>
        <div className="absolute right-0 top-0 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextMuted = !muted;
              setMuted(nextMuted);
              persistMuted(nextMuted);
              if (!nextMuted) playClick();
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-slate-900/80 text-slate-300 transition-colors hover:text-white"
            title={muted ? "Sätt på ljud" : "Stäng av ljud"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-slate-900/80 text-slate-300 transition-colors hover:text-white"
            title="Stäng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          {pack?.emoji} {pack?.name}
          {pulls.length > 1 && ` · ${index + 1}/${pulls.length}`}
        </p>

        {/* One dot per pull: how many are left, and how good they were. */}
        {pulls.length > 1 && stage !== "summary" && (
          <div className="mb-4 flex items-center gap-1.5">
            {pulls.map((p, i) => {
              const r = RARITY_META[p.rarity as Rarity] ?? RARITY_META.VANLIG;
              return (
                <span
                  key={`${p.keenId}-${i}`}
                  title={r.label}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i === index ? "w-6 animate-keen-pulse" : "w-2",
                    i < index ? "opacity-100" : i === index ? "opacity-100" : "opacity-25"
                  )}
                  style={{ background: r.from }}
                />
              );
            })}
          </div>
        )}

        {/* ── the pack itself ───────────────────────────────────────────── */}
        {stage === "windup" && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative grid h-44 w-36 place-items-center" title="Tryck för att öppna direkt">
              <span
                className="absolute inset-0 rounded-3xl blur-2xl animate-keen-pulse"
                style={{ background: `radial-gradient(circle, hsl(${pack?.hue ?? 260} 80% 60% / 0.55), transparent 70%)` }}
              />
              {pack ? (
                <PackArt
                  pack={pack}
                  variant="hero"
                  className="relative h-44 w-36 animate-keen-shake rounded-3xl"
                />
              ) : (
                <span className="relative grid h-44 w-36 place-items-center rounded-3xl border border-white/15 bg-slate-800 text-6xl">
                  🎁
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-300 animate-keen-pulse">Öppnar…</p>
            <span className="-mt-3 text-[11px] font-semibold text-slate-500">Tryck var som helst för att skynda på</span>
          </div>
        )}

        {/* ── the reveal ────────────────────────────────────────────────── */}
        {stage === "reveal" && keen && (
          <div className="flex flex-col items-center">
            <div className="relative grid place-items-center">
              {power >= 4 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute h-[26rem] w-[26rem] animate-keen-spin-slow rounded-full opacity-70"
                  style={{
                    background:
                      power >= 5
                        ? `conic-gradient(from 0deg, ${RAINBOW.map((c) => `${c}00`).join(",")})`
                        : `conic-gradient(from 0deg, transparent 0deg, ${HEX[rarity]}aa 18deg, transparent 42deg, ${HEX[rarity]}66 60deg, transparent 90deg, ${HEX[rarity]}aa 130deg, transparent 170deg, ${HEX[rarity]}66 210deg, transparent 250deg, ${HEX[rarity]}aa 300deg, transparent 340deg)`,
                  }}
                />
              )}
              {power >= 5 && (
                <span aria-hidden className="pointer-events-none absolute h-72 w-72 rounded-full keen-chroma opacity-40 blur-2xl animate-keen-spin-slow" />
              )}
              <div
                className={cn(
                  "relative grid place-items-center rounded-3xl border p-6 animate-keen-flip",
                  power >= 4 ? RARITY_META[rarity].ring : "border-white/10",
                  "bg-slate-900/70 backdrop-blur-xl"
                )}
              >
                <KeenAvatar keen={keen} size={168} className={cn("animate-keen-pop", power >= 3 && RARITY_META[rarity].glow)} />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
                >
                  <span className="absolute -inset-y-8 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-keen-sheen" />
                </span>
              </div>
            </div>

            <div className={cn("mt-5 flex flex-col items-center gap-1.5", power >= 4 && "animate-keen-pop")}>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em]",
                  RARITY_META[rarity].chip,
                  rarity === "KROMA" && "keen-chroma-text animate-keen-pan"
                )}
              >
                {RARITY_META[rarity].label}
              </span>
              <h2
                className={cn(
                  "font-display text-3xl font-extrabold tracking-tight",
                  rarity === "KROMA" ? "keen-chroma-text animate-keen-pan" : RARITY_META[rarity].text
                )}
              >
                {keen.name}
              </h2>

              {pull.isNew ? (
                <span className="mt-1 flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-extrabold text-emerald-300 animate-keen-wiggle">
                  <Sparkles className="h-3.5 w-3.5" /> Ny Keen!
                </span>
              ) : (
                <span
                  data-no-translate
                  className="mt-1 flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs font-extrabold text-amber-200 animate-keen-wiggle"
                >
                  Dubblett · +{pull.refund} mynt
                </span>
              )}

              <p className="mt-1 text-xs text-slate-400">
                {chance > 0 ? `Chans: ${String(chance).replace(".", ",")} %` : ""}
                {pull.owned > 1 ? ` · Du äger ${pull.owned} st` : ""}
              </p>
              {keenBio(keen) && (
                <p className="mt-1 max-w-sm text-center text-xs italic leading-snug text-slate-300">
                  “{keenBio(keen)}”
                </p>
              )}
              {pulls.length > 1 && (
                <span className="mt-2 text-[11px] text-slate-500">Tryck för nästa · {index + 1} av {pulls.length}</span>
              )}
            </div>
          </div>
        )}

        {/* ── summary ───────────────────────────────────────────────────── */}
        {stage === "summary" && (
          <div className="w-full animate-keen-rise rounded-3xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-white">
                {pulls.length > 1 ? `Du fick ${pulls.length} Keens!` : "Resultat"}
              </h2>
              <CoinCounter value={coins} className="text-amber-300" />
            </div>

            {/* The numbers behind the reveal, in one glance. */}
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Nya" value={String(newCount)} tone={newCount > 0 ? "text-emerald-300" : "text-slate-300"} />
              <Stat label="Dubbletter" value={String(dupeCount)} tone={dupeCount > 0 ? "text-amber-300" : "text-slate-300"} />
              <Stat label="Poäng" value={`+${points}`} tone="text-indigo-300" />
              <Stat label="Värde" value={String(worth)} tone="text-sky-300" suffix=" mynt" />
            </div>

            {best && (
              <p className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-400">
                Bästa drag:
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider", RARITY_META[best.rarity as Rarity].chip)}>
                  {RARITY_META[best.rarity as Rarity].label}
                </span>
                <span className="text-slate-300">{KEEN_BY_ID[best.keenId]?.name}</span>
                {points > 0 && <span className="text-slate-500">· {points} poäng närmare nästa nivå</span>}
              </p>
            )}

            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {pulls.map((p, i) => {
                const k = KEEN_BY_ID[p.keenId];
                if (!k) return null;
                const r = RARITY_META[p.rarity as Rarity] ?? RARITY_META.VANLIG;
                return (
                  <div
                    key={`${p.keenId}-${i}`}
                    className={cn(
                      "relative flex flex-col items-center gap-1 rounded-2xl border bg-slate-950/50 p-2 animate-keen-rise",
                      r.ring
                    )}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <KeenAvatar keen={k} size={48} />
                    <p className="truncate text-[11px] font-bold text-white">{k.name}</p>
                    <p className={cn("text-[9px] font-bold uppercase tracking-wider", r.text)}>{r.label}</p>
                    {p.isNew ? (
                      <span className="text-[9px] font-extrabold text-emerald-300">NY</span>
                    ) : (
                      <span data-no-translate className="text-[9px] font-extrabold text-amber-300">
                        +{p.refund}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm">
              <div className="flex flex-col gap-0.5 text-slate-300">
                {spent > 0 && (
                  <span data-no-translate>
                    Kostade <b className="text-red-300">−{spent}</b> mynt
                  </span>
                )}
                {refunded > 0 && (
                  <span data-no-translate>
                    Dubbletter gav tillbaka <b className="text-emerald-300">+{refunded}</b> mynt
                  </span>
                )}
                {spent === 0 && refunded === 0 && <span>Gratis!</span>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500"
                >
                  Stäng
                </button>
                <button
                  type="button"
                  disabled={!canAgain}
                  onClick={() => onAgain(pulls.length)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition-all",
                    canAgain
                      ? "bg-gradient-to-b from-indigo-500 to-indigo-600 shadow-glow-sm hover:from-indigo-400 hover:to-indigo-500"
                      : "cursor-not-allowed bg-slate-800 text-slate-500"
                  )}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {againPrice === 0 ? "Öppna igen" : `Öppna igen · ${againPrice} mynt`}
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-xs font-semibold">
              <Link href="/keens" className="text-indigo-300 hover:text-indigo-200">
                Se hela samlingen →
              </Link>
              <Link href="/keens/market" className="text-amber-300 hover:text-amber-200">
                Saknar du en? Köp den i marknaden →
              </Link>
            </div>
          </div>
        )}

        {stage !== "summary" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setStage("summary");
            }}
            className="mt-6 text-xs font-semibold text-slate-400 underline decoration-dotted hover:text-slate-200"
          >
            {pulls.length > 1 ? "Hoppa över till sammanfattningen" : "Visa resultatet direkt"}
          </button>
        )}
      </div>
    </div>
  );
}

/** One number in the summary's little stat row. */
function Stat({ label, value, tone, suffix }: { label: string; value: string; tone: string; suffix?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/50 px-2.5 py-2 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p data-no-translate className={cn("font-display text-sm font-extrabold", tone)}>
        {value}
        {suffix && <span className="text-[10px] font-bold text-slate-500">{suffix}</span>}
      </p>
    </div>
  );
}
