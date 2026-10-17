import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The painted Keens.
 *
 * The design sheet draws the Halloween pack and Omeisaurus as glossy, rounded
 * tiles — thick outlines, one big highlight, a face that reads from across the
 * room — rather than as pixel art. Those characters are built here as SVG
 * instead of bitmaps: gradients and rounded paths give the same painted feel at
 * any size, with no image files to ship.
 *
 * One function per character, all on the same 100×100 grid and the same tile
 * outline, so the set looks like one set. `KeenAvatar` picks this renderer for
 * the ids in `ILLUSTRATED_KEENS` and keeps the pixel renderer for the rest.
 */

type ArtProps = { id: string };

const TILE = { x: 2.5, y: 2.5, w: 95, h: 95, r: 24 };

/** A stable id prefix — no hooks, so this stays renderable from a server component. */
const g = (id: string, part: string) => `keen-${id}-${part}`;

function Gloss({ id }: ArtProps) {
  return (
    <>
      <radialGradient id={g(id, "gloss")} cx="0.3" cy="0.16" r="0.62">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
        <stop offset="60%" stopColor="#ffffff" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <ellipse cx="34" cy="22" rx="34" ry="20" fill={`url(#${g(id, "gloss")})`} />
    </>
  );
}

/**
 * The common frame: one rounded tile, everything drawn inside it clipped to the
 * tile's corners so a cape or a cookie never pokes out square, and a hairline
 * outline on top so the character sits on the shelf like a sticker.
 */
function Frame({ id, fill, children }: ArtProps & { fill: string; children: React.ReactNode }) {
  const clip = g(id, "frame");
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <rect x={TILE.x} y={TILE.y} width={TILE.w} height={TILE.h} rx={TILE.r} />
        </clipPath>
      </defs>
      <rect {...{ x: TILE.x, y: TILE.y, width: TILE.w, height: TILE.h, rx: TILE.r }} fill={fill} />
      <g clipPath={`url(#${clip})`}>{children}</g>
      <rect
        {...{ x: TILE.x, y: TILE.y, width: TILE.w, height: TILE.h, rx: TILE.r }}
        fill="none"
        stroke="#000"
        strokeOpacity="0.28"
        strokeWidth="2"
      />
    </>
  );
}

/** 55 % — a lantern-lit pumpkin with a leaf on its stalk, carved and grinning. */
function Pumpkin({ id }: ArtProps) {
  return (
    <>
      <defs>
        <linearGradient id={g(id, "body")} x1="0.15" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#ffc078" />
          <stop offset="42%" stopColor="#fb8c1a" />
          <stop offset="100%" stopColor="#b93d0c" />
        </linearGradient>
        <radialGradient id={g(id, "hot")} cx="0.5" cy="0.72" r="0.55">
          <stop offset="0%" stopColor="#ffd25e" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffd25e" stopOpacity="0" />
        </radialGradient>
      </defs>

      <Frame id={id} fill={`url(#${g(id, "body")})`}>
        <g>
          <ellipse cx="50" cy="74" rx="40" ry="26" fill={`url(#${g(id, "hot")})`} />
          {/* ribs: three soft creases that make a flat square read as a gourd */}
          <path d="M30 14q-7 42 0 80" stroke="#9a3208" strokeOpacity="0.4" strokeWidth="3" fill="none" />
          <path d="M70 14q7 42 0 80" stroke="#9a3208" strokeOpacity="0.4" strokeWidth="3" fill="none" />
          <path d="M50 12v84" stroke="#ffd8a8" strokeOpacity="0.25" strokeWidth="2.5" fill="none" />
          {/* stalk + leaf */}
          <rect x="44" y="0" width="12" height="16" rx="4" fill="#7a4a2d" />
          <path d="M56 7q13-9 20 1-11 7-20 1z" fill="#4ade80" />
          <path d="M57 8q8 1 15 3" stroke="#166534" strokeWidth="1.6" fill="none" />
          {/* carved eyes and grin */}
          <path d="M24 43q9-13 18 0-9 8-18 0z" fill="#5b2408" />
          <path d="M58 43q9-13 18 0-9 8-18 0z" fill="#5b2408" />
          <path d="M25 61q25 24 50 0-11 18-25 18T25 61z" fill="#5b2408" />
          <path d="M36 67h7v6h-7zM57 67h7v6h-7z" fill="#ffb64d" opacity="0.85" />
          <Gloss id={id} />
        </g>
      </Frame>
    </>
  );
}

