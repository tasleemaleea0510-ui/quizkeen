import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getKeenView } from "./_data";
import CoinCounter from "@/components/keens/coin-counter";
import KeensTabs from "@/components/keens/keens-tabs";
import { TOTAL_KEENS } from "@/lib/keens";

export default async function KeensLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, state } = await getKeenView();
  if (!user) redirect("/login");
  if (!profile) redirect("/register");

  const distinct = state?.distinct ?? 0;
  const percent = state ? Math.round((distinct / TOTAL_KEENS) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-600/40 to-violet-600/30 text-indigo-200 shadow-glow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
              Keens
            </h1>
            <p className="text-xs text-slate-400">
              Samla {TOTAL_KEENS} figurer · öppna paket · handla i marknaden
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Samling</span>
            <span data-no-translate className="text-sm font-extrabold text-white">
              {distinct}/{TOTAL_KEENS} · {percent} %
            </span>
          </div>
          <div
            className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-200"
            title="Dina mynt"
          >
            <CoinCounter value={state?.coins ?? 0} className="text-base" />
            <span className="text-xs font-semibold text-amber-200/70">mynt</span>
          </div>
        </div>
      </div>

      <KeensTabs
        freeReady={state ? state.freeWaitMs === 0 && !state.dailyBonusDisabled : false}
        dupes={state?.dupes ?? 0}
      />

      <div className="mt-6">{children}</div>

      {state?.coinsFrozen && (
        <p className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200">
          Din myntplånbok är fryst — du kan samla och sälja, men inte köpa paket eller Keens.
        </p>
      )}
    </div>
  );
}
