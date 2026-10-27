"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_COLORS = ["#818cf8", "#c084fc", "#38bdf8", "#34d399", "#fbbf24", "#fb7185"];

type Particle = { dx: number; dy: number; rot: number; sc: number; color: string; delay: number };

/**
 * A one-shot spray of particles from the middle of whatever wraps it.
 *
 * `fire` is a counter: each increase throws one burst. Particles are plain
 * elements with a CSS animation (see `.spark`), so there is no canvas, no
 * per-frame JavaScript and nothing to clean up — the nodes remove themselves
 * when the animation ends. A burst is skipped entirely for reduced-motion.
 */
export default function SparkBurst({
  fire,
  count = 18,
  colors = DEFAULT_COLORS,
  className = "",
}: {
  fire: number;
  count?: number;
  colors?: string[];
  className?: string;
}) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const seen = useRef(fire);

  useEffect(() => {
    if (fire === seen.current) return;
    seen.current = fire;
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const next: Particle[] = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const distance = 26 + Math.random() * 44;
      return {
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance - 6,
        rot: (Math.random() - 0.5) * 520,
        sc: 0.7 + Math.random() * 0.9,
        color: colors[Math.floor(Math.random() * colors.length)] ?? "#fff",
        delay: Math.random() * 90,
      };
    });

    setParticles(next);
    const id = setTimeout(() => setParticles([]), 1100);
    return () => clearTimeout(id);
    // `colors` is a fresh array on most calls; the burst is keyed on `fire`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fire, count]);

  if (!particles.length) return null;

  return (
    <span aria-hidden className={`pointer-events-none absolute inset-0 z-10 ${className}`}>
      {particles.map((p, i) => (
        <span
          key={i}
          className="spark"
          style={
            {
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--rot": `${p.rot}deg`,
              "--sc": p.sc,
              background: p.color,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
