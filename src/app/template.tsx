"use client";

import { usePathname } from "next/navigation";
import { isGameScreen } from "@/lib/game-screen";

/**
 * Every route change enters the same way.
 *
 * Next's `template` is remounted on navigation (unlike `layout`), which is
 * exactly the hook a page transition needs: no router events, no exit
 * animation to keep in sync, just a fresh element that plays once.
 *
 * A game is the exception. The enter animation is a `transform`, and a
 * transformed ancestor becomes the containing block for `position: fixed` —
 * so the game stage, which *is* fixed, would be scaled down and pushed down by
 * this wrapper instead of covering the screen, leaving a stripe of the page
 * below it. A match also does not want to fade in: it is already a whole screen.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isGameScreen(pathname)) return <>{children}</>;
  return <div className="page-enter">{children}</div>;
}
