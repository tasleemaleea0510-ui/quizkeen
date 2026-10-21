import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Never cached: this endpoint exists to answer three questions in one request —
// "is the live site up?", "which build is it?", and "can it reach what it needs?"
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Probe = {
  state: "ok" | "down" | "not-configured";
  /** Why it failed: a Prisma code (P1001), a socket code (ENOTFOUND), or null. */
  code: string | null;
};

/**
 * Wait for a dependency, but never forever. A health check that hangs on a dead
 * database is useless precisely when it matters most.
 *
 * The code is reported because "down" alone sends you hunting: `P1001` means the
 * host is unreachable (usually an IPv6-only Supabase host called from a network
 * without IPv6), `P1000` means it was reached and the credentials were refused,
 * and `ENOTFOUND` means the name does not resolve at all.
 */
async function probe(run: () => Promise<unknown>, timeoutMs = 6000): Promise<Probe> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      run(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "TIMEOUT" })), timeoutMs);
      }),
    ]);
    return { state: "ok", code: null };
  } catch (e: any) {
    const code = e?.code ?? e?.cause?.code ?? e?.cause?.errno ?? e?.name ?? null;
    return { state: "down", code: code ? String(code).slice(0, 40) : null };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Which build is serving, and whether the two services behind it answer.
 *
 * The extra fields exist because "Failed to fetch" on the login form and an
 * empty page are otherwise impossible to diagnose from a browser: both look
 * like the site is fine. `db` covers everything data-driven (profiles, quizzes,
 * broadcasts); `auth` covers signing in.
 *
 * It always answers 200 — a failing dependency is data for a human, not a
 * reason for the host to restart a process that is running fine.
 */
export async function GET() {
  // Render and Vercel expose the deployed commit under different names.
  const sha = process.env.RENDER_GIT_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA;

  const [db, auth] = await Promise.all([
    process.env.DATABASE_URL
      ? probe(() => prisma.$queryRaw`SELECT 1`)
      : Promise.resolve<Probe>({ state: "not-configured", code: null }),
    SUPABASE_URL
      ? probe(async () => {
          // Any HTTP answer proves the auth service is reachable, so this does
          // not look at the status code: /auth/v1/health refuses a request
          // without the apikey header, and calling that 401 "down" would report
          // a healthy service as broken — the opposite of useful.
          await fetch(`${SUPABASE_URL}/auth/v1/health`, {
            cache: "no-store",
            headers: SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {},
            signal: AbortSignal.timeout(6000),
          });
        })
      : Promise.resolve<Probe>({ state: "not-configured", code: null }),
  ]);

  return NextResponse.json({
    // `ok` means "the app and its database both answer", which is the question
    // someone checking a deploy actually has.
    ok: db.state === "ok",
    app: "QuizKeen",
    // Short commit of the deployment serving this request. Comparing it with
    // `git rev-parse HEAD` proves whether a push actually reached production.
    commit: sha ? sha.slice(0, 7) : "local",
    environment: process.env.RENDER ? "render" : (process.env.VERCEL_ENV ?? "local"),
    region: process.env.RENDER_REGION ?? process.env.VERCEL_REGION ?? "local",
    db: db.state,
    dbCode: db.code,
    auth: auth.state,
    authCode: auth.code,
    time: new Date().toISOString(),
  });
}
