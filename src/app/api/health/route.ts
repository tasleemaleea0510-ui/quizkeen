import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Never cached: this endpoint exists to answer two questions in one request —
// "is the live site up?" and "which build is it?".
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Wait for a dependency, but never forever. A health check that hangs on a dead
 * database is useless precisely when it matters most.
 */
async function probe(run: () => Promise<unknown>, timeoutMs = 4000): Promise<"ok" | "down"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      run(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ]);
    return "ok";
  } catch {
    return "down";
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Which build is serving, and whether the two services behind it answer.
 *
 * The extra two fields exist because "Failed to fetch" on the login form is
 * otherwise impossible to diagnose from a browser: it means the auth service is
 * unreachable, but the page looks perfectly healthy. `db` answers the same
 * question for everything else on the site (profiles, quizzes, broadcasts).
 *
 * It always answers 200 — a failing dependency is data for a human, not a
 * reason for the host to restart a process that is running fine.
 */
export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;

  const [db, auth] = await Promise.all([
    probe(() => prisma.$queryRaw`SELECT 1`),
    SUPABASE_URL
      ? probe(async () => {
          // Any HTTP answer proves the auth service is reachable, so this does
          // not look at the status code: /auth/v1/health refuses a request
          // without the apikey header, and calling that 401 "down" would report
          // a healthy service as broken — the opposite of useful.
          await fetch(`${SUPABASE_URL}/auth/v1/health`, {
            cache: "no-store",
            headers: SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {},
            signal: AbortSignal.timeout(4000),
          });
        })
      : Promise.resolve("down" as const),
  ]);

  return NextResponse.json({
    // `ok` now means "the app and its database both answer", which is the
    // question someone checking a deploy actually has.
    ok: db === "ok",
    app: "QuizKeen",
    // Short commit of the deployment serving this request. Comparing it with
    // `git rev-parse HEAD` proves whether a push actually reached production.
    commit: sha ? sha.slice(0, 7) : "local",
    environment: process.env.VERCEL_ENV ?? (process.env.RENDER ? "render" : "local"),
    region: process.env.VERCEL_REGION ?? process.env.RENDER_REGION ?? "local",
    db,
    auth: SUPABASE_URL ? auth : "not-configured",
    time: new Date().toISOString(),
  });
}
