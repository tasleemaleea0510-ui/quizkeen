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
 */

/** Where each theme's stamped ink comes from. The rest derive from the hue. */
const ACCENTS: Record<string, string> = {
  gamer: "#7cf03a",
  halloween: "#ffb347",
  gratis: "#6ee7b7",
  mytisk: "#e9d5ff",
};

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
        <span
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
