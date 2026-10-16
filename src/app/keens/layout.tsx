import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getKeenView } from "./_data";
import CoinCounter from "@/components/keens/coin-counter";
import KeensTabs from "@/components/keens/keens-tabs";
import { TOTAL_KEENS, collectorRank } from "@/lib/keens";

/**
 * The Keens shell: who you are as a collector, on every Keens page.
 *
 * The ring and the rank are both derived from the collection the request already
 * loaded — nothing extra is asked of the database — and they are here rather than
 * on the collection page on purpose: the badge that says which rank you are is
 * worth seeing while you are buying the pack that might raise it.
 */
export default async function KeensLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, state } = await getKeenView();
  if (!user) redirect("/login");
  if (!profile) redirect("/register");

  const distinct = state?.distinct ?? 0;
  const percent = state ? Math.round((distinct / TOTAL_KEENS) * 100) : 0;
  const rank = collectorRank(state?.owned ?? {});
  const circumference = 2 * Math.PI * 22;

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
          {/* The collection as a ring: the number in the middle is what you own. */}
          <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-900/50 px-3 py-2 backdrop-blur-xl">
            <div className="relative grid h-14 w-14 place-items-center">
              <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
                <defs>
                  <linearGradient id="keen-ring" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="55%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="6" />
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  fill="none"
                  stroke="url(#keen-ring)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - Math.min(1, percent / 100))}
                />
              </svg>
              <span data-no-translate className="absolute font-display text-xs font-extrabold text-white">
                {percent}%
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Samling</span>
              <span data-no-translate className="text-sm font-extrabold text-white">
                {distinct}/{TOTAL_KEENS}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                {rank.rank.label}
                {rank.next && <span className="font-semibold normal-case tracking-normal text-slate-500">{rank.toNext} poäng kvar</span>}
              </span>
            </div>
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

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-[11px] text-slate-500">
        <Link href="/keens/packs" className="font-semibold text-indigo-300 hover:text-indigo-200">
          Öppna ett paket
        </Link>
        · samla på dig poäng för att klättra från {rank.rank.label} till {rank.next?.label ?? "toppen"}.
      </p>
    </div>
  );
}
