"use client";

import type { ReactNode } from "react";
import type { HeistMode } from "@/lib/game-modes";
import { stageTheme } from "./game-theme";
import GameBackdrop from "./game-backdrop";

/**
 * One match, one screen.
 *
 * The whole app is a document that scrolls; a game is not. This pins the match
 * to the viewport (`100dvh`, so a phone's address bar cannot cut the bottom
 * answers off), paints the mode's room behind it, and lets the inside lay
 * itself out with flex. Nothing inside it can grow the page.
 *
 * `data-mode` is what the stylesheet reads for the accent glow, so a new mode
 * needs no new CSS — one entry in the theme table and one in the backdrop.
 */
export default function GameStage({
  mode,
  children,
}: {
  mode: HeistMode | null;
  children: ReactNode;
}) {
  const theme = stageTheme(mode);

  return (
    <div
      data-mode={theme.id}
      className="qk-stage fixed inset-0 z-0 flex h-[100dvh] flex-col overflow-hidden text-white"
    >
      <GameBackdrop mode={theme.id} />
      {children}
    </div>
  );
}