/** 30 % — a chicken frozen in an ice cube, comb and all. */
function IceChick({ id, sunny }: ArtProps & { sunny?: boolean }) {
  const body = sunny ? "#fbbf24" : "#9ad7f5";
  const bodyDeep = sunny ? "#e08b0b" : "#5fa8cf";
  const bodyLight = sunny ? "#ffe08a" : "#d6f2ff";
  return (
    <>
      <defs>
        <linearGradient id={g(id, "ice")} x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor={bodyLight} />
          <stop offset="55%" stopColor={body} />
          <stop offset="100%" stopColor={bodyDeep} />
        </linearGradient>
      </defs>

      <Frame id={id} fill={`url(#${g(id, "ice")})`}>
        {/* the frozen block the chick is stuck inside */}
        <rect x="13" y="16" width="74" height="70" rx="16" fill="#ffffff" opacity="0.16" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" />
        <path d="M20 22q-6 22-3 44" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" fill="none" />

        {/* comb */}
        <path d="M36 12q2-9 7-2 3-9 8-1 4-7 8 2 3-4 5 2-13 6-28-1z" fill="#e63946" />
        <path d="M36 12q14 6 28 0v4q-14 6-28 0z" fill="#a4161a" />

        {/* face */}
        <circle cx="35" cy="44" r="9" fill="#fff" />
        <circle cx="65" cy="44" r="9" fill="#fff" />
        <circle cx="37" cy="46" r="4.5" fill="#13202c" />
        <circle cx="63" cy="46" r="4.5" fill="#13202c" />
        <circle cx="38.5" cy="44" r="1.6" fill="#fff" />
        <circle cx="64.5" cy="44" r="1.6" fill="#fff" />
        <path d="M44 57h12l-6 9z" fill="#f59e0b" />
        <path d="M44 57h12l-6 4z" fill="#b45309" opacity="0.6" />
        {sunny && <circle cx="50" cy="71" r="4" fill="#e63946" />}

        {/* the chocolate cookie base that the sheet gives both cubes */}
        <path d="M6 82h88v8q0 8-8 8H14q-8 0-8-8z" fill="#8b5a2b" />
        <path d="M6 82h88v4H6z" fill="#b07a42" />
        <circle cx="24" cy="90" r="2.2" fill="#33200f" />
        <circle cx="50" cy="92" r="2.2" fill="#33200f" />
        <circle cx="76" cy="90" r="2.2" fill="#33200f" />
        <Gloss id={id} />
      </Frame>
    </>
  );
}

