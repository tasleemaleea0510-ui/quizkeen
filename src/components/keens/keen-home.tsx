import * as React from "react";
import Link from "next/link";
import { ArrowRight, Gift, Package, Sparkles, Target } from "lucide-react";
import {
  OBTAINABLE_KEENS,
  RARITY_META,
  RARITY_ORDER,
  SHELF_PACKS,
  packProgress,
  type Rarity,
} from "@/lib/keens";
import type { KeenState } from "@/lib/keens-store";
import { cn } from "@/lib/utils";
import PackArt from "./pack-art";

/**
 * Two pieces of the collection page that make it feel like a place rather than
 * a catalogue: the shelf of packs you can open, and a short list of the next
 * three things worth doing.
 *
 * Both are derived from state the page already loaded — no extra queries, and
 * nothing is stored, so the labels can never go stale or claim a reward that
 * does not exist.
 */

export function PackRail({ owned }: { owned: Record<string, number> }) {
  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
          <Package className="h-4 w-4 text-indigo-300" /> Pakethyllan
        </h2>
        <Link href="/keens/packs" className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-300 hover:text-indigo-200">
          Öppna paket <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="keen-scroll -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {SHELF_PACKS.map((pack) => {
          const progress = packProgress(owned, pack.id);
          const complete = progress.total > 0 && progress.have === progress.total;
          return (
            <Link
              key={pack.id}
              href="/keens/packs"
              className="group relative w-[9.75rem] shrink-0 snap-start rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/30 hover:shadow-raise"
            >
              <PackArt
                pack={pack}
                className="h-24 w-full rounded-xl transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <p className="mt-2 truncate font-display text-sm font-extrabold text-white">{pack.name}</p>
              <div className="mt-1 flex items-center justify-between text-[10px] font-bold">
                <span className="text-slate-500">I samlingen</span>
                <span data-no-translate className={cn("tabular-nums", complete ? "text-emerald-300" : "text-slate-300")}>
                  {progress.have}/{progress.total}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${progress.percent}%`,
                    background: `linear-gradient(90deg, hsl(${pack.hue} 85% 60%), hsl(${(pack.hue + 50) % 360} 85% 65%))`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-px text-[10px] font-extrabold text-amber-200">
                  {pack.price} mynt
                </span>
                <span className="text-[10px] font-bold text-indigo-300 opacity-0 transition-opacity group-hover:opacity-100">
                  Öppna →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

type Step = {
  key: string;
  kicker: string;
  title: string;
  detail: string;
  cta: string;
  href: string;
  percent: number;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

export function NextSteps({ state }: { state: KeenState }) {
  const steps: Step[] = [];

  // 1. The free pack is the cheapest thing to do every day.
  const freeReady = state.freeWaitMs === 0 && !state.dailyBonusDisabled;
  steps.push({
    key: "free",
    kicker: "Varje dag",
    title: freeReady ? "Gratispaketet väntar" : "Gratispaketet är öppnat",
    detail: freeReady ? "Ett paket på huset — ta det innan midnatt." : "Kom tillbaka imorgon för nästa.",
    cta: freeReady ? "Öppna gratis" : "Till paketen",
    href: "/keens/packs",
    percent: freeReady ? 100 : 0,
    color: "#34d399",
    icon: Gift,
  });

  // 2. The pack closest to complete: a finish line you can actually see.
  const nearest = SHELF_PACKS.map((p) => ({ pack: p, ...packProgress(state.owned, p.id) }))
    .filter((row) => row.total > 0 && row.have < row.total)
    .sort((a, b) => b.percent - a.percent || b.have - a.have)[0];
  if (nearest) {
    steps.push({
      key: "pack",
      kicker: "Närmast klart",
      title: `Fyll ${nearest.pack.name}`,
      detail: `${nearest.have}/${nearest.total} hittade — ${nearest.total - nearest.have} kvar.`,
      cta: "Öppna paket",
      href: "/keens/packs",
      percent: nearest.percent,
      color: `hsl(${nearest.pack.hue} 85% 65%)`,
      icon: Target,
    });
  }

  // 3. The rarest tier you are still missing a single Keen from.
  const rarestMissing = [...RARITY_ORDER]
    .reverse()
    .find((r) => OBTAINABLE_KEENS.some((k) => k.rarity === r && (state.owned[k.id] ?? 0) === 0)) as
    | Rarity
    | undefined;
  if (rarestMissing) {
    const all = OBTAINABLE_KEENS.filter((k) => k.rarity === rarestMissing);
    const have = all.filter((k) => (state.owned[k.id] ?? 0) > 0).length;
    steps.push({
      key: "rare",
      kicker: "Sällsynthetsjakt",
      title: `Hitta: ${RARITY_META[rarestMissing].label.toLowerCase()}`,
      detail: `${have}/${all.length} i den nivån.`,
      cta: "Till marknaden",
      href: "/keens/market",
      percent: Math.round((have / Math.max(1, all.length)) * 100),
      color: RARITY_META[rarestMissing].from,
      icon: Sparkles,
    });
  }

  if (!steps.length) {
    return (
      <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
        Allt är gjort för idag — samlingen är komplett. Njut.
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold text-white">
        <Sparkles className="h-4 w-4 text-fuchsia-300" /> Nästa steg
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.slice(0, 3).map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.key}
              href={step.href}
              className="group relative isolate overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-raise"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 opacity-40 transition-opacity group-hover:opacity-70"
                style={{ background: `radial-gradient(120% 100% at 100% 0%, ${step.color}26, transparent 62%)` }}
              />
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{step.kicker}</span>
                <Icon className="h-3.5 w-3.5" style={{ color: step.color }} />
              </div>
              <p className="mt-1 text-sm font-bold leading-snug text-white">{step.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{step.detail}</p>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.max(4, Math.min(100, step.percent))}%`, background: step.color }}
                />
              </div>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-300">
                {step.cta} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
