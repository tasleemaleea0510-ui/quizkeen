import { cache } from "react";
import { cookies } from "next/headers";
import type { Keen } from "@/lib/keens";
import { WORN_COOKIE, parseWorn } from "@/lib/worn";

/**
 * The Keen this request is wearing, read from the cookie.
 *
 * Memoised per request like `getViewer`, so the header, the layout and the page
 * can each ask without paying for it three times. Fails closed: a request
 * without cookies (or with a mangled one) simply wears nothing.
 */
export const getWornKeen = cache(async (): Promise<Keen | null> => {
  try {
    const jar = await cookies();
    return parseWorn(jar.get(WORN_COOKIE)?.value ?? null);
  } catch {
    return null;
  }
});
