import * as React from "react";
import type { Pack } from "@/lib/keens";
import { cn } from "@/lib/utils";

/**
 * A pack, drawn as the foil bag from the design sheet.
 *
 * The shelf used to show a 16×16 sprite in a box, which made a 250-coin pack
 * look like a button. A pack is an object: a glossy bag of vector diamonds with
 * the theme's name stamped on it, a neon hem, and the theme's own glyph. It is
 * built from gradients instead of an image so every pack — including ones added
 * later — gets the same treatment from its hue alone.
 *
 * The Gamer pack is the exception: the sheet draws that one to a specific
 * design — a pixel bag with its own blocky lettering, a neon frame and the pack's
 * own icons scattered around the secret Keen — so it is drawn here as a small
 * pixel canvas rather than derived from the hue. See `GamerBag`.
 */

/** Where each theme's stamped ink comes from. The rest derive from the hue. */
const ACCENTS: Record<string, string> = {
  gamer: "#7cf03a",
  halloween: "#ffb347",
  gratis: "#6ee7b7",
  mytisk: "#e9d5ff",
};

/* ── The Gamer pack bag ────────────────────────────────────────────────────── */

/**
 * A 5×7 bitmap alphabet, the same blocky letterforms the sheet uses for the
 * "GAMER PACK" stamp. Drawing the letters as pixels instead of setting them in
 * the page font is what keeps the bag looking like artwork at 88 px: a webfont
 * at that size is a grey smudge, five-by-seven blocks are still five-by-seven
 * blocks.
 */
const GLYPHS: Record<string, string[]> = {
  G: [".XXX.", "X...X", "X....", "X..XX", "X...X", "X...X", ".XXX."],
  A: [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
  M: ["X...X", "XX.XX", "X.X.X", "X...X", "X...X", "X...X", "X...X"],
  E: ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "XXXXX"],
  R: ["XXXX.", "X...X", "X...X", "XXXX.", "X.X..", "X..X.", "X...X"],
  P: ["XXXX.", "X...X", "X...X", "XXXX.", "X....", "X....", "X...."],
  C: [".XXXX", "X....", "X....", "X....", "X....", "X....", ".XXXX"],
  K: ["X...X", "X..X.", "X.X..", "XX...", "X.X..", "X..X.", "X...X"],
};

type Pixels = Record<string, string>;

/**
 * One bitmap as SVG rects. `pad` grows every cell outward, which is how the dark
 * outline around the lettering is made: the same word is stamped once fat and
 * dark, then again at its real size in colour on top.
 */
function bitmap(
  rows: string[],
  palette: Pixels,
  x: number,
  y: number,
  cell: number,
  pad = 0
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  rows.forEach((row, ry) => {
    row.split("").forEach((ch, rx) => {
      const fill = palette[ch];
      if (!fill) return;
      out.push(
        <rect
          key={`${x}-${y}-${pad}-${rx}-${ry}`}
          x={Number((x + rx * cell - pad).toFixed(2))}
          y={Number((y + ry * cell - pad).toFixed(2))}
          width={Number((cell + pad * 2).toFixed(2))}
          height={Number((cell + pad * 2).toFixed(2))}
          fill={fill}
        />
      );
    });
  });
  return out;
}

/** A word in the pixel alphabet, one glyph after another. */
function word(text: string, palette: Pixels, x: number, y: number, cell: number, pad = 0) {
  return text.split("").map((ch, i) => {
    const glyph = GLYPHS[ch];
    if (!glyph) return null;
    return (
      <React.Fragment key={`${ch}-${i}`}>
        {bitmap(glyph, palette, x + i * (5 + 1) * cell, y, cell, pad)}
      </React.Fragment>
    );
  });
}

const GAMER_INK = { X: "#7cf03a" };
const GAMER_OUTLINE = { X: "#08210a" };
const CREAM_INK = { X: "#fdf6dd" };
const CREAM_OUTLINE = { X: "#2a1046" };
/** Every icon is stamped twice: a dark pass grown a little, then its own ink. */
const ICON_OUTLINE = { X: "#160a26" };

