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
  /** One line of plain advice for that code, so the answer is actionable. */
  hint: string | null;
};

const HINTS: Record<string, string> = {
  P1000: "Databasen svarar men avvisar inloggningen — kontrollera användare och lösenord i DATABASE_URL.",
  P1001: "Databasen går inte att nå härifrån — använd pooler-adressen från Supabase (IPv4) i DATABASE_URL.",
  P1003: "Databasen finns inte på den adressen — kontrollera databasnamnet.",
  P2021: "Tabellerna saknas — schemat är inte uppladdat till den här databasen.",
  P2022: "En kolumn saknas — schemat är äldre än koden, kör prisma db push.",
  ENOTFOUND: "Namnet finns inte i DNS från servern — starta om tjänsten; kvarstår det, kontrollera projektets URL.",
  TIMEOUT: "Svarade inte inom 6 sekunder.",
  UND_ERR_CONNECT_TIMEOUT: "Anslutningen tog för lång tid.",
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
    return { state: "ok", code: null, hint: null };
  } catch (e: any) {
    // Prisma puts its own code on `errorCode` (P1001), plain sockets on `code`
    // (ENOTFOUND), and fetch buries the real cause one level down.
    const raw = e?.errorCode ?? e?.code ?? e?.cause?.code ?? e?.cause?.errno ?? e?.name ?? null;
    const code = raw ? String(raw).slice(0, 40) : null;
    return { state: "down", code, hint: code ? (HINTS[code] ?? null) : null };
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
      : Promise.resolve<Probe>({ state: "not-configured", code: null, hint: "DATABASE_URL saknas i den här tjänsten." }),
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
      : Promise.resolve<Probe>({ state: "not-configured", code: null, hint: "NEXT_PUBLIC_SUPABASE_URL saknas i den här tjänsten." }),
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
    dbHint: db.hint,
    auth: auth.state,
    authCode: auth.code,
    authHint: auth.hint,
    time: new Date().toISOString(),
  });
}
