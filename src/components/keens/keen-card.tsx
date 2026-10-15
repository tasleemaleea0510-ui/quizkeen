"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { RARITY_META, type Keen } from "@/lib/keens";
import { cn } from "@/lib/utils";
import KeenAvatar from "./keen-avatar";

/**
 * One Keen in a grid: tilts towards the pointer, sweeps a highlight across the
 * tile on hover, and lights its own rarity colour. Locked Keens show up as a
 * silhouette so the collection always looks like a set to complete.
 */
export default function KeenCard({
  keen,
  owned = 0,
  onSelect,
  footer,
  badge,
  index = 0,
  busy = false,
  dim = false,
}: {
  keen: Keen;
  owned?: number;
  onSelect?: () => void;
  footer?: React.ReactNode;
  badge?: React.ReactNode;
  index?: number;
  busy?: boolean;
  dim?: boolean;
}) {
  const meta = RARITY_META[keen.rarity];
  const locked = owned <= 0;
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });

  function move(e: React.MouseEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - box.left) / box.width - 0.5;
    const py = (e.clientY - box.top) / box.height - 0.5;
    setTilt({ x: -py * 12, y: px * 14 });
  }

  return (
    <div
      onMouseMove={move}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      onClick={onSelect}
      className={cn(
        "group relative isolate flex flex-col items-center gap-2 overflow-hidden rounded-2xl border bg-slate-900/60 p-3 text-center backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-200",
        locked ? "border-white/5" : meta.ring,
        !locked && "hover:shadow-raise",
        busy && "pointer-events-none opacity-60",
        dim && "pointer-events-none opacity-40 saturate-0",
        onSelect && "cursor-pointer",
        "animate-keen-rise"
      )}
      style={{
        animationDelay: `${Math.min(index * 22, 460)}ms`,
        transform: `perspective(700px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      }}
    >
      {/* the highlight that sweeps across on hover */}
      <span className="pointer-events-none absolute -inset-x-full -top-1/2 h-[200%] rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-all duration-700 group-hover:left-1/2 group-hover:opacity-100" />
      {!locked && (
        <span
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b opacity-60 transition-opacity duration-300 group-hover:opacity-100",
            meta.tile
          )}
        />
      )}

      <div className="relative">
        <KeenAvatar
          keen={keen}
          size={72}
          locked={locked}
          className={cn("transition-transform duration-300", !locked && "group-hover:-translate-y-0.5", !locked && meta.glow)}
        />
        {owned > 1 && (
          <span
            data-no-translate
            className="absolute -right-1.5 -bottom-1.5 rounded-full border border-white/15 bg-slate-950/90 px-1.5 py-px text-[11px] font-extrabold text-white shadow-raise"
          >
            ×{owned}
          </span>
        )}
        {locked && (
          <span className="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full border border-white/10 bg-slate-950/90">
            <Lock className="h-3 w-3 text-slate-400" />
          </span>
        )}
        {badge}
      </div>

      <div className="min-w-0">
        <p className={cn("truncate text-sm font-bold", locked ? "text-slate-500" : "text-white")}>
          {locked ? "???" : keen.name}
        </p>
        <p className={cn("mt-0.5 text-[10px] font-bold uppercase tracking-wider", locked ? "text-slate-600" : meta.text)}>
          {meta.label}
        </p>
      </div>

      {footer}
    </div>
  );
}
