"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, RotateCw, Check, ArrowRight } from "lucide-react";
import { allDueNow } from "@/lib/srs";

/**
 * What this device knows about your memory.
 *
 * The repetition schedule lives in the browser (see `lib/srs.ts`), so this is
 * the only place that can answer "how many cards are waiting today". It renders
 * nothing until it has read storage, so the server-rendered page and the first
 * client paint agree — no flash of a wrong number.
 */
export default function KnowledgeSummary() {
  const [stats, setStats] = useState<{ due: number; mastered: number; cards: number } | null>(null);

  useEffect(() => {
    const read = () => setStats(allDueNow());
    read();
    // A study session in another tab changes the answer; so does coming back.
    window.addEventListener("focus", read);
    document.addEventListener("visibilitychange", read);
    return () => {
      window.removeEventListener("focus", read);
      document.removeEventListener("visibilitychange", read);
    };
  }, []);

  const due = stats?.due ?? 0;
  const mastered = stats?.mastered ?? 0;
  const cards = stats?.cards ?? 0;

  return (
    <section className="surface p-5">
      <h2 className="section-title flex items-center gap-2">
        <Brain className="h-5 w-5 text-sky-300" /> Minnet
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Repetitionen planeras per enhet: kort du kan kommer tillbaka allt mer sällan.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="surface-flat p-3">
          <p className="stat-label">Att repetera</p>
          <p className="stat-value text-amber-300 tabular" data-no-translate>
            {stats ? due : "–"}
          </p>
        </div>
        <div className="surface-flat p-3">
          <p className="stat-label">Kan det</p>
          <p className="stat-value text-emerald-300 tabular" data-no-translate>
            {stats ? mastered : "–"}
          </p>
        </div>
        <div className="surface-flat p-3">
          <p className="stat-label">I schemat</p>
          <p className="stat-value text-sky-300 tabular" data-no-translate>
            {stats ? cards : "–"}
          </p>
        </div>
      </div>

      {stats && due > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">
          <RotateCw className="h-3.5 w-3.5" />
          {due} kort väntar idag — det tar några minuter.
        </p>
      )}

      {stats && cards > 0 && due === 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">
          <Check className="h-3.5 w-3.5" /> Allt repeterat för idag. Nästa kort kommer imorgon.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/flashcards"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-white hover:border-white/20"
        >
          {due > 0 ? "Repetera nu" : "Öppna gloskort"} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
