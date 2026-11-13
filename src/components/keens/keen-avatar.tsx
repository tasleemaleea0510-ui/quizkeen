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
        className={cn(
          "h-full w-full object-contain",
          locked && "opacity-40 brightness-0 saturate-0"
        )}
      />
    </span>
  );
}
