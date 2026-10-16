import * as React from "react";
import type { Sprite } from "@/lib/keen-sprites";

/**
 * A Keen's bitmap, drawn as SVG squares.
 *
 * `shapeRendering="crispEdges"` plus a viewBox in pixel units means the artwork
 * stays hard-edged at every size — 26 px in the "what am I missing" strip, 168 px
 * in the reveal. Horizontal runs of the same colour are merged into one rect, so
 * a 13×13 sprite costs roughly twenty nodes instead of a hundred and seventy.
 */
export default function PixelSprite({
  sprite,
  size,
  className,
}: {
  sprite: Sprite;
  size: number;
  className?: string;
}) {
  const { rows } = sprite;
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const height = rows.length;
  // Square box, so a wide or tall sprite never stretches its own pixels.
  const box = Math.max(width, height);
  const offX = (box - width) / 2;
  const offY = (box - height) / 2;

  const rects: { key: string; x: number; y: number; w: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const letter = row[x];
      const fill = sprite.palette[letter];
      if (!fill) {
        x += 1;
        continue;
      }
      let run = 1;
      while (x + run < row.length && row[x + run] === letter) run += 1;
      rects.push({ key: `${y}-${x}`, x: x + offX, y: y + offY, w: run, fill });
      x += run;
    }
  });

  return (
    <svg
      viewBox={`0 0 ${box} ${box}`}
      width={size}
      height={size}
      role="img"
      aria-label={sprite.alt}
      shapeRendering="crispEdges"
      className={className}
    >
      {rects.map((r) => (
        <rect key={r.key} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
