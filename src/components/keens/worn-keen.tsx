"use client";

import * as React from "react";
import { KEEN_BY_ID, type Keen } from "@/lib/keens";
import { parseWorn, wornIdFromCookieString } from "@/lib/worn";
import { wearKeenAction } from "@/app/keens/actions";
import KeenAvatar from "./keen-avatar";
import { cn } from "@/lib/utils";

/**
 * Wearing a Keen, from the browser's side.
 *
 * The cookie is the source of truth and the server action is the one that writes
 * it, so this hook never invents a Keen you do not own: it reads the cookie on
 * mount, and updates only from what the action confirmed. Every component on the
 * page that shows your Keen listens to the same event, so putting one on in the
 * collection also changes the header without a reload.
 */
const WORN_EVENT = "quizkeen-worn";

/** The Keen currently worn, and a `wear()` that puts one on (or takes it off). */
export function useWorn() {
  const [keen, setKeen] = React.useState<Keen | null>(null);

  React.useEffect(() => {
    const read = () => setKeen(parseWorn(wornIdFromCookieString(document.cookie)));
    read();
    window.addEventListener(WORN_EVENT, read);
    return () => window.removeEventListener(WORN_EVENT, read);
  }, []);

  const wear = React.useCallback(async (keenId: string | null) => {
    const result = await wearKeenAction(keenId);
    if (result.ok) {
      setKeen(keenId ? KEEN_BY_ID[keenId] ?? null : null);
      window.dispatchEvent(new Event(WORN_EVENT));
    }
    return result;
  }, []);

  return { keen, wear };
}

/** Your worn Keen, drawn — or nothing at all when you are not wearing one. */
export default function WornKeen({
  size = 34,
  className,
  showName = false,
}: {
  size?: number;
  className?: string;
  showName?: boolean;
}) {
  const { keen } = useWorn();
  if (!keen) return null;

  return (
    <span className={cn("inline-flex items-center gap-2", className)} title={`Du bär ${keen.name}`}>
      <KeenAvatar keen={keen} size={size} className="shrink-0" />
      {showName && (
        <span className="text-xs font-bold text-slate-300">
          <span data-no-translate>{keen.name}</span>
        </span>
      )}
    </span>
  );
}
