"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Clock, Coins, Crown, Flame, Package, Search, Shirt, Sparkles, Store, Tag, Trophy } from "lucide-react";
import {
  ADMIN_PACK,
  KEEN_BY_ID,
  OBTAINABLE_KEENS,
  PACK_BY_ID,
  RARITY_META,
  RARITY_ORDER,
  RANKS,
  SHELF_PACKS,
  TOTAL_KEENS,
  collectorRank,
  dayKey,
  dailyDeals,
  keenBio,
  keenOfTheDay,
  isGiftKeen,
  isObtainable,
  isStarterKeen,
  isTradeable,
  marketPrice,
  packProgress,
  rarityChance,
  rarityOdds,
  retiredKeens,
  sellPrice,
  type Keen,
  type Rarity,
} from "@/lib/keens";
import { buyKeenAction, sellDuplicatesAction, sellKeenAction } from "@/app/keens/actions";
import type { KeenState } from "@/lib/keens-store";
import KeenAvatar from "./keen-avatar";
import KeenCard from "./keen-card";
import { NextSteps, PackRail } from "./keen-home";
import { useWorn } from "./worn-keen";
import { Toasts, useToasts } from "./toast";
import { playCoin, playError, playSell } from "./sounds";
import { cn } from "@/lib/utils";

type View = "alla" | "agda" | "saknade";
type Sort = "sallhet" | "namn" | "antal";

/** Milliseconds until the spotlight and the deals roll over — midnight UTC. */
function msToMidnightUtc(now: number = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now;
}

function hhmmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CollectionClient({ state }: { state: KeenState }) {
  const { toasts, push, dismiss } = useToasts();
  const [rarity, setRarity] = React.useState<Rarity | "ALLA">("ALLA");
  const [pack, setPack] = React.useState<Keen["pack"] | "ALLA">("ALLA");
  const [view, setView] = React.useState<View>("alla");
  const [sort, setSort] = React.useState<Sort>("sallhet");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Keen | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  // The Keen on your back: shown in the grid, set from the detail card, and read
  // by every other screen in the app.
  const { keen: worn, wear } = useWorn();
  const [wearing, setWearing] = React.useState(false);

  const owned = state.owned;
  const distinct = state.distinct;

  // ── the daily spotlight ────────────────────────────────────────────────────
  // The same Keen for everyone until midnight UTC, with a clock so you can watch
  // the next one arrive. It is a pure function of the date, so the server and the
  // browser already agree on who it is — only the countdown is client-side.
  // Started from `null` and filled in on mount: reading the clock during render
  // would make the server's second and the browser's second disagree, and React
  // reacts to that by throwing the server HTML away.
  const [rollIn, setRollIn] = React.useState<number | null>(null);
  React.useEffect(() => {
    setRollIn(msToMidnightUtc());
    const t = setInterval(() => setRollIn(msToMidnightUtc()), 1000);
    return () => clearInterval(t);
  }, []);
  const today = dayKey();
  const spotlight = React.useMemo(() => keenOfTheDay(today), [today]);
  const spotlightDeal = React.useMemo(() => dailyDeals(today).find((d) => d.keen.id === spotlight?.id) ?? null, [today, spotlight]);

  // ── rank and the pack you are closest to finishing ─────────────────────────
  const rank = React.useMemo(() => collectorRank(owned), [owned]);
  const nearest = React.useMemo(() => {
    return SHELF_PACKS.map((p) => ({ pack: p, ...packProgress(owned, p.id) }))
      .filter((row) => row.total > 0 && row.have < row.total)
      .sort((a, b) => b.percent - a.percent || b.have - a.have)[0] ?? null;
  }, [owned]);

  /**
   * What this page shows: every Keen a player can still get, plus the ones they
   * own from a pack that has left the shelf — something you were given must never
   * quietly vanish from your showcase. Only the obtainable ones count towards the
   * total, so a retired Keen can never push a collection past 100 %.
   */
  const collection = React.useMemo(() => [...OBTAINABLE_KEENS, ...retiredKeens(owned)], [owned]);

  // Only the packs this collection actually spans: a dropdown of retired themes
  // you own nothing from is just noise.
  const packOptions = React.useMemo(() => {
    const ids = Array.from(new Set(collection.map((k) => k.pack)));
    return ids.map((id) => {
      const theme = PACK_BY_ID[id];
      if (!theme) return { id, label: id === ADMIN_PACK ? "Admin-gåva" : id };
      return { id, label: theme.hidden ? `${theme.name} (utgången)` : theme.name };
    });
  }, [collection]);

  const list = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = collection.filter((k) => {
      if (rarity !== "ALLA" && k.rarity !== rarity) return false;
      if (pack !== "ALLA" && k.pack !== pack) return false;
      const count = owned[k.id] ?? 0;
      if (view === "agda" && count <= 0) return false;
      if (view === "saknade" && count > 0) return false;
      if (needle && !`${k.name} ${k.nameEn} ${k.id}`.toLowerCase().includes(needle)) return false;
      return true;
    });

    const byRarity = (a: Keen, b: Keen) => RARITY_META[b.rarity].order - RARITY_META[a.rarity].order;
    if (sort === "namn") return filtered.sort((a, b) => a.name.localeCompare(b.name, "sv"));
    if (sort === "antal") return filtered.sort((a, b) => (owned[b.id] ?? 0) - (owned[a.id] ?? 0) || byRarity(a, b));      return filtered.sort((a, b) => byRarity(a, b) || a.name.localeCompare(b.name, "sv"));
  }, [collection, rarity, pack, view, sort, query, owned]);

  const percent = Math.round((distinct / TOTAL_KEENS) * 100);

  // A given-away Keen (the Admin Keen) has no shelf and no price, so the detail
  // card asks the catalogue instead of assuming a pack exists behind every Keen.
  const selectedGift = selected ? isGiftKeen(selected) : false;
  const selectedPack = selected ? PACK_BY_ID[selected.pack] : undefined;
  const selectedTradeable = selected ? isTradeable(selected) : false;
  // ``Owned but no longer obtainable`` — its pack left the shelf.
  const selectedRetired = selected ? !isObtainable(selected) : false;
  const selectedOwned = selected ? owned[selected.id] ?? 0 : 0;
  const selectedBio = selected ? keenBio(selected) : "";
  // Everything else on the same shelf, so the detail card is a place to browse
  // from rather than a dead end you have to close to keep looking.
  const selectedSiblings = React.useMemo(() => {
    if (!selected || selectedGift) return [];
    return OBTAINABLE_KEENS.filter((k) => k.pack === selected.pack && k.id !== selected.id).sort(
      (a, b) => RARITY_META[a.rarity].order - RARITY_META[b.rarity].order || a.name.localeCompare(b.name, "sv")
    );
  }, [selected, selectedGift]);
  const selectedOdds = selectedPack ? rarityOdds(selectedPack.id) : [];

  async function sellAll() {
    setBusy(true);
    const res = await sellDuplicatesAction();
    setBusy(false);
    if (!res.ok) {
      playError();
      push(res.message, "err");
      return;
    }
    playSell();
    push(`Sålde ${res.sold} dubbletter för ${res.earned} mynt!`, "ok");
  }

  async function buy(keen: Keen) {
    setBusy(true);
    const res = await buyKeenAction(keen.id, 1);
    setBusy(false);
    if (!res.ok) {
      playError();
      push(res.message, "err");
      return;
    }
    playCoin();
    push(`${keen.name} tillagd i samlingen!`, "ok");
  }

  async function toggleWear(keen: Keen) {
    if (wearing) return;
    setWearing(true);
    const res = await wear(worn?.id === keen.id ? null : keen.id);
    setWearing(false);
    if (!res.ok) {
      playError();
      push(res.message, "err");
      return;
    }
    if (res.keenId) push(`${keen.name} är på dig nu — syns i quiz och gloskort!`, "ok");
    else push("Du tog av dig Keen.", "ok");
  }

  async function sellOne(keen: Keen) {
    setBusy(true);
    const res = await sellKeenAction(keen.id, 1);
    setBusy(false);
    if (!res.ok) {
      playError();
      push(res.message, "err");
      return;
    }
    playSell();
    push(`Sålde en ${keen.name} för ${sellPrice(keen)} mynt.`, "ok");
    if ((owned[keen.id] ?? 0) <= 1) setSelected(null);
  }

  return (
    <div className="space-y-6">
      {/* ── vem du är just nu ──────────────────────────────────────────────── */}
      {worn && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
          <KeenAvatar keen={worn} size={44} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">Keenen du bär</p>
            <p className="truncate text-sm font-bold text-white">{worn.name}</p>
          </div>
          <button
            type="button"
            disabled={wearing}
            onClick={() => toggleWear(worn)}
            className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:border-slate-500 disabled:opacity-50"
          >
            Ta av
          </button>
        </div>
      )}

      {/* ── dagens Keen ──────────────────────────────────────────────────── */}
      {spotlight && (
        <Spotlight
          keen={spotlight}
          owned={owned[spotlight.id] ?? 0}
          dealPrice={spotlightDeal?.price ?? null}
          rollIn={rollIn}
          busy={busy}
          onBuy={() => buy(spotlight)}
          onOpen={() => setSelected(spotlight)}
        />
      )}

      {/* ── three things worth doing next ────────────────────────────────── */}
      <NextSteps state={state} />

      {/* ── the shelf, as a rail of foil bags ────────────────────────────── */}
      <PackRail owned={owned} />

      {/* ── collector rank ───────────────────────────────────────────────── */}
      <RankTrack rank={rank} />

      {/* ── progress ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-4 backdrop-blur-xl sm:col-span-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Samlade Keens</p>
              <p data-no-translate className="font-display text-2xl font-extrabold text-white">
                {distinct} <span className="text-slate-500">/ {TOTAL_KEENS}</span>
              </p>
            </div>
            <span data-no-translate className="font-display text-2xl font-extrabold text-gradient">
              {percent} %
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400 transition-[width] duration-700 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {TOTAL_KEENS - distinct > 0 ? `${TOTAL_KEENS - distinct} Keens kvar att hitta` : "Du har samlat alla! 🎉"}
            {state.dupes > 0 && ` · ${state.dupes} dubbletter att sälja`}
          </p>

          {/* The pack you are closest to finishing: the shortest path to a
              complete set, said out loud instead of left as homework. */}
          {nearest && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2">
              <span className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                <Package className="h-3.5 w-3.5 text-indigo-300" />
                Närmast komplett: {nearest.pack.emoji} {nearest.pack.name}
                <span data-no-translate className="text-slate-500">
                  {nearest.have}/{nearest.total}
                </span>
              </span>
              <Link
                href="/keens/packs"
                className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-300 hover:text-indigo-200"
              >
                Öppna paket <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-white/5 bg-slate-900/50 p-4 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dubbletter</p>
            <p data-no-translate className="font-display text-2xl font-extrabold text-amber-300">
              {state.dupes}
            </p>
          </div>
          <button
            type="button"
            disabled={busy || pending || state.dupes === 0}
            onClick={sellAll}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
              state.dupes > 0 && !busy
                ? "bg-gradient-to-b from-amber-500 to-amber-600 text-slate-950 shadow-glow-sm hover:from-amber-400 hover:to-amber-500"
                : "cursor-not-allowed bg-slate-800 text-slate-500"
            )}
          >
            <Tag className="h-4 w-4" />
            Sälj alla dubbletter
          </button>
        </div>
      </div>

      {/* ── filters ──────────────────────────────────────────────────────── */}
      <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sök Keen…"
              className="h-10 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <select
            value={pack}
            onChange={(e) => setPack(e.target.value as Keen["pack"] | "ALLA")}
            className="h-10 rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
          >
            <option value="ALLA">Alla paket</option>
            {packOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-10 rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
          >
            <option value="sallhet">Sortera: sällsynthet</option>
            <option value="namn">Sortera: namn</option>
            <option value="antal">Sortera: antal</option>
          </select>
          <div className="flex rounded-xl border border-slate-700/80 bg-slate-950/60 p-1">
            {([
              ["alla", "Alla"],
              ["agda", "Ägda"],
              ["saknade", "Saknade"],
            ] as [View, string][]).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                  view === id ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                )}
              >
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
          {RARITY_ORDER.filter((r) => collection.some((k) => k.rarity === r)).map((r) => {
            const meta = RARITY_META[r];
            const total = collection.filter((k) => k.rarity === r).length;
            const have = collection.filter((k) => k.rarity === r && (owned[k.id] ?? 0) > 0).length;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRarity(r)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
                  rarity === r ? meta.chip : "border-white/10 text-slate-400 hover:text-white"
                )}
              >
                {meta.label} <span data-no-translate>{have}/{total}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── grid ─────────────────────────────────────────────────────────── */}
      {list.length === 0 ? (
        <p className="rounded-2xl border border-white/5 bg-slate-900/40 px-6 py-12 text-center text-sm text-slate-400">
          Inga Keens matchar filtret.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.map((k, i) => (
            <KeenCard
              key={k.id}
              keen={k}
              owned={owned[k.id] ?? 0}
              index={i}
              badge={
                isObtainable(k) ? undefined : (
                  <span className="absolute -right-1.5 -top-1.5 rounded-full border border-slate-500/40 bg-slate-950/90 px-1.5 py-px text-[9px] font-extrabold text-slate-300">
                    Utgången
                  </span>
                )
              }
              worn={worn?.id === k.id}
              onSelect={() => setSelected(k)}
            />
          ))}
        </div>
      )}

      {/* ── recent pulls ─────────────────────────────────────────────────── */}
      {state.recent.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur-xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Sparkles className="h-3.5 w-3.5" /> Senaste öppningar
          </p>
          <div className="keen-scroll flex gap-2 overflow-x-auto pb-1">
            {state.recent.map((r, i) => {
              const keen = KEEN_BY_ID[r.keenId];
              if (!keen) return null;
              return (
                <div
                  key={`${r.keenId}-${i}`}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-white/5 bg-slate-950/50 px-2.5 py-1.5"
                  title={`${keen.name} · ${RARITY_META[keen.rarity].label}${r.refund ? ` · +${r.refund} mynt` : ""}`}
                >
                  <KeenAvatar keen={keen} size={30} />
                  <div className="leading-tight">
                    <p className="max-w-[7.5rem] truncate text-[11px] font-bold text-white">{keen.name}</p>
                    <p className={cn("text-[9px] font-bold uppercase", RARITY_META[keen.rarity].text)}>
                      {r.packId === "marknad"
                        ? r.refund
                          ? `Såld +${r.refund}`
                          : "Marknad"
                        : r.packId === "gava"
                          ? "Admin-gåva"
                          : PACK_BY_ID[r.packId]?.name ?? r.packId}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── detail modal ─────────────────────────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-[65] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-md animate-keen-fade"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="keen-scroll max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-center shadow-raise animate-keen-pop"
          >
            <div className="flex justify-center">
              <KeenAvatar
                keen={selected}
                size={140}
                locked={(owned[selected.id] ?? 0) === 0}
                className={cn((owned[selected.id] ?? 0) > 0 && RARITY_META[selected.rarity].glow)}
              />
            </div>
            <h3
              className={cn(
                "mt-4 font-display text-2xl font-extrabold",
                selected.rarity === "KROMA" ? "keen-chroma-text animate-keen-pan" : "text-white"
              )}
            >
              {(owned[selected.id] ?? 0) === 0 ? (selectedGift ? "Inte utdelad än" : "Inte hittad än") : selected.name}
            </h3>
            <span
              className={cn(
                "mt-2 inline-block rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider",
                RARITY_META[selected.rarity].chip
              )}
            >
              {RARITY_META[selected.rarity].label}
            </span>

            {/* The character's one line. Owned reads it; a locked one stays a
                mystery, because that is half of what you are collecting. */}
            {selectedBio && (
              <p
                className={cn(
                  "mt-3 rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2 text-xs leading-snug",
                  selectedOwned > 0 ? "italic text-slate-300" : "text-slate-500"
                )}
              >
                {selectedOwned > 0 ? `“${selectedBio}”` : "Historien låses upp när du hittar den."}
              </p>
            )}

            <dl className="mt-3 space-y-1.5 rounded-2xl border border-white/5 bg-slate-950/50 p-3 text-left text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-400">Paket</dt>
                <dd className="font-semibold text-slate-200">
                  {selectedGift
                    ? "Admin-gåva"
                    : `${selectedPack?.emoji ?? ""} ${selectedPack?.name ?? "—"}${selectedRetired ? " (utgången)" : ""}`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Chans i paketet</dt>
                <dd data-no-translate className="font-semibold text-slate-200">
                  {selectedGift
                    ? "Delas ut"
                    : selectedRetired || !selectedPack
                      ? "Paketet är utgånget"
                      : `${String(rarityChance(selectedPack.id, selected.rarity)).replace(".", ",")} %`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Du äger</dt>
                <dd data-no-translate className="font-semibold text-slate-200">
                  {owned[selected.id] ?? 0} st
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Marknadspris</dt>
                <dd data-no-translate className="font-semibold text-amber-300">
                  {selectedTradeable ? `${marketPrice(selected)} mynt` : "Går inte att köpa"}
                </dd>
              </div>
            </dl>

            {selected.rarity === "KROMA" && (
              <p className="mt-3 text-[11px] text-slate-400">
                Kroma-Keens finns bara i Mytiskapaketet — eller i marknaden.
              </p>
            )}

            {selectedRetired && (
              <p className="mt-3 text-[11px] text-slate-400">
                Den här Keen kommer från ett paket som inte är till salu längre, så den går bara att sälja — den syns
                kvar i samlingen för att du redan har den.
              </p>
            )}

            {selectedGift && (
              <p className="mt-3 text-[11px] text-slate-400">
                Den här Keen finns inte i något paket. Bara en admin i QuizKeen Command kan dela ut den, och då hamnar
                den direkt i samlingen — den går aldrig att köpa eller sälja.
              </p>
            )}

            {selected && isStarterKeen(selected) && (
              <p className="mt-3 text-[11px] text-slate-400">
                Den här får alla från dag ett. Den kan inte köpas, säljas eller tappas — men den kan bäras, och då syns
                den i quizen, lobbyn och på gloskorten.
              </p>
            )}

            {/* What the pack actually rolls, with this Keen's own tier marked. */}
            {!selectedGift && selectedOdds.length > 0 && (
              <div className="mt-3 text-left">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {selectedPack?.emoji} {selectedPack?.name} — vad paketet kan ge
                </p>
                <ul className="space-y-1">
                  {selectedOdds.map(({ rarity, chance }) => {
                    const isMine = rarity === selected.rarity;
                    return (
                      <li key={rarity} className="flex items-center gap-2">
                        <span
                          className="h-1.5 rounded-full"
                          style={{ width: `${Math.max(2, chance)}%`, background: RARITY_META[rarity].from }}
                        />
                        <span
                          className={cn(
                            "flex-1 text-[10px] font-bold",
                            isMine ? RARITY_META[rarity].text : "text-slate-500"
                          )}
                        >
                          {RARITY_META[rarity].label}
                        </span>
                        <span data-no-translate className={cn("text-[10px] font-extrabold", isMine ? "text-white" : "text-slate-500")}>
                          {String(chance).replace(".", ",")} %
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* The rest of the same shelf — tap one to keep browsing. */}
            {selectedSiblings.length > 0 && (
              <div className="mt-4 text-left">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Fler från samma paket
                </p>
                <div className="keen-scroll flex gap-1.5 overflow-x-auto pb-1">
                  {selectedSiblings.map((k) => {
                    const have = (owned[k.id] ?? 0) > 0;
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setSelected(k)}
                        title={have ? k.name : "Inte hittad än"}
                        className={cn(
                          "shrink-0 rounded-xl border p-1 transition-colors",
                          have ? RARITY_META[k.rarity].ring : "border-white/5",
                          "hover:border-white/40"
                        )}
                      >
                        <KeenAvatar keen={k} size={38} locked={!have} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              {selectedOwned > 0 &&
                (worn?.id === selected.id ? (
                  <button
                    type="button"
                    disabled={wearing}
                    onClick={() => toggleWear(selected)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    <Shirt className="h-4 w-4" />
                    Du bär den här — ta av
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={wearing}
                    onClick={() => toggleWear(selected)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-4 py-2.5 text-sm font-bold text-fuchsia-200 transition-colors hover:bg-fuchsia-500/25 disabled:opacity-50"
                  >
                    <Shirt className="h-4 w-4" />
                    Bär den här Keen
                  </button>
                ))}
              {selectedTradeable && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => buy(selected)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-glow-sm transition-all hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-50"
                >
                  <Store className="h-4 w-4" />
                  Köp för {marketPrice(selected)} mynt
                </button>
              )}
              {selectedTradeable && (owned[selected.id] ?? 0) > 1 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => sellOne(selected)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-200 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                >
                  <Coins className="h-4 w-4" />
                  Sälj en dubblett (+{sellPrice(selected)})
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

/**
 * Today's Keen.
 *
 * One character, chosen by the date, with a clock until the next one — a reason
 * to open the app tomorrow, and a reason to read about a Keen you would never
 * otherwise look twice at. It shows the character even when you do not own it:
 * a spotlight you cannot see is not a spotlight.
 */
function Spotlight({
  keen,
  owned,
  dealPrice,
  rollIn,
  busy,
  onBuy,
  onOpen,
}: {
  keen: Keen;
  owned: number;
  dealPrice: number | null;
  rollIn: number | null;
  busy: boolean;
  onBuy: () => void;
  onOpen: () => void;
}) {
  const meta = RARITY_META[keen.rarity];
  const pack = PACK_BY_ID[keen.pack];
  const chance = pack ? rarityChance(pack.id, keen.rarity) : 0;
  const price = dealPrice ?? marketPrice(keen);
  const have = owned > 0;
  const tradeable = isTradeable(keen);
  const bio = keenBio(keen);

  return (
    <section
      className={cn("relative isolate overflow-hidden rounded-3xl border p-5 backdrop-blur-xl", meta.ring)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: `radial-gradient(120% 110% at 88% 0%, ${meta.from}33, transparent 60%)` }}
      />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-4">
          <KeenAvatar keen={keen} size={128} className={cn(have && meta.glow)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">
              <Sparkles className="h-3.5 w-3.5" /> Dagens Keen
            </span>
            <span
              data-no-translate
              className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[10px] font-bold text-slate-400"
              title="Dagens Keen byts vid midnatt UTC"
            >
              <Clock className="h-3 w-3 text-fuchsia-300" />
              byts om {rollIn === null ? "--:--:--" : hhmmss(rollIn)}
            </span>
            {dealPrice !== null && (
              <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-200">
                <Flame className="h-3 w-3 animate-keen-pulse" /> Dagens deal
              </span>
            )}
          </div>

          <h2
            className={cn(
              "mt-1.5 font-display text-2xl font-extrabold tracking-tight",
              keen.rarity === "KROMA" ? "keen-chroma-text animate-keen-pan" : "text-white"
            )}
          >
            {keen.name}
          </h2>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider", meta.chip)}>
              {meta.label}
            </span>
            {pack && (
              <span className="text-[11px] font-bold text-slate-400">
                {pack.emoji} {pack.name}
                {chance > 0 && <span data-no-translate> · {String(chance).replace(".", ",")} % chans</span>}
              </span>
            )}
          </div>

          {bio && (
            <p className={cn("mt-2 text-sm leading-snug", have ? "italic text-slate-300" : "text-slate-400")}>
              “{bio}”
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {have ? (
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-extrabold text-emerald-300">
                ✓ I din samling{owned > 1 && ` · ${owned} st`}
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[11px] font-extrabold text-slate-300">
                Du har den inte än
              </span>
            )}

            {tradeable && (
              <button
                type="button"
                disabled={busy}
                onClick={onBuy}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-600 px-3.5 py-1.5 text-[11px] font-extrabold text-white shadow-glow-sm transition-all hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-50"
              >
                <Store className="h-3.5 w-3.5" />
                Köp för {price} mynt
              </button>
            )}
            <button
              type="button"
              onClick={onOpen}
              className="rounded-full border border-slate-700 px-3.5 py-1.5 text-[11px] font-bold text-slate-300 transition-colors hover:border-slate-500"
            >
              Visa detaljer
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The collector ladder.
 *
 * A collection is a number, but a rank is a goal: the rows ahead of you are
 * visible, so "Mästare" is something to reach for rather than a label you
 * discover. Points are derived from what you own — nothing here is stored.
 */
function RankTrack({ rank }: { rank: ReturnType<typeof collectorRank> }) {
  return (
    <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <Trophy className="h-3.5 w-3.5 text-amber-400" /> Samlarnivå
          </p>
          <p className="font-display text-xl font-extrabold text-white">{rank.rank.label}</p>
        </div>
        <p data-no-translate className="text-xs font-bold text-slate-400">
          {rank.points} poäng
          {rank.next && <span className="text-slate-500"> · {rank.toNext} till {rank.next.label}</span>}
        </p>
      </div>

      <ol className="mt-3 flex flex-wrap gap-1.5">
        {RANKS.map((row, i) => {
          const done = i <= rank.index;
          const current = i === rank.index;
          return (
            <li
              key={row.label}
              data-no-translate
              title={`${row.points} poäng`}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold transition-colors",
                current && "border-amber-400/60 bg-amber-500/15 text-amber-200 shadow-glow-sm",
                !current && done && "border-indigo-400/30 bg-indigo-500/10 text-indigo-200",
                !done && "border-white/5 text-slate-600"
              )}
            >
              {done ? <Crown className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              {row.label}
            </li>
          );
        })}
      </ol>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-400 to-indigo-400 transition-[width] duration-700 ease-out"
          style={{ width: `${Math.round(rank.progress * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Varje Keen ger poäng efter sällsynthet — en Vanlig 1, en Mystisk 8. Det är de sällsynta som lyfter nivån.
      </p>
    </section>
  );
}
