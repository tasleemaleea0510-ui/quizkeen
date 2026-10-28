import type { ModeId } from "@/lib/game-modes";

/**
 * The room each mode is played in.
 *
 * Every layer is CSS — gradients, masks and one keyframe each — because this
 * runs on the phone in a student's hand while it is also decoding the next
 * question. There is no canvas and no animation loop: the compositor does the
 * work, and `prefers-reduced-motion` already stops the lot.
 */

/** The mode's colour, warmest at the top and again along the floor. */
const WASH: Record<ModeId, string> = {
  classic: "bg-[radial-gradient(120%_70%_at_50%_0%,rgba(99,102,241,0.24),transparent_62%)]",
  vault: "bg-[radial-gradient(120%_70%_at_50%_0%,rgba(245,158,11,0.24),transparent_62%)]",
  crypto: "bg-[radial-gradient(120%_70%_at_50%_0%,rgba(16,185,129,0.24),transparent_62%)]",
  pirate: "bg-[radial-gradient(120%_70%_at_50%_0%,rgba(244,63,94,0.22),transparent_62%)]",
};

export default function GameBackdrop({ mode }: { mode: ModeId }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 ${WASH[mode]}`} />

      {/* Crypto Clash: data streams running down the wall, the way a terminal
          would blink if you left it alone. */}
      {mode === "crypto" && (
        <>
          <div className="qk-rain absolute inset-0 opacity-60" />
          <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(70%_100%_at_50%_0%,rgba(16,185,129,0.28),transparent_70%)]" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(70%_100%_at_50%_100%,rgba(6,78,59,0.55),transparent_75%)]" />
        </>
      )}

      {/* Vault Raiders: gold light turning slowly behind the vault door. */}
      {mode === "vault" && (
        <>
          <div className="absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax] -translate-x-1/2 -translate-y-1/2">
            <div className="qk-vault-rays h-full w-full" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(70%_100%_at_50%_100%,rgba(120,53,15,0.45),transparent_75%)]" />
        </>
      )}

      {/* Pirate Heist: a tide that never quite settles. */}
      {mode === "pirate" && (
        <>
          <div className="qk-tide absolute inset-0" />
          <div className="absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(70%_100%_at_50%_100%,rgba(76,5,25,0.5),transparent_75%)]" />
        </>
      )}

      {/* The shared floor: a faint grid so the tiles always sit on something,
          a vignette to push the edges down, and scanlines for texture. */}
      <div className="qk-stage-grid absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_30%,rgba(2,4,12,0.88)_100%)]" />
      <div className="qk-scan absolute inset-0" />
    </div>
  );
}
