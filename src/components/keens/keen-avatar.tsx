"use client";
import * as React from "react";
import { keenArtSrc, type Keen } from "@/lib/keens";
import { cn } from "@/lib/utils";

/**
 * A Keen, as the artwork itself.
 *
 * One picture per id in `public/keens`, rendered as an `<img>`: a 20 px chip in
 * the navbar and the 168 px reveal in the pack opener are the same file, so
 * nothing is redrawn and nothing can drift from the design sheet.
 *
 * A locked Keen is a silhouette: the same file, flattened to black and dimmed.
 * That hides the character without needing a second set of shapes.
 *
 * If a file is missing — a Keen added to the catalogue before its art landed —
 * the avatar falls back to the Keen's emoji on its rarity tint instead of the
 * browser's broken-image icon. The catalogue is content; art is an asset, and
 * one arriving late must not make the collection look broken.
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
  const [missing, setMissing] = React.useState(false);

  // A new Keen in the same component instance must get its own chance to load.
  React.useEffect(() => {
    setMissing(false);
  }, [keen.id]);

  if (missing) {
    return (
      <span
        className={cn(
          "inline-grid shrink-0 select-none place-items-center rounded-xl border border-white/10 bg-white/[0.06] align-middle",
          locked && "opacity-40",
          className
        )}
        style={{ width: size, height: size, ...style }}
        title={keen.name}
        aria-label={keen.name}
      >
        <span aria-hidden style={{ fontSize: Math.max(12, size * 0.5), lineHeight: 1 }}>
          {keen.emoji}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn("inline-grid shrink-0 select-none place-items-center align-middle", className)}
      style={{ width: size, height: size, ...style }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the art is a fixed, local PNG; next/image adds nothing at these sizes */}
      <img
        src={keenArtSrc(keen)}
        alt={locked ? "" : keen.name}
        aria-hidden={locked || undefined}
        width={size}
        height={size}
        draggable={false}
        decoding="async"
        loading="lazy"
        onError={() => setMissing(true)}
        className={cn("h-full w-full object-contain", locked && "opacity-40 brightness-0 saturate-0")}
      />
    </span>
  );
}
