/**
 * The Keen you are wearing.
 *
 * A Keen is not only for the shelf: the one you wear is your face in a quiz
 * lobby, on the flashcards, next to your name in the header — the Blooket idea,
 * where the thing you collect is the thing you play as.
 *
 * It lives in a cookie rather than in the database. Wearing is a display choice,
 * not progress: nothing about the economy depends on it, and a cookie keeps it
 * working without a schema change and without another round trip on every page.
 * The cost of that choice is honest and small — the Keen is remembered per
 * browser, not per account.
 *
 * This module is deliberately free of `next/headers`, because the lobby and the
 * game screens are client components that read the same cookie themselves.
 */

import { KEEN_BY_ID, type Keen } from "@/lib/keens";

export const WORN_COOKIE = "qk_keen";
export const WORN_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Turn a raw cookie value into a Keen.
 *
 * Only real ids survive: a hand-edited cookie wears nothing rather than making
 * the pages render a character that does not exist.
 */
export function parseWorn(value: string | null | undefined): Keen | null {
  if (!value) return null;
  return KEEN_BY_ID[value] ?? null;
}

/** The worn Keen id inside a `document.cookie` string, for client components. */
export function wornIdFromCookieString(cookie: string | null | undefined): string | null {
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === WORN_COOKIE) {
      const raw = rest.join("=").trim();
      if (!raw) return null;
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}