/** The 7×7 "?", the box the sheet puts in the bag's lower-right corner. */
const QUESTION = [".XXXX.", "X...X.", "...X..", "..X...", "..X...", "......", "..X..."];

const HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];

const CONTROLLER = [
  ".XXXXXXX.",
  "XXXXXXXXX",
  "XGXXXXXRX",
  "XXXXXXXXX",
  "XX.X.X.XX",
  "XXXXXXXXX",
  ".XXXXXXX.",
];

const HEADPHONES = [
  "..XXXXX..",
  ".X.....X.",
  "X.......X",
  "X.......X",
  "XXX...XXX",
  "XGX...XGX",
  "XGX...XGX",
  ".X.....X.",
];

const TROPHY = [
  "XXXXXXX",
  "XX...XX",
  "XXXXXXX",
  ".XXXXX.",
  "..XXX..",
  "...X...",
  ".XXXXX.",
];

/**
 * The Gamer pack, to the sheet: a purple pixel bag under a hot-pink neon frame,
 * "GAMER PACK" stamped across the top in the pack's own blocky lettering, and the
 * pack's icons — controller, sword, headphones, trophy, heart, question plate —
 * scattered around the Pixel Thorne in the middle.
 */
function GamerBag() {
  // GAMER spans 29 cells and PACK 23; both are centred on the bag's 100-unit
  // canvas so the stamp sits square however the bag is cropped.
  const bigCell = 2.4;
  const smallCell = 1.9;
  const bigX = (100 - (5 * 5 + 4) * bigCell) / 2;
  const smallX = (100 - (4 * 5 + 3) * smallCell) / 2;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="pack-gamer-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d24e0" />
          <stop offset="0.55" stopColor="#6d15c4" />
          <stop offset="1" stopColor="#43078c" />
        </linearGradient>
        {/* the bag's fine pixel-print */}
        <pattern id="pack-gamer-px" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="none" />
          <rect x="0" y="0" width="3" height="3" fill="#c084fc" opacity="0.3" />
          <rect x="7" y="7" width="3" height="3" fill="#c084fc" opacity="0.3" />
          <rect x="7" y="0" width="3" height="3" fill="#3b0764" opacity="0.45" />
          <rect x="0" y="7" width="3" height="3" fill="#3b0764" opacity="0.45" />
        </pattern>
      </defs>

      {/* foil */}
      <rect width="100" height="100" fill="url(#pack-gamer-bg)" />
      <rect width="100" height="100" fill="url(#pack-gamer-px)" />
      {/* the band the stamp sits on */}
      <rect x="4" y="6" width="92" height="38" rx="3" fill="#7e1ed2" opacity="0.62" />
      <rect x="4" y="6" width="92" height="38" rx="3" fill="url(#pack-gamer-px)" opacity="0.75" />

      {/* the stamp */}
      {word("GAMER", GAMER_OUTLINE, bigX, 9.5, bigCell, 0.85)}
      {word("GAMER", GAMER_INK, bigX, 9.5, bigCell)}
      {word("PACK", CREAM_OUTLINE, smallX + 5, 28, smallCell, 0.7)}
      {word("PACK", CREAM_INK, smallX + 5, 28, smallCell)}

      {/* Pixel Thorne, the pack's secret, holding the middle of the bag */}
      <g transform="translate(50 60)">
        <path
          d="M0 -15 L3.4 -9.6 L8.6 -12.6 L8 -6.4 L14 -5.6 L10.2 -1.6 L14.6 2.6 L9 3.2 L10.6 9 L5 7.2 L3.2 13.4 L0 9.2 L-3.2 13.4 L-5 7.2 L-10.6 9 L-9 3.2 L-14.6 2.6 L-10.2 -1.6 L-14 -5.6 L-8 -6.4 L-8.6 -12.6 L-3.4 -9.6 Z"
          fill="#0b0612"
          stroke="#a855f7"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M-8 -4l7-2-2 4.6-4.4.6Z" fill="#5cf53c" />
        <path d="M8 -4l-7-2 2 4.6 4.4.6Z" fill="#5cf53c" />
        <path d="M-8 2c4 2.4 12 2.4 16 0l-3.4 4.6-2.4-3-2.8 3.8-2.8-3.8-2.4 3Z" fill="#5cf53c" />
      </g>

      {/* the pack's icons, scattered the way the sheet scatters them */}
      <g>
        {bitmap(CONTROLLER, ICON_OUTLINE, 5.4, 40.4, 1.3, 0.55)}
        {bitmap(CONTROLLER, { X: "#241f36", G: "#7cf03a", R: "#ef4444" }, 5.4, 40.4, 1.3)}
      </g>
      <g transform="rotate(45 86 42)">
        <rect x="84.4" y="31.5" width="3.4" height="15" rx="0.6" fill="#dfe6f2" />
        <rect x="84.4" y="31.5" width="1.3" height="15" fill="#ffffff" opacity="0.7" />
        <rect x="82.2" y="46.5" width="7.8" height="2" rx="0.6" fill="#22d3ee" />
        <rect x="84.6" y="48.5" width="3" height="5" rx="0.6" fill="#facc15" />
        <rect x="84.6" y="53.5" width="3" height="2.6" rx="1.3" fill="#22d3ee" />
      </g>
      <g>
        {bitmap(HEADPHONES, ICON_OUTLINE, 5.4, 58, 1.25, 0.55)}
        {bitmap(HEADPHONES, { X: "#1b1b25", G: "#7cf03a" }, 5.4, 58, 1.25)}
      </g>
      <g>
        {bitmap(TROPHY, ICON_OUTLINE, 79, 55, 1.35, 0.55)}
        {bitmap(TROPHY, { X: "#fbbf24" }, 79, 55, 1.35)}
        <path d="M78.6 55.4c-2.4 0-3.2 4.6 1 4.6" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
        <path d="M88.6 55.4c2.4 0 3.2 4.6-1 4.6" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
        <rect x="81.6" y="64.4" width="4.2" height="2.4" rx="0.6" fill="#a16207" />
      </g>
      <g>
        {bitmap(HEART, ICON_OUTLINE, 6, 74, 1.5, 0.55)}
        {bitmap(HEART, { X: "#e11d2e" }, 6, 74, 1.5)}
        <rect x="8.4" y="75.4" width="3" height="3" fill="#ff7a86" />
      </g>
      <g>
        <rect x="78.4" y="77.4" width="12.2" height="12.2" rx="1" fill="#facc15" />
        <rect x="79.6" y="78.6" width="9.8" height="9.8" rx="0.6" fill="#3b0764" />
        {bitmap(QUESTION, { X: "#fde68a" }, 80.6, 79.6, 1.4)}
      </g>

      {/* sparkles the sheet scatters over the foil */}
      {[
        [16, 22],
        [78, 20],
        [26, 52],
        [72, 49],
        [20, 68],
        [66, 71],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} opacity="0.85" fill="#ff4fd8">
          <rect x={x} y={y - 2} width="1.4" height="5.4" />
          <rect x={x - 2} y={y} width="5.4" height="1.4" />
        </g>
      ))}

      {/* the neon frame */}
      <rect x="2" y="2" width="96" height="96" rx="6" fill="none" stroke="#ff3ddb" strokeWidth="6" opacity="0.2" />
      <rect x="2" y="2" width="96" height="96" rx="6" fill="none" stroke="#ff3ddb" strokeWidth="2.4" />
      <rect x="5.5" y="5.5" width="89" height="89" rx="3" fill="none" stroke="#ffb3f0" strokeWidth="0.8" opacity="0.75" />
      <rect x="6.5" y="6.5" width="87" height="87" rx="2.5" fill="none" stroke="#2a0a47" strokeWidth="1.2" opacity="0.55" />
    </svg>
  );
}

