"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reveal whatever is inside it once it scrolls into view.
 *
 * The page already animates things that were on screen at load; this covers the
 * rest of a long page, where content used to simply *be there* when you arrived.
 * It is deliberately dependency-free: one IntersectionObserver per block, a
 * transform/opacity pair, and no layout thrash — the element keeps its own box
 * the whole time, so nothing jumps as it settles.
 *
 * Motion is opt-out: anyone with `prefers-reduced-motion` gets the content
 * immediately, and so does anyone whose browser cannot observe intersections.
 */
export default function Reveal({
  children,
  className = "",
  /** Milliseconds to hold before starting — for a staggered row. */
  delay = 0,
  /** How far the block travels, in pixels. */
  distance = 20,
  /** Re-hide when scrolled back out, for blocks that are revisited. */
  once = true,
  threshold = 0.12,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  once?: boolean;
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // "idle" is the pre-reveal state; "reduced" means motion is off entirely.
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
            if (once) observer.disconnect();
          } else if (!once) {
            setState("idle");
          }
        }
      },
      { threshold, rootMargin: "0px 0px -5% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once, threshold]);

  const shown = state !== "idle";

  return (
    <div
      ref={ref}
      data-reveal
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translate3d(0, ${distance}px, 0)`,
        transition:
          state === "reduced"
            ? "none"
            : `opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: shown ? undefined : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
