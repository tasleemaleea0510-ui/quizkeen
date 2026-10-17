import * as React from "react";
import { RARITY_META, type Keen } from "@/lib/keens";
import { KEEN_SPRITES, SPRITE_BOARDS, type SpriteBoard } from "@/lib/keen-sprites";
import { cn } from "@/lib/utils";
import IllustratedAvatar, { ILLUSTRATED_KEENS } from "./illustrated-avatar";
import PixelSprite from "./pixel-sprite";

const ILLUSTRATED = new Set(ILLUSTRATED_KEENS);

/**
 * A Keen, drawn.
 *
 * Two ways, and the Keen picks:
 *  - the Gamer pack and the Admin Keen have hand-pixelled bitmaps in
 *    `lib/keen-sprites.ts`, drawn by `PixelSprite`;
 *  - everyone else is built from their own hue — a rounded body with a
 *    highlight, little arms, and the Keen's emoji as the face.
 *
 * Either way there is no artwork to load, every rarity is instantly
 * distinguishable, and Kroma Keens still animate. Locked Keens never reveal
 * which of the two they are: they all show the same silhouette tile.
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

  // The painted characters (Halloween, the Admin Keen) bring their own tile.
  // A locked one stays a silhouette, so the set still teases rather than spoils.
  const painted = !locked && ILLUSTRATED.has(keen.id);
  if (painted) {
    return (
      <IllustratedAvatar
        id={keen.id}
        size={size}
        label={keen.name}
        className={className}
        style={style}
      />
    );
  }

  // A locked Keen is a mystery in both directions: no sprite, no emoji, just "?".
  const sprite = locked ? undefined : KEEN_SPRITES[keen.id];
  const board: SpriteBoard = sprite?.board ?? "tile";

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
        ...(sprite && board !== "tile"
          ? SPRITE_BOARDS[board]
          : chroma && !locked
            ? {}
            : {
                background: locked
                  ? "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)"
                  : `radial-gradient(130% 130% at 30% 10%, hsl(${hue} 92% 76%) 0%, hsl(${hue} 74% 48%) 52%, hsl(${hue} 64% 27%) 100%)`,
              }),
      }}
    >
      {chroma && !locked && <span className="keen-chroma absolute inset-0" />}

      {/* body shading: a bright crown and a dark floor turn a square into a creature.
          The pixel Keens bring their own plate, so they skip it. */}
      {!locked && !sprite && (
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

      {sprite ? (
        <PixelSprite sprite={sprite} size={Math.round(size * 0.84)} className="relative z-10" />
      ) : (
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
      )}
    </div>
  );
}
