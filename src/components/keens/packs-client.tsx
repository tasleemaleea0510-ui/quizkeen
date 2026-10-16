"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Gift, Info, Lock, Sparkles, Timer } from "lucide-react";
import {
  HIDDEN_PACKS,
  PACK_BY_ID,
  RARITY_META,
  RARITY_ORDER,
  SHELF_PACKS,
  formatWait,
  keensInPack,
  type AnyPackId,
  type Pack,
} from "@/lib/keens";
import { PACK_EMBLEMS, SPRITE_BOARDS } from "@/lib/keen-sprites";
import { getKeenStateAction, openPackAction } from "@/app/keens/actions";
import type { KeenState } from "@/lib/keens-store";
import { cn } from "@/lib/utils";
import CoinCounter from "./coin-counter";
import KeenAvatar from "./keen-avatar";
import PixelSprite from "./pixel-sprite";
import PackOpener, { type OpenedPull } from "./pack-opener";
import { Toasts, useToasts } from "./toast";
import { playClick, playError, playWindUp } from "./sounds";

type Opening = { packId: string; pulls: OpenedPull[]; coins: number; spent: number; refunded: number; nonce: number };

export default function PacksClient({ state }: { state: KeenState }) {
  const router = useRouter();
  const { toasts, push, dismiss } = useToasts();
  const [live, setLive] = React.useState(state);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [opening, setOpening] = React.useState<Opening | null>(null);
  const [wait, setWait] = React.useState(state.freeWaitMs);
  const nonce = React.useRef(0);

  // Server truth whenever the page re-renders (after a revalidatePath).
  React.useEffect(() => {
    setLive(state);
    setWait(state.freeWaitMs);
  }, [state]);

  // A live countdown, so the free pack unlocks in front of you.
  const freeRunning = wait > 0;
  React.useEffect(() => {
    if (!freeRunning) return;
    const t = setInterval(() => setWait((ms) => Math.max(0, ms - 1000)), 1000);
    return () => clearInterval(t);
  }, [freeRunning]);

  const free = PACK_BY_ID.gratis;
  const freeReady = wait === 0 && !live.dailyBonusDisabled;

  async function refresh() {
    const fresh = await getKeenStateAction();
    if (fresh) {
      setLive(fresh);
      setWait(fresh.freeWaitMs);
    }
    router.refresh();
  }

  async function open(pack: Pack, count: number) {
    if (busy) return;
    const key = `${pack.id}-${count}`;
    setBusy(key);
    if (pack.price > 0) playWindUp();
    const res = await openPackAction(pack.id, count);
    setBusy(null);

    if (!res.ok) {
      playError();
      push(res.message, "err");
      return;
    }

    nonce.current += 1;
    setOpening({
      packId: res.packId,
      pulls: res.pulls,
      coins: res.coins,
      spent: res.spent,
      refunded: res.refunded,
      nonce: nonce.current,
    });
  }

  return (
    <div className="space-y-8">
      {/* ── the free pack ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900/50 to-slate-900/40 p-5 backdrop-blur-xl">
        <span className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className={cn("grid h-16 w-16 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-3xl", freeReady && "animate-keen-bob")}>
              {free.emoji}
            </span>
            <div>
              <p className="font-display text-lg font-extrabold text-white">{free.name}</p>
              <p className="max-w-md text-xs text-slate-400">{free.tagline}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {RARITY_ORDER.filter((r) => free.odds[r]).map((r) => (
                  <span key={r} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", RARITY_META[r].chip)}>
                    {RARITY_META[r].label} {String(free.odds[r]).replace(".", ",")} %
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:w-56">
            {live.dailyBonusDisabled ? (
              <span className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm font-semibold text-slate-400">
                <Lock className="h-4 w-4" /> Inte tillgängligt
              </span>
            ) : (
              <button
                type="button"
                disabled={!freeReady || busy !== null}
                onClick={() => {
                  playClick();
                  open(free, 1);
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition-all",
                  freeReady && !busy
                    ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-emerald-950 shadow-[0_0_28px_-8px_rgba(52,211,153,0.8)] hover:from-emerald-300 hover:to-emerald-500"
                    : "cursor-not-allowed bg-slate-800 text-slate-500"
                )}
              >
                <Gift className="h-4 w-4" />
                {freeReady ? "Öppna gratis" : "Redan öppnat"}
              </button>
            )}
            {!freeReady && !live.dailyBonusDisabled && (
              <span data-no-translate className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400">
                <Timer className="h-3.5 w-3.5 text-emerald-400" />
                {formatWait(wait)} kvar
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── the shelf ────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-white">
            <Sparkles className="h-5 w-5 text-indigo-400" /> Paket
          </h2>
          <CoinCounter value={live.coins} className="text-lg" label="mynt" />
        </div>

        {HIDDEN_PACKS.length > 0 && (
          <p className="rounded-2xl border border-white/5 bg-slate-900/40 px-4 py-3 text-xs text-slate-400">
            Fler temapaket är inte till salu just nu — deras Keens finns kvar i samlingen och går att köpa i marknaden.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {SHELF_PACKS.map((pack, i) => (
            <PackTile
              key={pack.id}
              pack={pack}
              owned={live.owned}
              coins={live.coins}
              frozen={live.coinsFrozen}
              busy={busy}
              index={i}
              onOpen={open}
            />
          ))}
        </div>
      </section>

      <p className="flex items-start gap-2 rounded-2xl border border-white/5 bg-slate-900/40 px-4 py-3 text-xs text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
        Dubbletter betalar tillbaka sig själva direkt: får du en Keen du redan har får du mynt tillbaka — säljvärdet för
        den sällsyntheten. Öppna fler paket på en gång för fler chanser!
      </p>

      {opening && (
        <PackOpener
          key={opening.nonce}
          packId={opening.packId}
          pulls={opening.pulls}
          coins={opening.coins}
          spent={opening.spent}
          refunded={opening.refunded}
          onClose={() => {
            setOpening(null);
            void refresh();
          }}
          onAgain={(count) => {
            const pack = PACK_BY_ID[opening.packId];
            setOpening(null);
            if (pack) void open(pack, count);
          }}
        />
      )}

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

/** One pack on the shelf: odds, collection progress, and a button per size. */
function PackTile({
  pack,
  owned,
  coins,
  frozen,
  busy,
  index,
  onOpen,
}: {
  pack: Pack;
  owned: Record<string, number>;
  coins: number;
  frozen: boolean;
  busy: string | null;
  index: number;
  onOpen: (pack: Pack, count: number) => void;
}) {
  const inPack = keensInPack(pack.id as AnyPackId);
  const emblem = PACK_EMBLEMS[pack.id];
  const have = inPack.filter((k) => (owned[k.id] ?? 0) > 0).length;
  const percent = inPack.length ? Math.round((have / inPack.length) * 100) : 0;
  const complete = have === inPack.length;

  return (
    <div
      className="group relative isolate overflow-hidden rounded-3xl border border-white/5 bg-slate-900/50 p-4 backdrop-blur-xl transition-all duration-300 hover:border-indigo-400/30 hover:shadow-raise animate-keen-rise"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <span
        className="pointer-events-none absolute inset-0 -z-10 opacity-40 transition-opacity duration-500 group-hover:opacity-70"
        style={{ background: `radial-gradient(120% 90% at 88% 0%, hsl(${pack.hue} 80% 55% / 0.28), transparent 62%)` }}
      />

      <div className="flex items-start gap-3">
        <span
          className={cn(
            "relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl border text-3xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105",
            emblem ? "border-fuchsia-400/70" : "border-white/15"
          )}
          style={
            emblem
              ? { background: SPRITE_BOARDS.neon.background, boxShadow: "0 16px 34px -14px rgba(255,47,208,0.85)" }
              : {
                  background: `linear-gradient(160deg, hsl(${pack.hue} 70% 40%), hsl(${pack.hue} 70% 18%))`,
                  boxShadow: `0 16px 34px -18px hsl(${pack.hue} 80% 50% / 0.95)`,
                }
          }
        >
          {emblem ? (
            <PixelSprite sprite={emblem} size={58} />
          ) : (
            <span className="animate-keen-bob">{pack.emoji}</span>
          )}
          {complete && (
            <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-emerald-400/50 bg-emerald-500 text-[11px] font-extrabold text-emerald-950">
              ✓
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-display text-base font-extrabold text-white">{pack.name}</p>
            <span data-no-translate className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-extrabold text-amber-200">
              {pack.price} mynt
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{pack.tagline}</p>

          {/* odds */}
          <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            {RARITY_ORDER.filter((r) => pack.odds[r]).map((r) => (
              <span
                key={r}
                title={`${RARITY_META[r].label} ${String(pack.odds[r]).replace(".", ",")} %`}
                style={{ width: `${pack.odds[r]}%`, background: RARITY_META[r].from }}
                className="h-full"
              />
            ))}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {RARITY_ORDER.filter((r) => pack.odds[r]).map((r) => (
              <span
                key={r}
                data-no-translate
                className="text-[9px] font-bold uppercase tracking-wide"
                style={{ color: RARITY_META[r].from }}
              >
                {RARITY_META[r].label} {String(pack.odds[r]).replace(".", ",")}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-slate-500">I samlingen</span>
          <span data-no-translate className="text-slate-300">
            {have}/{inPack.length}
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%`, background: `linear-gradient(90deg, hsl(${pack.hue} 80% 55%), hsl(${(pack.hue + 60) % 360} 80% 60%))` }}
          />
        </div>
      </div>

      {/* the last few Keens you are missing from this pack */}
      <div className="mt-3 flex items-center gap-1.5">
        {inPack
          .filter((k) => (owned[k.id] ?? 0) === 0)
          .slice(0, 6)
          .map((k) => (
            <KeenAvatar key={k.id} keen={k} size={26} locked className="opacity-60" />
          ))}
        {inPack.filter((k) => (owned[k.id] ?? 0) === 0).length > 6 && (
          <span data-no-translate className="text-[10px] font-bold text-slate-500">
            +{inPack.filter((k) => (owned[k.id] ?? 0) === 0).length - 6}
          </span>
        )}
        {complete && <span className="text-[11px] font-bold text-emerald-300">Alla hittade! 🎉</span>}
      </div>

      <div className="mt-4 flex gap-2">
        {pack.sizes.map((size, si) => {
          const cost = pack.price * size;
          const key = `${pack.id}-${size}`;
          const canAfford = !frozen && coins >= cost;
          const working = busy === key;
          return (
            <button
              key={size}
              type="button"
              disabled={!canAfford || busy !== null}
              onClick={() => onOpen(pack, size)}
              className={cn(
                "flex flex-1 flex-col items-center rounded-xl px-2 py-2 text-xs font-extrabold transition-all",
                si === 0 && "flex-[1.3]",
                canAfford && !busy
                  ? si === 0
                    ? "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-glow-sm hover:from-indigo-400 hover:to-indigo-500"
                    : "border border-indigo-400/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20"
                  : "cursor-not-allowed bg-slate-800 text-slate-500"
              )}
            >
              <span>{working ? "Öppnar…" : size === 1 ? "Öppna 1" : `Öppna ${size}`}</span>
              <span data-no-translate className="text-[10px] font-bold opacity-80">
                {cost} mynt
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
