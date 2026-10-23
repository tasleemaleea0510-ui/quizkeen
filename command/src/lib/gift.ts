/**
 * The fixed self-gift an admin may take from the console.
 *
 * 100 mynt, once every two hours. The cooldown is not stored here or in the
 * browser: the grant is written to the same `CoinGrant` ledger the in-app panel
 * writes, with the same marker ("Gåva från ägaren"), so pressing the button in
 * QuizKeen and pressing it in Command cannot both pay out inside two hours.
 */

export const GIFT_COINS = 100;
export const GIFT_COOLDOWN_MS = 2 * 60 * 60 * 1000;

/** Exactly the value src/lib/moderation.ts uses (OWNER_GIFT_LABEL). */
export const GIFT_LABEL = "Gåva från ägaren";

/** The popup the admin sees next time they open QuizKeen. */
export const GIFT_POPUP = `🎁 Din gåva: +${GIFT_COINS} mynt! Nästa går att ta om 2 tim.`;

/** "1 tim 58 min" — the wait until the next gift may be taken. */
export function giftWait(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 60_000));
  if (total < 1) return "mindre än en minut";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} tim ${m} min` : `${h} tim`;
}
