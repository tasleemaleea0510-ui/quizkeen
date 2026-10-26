import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./client";

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

/**
 * The server-side Supabase client, reading and writing the session cookies.
 *
 * `@supabase/ssr` is on 0.6, where a server client stores the session through
 * `getAll`/`setAll` instead of one cookie of its own choosing. The old 0.3 pin
 * ignored those two callbacks entirely, so every server component saw a
 * signed-out visitor no matter how fresh the session was: signing in reached
 * /dashboard and was billed straight back to /login.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The rotated pair is picked
          // up by middleware on the next request instead.
        }
      },
    },
  });
}
