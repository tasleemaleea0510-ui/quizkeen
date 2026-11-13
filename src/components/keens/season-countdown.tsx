"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The time left before a seasonal pack leaves the shelf.
 *
 * The target is computed on the server and passed in as a timestamp, so every
 * visitor counts down to the same moment (1 December, 00:00) rather than to a
 * moment derived from their own clock. Nothing renders until the client has
 * mounted, which keeps the server HTML and the hydrated markup identical.
 */
export default function SeasonCountdown({
  endsAt,
  className,
}: {
  endsAt: number | null;
  className?: string;
}) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) {
      setLeft(0);
      return;
    }
    const tick = () => setLeft(Math.max(0, endsAt - Date.now()));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [endsAt]);

  if (left === null) {
    return (
      <span className={cn("inline-block font-mono text-sm font-extrabold tabular-nums opacity-60", className)}>
        …
      </span>
    );
  }
  if (left <= 0) return null;

  const total = Math.floor(left / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span
      className={cn("inline-flex items-baseline gap-1 font-mono text-sm font-extrabold tabular-nums", className)}
      data-no-translate
      aria-label={`${days} dagar ${hours} timmar ${minutes} minuter kvar`}
    >
      {days} d {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}
