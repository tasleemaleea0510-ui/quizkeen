"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Tilt a card towards the pointer, with a light that follows the cursor.
 *
 * Writes CSS variables rather than React state on every move, so a 60fps
 * pointer sweep costs one style recalculation instead of a re-render. Touches
 * are ignored — a phone has no hover to tilt towards — and the whole effect
 * collapses to nothing under `prefers-reduced-motion`.
 */
export default function Tilt({
  children,
  className = "",
  /** Maximum rotation in degrees at the corners. */
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const node = ref.current;
    if (!node) return;
    if (!enabled) setEnabled(true);

    const box = node.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width;
    const py = (event.clientY - box.top) / box.height;
    node.style.setProperty("--tilt-ry", `${(px - 0.5) * 2 * max}deg`);
    node.style.setProperty("--tilt-rx", `${-(py - 0.5) * 2 * max}deg`);
    node.style.setProperty("--tilt-mx", `${px * 100}%`);
    node.style.setProperty("--tilt-my", `${py * 100}%`);
  }

  function reset() {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--tilt-ry", "0deg");
    node.style.setProperty("--tilt-rx", "0deg");
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={`tilt ${className}`}
      data-tilting={enabled ? "on" : "off"}
    >
      <span aria-hidden className="tilt-glare" />
      {children}
    </div>
  );
}
