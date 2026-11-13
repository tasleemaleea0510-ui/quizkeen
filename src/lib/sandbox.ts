/**
 * Who gets into the sandbox.
 *
 * Two doors, on purpose:
 *
 *   /sandbox          — the owner's own check room, behind the session. This is
 *                       where I look at a change without touching real data.
 *   /sandbox/s/<key>  — the link you can hand someone. Unguessable path, no
 *                       account, nothing to sign in to.
 *
 * The fallback key is only the default so the link exists the moment this
 * ships; set `SANDBOX_KEY` in the deployment to rotate it without a code
 * change. Rotating invalidates every link already handed out, which is the
 * point of a secret that was pasted into a chat.
 */
const FALLBACK_KEY = "keenlab-7f3q9z2m-x4w8";

/** The current key. Reads the environment on every call, never caches it. */
export function sandboxKey(): string {
  const fromEnv = (process.env.SANDBOX_KEY ?? "").trim();
  return fromEnv.length >= 8 ? fromEnv : FALLBACK_KEY;
}

/** True when `candidate` is the live key. */
export function isSandboxKey(candidate: string): boolean {
  return candidate === sandboxKey();
}

/** The path to give away, for copy-pasting into a message. */
export function sandboxLink(origin = "https://quizkeen.vercel.app"): string {
  return `${origin}/sandbox/s/${sandboxKey()}`;
}
