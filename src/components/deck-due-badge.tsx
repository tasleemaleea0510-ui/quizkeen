"use client";

import { useEffect, useState } from "react";
import { RotateCw, Check } from "lucide-react";
import { deckStats, loadDeck } from "@/lib/srs";

/**
 * "12 att repetera" on a deck in the list.
 *
 * The schedule lives in the browser, so the list cannot be rendered with this
 * number on the server — it appears a moment after the first paint instead of
 * being wrong in the HTML.
 */
export default function DeckDueBadge({ collectionId, cardIds }: { collectionId: string; cardIds: string[] }) {
  const [due, setDue] = useState<number | null>(null);

  useEffect(() => {
    const read = () => {
      const stats = deckStats(cardIds, loadDeck(collectionId));
      setDue(stats.dueNow);
    };
    read();
    window.addEventListener("focus", read);
    return () => window.removeEventListener("focus", read);
  }, [collectionId, cardIds]);

  if (due === null || due === 0) {
    return due === 0 ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
        <Check className="h-3 w-3" /> Klart idag
      </span>
    ) : null;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">
      <RotateCw className="h-3 w-3" /> {due} att repetera
    </span>
  );
}
