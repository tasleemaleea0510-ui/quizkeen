import * as React from "react";
import type { Keen } from "@/lib/keens";
import { keenArtSvg } from "@/lib/keen-art";
import { cn } from "@/lib/utils";

/**
 * A Keen, drawn.
 *
 * One renderer for the whole catalogue: `lib/keen-art.ts` builds the SVG from
 * the Keen's own recipe, and this inlines it, so a 20 px chip in the navbar and
 * the 168 px reveal in the pack opener are the same drawing at different sizes —
 * with no image files, no emoji, and no blur.
 *
 * A locked Keen is a silhouette: same plate, same size, no spoilers.
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
      dangerouslySetInnerHTML={{ __html: keenArtSvg(keen, { locked }) }}
    />
  );
}
