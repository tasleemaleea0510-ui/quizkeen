import type { ReactNode } from "react";
import { levelProgress } from "@/lib/levels";

/**
 * The XP bar, in one place.
 *
 * Every screen that shows progress shows *this*: the level on the left, the
 * number in the middle, the XP still missing on the right, and a bar that fills
 * to the exact ratio the server computed. Because `levelProgress` is the same
 * function the writer uses, the bar can never disagree with the level next to it
 * — which is the whole reason it replaced four hand-rolled copies.
 */
export default function Progress({
  xp,
  label,
  showNumbers = true,
  className = "",
  children,
}: {
  xp: number;
  /** Optional heading above the bar. */
  label?: ReactNode;
  showNumbers?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const { level, into, span, ratio, toNext } = levelProgress(xp);
  return (
    <div className={className}>
      {(label || showNumbers) && (
        <div className="mb-2 flex items-end justify-between gap-3">
          <span className="text-sm font-bold text-white">{label ?? `Nivå ${level}`}</span>
          {showNumbers && (
            <span className="text-xs font-semibold text-slate-400 tabular" data-no-translate>
              {into}/{span} XP · {toNext} kvar
            </span>
          )}
        </div>
      )}
      <div className="bar">
        <span
          className="bar-fill"
          style={{ width: `${Math.round(ratio * 100)}%` }}
          role="progressbar"
          aria-valuenow={Math.round(ratio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {children}
    </div>
  );
}
