"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fade a block in the first time it is scrolled into view.
 *
 * The console pages are long — a wall of panels that used to appear all at once.
 * This gives each one an arrival without any layout shift: the box is there from
 * the start, only its opacity and offset move.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  distance = 16,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"idle" | "in" | "reduced">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setState("reduced");
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setState("reduced");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState("in");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -4% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const shown = state !== "idle";

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translate3d(0, ${distance}px, 0)`,
        transition:
          state === "reduced"
            ? "none"
            : `opacity 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * A number that rolls to its new value.
 *
 * The console is client-rendered behind the gate, so the first paint can safely
 * start from the incoming figure and count whenever the data refreshes.
 */
export function CountUp({
  value,
  duration = 700,
  className = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  className?: string;
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
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (value - start) * eased));
      if (t < 1) frame.current = requestAnimationFrame(step);
      else from.current = value;
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      from.current = value;
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {display.toLocaleString("sv-SE")}
      {suffix}
    </span>
  );
}

/** The drifting colour fields behind every console screen. */
export function CommandAurora() {
  return (
    <div aria-hidden className="cmd-aurora">
      <span />
      <span />
      <span />
    </div>
  );
}
