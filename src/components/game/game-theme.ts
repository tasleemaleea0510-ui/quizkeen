import type { HeistMode, ModeId } from "@/lib/game-modes";

/**
 * How each game mode dresses the room.
 *
 * Blooket's trick is that a game mode is a *place*, not a badge: the walls
 * change colour, the light behind the question changes, and you know where you
 * are before you read a word. These are the tokens that do it, kept in one file
 * so the player's phone and the projector on the wall are lit the same way.
 */
export type StageTheme = {
  id: ModeId;
  name: string;
  /** The HUD chip: border, wash and text colour. */
  chip: string;
  /** The accent used for eyebrows and rules in this mode. */
  accent: string;
  /** The soft glow the question card floats on. */
  halo: string;
  /** The light that spills out of the right-hand rail. */
  edge: string;
};

export const STAGE_THEME: Record<ModeId, StageTheme> = {
  classic: {
    id: "classic",
    name: "Klassisk quiz",
    chip: "border-indigo-400/35 bg-indigo-500/15 text-indigo-200",
    accent: "text-indigo-300",
    halo: "bg-indigo-500/25",
    edge: "shadow-[inset_60px_0_90px_-70px_rgba(99,102,241,0.9)]",
  },
  vault: {
    id: "vault",
    name: "Vault Raiders",
    chip: "border-amber-400/35 bg-amber-500/15 text-amber-200",
    accent: "text-amber-300",
    halo: "bg-amber-500/25",
    edge: "shadow-[inset_60px_0_90px_-70px_rgba(245,158,11,0.9)]",
  },
  crypto: {
    id: "crypto",
    name: "Crypto Clash",
    chip: "border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
    accent: "text-emerald-300",
    halo: "bg-emerald-500/25",
    edge: "shadow-[inset_60px_0_90px_-70px_rgba(16,185,129,0.9)]",
  },
  pirate: {
    id: "pirate",
    name: "Pirate Heist",
    chip: "border-rose-400/35 bg-rose-500/15 text-rose-200",
    accent: "text-rose-300",
    halo: "bg-rose-500/25",
    edge: "shadow-[inset_60px_0_90px_-70px_rgba(244,63,94,0.9)]",
  },
};

/** The theme for the mode being played, or the plain quiz when there is none. */
export function stageTheme(mode: HeistMode | null | undefined): StageTheme {
  return mode ? STAGE_THEME[mode] : STAGE_THEME.classic;
}
