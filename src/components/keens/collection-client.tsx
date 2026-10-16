"use client";

import * as React from "react";
import { Coins, Search, Sparkles, Store, Tag } from "lucide-react";
import {
  ADMIN_PACK,
  KEEN_BY_ID,
  OBTAINABLE_KEENS,
  PACK_BY_ID,
  RARITY_META,
  RARITY_ORDER,
  TOTAL_KEENS,
  isGiftKeen,
  isObtainable,
  isTradeable,
  marketPrice,
  rarityChance,
  retiredKeens,
  sellPrice,
  type Keen,
  type Rarity,
} from "@/lib/keens";
import { buyKeenAction, sellDuplicatesAction, sellKeenAction } from "@/app/keens/actions";
import type { KeenState } from "@/lib/keens-store";
import KeenAvatar from "./keen-avatar";
import KeenCard from "./keen-card";
import { Toasts, useToasts } from "./toast";
import { playCoin, playError, playSell } from "./sounds";
import { cn } from "@/lib/utils";

type View = "alla" | "agda" | "saknade";
type Sort = "sallhet" | "namn" | "antal";

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

  const owned = state.owned;
  const distinct = state.distinct;

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
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-center shadow-raise animate-keen-pop"
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

            <dl className="mt-4 space-y-1.5 rounded-2xl border border-white/5 bg-slate-950/50 p-3 text-left text-xs">
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

            <div className="mt-5 flex flex-col gap-2">
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
