import * as React from "react";
import { RARITY_META, type Keen } from "@/lib/keens";
import { cn } from "@/lib/utils";

/**
 * A Keen, drawn.
 *
 * There is no artwork to load, so each character is built from its own hue:
 * a rounded body with a highlight, little arms, and the Keen's emoji as the
 * face. That keeps 48 characters in one small file, makes every rarity
 * instantly distinguishable, and lets Kroma Keens animate.
 */
export default function KeenAvatar({
  keen,
  size = 64,
  locked = false,
  className,
  style,
}: {
  keen: Keen;
  size?: number;
  locked?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const meta = RARITY_META[keen.rarity];
  const chroma = keen.rarity === "KROMA";
  const hue = keen.hue;

  const arms = size >= 56;

  return (
    <div
      className={cn(
        "relative grid select-none place-items-center overflow-hidden rounded-[30%] border",
        meta.ring,
        locked && "border-slate-700/60",
        className
      )}
      style={{
        width: size,
        height: size,
        ...style,
        ...(chroma && !locked ? {} : {
          background: locked
            ? "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)"
            : `radial-gradient(130% 130% at 30% 10%, hsl(${hue} 92% 76%) 0%, hsl(${hue} 74% 48%) 52%, hsl(${hue} 64% 27%) 100%)`,
        }),
      }}
    >
      {chroma && !locked && <span className="keen-chroma absolute inset-0" />}

      {/* body shading: a bright crown and a dark floor turn a square into a creature */}
      {!locked && (
        <>
          <span className="pointer-events-none absolute inset-x-[14%] top-[7%] h-[20%] rounded-full bg-white/35 blur-[5px]" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[26%] bg-gradient-to-t from-black/45 to-transparent" />
          {arms && (
            <>
              <span
                className="pointer-events-none absolute -left-[4%] top-[48%] h-[24%] w-[18%] rounded-full"
                style={{ background: `hsl(${hue} 60% 30%)` }}
              />
              <span
                className="pointer-events-none absolute -right-[4%] top-[48%] h-[24%] w-[18%] rounded-full"
                style={{ background: `hsl(${hue} 60% 30%)` }}
              />
            </>
          )}
        </>
      )}

      <span
        className={cn(
          "relative z-10 leading-none",
          locked ? "text-slate-500" : "drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]",
          chroma && !locked && "drop-shadow-[0_0_10px_rgba(255,255,255,0.85)]"
        )}
        style={{ fontSize: Math.round(size * 0.54) }}
      >
        {locked ? "?" : keen.emoji}
      </span>
    </div>
  );
}
