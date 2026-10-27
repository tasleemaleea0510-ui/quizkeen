"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * A card that lights up under the pointer.
 *
 * The wrapper writes the pointer's position into `--mx` / `--my`, which the
 * `.spotlight` rule turns into a soft dot of accent light that follows the
 * cursor. It is the cheapest way to make a grid of panels feel physical: no
 * tilt (so text stays readable), no JavaScript per frame beyond one style
 * write, and nothing at all on touch.
 */
export default function Spotlight({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [on, setOn] = useState(false);

  return (
    <div
      ref={ref}
      data-spotlight={on ? "on" : undefined}
      className={`spotlight relative overflow-hidden ${className}`}
      onPointerMove={(e) => {
        const node = ref.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        node.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        node.style.setProperty("--my", `${e.clientY - rect.top}px`);
      }}
      onPointerEnter={() => setOn(true)}
      onPointerLeave={() => setOn(false)}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
