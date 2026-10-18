"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts to its new value instead of snapping to it.
 *
 * Only safe to use where the value is known on the client — game scores, live
 * wallet balances. A server-rendered total should keep plain text so the real
 * figure is in the HTML from the first byte.
 *
 * The first render is the final value, so hydration matches the server; the
 * animation starts on the tick after mount, from wherever the number already
 * was. That means a value that *changes* rolls (coins earned, score gained),
 * while a value that is set on arrival simply appears.
 */
export default function CountUp({
  value,
  duration = 800,
  className = "",
  prefix = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const frame = useRef<number>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      from.current = value;
      setDisplay(value);
      return;
    }

    const start = from.current;
    if (start === value) return;

    const startedAt = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      // easeOutCubic: fast off the mark, gentle on arrival.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (value - start) * eased));
      if (t < 1) {
        frame.current = requestAnimationFrame(step);
      } else {
        from.current = value;
      }
    };

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      from.current = value;
    };
  }, [value, duration]);

  return (
    <span className={className} data-no-translate>
      {prefix}
      {display.toLocaleString("sv-SE")}
      {suffix}
    </span>
  );
}
