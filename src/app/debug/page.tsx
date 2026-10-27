import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { STAFF_ROLES } from "@/lib/moderation";

export const dynamic = "force-dynamic";

/**
 * A health check for staff, and nothing else.
 *
 * It used to print **every cookie** — including the Supabase auth cookies — with
 * the first 30 characters of each value, to anyone who guessed the URL. That is
 * a session token on a public page. Now:
 *
 *   - only staff may open it (anyone else is sent to their dashboard);
 *   - no cookie *values* are read or shown, only names and lengths, which is
 *     exactly what diagnoses "the session cookie never made it" — a name tells
 *     you the cookie is there, a length tells you it is not empty;
 *   - the auth answer is reduced to a boolean: the visitor's own e-mail address
 *     is not a health metric and is not printed.
 */
export default async function DebugPage() {
  const { user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (!profile || !STAFF_ROLES.includes(profile.role as never)) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const cookieSizes = cookieStore
    .getAll()
    .map((c: { name: string; value: string }) => ({ name: c.name, length: (c.value || "").length }));

  return (
    <div data-accent="emerald" className="mx-auto max-w-3xl px-4 py-12">
      <div className="surface p-6">
        <h1 className="page-title">Systemkontroll</h1>
        <p className="mt-2 text-sm text-slate-400">
          Bara för personal. Inga hemliga värden visas — endast namn och storlek på kakorna.
        </p>
        <pre className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-xs text-emerald-200">
          {JSON.stringify(
            {
              role: profile.role,
              signedIn: !!data.user,
              authError: error?.message ?? null,
              cookies: cookieSizes,
              at: new Date().toISOString(),
            },
            null,
            2
          )}
        </pre>
        <p className="mt-4 text-xs text-slate-500">
          /api/health svarar med commit-hash och miljö — den är den snabba kollen på om en deploy kom ut.
        </p>
      </div>
    </div>
  );
}