export default function PackArt({
  pack,
  className,
  variant = "tile",
}: {
  pack: Pick<Pack, "id" | "name" | "hue" | "emoji">;
  className?: string;
  variant?: "tile" | "hero";
}) {
  const hue = pack.hue;
  const hero = variant === "hero";
  const accent = ACCENTS[pack.id] ?? `hsl(${(hue + 180) % 360} 92% 66%)`;
  // "Gamerpaketet" → "Gamer": one word that fits on a bag.
  const short = pack.name.replace(/paketet$/i, "").trim() || pack.name;

  // The Gamer pack has its own bag on the sheet, so it is drawn rather than
  // derived: same box, same glow around it, pixel artwork inside.
  if (pack.id === "gamer") {
    return (
      <div
        className={cn("relative isolate shrink-0 overflow-hidden", className)}
        style={{
          boxShadow: `0 16px 32px -16px hsl(${hue} 92% 55% / 0.9), 0 0 0 1px hsl(${hue} 90% 70% / 0.35)`,
        }}
      >
        <GamerBag />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative isolate grid shrink-0 place-items-center overflow-hidden rounded-2xl text-center",
        className
      )}
      style={{
        background: `radial-gradient(130% 120% at 50% 0%, hsl(${hue} 72% 46%) 0%, hsl(${hue} 74% 27%) 46%, hsl(${hue} 72% 13%) 100%)`,
        boxShadow: `inset 0 0 0 1px hsl(${hue} 90% 78% / 0.55), inset 0 0 26px hsl(${hue} 92% 46% / 0.55), 0 16px 32px -16px hsl(${hue} 92% 55% / 0.9)`,
      }}
    >
      {/* the bag's vector-diamond print */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, hsl(${hue} 76% 20%) 0 8px, hsl(${hue} 78% 33%) 8px 16px)`,
        }}
      />
      <span
        aria-hidden
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #05060f 0 8px, transparent 8px 16px)",
        }}
      />
      {/* sheen */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(78% 58% at 50% 34%, rgba(255,255,255,0.24), rgba(255,255,255,0) 72%)",
        }}
      />
      {/* stitched hem, top and bottom */}
      <span
        aria-hidden
        className="absolute inset-x-1.5 top-1.5 h-1 rounded-full"
        style={{ background: `repeating-linear-gradient(90deg, ${accent} 0 3px, transparent 3px 7px)`, opacity: 0.85 }}
      />
      <span
        aria-hidden
        className="absolute inset-x-1.5 bottom-1.5 h-1 rounded-full"
        style={{ background: `repeating-linear-gradient(90deg, ${accent} 0 3px, transparent 3px 7px)`, opacity: 0.85 }}
      />

      {/* corner glyphs, the way the sheet's packet scatters little icons */}
      {["-top-0.5 -left-0.5", "-top-0.5 -right-0.5", "-bottom-0.5 -left-0.5", "-bottom-0.5 -right-0.5"].map(
        (pos, i) => (
          <span
            key={pos}
            aria-hidden
            className={cn("absolute text-white/20", pos)}
            style={{ fontSize: hero ? 14 : 7, transform: `rotate(${i % 2 ? 18 : -18}deg)` }}
          >
            ✦
          </span>
        )
      )}

      <div className="relative flex flex-col items-center justify-center leading-none">
        {/* The stamp is artwork, not copy — `data-no-translate` keeps the
            translation layer off it. Without it the Start pack's bag, whose
            stamp is the word "Starta", gets rewritten to "Start" the moment
            the page hydrates. */}
        <span
          data-no-translate
          className="font-display font-extrabold uppercase"
          style={{
            color: accent,
            fontSize: hero ? 24 : 9.5,
            letterSpacing: "0.04em",
            textShadow: `0 1px 0 #1b0a2e, 0 -1px 0 #1b0a2e, 1px 0 0 #1b0a2e, -1px 0 0 #1b0a2e, 0 3px 8px rgba(0,0,0,0.55)`,
          }}
        >
          {short}
        </span>
        <span
          data-no-translate
          className="font-display font-extrabold uppercase text-white/80"
          style={{ fontSize: hero ? 11 : 5.5, letterSpacing: "0.32em", marginTop: hero ? 2 : 1 }}
        >
          pack
        </span>
        <span
          aria-hidden
          style={{
            fontSize: hero ? 46 : 21,
            lineHeight: 1,
            marginTop: hero ? 10 : 4,
            filter: `drop-shadow(0 3px 7px ${accent}66)`,
          }}
        >
          {pack.emoji}
        </span>
      </div>
    </div>
  );
}
