import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./lib/supabase/client";

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

/** A session this close to its expiry is renewed now instead of mid-page. */
const RENEW_BEFORE_MS = 60_000;

/**
 * Keeps the Supabase session alive.
 *
 * A Server Component cannot write cookies, so when a page had to refresh an
 * expired access token the new pair was thrown away. Supabase rotates refresh
 * tokens, which means the browser kept sending a token the auth service had
 * already spent: the next request failed, the session was dropped and the
 * visitor was sent back to /login — often seconds after signing in.
 *
 * Middleware is the one place in the request pipeline that can both read the
 * old cookies and write the rotated pair back. It renews only when the cookie
 * is actually near expiry, so the common request costs no auth round trip.
 */
export async function middleware(request: NextRequest) {
  const hasSession = request.cookies.getAll().some((c) => c.name.includes("-auth-token"));
  if (!hasSession) return NextResponse.next({ request });

  // Staged until the refresh has happened: the response has to be built from a
  // request that already carries the new cookies, or the page render below
  // still reads the expired pair.
  const staged: CookieToSet[] = [];

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        staged.push(...cookiesToSet);
      },
    },
  });

  const response = NextResponse.next({ request });
  const flush = (res: NextResponse) => {
    for (const { name, value, options } of staged) res.cookies.set(name, value, options);
    return res;
  };

  let expiresAt: number | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    expiresAt = data.session?.expires_at ?? null;
    if (!data.session) return flush(response);

    const stale = !expiresAt || expiresAt * 1000 - RENEW_BEFORE_MS < Date.now();
    if (!stale) return flush(response);

    // Spend the refresh token here, where the rotated pair can be stored.
    // A failure is not fatal: the page's own auth check sends the visitor to
    // /login, which is the honest answer once the refresh token is dead too.
    await supabase.auth.refreshSession().catch(() => {});
  } catch {
    return flush(response);
  }

  return flush(response);
}

export const config = {
  matcher: [
    // Everything except Next's own build output and static files.
    "/((?!_next/static|_next/image|favicon.ico|icons/|keens/|art/|fonts/|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|css|js|map|woff|woff2|ttf|mp3|webm)$).*)",
  ],
};
