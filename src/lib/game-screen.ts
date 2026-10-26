/**
 * The routes that own the whole screen.
 *
 * The quiz host and the player's game are played on a projector and on phones,
 * and both draw their own top bar (your Keen, the score, the fullscreen switch).
 * The site navbar and footer step aside there so nothing is stacked above the
 * game. The deck host looks similar but has no bar of its own, so it keeps the
 * site chrome and its way back out.
 */
export function isGameScreen(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/play/game/")) return true;
  return pathname.startsWith("/host/") && !pathname.startsWith("/host/deck/");
}
