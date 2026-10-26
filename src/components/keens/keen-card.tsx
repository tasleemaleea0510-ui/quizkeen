"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { PACK_BY_ID, RARITY_META, keenBio, type Keen } from "@/lib/keens";
import { cn } from "@/lib/utils";
import KeenAvatar from "./keen-avatar";

/**
 * One Keen in a grid.
 *
 * The character sits on a pedestal we paint ourselves — a rounded tile washed in
 * the rarity colour — instead of floating on whatever happens to be behind the
 * card. That is what stops the artwork reading as a black square: the tile is
 * always there, whatever the picture brings with it, and it lights up with the
 * rarity the moment you own the Keen.
 *
 * The tint is a normal child rather than a negative-z layer: a `-z-10` child of
 * an `isolate` card paints *behind the card's own background*, which is how the
 * rarity wash used to disappear entirely.
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
  worn = false,
}: {
  keen: Keen;
  owned?: number;
  onSelect?: () => void;
  footer?: React.ReactNode;
  badge?: React.ReactNode;
  index?: number;
  busy?: boolean;
  dim?: boolean;
  /** True when this is the Keen the player is wearing right now. */
  worn?: boolean;
}) {
  const meta = RARITY_META[keen.rarity];
  const locked = owned <= 0;
  const bio = keenBio(keen);
  const pack = PACK_BY_ID[keen.pack];
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });

  function move(e: React.MouseEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - box.left) / box.width - 0.5;
    const py = (e.clientY - box.top) / box.height - 0.5;
    setTilt({ x: -py * 10, y: px * 12 });
  }

  return (
    <div
      onMouseMove={move}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      onClick={onSelect}
      className={cn(
        "group relative isolate flex flex-col items-center gap-2.5 overflow-hidden rounded-[22px] border bg-white/[0.05] p-3 text-center backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-200",
        locked ? "border-white/10" : meta.ring,
        !locked && "hover:shadow-[0_22px_44px_-26px_rgba(99,102,241,0.65)]",
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

      {/* the rarity wash, over the card and under everything else */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          backgroundImage: locked
            ? "linear-gradient(180deg, rgba(148,163,184,0.1), transparent 70%)"
            : `linear-gradient(180deg, ${meta.from}2b, transparent 72%)`,
        }}
      />

      <div className="relative grid h-[92px] w-[92px] place-items-center">
        {/* the pedestal: a warm tile so the character never sits on bare black */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-[22px] border border-white/10"
          style={{
            backgroundImage: locked
              ? "radial-gradient(120% 120% at 50% 20%, rgba(148,163,184,0.18), rgba(148,163,184,0.04))"
              : `radial-gradient(120% 120% at 50% 18%, ${meta.from}45, ${meta.from}12 60%, transparent 85%)`,
          }}
        />
        <KeenAvatar
          keen={keen}
          size={78}
          locked={locked}
          className={cn(
            "relative transition-transform duration-300",
            !locked && "group-hover:-translate-y-0.5",
            !locked && meta.glow
          )}
        />
        {owned > 1 && (
          <span
            data-no-translate
            className="absolute -bottom-1 -right-1 rounded-full border border-white/20 bg-slate-950/95 px-1.5 py-px text-[11px] font-extrabold text-white shadow-raise"
          >
            ×{owned}
          </span>
        )}
        {locked && (
          <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-white/15 bg-slate-950/95">
            <Lock className="h-3 w-3 text-slate-400" />
          </span>
        )}
        {worn && (
          <span
            className="absolute -left-1 -top-1 rounded-full border border-emerald-400/50 bg-emerald-500/25 px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-emerald-100 backdrop-blur"
            title="Du bär den här Keen"
          >
            På dig
          </span>
        )}
        {badge}
      </div>

      <div className="min-w-0">
        <p className={cn("truncate text-sm font-extrabold", locked ? "text-slate-500" : "text-white")}>
          {locked ? "???" : keen.name}
        </p>
        <p className={cn("mt-0.5 text-[10px] font-extrabold uppercase tracking-wider", locked ? "text-slate-600" : meta.text)}>
          {meta.label}
        </p>
      </div>

      {/* The character, in one line — a collection that is only a grid of names
          and rarities is a checklist, not a shelf of characters. */}
      {bio && (
        <p
          className={cn(
            "hidden text-[10px] leading-snug sm:line-clamp-2 sm:block",
            locked ? "text-slate-600" : "text-slate-400"
          )}
        >
          {locked ? "Hitta den för att läsa historien." : bio}
        </p>
      )}

      {pack && !locked && (
        <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          {pack.emoji} {pack.name}
        </p>
      )}

      {footer}
    </div>
  );
}
