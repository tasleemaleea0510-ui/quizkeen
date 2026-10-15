"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, Coins, Flame, Search, Sparkles, Store, Tag, TrendingDown, Trophy } from "lucide-react";
import {
  DEAL_OFF,
  KEENS,
  PACK_BY_ID,
  RARITY_META,
  RARITY_ORDER,
  TOTAL_KEENS,
  dayKey,
  dailyDeals,
  marketPrice,
  sellPrice,
  type Keen,
  type Rarity,
} from "@/lib/keens";
import { buyKeenAction, getKeenStateAction, sellDuplicatesAction, sellKeenAction } from "@/app/keens/actions";
import type { KeenState } from "@/lib/keens-store";
import type { KeenTop } from "@/app/keens/_data";
import { cn } from "@/lib/utils";
import CoinCounter from "./coin-counter";
import KeenAvatar from "./keen-avatar";
import KeenCard from "./keen-card";
import { Toasts, useToasts } from "./toast";
import { playCoin, playError, playSell } from "./sounds";

type Filter = "alla" | "saknade" | "agda";
type Sort = "pris" | "sallhet" | "namn";

/** Milliseconds until the deals reset — 00:00 UTC, the same instant everywhere. */
function nextDealReset(now = Date.now()): number {
  const d = new Date(now);
  const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return end - now;
}

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MarketClient({ state, top }: { state: KeenState; top: KeenTop[] }) {
  const router = useRouter();
  const { toasts, push, dismiss } = useToasts();
  const [live, setLive] = React.useState(state);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [rarity, setRarity] = React.useState<Rarity | "ALLA">("ALLA");
  const [filter, setFilter] = React.useState<Filter>("alla");
  const [sort, setSort] = React.useState<Sort>("sallhet");
  const [resetIn, setResetIn] = React.useState(() => nextDealReset());

  React.useEffect(() => setLive(state), [state]);

  // The deals expire at midnight UTC; the clock makes that visible.
  React.useEffect(() => {
    const t = setInterval(() => setResetIn(nextDealReset()), 1000);
    return () => clearInterval(t);
  }, []);

  const deals = React.useMemo(() => dailyDeals(dayKey()), []);
  const dealByKeen = React.useMemo(() => new Map(deals.map((d) => [d.keen.id, d])), [deals]);

  const priceOf = React.useCallback((keen: Keen) => dealByKeen.get(keen.id)?.price ?? marketPrice(keen), [dealByKeen]);

  const owned = live.owned;

  const list = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = KEENS.filter((k) => {
      if (rarity !== "ALLA" && k.rarity !== rarity) return false;
      const count = owned[k.id] ?? 0;
      if (filter === "agda" && count <= 0) return false;
      if (filter === "saknade" && count > 0) return false;
      if (needle && !`${k.name} ${k.nameEn} ${k.id}`.toLowerCase().includes(needle)) return false;
      return true;
    });

    const byRarity = (a: Keen, b: Keen) => RARITY_META[b.rarity].order - RARITY_META[a.rarity].order;
    if (sort === "pris") return filtered.sort((a, b) => priceOf(a) - priceOf(b) || byRarity(a, b));
    if (sort === "namn") return filtered.sort((a, b) => a.name.localeCompare(b.name, "sv"));
    return filtered.sort((a, b) => byRarity(a, b) || priceOf(a) - priceOf(b));
  }, [query, rarity, filter, sort, owned, priceOf]);

  async function refresh() {
    const fresh = await getKeenStateAction();
    if (fresh) setLive(fresh);
    router.refresh();
  }

  async function buy(keen: Keen, count = 1) {
    if (busy) return;
    setBusy(`buy-${keen.id}`);
    const res = await buyKeenAction(keen.id, count);
    if (!res.ok) {
      setBusy(null);
      playError();
      push(res.message, "err");
      return;
    }
    playCoin();
    push(`${keen.name} köpt för ${res.price * count} mynt. Du äger ${res.owned} st.`, "ok");
    await refresh();
    setBusy(null);
  }

  async function sell(keen: Keen, count = 1) {
    if (busy) return;
    setBusy(`sell-${keen.id}`);
    const res = await sellKeenAction(keen.id, count);
    if (!res.ok) {
      setBusy(null);
      playError();
      push(res.message, "err");
      return;
    }
    playSell();
    push(`Sålde ${count} × ${keen.name} för ${sellPrice(keen) * count} mynt.`, "ok");
    await refresh();
    setBusy(null);
  }

  async function sellAll() {
    if (busy) return;
    setBusy("sell-all");
    const res = await sellDuplicatesAction();
    if (!res.ok) {
      setBusy(null);
      playError();
      push(res.message, "err");
      return;
    }
    playSell();
    push(`Sålde ${res.sold} dubbletter för ${res.earned} mynt!`, "ok");
    await refresh();
    setBusy(null);
  }

  const affordable = list.filter((k) => (owned[k.id] ?? 0) === 0 && live.coins >= priceOf(k)).length;

  return (
    <div className="space-y-6">
      {/* ── wallet + duplicate cash-out ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-slate-900/50 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
            <Coins className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Din plånbok</p>
            <CoinCounter value={live.coins} className="text-lg text-white" />
          </div>
          <div className="ml-2 hidden border-l border-white/10 pl-4 sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Råd att handla</p>
            <p data-no-translate className="text-sm font-extrabold text-slate-200">
              {affordable} {affordable === 1 ? "Keen" : "Keens"}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={live.dupes === 0 || busy !== null}
          onClick={sellAll}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition-all",
            live.dupes > 0 && !busy
              ? "bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950 shadow-[0_0_26px_-8px_rgba(251,191,36,0.85)] hover:from-amber-300 hover:to-amber-500"
              : "cursor-not-allowed bg-slate-800 text-slate-500"
          )}
        >
          <Tag className="h-4 w-4" />
          {live.dupes > 0 ? `Sälj ${live.dupes} dubbletter` : "Inga dubbletter"}
        </button>
      </div>

      {/* ── today's deals ─────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900/50 to-slate-900/40 p-4 backdrop-blur-xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
            <Flame className="h-5 w-5 text-amber-400 animate-keen-pulse" />
            Dagens deals
            <span data-no-translate className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-extrabold text-amber-200">
              −{DEAL_OFF} %
            </span>
          </h2>
          <span data-no-translate className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Clock className="h-3.5 w-3.5 text-amber-400" /> nya deals om {clock(resetIn)}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {deals.map((deal, i) => {
            const have = owned[deal.keen.id] ?? 0;
            const canBuy = live.coins >= deal.price && !live.coinsFrozen;
            return (
              <div
                key={deal.keen.id}
                className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-950/50 p-3 text-center animate-keen-rise transition-all duration-300 hover:border-amber-400/50 hover:shadow-raise"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />
                <div className="flex flex-col items-center gap-2">
                  <KeenAvatar keen={deal.keen} size={64} locked={have === 0} className={cn("transition-transform duration-300 group-hover:-translate-y-1", have > 0 && RARITY_META[deal.keen.rarity].glow)} />
                  <p className={cn("text-sm font-bold", have > 0 ? "text-white" : "text-slate-400")}>
                    {have > 0 ? deal.keen.name : "???"}
                  </p>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide", RARITY_META[deal.keen.rarity].chip)}>
                    {RARITY_META[deal.keen.rarity].label}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span data-no-translate className="text-xs font-bold text-slate-500 line-through">
                      {marketPrice(deal.keen)}
                    </span>
                    <span data-no-translate className="font-display text-lg font-extrabold text-amber-300">
                      {deal.price} mynt
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!canBuy || busy !== null}
                    onClick={() => buy(deal.keen)}
                    className={cn(
                      "w-full rounded-xl px-3 py-2 text-xs font-extrabold transition-all",
                      canBuy && !busy
                        ? "bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950 hover:from-amber-300 hover:to-amber-500"
                        : "cursor-not-allowed bg-slate-800 text-slate-500"
                    )}
                  >
                    {busy === `buy-${deal.keen.id}` ? "Köper…" : "Köp nu"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── filters ───────────────────────────────────────────────────────── */}
      <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sök i marknaden…"
              className="h-10 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-10 rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
          >
            <option value="sallhet">Sortera: sällsynthet</option>
            <option value="pris">Sortera: lägsta pris</option>
            <option value="namn">Sortera: namn</option>
          </select>
          <div className="flex rounded-xl border border-slate-700/80 bg-slate-950/60 p-1">
            {(
              [
                ["alla", "Alla", Store],
                ["saknade", "Saknade", TrendingDown],
                ["agda", "Ägda", Sparkles],
              ] as [Filter, string, typeof Store][]
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                  filter === id ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setRarity("ALLA")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
              rarity === "ALLA" ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-slate-400 hover:text-white"
            )}
          >
            Alla
          </button>
          {RARITY_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRarity(r)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
                rarity === r ? RARITY_META[r].chip : "border-white/10 text-slate-400 hover:text-white"
              )}
            >
              {RARITY_META[r].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── the shop ──────────────────────────────────────────────────────── */}
      {list.length === 0 ? (
        <p className="rounded-2xl border border-white/5 bg-slate-900/40 px-6 py-12 text-center text-sm text-slate-400">
          Inga Keens matchar filtret.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.map((keen, i) => {
            const have = owned[keen.id] ?? 0;
            const price = priceOf(keen);
            const deal = dealByKeen.get(keen.id);
            const canBuy = live.coins >= price && !live.coinsFrozen;
            return (
              <KeenCard
                key={keen.id}
                keen={keen}
                owned={have}
                index={i}
                badge={
                  deal ? (
                    <span
                      data-no-translate
                      className="absolute -left-1.5 -top-1.5 rounded-full border border-amber-400/50 bg-amber-500 px-1.5 py-px text-[10px] font-extrabold text-amber-950 shadow-raise animate-keen-pulse"
                    >
                      −{deal.off}%
                    </span>
                  ) : undefined
                }
                footer={
                  <div className="mt-1 flex w-full flex-col gap-1.5">
                    <div className="flex items-center justify-center gap-1.5">
                      {deal && (
                        <span data-no-translate className="text-[10px] font-bold text-slate-500 line-through">
                          {marketPrice(keen)}
                        </span>
                      )}
                      <span data-no-translate className={cn("text-xs font-extrabold", deal ? "text-amber-300" : "text-slate-300")}>
                        {price} mynt
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={!canBuy || busy !== null}
                      onClick={() => buy(keen)}
                      className={cn(
                        "rounded-lg px-2 py-1.5 text-[11px] font-extrabold transition-all",
                        canBuy && !busy
                          ? "bg-indigo-500/15 text-indigo-200 ring-1 ring-inset ring-indigo-400/30 hover:bg-indigo-500/30"
                          : "cursor-not-allowed bg-slate-800 text-slate-500"
                      )}
                    >
                      {busy === `buy-${keen.id}` ? "…" : "Köp"}
                    </button>
                    {have > 1 && (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => sell(keen)}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] font-extrabold text-amber-200 transition-colors hover:bg-amber-500/20"
                      >
                        {busy === `sell-${keen.id}` ? "…" : `Sälj (+${sellPrice(keen)})`}
                      </button>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      {/* ── leaderboard ───────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur-xl">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Trophy className="h-3.5 w-3.5 text-amber-400" /> Bästa samlarna
        </h2>
        {top.length === 0 ? (
          <p className="text-sm text-slate-400">Ingen har samlat några Keens än — bli den första!</p>
        ) : (
          <ol className="space-y-1.5">
            {top.map((row, i) => (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2 animate-keen-rise"
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold",
                    i === 0 && "bg-amber-400 text-amber-950",
                    i === 1 && "bg-slate-300 text-slate-900",
                    i === 2 && "bg-amber-700 text-amber-100",
                    i > 2 && "bg-slate-800 text-slate-400"
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{row.username}</span>
                <span data-no-translate className="text-xs font-extrabold text-slate-300">
                  {row.count} <span className="text-slate-500">/ {TOTAL_KEENS}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-[11px] text-slate-500">
          Keens finns i {Object.keys(PACK_BY_ID).length - 1} temapaket plus gratispaketet — ju sällsyntare, desto dyrare.
        </p>
      </section>

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
