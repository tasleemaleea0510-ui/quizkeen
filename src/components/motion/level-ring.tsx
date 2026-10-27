"use client";

import { useEffect, useState } from "react";
import { levelProgress } from "@/lib/levels";

/**
 * The XP ring.
 *
 * One SVG circle whose dash offset is the level's progress. It animates from
 * where it was to where it is, so a grant that lands mid-session sweeps round
 * instead of jumping — and on first paint it sweeps up from empty, which is the
 * one animation in the app that reads as "this is your progress".
 *
 * The number in the middle is the level; the label under the ring is what the
 * level means. Both come from `lib/levels`, the same maths the server writes.
 */
export default function LevelRing({
  xp,
  size = 96,
  stroke = 8,
  showLabel = true,
  className = "",
}: {
  xp: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const { level, ratio, into, span, toNext } = levelProgress(xp);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Starts empty, fills to the real value one frame later so the transition
  // always has two states to move between.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(ratio));
    return () => cancelAnimationFrame(id);
  }, [ratio]);

  const offset = circumference * (1 - shown);

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--accent-bright)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)",
              filter: "drop-shadow(0 0 6px var(--accent-line))",
            }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-2xl font-extrabold leading-none text-white tabular" data-no-translate>
            {level}
          </span>
          <span className="absolute bottom-3 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
            nivå
          </span>
        </div>
      </div>

      {showLabel && (
        <div className="min-w-0">
          <p className="text-sm font-bold text-white" data-no-translate>
            {into} / {span} XP
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{toNext} XP kvar till nivå {level + 1}</p>
          <div className="bar mt-2 w-40">
            <span className="bar-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
