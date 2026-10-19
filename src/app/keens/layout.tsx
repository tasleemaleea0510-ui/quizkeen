import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, Sparkles, Tag } from "lucide-react";
import { getKeenView } from "./_data";
import CoinCounter from "@/components/keens/coin-counter";
import KeensTabs from "@/components/keens/keens-tabs";
import KeenAvatar from "@/components/keens/keen-avatar";
import { KEEN_BY_ID, RARITY_META, TOTAL_KEENS, collectorRank, type Keen } from "@/lib/keens";
import { getWornKeen } from "@/lib/worn-server";

/**
 * The Keens shell: who you are as a collector, on every Keens page.
 *
 * The ring, the rank and the trophy shelf are all derived from the collection
 * the request already loaded — nothing extra is asked of the database — and they
 * are here rather than on the collection page on purpose: the badge that says
 * which rank you are is worth seeing while you are buying the pack that might
 * raise it. The three characters floating behind the title are your own rarest
 * finds, so the header looks different for every account.
 */
export default async function KeensLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, state } = await getKeenView();
  if (!user) redirect("/login");
  if (!profile) redirect("/register");

  const distinct = state?.distinct ?? 0;
  const percent = state ? Math.round((distinct / TOTAL_KEENS) * 100) : 0;
  const rank = collectorRank(state?.owned ?? {});
  const worn = await getWornKeen();
  const circumference = 2 * Math.PI * 22;

  const trophies: Keen[] = Object.entries(state?.owned ?? {})
    .flatMap(([id, count]) => (count > 0 && KEEN_BY_ID[id] ? [KEEN_BY_ID[id]] : []))
    .sort((a, b) => RARITY_META[b.rarity].order - RARITY_META[a.rarity].order)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <section className="relative isolate mb-4 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 px-4 py-5 backdrop-blur-xl sm:px-6">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(110% 140% at 6% -20%, rgba(99,102,241,0.32), transparent 55%), radial-gradient(80% 120% at 92% -10%, rgba(217,70,239,0.22), transparent 60%), radial-gradient(80% 120% at 50% 130%, rgba(56,189,248,0.14), transparent 65%)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.07) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(75% 100% at 50% 0%, #000 20%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(75% 100% at 50% 0%, #000 20%, transparent 85%)",
          }}
        />

        {/* your three rarest finds, as wallpaper */}
        <div aria-hidden className="pointer-events-none absolute -right-4 top-1/2 -z-10 flex -translate-y-1/2 items-center gap-1 opacity-[0.13]">
          {trophies.map((keen, i) => (
            <KeenAvatar
              key={keen.id}
              keen={keen}
              size={86 + i * 18}
              className={i === 0 ? "-translate-y-3" : i === 2 ? "translate-y-4" : ""}
            />
          ))}
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/40 to-fuchsia-500/25 text-indigo-100 shadow-glow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">Keens</h1>
              <p className="truncate text-xs text-slate-400">
                Samla {TOTAL_KEENS} figurer · öppna paket · handla i marknaden
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* The collection as a ring: the number in the middle is what you own. */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-950/50 px-3 py-2 backdrop-blur-xl">
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
                  {rank.next && (
                    <span className="font-semibold normal-case tracking-normal text-slate-500">
                      {rank.toNext} poäng kvar
                    </span>
                  )}
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

        {/* the three numbers this account would otherwise have to dig for */}
        <div className="relative mt-4 flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300">
            <Crown className="h-3 w-3 text-amber-400" />
            {rank.rank.label}
            <span data-no-translate className="text-slate-500">{rank.points} p</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300">
            <Tag className="h-3 w-3 text-amber-300" />
            Dubbletter
            <span data-no-translate className="text-slate-500">{state?.dupes ?? 0}</span>
          </span>
          {worn && (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 py-1 pl-1 pr-2.5 text-[11px] font-bold text-emerald-200">
              <KeenAvatar keen={worn} size={20} className="shrink-0" />
              Bär <span className="text-emerald-100">{worn.name}</span>
            </span>
          )}
          <Link
            href="/keens/packs"
            className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-200 transition-colors hover:bg-emerald-500/20"
          >
            <span data-no-translate className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            {state && state.freeWaitMs === 0 && !state.dailyBonusDisabled
              ? "Gratispaket att hämta"
              : "Gratispaketet är öppnat"}
          </Link>
          {rank.next && (
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300">
              Nästa nivå
              <span className="text-indigo-300">{rank.next.label}</span>
            </span>
          )}
        </div>
      </section>

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
        · samla på dig poäng för att klättra från {rank.rank.label} → {rank.next?.label ?? "toppen"}.
      </p>
    </div>
  );
}
