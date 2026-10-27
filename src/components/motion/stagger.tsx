import type { ReactNode } from "react";

/**
 * A list that arrives one item at a time.
 *
 * The container only sets a class; the delays live in CSS (`nth-child`), so the
 * animation lands on the real rows and any layout — grid, flex, plain stack —
 * keeps working untouched. A server component can use it, because nothing here
 * needs an effect.
 *
 * Delays stop growing after twelve rows: a fifty-row list still starts moving
 * immediately instead of making the last row wait four seconds.
 */
export default function Stagger({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`stagger-list ${className}`}>{children}</div>;
}
