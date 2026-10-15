"use client";

import { useEffect, useRef, useState } from "react";
import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A coin balance that counts to its new value instead of jumping.
 *
 * The number on screen is its own state, tweened from the previous value, so a
 * pack purchase visibly drains the wallet and a duplicate payout visibly fills
 * it. The signed difference floats away above the number.
 */
export default function CoinCounter({
  value,
  className,
  iconClass,
  showIcon = true,
  label,
}: {
  value: number;
  className?: string;
  iconClass?: string;
  showIcon?: boolean;
  label?: string;
}) {
  const [shown, setShown] = useState(value);
  const [delta, setDelta] = useState(0);
  const previous = useRef(value);
  const frame = useRef<number>();

  useEffect(() => {
    const from = previous.current;
    const to = value;
    if (from === to) return;
    previous.current = to;
    setDelta(to - from);

    const reduce =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(to);
    } else {
      const started = performance.now();
      const duration = 620;
      const tick = (now: number) => {
        const p = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(from + (to - from) * eased));
        if (p < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    }

    const fade = setTimeout(() => setDelta(0), 1600);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      clearTimeout(fade);
    };
  }, [value]);

  return (
    <span className={cn("relative inline-flex items-center gap-1.5", className)}>
      {showIcon && <Coins className={cn("h-4 w-4 text-amber-400", iconClass)} />}
      <span key={delta} className={cn("font-display font-extrabold tabular-nums", delta !== 0 && "animate-keen-tick")}>
        {shown.toLocaleString("sv-SE")}
      </span>
      {label && <span className="text-xs font-semibold text-slate-400">{label}</span>}
      {delta !== 0 && (
        <span
          data-no-translate
          className={cn(
            "pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-extrabold",
            delta > 0 ? "text-emerald-400" : "text-red-400",
            "animate-keen-float-up"
          )}
        >
          {delta > 0 ? `+${delta.toLocaleString("sv-SE")}` : `−${Math.abs(delta).toLocaleString("sv-SE")}`}
        </span>
      )}
    </span>
  );
}