/** 12 % — a frog in a vampire cape, fangs out, bow tie on, under a full moon. */
function Frogula({ id }: ArtProps) {
  return (
    <>
      <defs>
        <linearGradient id={g(id, "night")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b2a7a" />
          <stop offset="100%" stopColor="#150f33" />
        </linearGradient>
        <linearGradient id={g(id, "skin")} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#8bf0b6" />
          <stop offset="55%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>

      <Frame id={id} fill={`url(#${g(id, "night")})`}>
        <circle cx="24" cy="22" r="13" fill="#fef9c3" opacity="0.9" />
        <circle cx="29" cy="18" r="11" fill={`url(#${g(id, "night")})`} opacity="0.85" />

        {/* cape, then the dark wings of the collar */}
        <path d="M4 98 20 44l30 30 30-30 16 54z" fill="#b91c1c" />
        <path d="M20 44 38 74 26 96 6 98z" fill="#7f1d1d" opacity="0.65" />
        <path d="M80 44 62 74l12 22 20 2z" fill="#7f1d1d" opacity="0.65" />

        {/* head */}
        <rect x="22" y="26" width="56" height="58" rx="18" fill={`url(#${g(id, "skin")})`} stroke="#0b3d1e" strokeWidth="2" />
        {/* eye bumps, like a frog's */}
        <circle cx="35" cy="24" r="11" fill="#4ade80" stroke="#0b3d1e" strokeWidth="2" />
        <circle cx="65" cy="24" r="11" fill="#4ade80" stroke="#0b3d1e" strokeWidth="2" />
        <circle cx="35" cy="24" r="7" fill="#fff" />
        <circle cx="65" cy="24" r="7" fill="#fff" />
        <circle cx="36" cy="25" r="3.2" fill="#0b1a10" />
        <circle cx="64" cy="25" r="3.2" fill="#0b1a10" />
        <circle cx="37.2" cy="23.6" r="1.2" fill="#fff" />
        <circle cx="65.2" cy="23.6" r="1.2" fill="#fff" />

        {/* grin + fangs */}
        <path d="M31 56q19 18 38 0-19 26-38 0z" fill="#0b1a10" />
        <path d="M39 59l5 10 3-9z" fill="#fff" />
        <path d="M61 59l-5 10-3-9z" fill="#fff" />

        {/* bow tie */}
        <path d="M50 76 36 69v14z" fill="#111318" />
        <path d="M50 76 64 69v14z" fill="#111318" />
        <circle cx="50" cy="76" r="4" fill="#fbbf24" />
        <Gloss id={id} />
      </Frame>
    </>
  );
}

/** 2,6 % — a pumpkin-baked cookie, chocolate eyes, a bite out of the corner. */
function CookiePumpkin({ id }: ArtProps) {
  const cut = g(id, "cut");
  return (
    <>
      <defs>
        <linearGradient id={g(id, "dough")} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#f7c777" />
          <stop offset="55%" stopColor="#e8a33d" />
          <stop offset="100%" stopColor="#c07a2a" />
        </linearGradient>
        <mask id={cut}>
          <rect x="0" y="0" width="100" height="100" fill="#fff" />
          <circle cx="95" cy="88" r="17" fill="#000" />
          <circle cx="77" cy="99" r="11" fill="#000" />
          <circle cx="99" cy="68" r="8" fill="#000" />
        </mask>
      </defs>

      <Frame id={id} fill={`url(#${g(id, "dough")})`}>
        <g mask={`url(#${cut})`}>
          <rect x="6" y="8" width="88" height="84" rx="20" fill={`url(#${g(id, "dough")})`} stroke="#a16207" strokeWidth="2.5" />
          <rect x="12" y="14" width="76" height="72" rx="15" fill="#f3b45e" opacity="0.35" />
          {/* stalk + leaf */}
          <rect x="45" y="0" width="11" height="14" rx="4" fill="#7a4a2d" />
          <path d="M56 6q13-8 19 1-10 7-19 1z" fill="#4ade80" />
          {/* carved face */}
          <path d="M28 44q7-11 14 0-7 7-14 0z" fill="#3a1c0c" />
          <path d="M58 44q7-11 14 0-7 7-14 0z" fill="#3a1c0c" />
          <path d="M30 60q20 20 40 0-9 17-20 17T30 60z" fill="#3a1c0c" />
          <Gloss id={id} />
        </g>
        {/* crumbs where the bite was taken */}
        <circle cx="86" cy="76" r="3" fill="#e8a33d" />
        <circle cx="70" cy="94" r="2.5" fill="#c07a2a" />
        <circle cx="93" cy="58" r="2" fill="#e8a33d" />
      </Frame>
    </>
  );
}

/** 2,6 % — a cookie wrapped as a mummy, eyes peeking between the bandages. */
function CookieMummy({ id }: ArtProps) {
  return (
    <>
      <defs>
        <linearGradient id={g(id, "wrap")} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#fdf1d6" />
          <stop offset="60%" stopColor="#f5e0bb" />
          <stop offset="100%" stopColor="#d8b98c" />
        </linearGradient>
      </defs>

      <Frame id={id} fill={`url(#${g(id, "wrap")})`}>
        <rect x="6" y="8" width="88" height="84" rx="20" fill="#e8cba1" stroke="#b98f5a" strokeWidth="2.5" />
        {[16, 30, 70, 84].map((y, i) => (
          <rect
            key={y}
            x="2"
            y={y}
            width="96"
            height="9"
            rx="4.5"
            fill={`url(#${g(id, "wrap")})`}
            stroke="#c9a06a"
            strokeWidth="1.2"
            transform={`rotate(${i % 2 ? -3 : 3} 50 ${y + 4})`}
          />
        ))}
        {/* the gap the eyes look through */}
        <rect x="6" y="44" width="88" height="20" fill="#14161a" />
        <path d="M22 54q8-9 16 0-8 6-16 0z" fill="#fff" />
        <path d="M62 54q8-9 16 0-8 6-16 0z" fill="#fff" />
        <circle cx="30" cy="54" r="3.2" fill="#14161a" />
        <circle cx="70" cy="54" r="3.2" fill="#14161a" />
        <circle cx="31.4" cy="52.6" r="1.2" fill="#fff" />
        <circle cx="71.4" cy="52.6" r="1.2" fill="#fff" />
        <rect x="2" y="66" width="96" height="8" rx="4" fill="#fdf1d6" opacity="0.8" />

        {/* chocolate cookie base */}
        <path d="M6 84h88v6q0 6-7 6H13q-7 0-7-6z" fill="#8b5a2b" />
        <circle cx="30" cy="92" r="2" fill="#33200f" />
        <circle cx="58" cy="93" r="2" fill="#33200f" />
        <Gloss id={id} />
      </Frame>
    </>
  );
}

/** The Admin Keen — the painted dragon from the design sheet: red, gold, cream. */
function Omeisaurus({ id }: ArtProps) {
  return (
    <>
      <defs>
        <linearGradient id={g(id, "plate")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b3fd6" />
          <stop offset="55%" stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#43107a" />
        </linearGradient>
        <linearGradient id={g(id, "scale")} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#f2603a" />
          <stop offset="45%" stopColor="#d62f1f" />
          <stop offset="100%" stopColor="#8f1408" />
        </linearGradient>
        <linearGradient id={g(id, "gold")} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="60%" stopColor="#f7c731" />
          <stop offset="100%" stopColor="#d18f0a" />
        </linearGradient>
      </defs>

      <Frame id={id} fill={`url(#${g(id, "plate")})`}>
        <path d="M4 96 96 4" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="14" />
        <path d="M4 62 62 4" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="8" />

        {/* horns */}
        <path d="M30 26 22 8l16 9zM70 26 78 8 62 17z" fill={`url(#${g(id, "gold")})`} />
        {/* head */}
        <path
          d="M20 42q0-20 18-22 12-12 24 0 18 2 18 22v16q0 24-30 30-30-6-30-30z"
          fill={`url(#${g(id, "scale")})`}
          stroke="#5b0c04"
          strokeWidth="2.5"
        />
        {/* cream crest between the horns */}
        <path d="M36 26q14-10 28 0-14 8-28 0z" fill="#fdf0d5" opacity="0.9" />
        {/* eyes */}
        <circle cx="37" cy="47" r="10" fill="#fff" stroke="#5b0c04" strokeWidth="2" />
        <circle cx="63" cy="47" r="10" fill="#fff" stroke="#5b0c04" strokeWidth="2" />
        <circle cx="38" cy="48" r="4.6" fill="#20120a" />
        <circle cx="62" cy="48" r="4.6" fill="#20120a" />
        <circle cx="39.6" cy="46" r="1.6" fill="#fff" />
        <circle cx="63.6" cy="46" r="1.6" fill="#fff" />
        {/* muzzle */}
        <ellipse cx="50" cy="68" rx="21" ry="13" fill={`url(#${g(id, "gold")})`} />
        <ellipse cx="50" cy="64" rx="14" ry="6" fill="#fdf0d5" opacity="0.65" />
        <circle cx="43" cy="68" r="2" fill="#7a4a1d" />
        <circle cx="57" cy="68" r="2" fill="#7a4a1d" />
        {/* teeth */}
        <path d="M36 76l4 7 4-7zM56 76l4 7 4-7z" fill="#fdf0d5" />
        {/* gilded swirls on the cheeks */}
        <path d="M24 34q9-4 12 3-6 5-12-3zM76 34q-9-4-12 3 6 5 12-3z" fill={`url(#${g(id, "gold")})`} opacity="0.85" />
        <path d="M32 34q6 0 6 6t-6 6" stroke="#f7c731" strokeWidth="2" fill="none" opacity="0.8" />
        <path d="M68 34q-6 0-6 6t6 6" stroke="#f7c731" strokeWidth="2" fill="none" opacity="0.8" />
        <Gloss id={id} />
      </Frame>
    </>
  );
}

/** 0,3 % — the secret: an iced ghost cookie, happy about it. */
function CookieGhost({ id }: ArtProps) {
  return (
    <>
      <defs>
        <linearGradient id={g(id, "frost")} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#f4fbff" />
          <stop offset="55%" stopColor="#dff2fb" />
          <stop offset="100%" stopColor="#a9dcf2" />
        </linearGradient>
      </defs>

      <Frame id={id} fill={`url(#${g(id, "frost")})`}>
        {/* the icing sheet, then the scalloped hem that makes it a ghost */}
        <rect x="9" y="9" width="82" height="70" rx="18" fill={`url(#${g(id, "frost")})`} stroke="#8ec9e0" strokeWidth="2" />
        <circle cx="24" cy="78" r="11" fill="#dff2fb" stroke="#8ec9e0" strokeWidth="2" />
        <circle cx="50" cy="81" r="12" fill="#dff2fb" stroke="#8ec9e0" strokeWidth="2" />
        <circle cx="76" cy="78" r="11" fill="#dff2fb" stroke="#8ec9e0" strokeWidth="2" />
        {/* happy eyes and a grin */}
        <ellipse cx="36" cy="40" rx="6" ry="8" fill="#141c26" />
        <ellipse cx="64" cy="40" rx="6" ry="8" fill="#141c26" />
        <path d="M34 56q16 16 32 0-16 22-32 0z" fill="#141c26" />
        <circle cx="38" cy="36" r="2" fill="#fff" />
        <circle cx="66" cy="36" r="2" fill="#fff" />
        {/* the same chocolate base as the rest of the Halloween cookies */}
        <path d="M6 84h88v6q0 6-7 6H13q-7 0-7-6z" fill="#8b5a2b" />
        <circle cx="28" cy="91" r="2.2" fill="#33200f" />
        <circle cx="60" cy="92" r="2.2" fill="#33200f" />
        <Gloss id={id} />
      </Frame>
    </>
  );
}

/** 0,1 % — the secret: the Pumpkin King, crowned and winged on his slime box. */
function PumpkinKing({ id }: ArtProps) {
  return (
    <>
      <defs>
        <linearGradient id={g(id, "body")} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#ffb257" />
          <stop offset="55%" stopColor="#fb8c1a" />
          <stop offset="100%" stopColor="#b93d0c" />
        </linearGradient>
        <linearGradient id={g(id, "box")} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#8b3fd6" />
          <stop offset="100%" stopColor="#43107a" />
        </linearGradient>
        <linearGradient id={g(id, "crown")} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="60%" stopColor="#f7c731" />
          <stop offset="100%" stopColor="#c98f0a" />
        </linearGradient>
      </defs>

      <Frame id={id} fill={`url(#${g(id, "box")})`}>
        {/* bat wings */}
        <path d="M16 46 2 28l4 24-4 18 16-12z" fill="#14090a" />
        <path d="M84 46 98 28l-4 24 4 18-16-12z" fill="#14090a" />
        {/* crown */}
        <path d="M32 30 30 8l10 8 10-12 10 12 10-8-2 22z" fill={`url(#${g(id, "crown")})`} />
        <path d="M32 30h36v5H32z" fill="#c98f0a" />
        {/* head */}
        <rect x="26" y="30" width="48" height="48" rx="16" fill={`url(#${g(id, "body")})`} stroke="#5b2408" strokeWidth="2" />
        <path d="M38 53q6-9 12 0-6 6-12 0z" fill="#3a1c0c" />
        <path d="M50 53q6-9 12 0-6 6-12 0z" fill="#3a1c0c" />
        <path d="M36 65q14 15 28 0-7 14-14 14t-14-14z" fill="#3a1c0c" />
        {/* the treasure box, dripping slime */}
        <rect x="10" y="76" width="80" height="20" rx="5" fill={`url(#${g(id, "box")})`} stroke="#2c0a52" strokeWidth="2" />
        <rect x="10" y="83" width="80" height="4" fill="#f7c731" opacity="0.85" />
        <path d="M10 92q10-7 20 0t20 0 20 0 20 0v6H10z" fill="#5cf53c" opacity="0.85" />
        <Gloss id={id} />
      </Frame>
    </>
  );
}

const ART: Record<string, (p: ArtProps) => React.ReactElement> = {
  pumpkin: Pumpkin,
  chickenchick: (p) => <IceChick {...p} />,
  chickchicken: (p) => <IceChick {...p} sunny />,
  frogula: Frogula,
  cookiepumpkin: CookiePumpkin,
  cookiemummy: CookieMummy,
  cookieghost: CookieGhost,
  pumpkinking: PumpkinKing,
  omeisaurus: Omeisaurus,
};

/** Which characters the sheet draws painted rather than pixel. */
export const ILLUSTRATED_KEENS: string[] = Object.keys(ART);

export default function IllustratedAvatar({
  id,
  size,
  label,
  className,
  style,
}: {
  id: string;
  size: number;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Art = ART[id];
  if (!Art) return null;

  return (
    <div className={cn("relative select-none", className)} style={{ width: size, height: size, ...style }}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label={label ?? id}
        className="block h-full w-full overflow-visible"
      >
        <Art id={id} />
      </svg>
    </div>
  );
}
