import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./lib/supabase/client";

/**
 * Keeps the Supabase session alive.
 *
 * A Server Component cannot write cookies, so when a page had to refresh an
 * expired access token the new pair was thrown away. Supabase rotates refresh
 * tokens, which means the browser kept sending a token the server had already
 * spent: the next request failed, the session was dropped and the visitor was
 * sent back to /login — often right after a successful sign-in.
 *
 * Middleware is the one place in the request pipeline that can both read the
 * old cookies and write the rotated ones back, so the refresh happens here once
 * per request and every page afterwards sees a valid token.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Public pages and every static asset skip the auth round trip entirely.
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.includes("-auth-token"));
  if (!hasSession) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        for (const { name, value, options } of cookiesToSet) {
          // The request copy feeds the page render below, the response copy is
          // what the browser keeps.
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Best effort: an unreachable auth service must not take the page down with
  // it. A token that is simply expired falls through and the page redirects.
  await supabase.auth.getUser().catch(() => {});

  return response;
}

export const config = {
  matcher: [
    // Everything except Next's own build output and static files.
    "/((?!_next/static|_next/image|favicon.ico|icons/|keens/|art/|fonts/|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|css|js|map|woff|woff2|ttf|mp3|webm)$).*)",
  ],
};
