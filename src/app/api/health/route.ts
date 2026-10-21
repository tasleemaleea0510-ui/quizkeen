import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
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
  /** The library's own words, with any credentials stripped out. */
  detail: string | null;
};

/**
 * Keep the useful half of an error message and drop the dangerous half.
 *
 * A connection error names its host, which is harmless (it is in DNS anyway),
 * but a malformed DATABASE_URL is echoed back in full — password included — so
 * anything between "//" and "@" is replaced before this ever leaves the server.
 */
function scrub(message: unknown): string | null {
  if (!message) return null;
  const text = String(message)
    .replace(/\/\/[^@\s]+@/g, "//***@")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 180) : null;
}

/** Host and port of a URL, without credentials. Safe to publish. */
function endpoint(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return `${u.hostname}${u.port ? `:${u.port}` : ""}`;
  } catch {
    return "(ogiltig URL)";
  }
}

/**
 * What the resolver on THIS server says about the auth host.
 *
 * The difference between "the browser cannot reach Supabase" and "this box
 * cannot resolve Supabase" decides which side to fix, and a plain ENOTFOUND
 * cannot tell them apart.
 */
async function resolveHost(host: string | null): Promise<string | null> {
  if (!host || host === "(ogiltig URL)") return null;
  try {
    const addrs = await Promise.race([
      lookup(host, { all: true }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 3000)),
    ]);
    return (addrs as { address: string }[]).map((a) => a.address).slice(0, 4).join(", ") || "inga svar";
  } catch (e: any) {
    return `fel: ${String(e?.code ?? e?.message ?? "okänt").slice(0, 40)}`;
  }
}

const HINTS: Record<string, string> = {
  P1000: "Databasen svarar men avvisar inloggningen — kontrollera användare och lösenord i DATABASE_URL.",
  P1001: "Databasen går inte att nå härifrån — använd pooler-adressen från Supabase (IPv4) i DATABASE_URL.",
  P1003: "Databasen finns inte på den adressen — kontrollera databasnamnet.",
  P2021: "Tabellerna saknas — schemat är inte uppladdat till den här databasen.",
  P2022: "En kolumn saknas — schemat är äldre än koden, kör prisma db push.",
  ENOTFOUND: "Namnet finns inte i DNS från servern — starta om tjänsten; kvarstår det, kontrollera projektets URL.",
  // The host can be right and this still happens when the server cannot reach
  // Supabase at all — the pooler then reports it cannot find the project.
  TENANT: "Poolern hittar inte projektet härifrån. Kontrollera att DATABASE_URL är Supabase \"Session pooler\" och att servern kan nå *.supabase.co (DNS/utgående nätverk).",
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
    return { state: "ok", code: null, hint: null, detail: null };
  } catch (e: any) {
    // Prisma puts its own code on `errorCode` (P1001), plain sockets on `code`
    // (ENOTFOUND), and fetch buries the real cause one level down.
    const raw = e?.errorCode ?? e?.code ?? e?.cause?.code ?? e?.cause?.errno ?? e?.name ?? null;
    const message = String(e?.message ?? e?.cause?.message ?? "");
    // Supabase's pooler says this when the hostname is in a different region
    // than the project. It is a configuration error, not an outage, so it gets
    // its own code instead of hiding inside the library's words.
    const tenantMismatch = /tenant\/user .* not found/i.test(message);
    const code = tenantMismatch ? "TENANT" : raw ? String(raw).slice(0, 40) : null;
    return {
      state: "down",
      code,
      hint: code ? (HINTS[code] ?? null) : null,
      detail: scrub(e?.message ?? e?.cause?.message),
    };
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
export async function GET(request: Request) {
  // `?dns=1` adds a resolver survey. It is off by default because it costs a
  // few lookups, but it is the difference between "this host is wrong" and
  // "this machine has no working DNS at all".
  const survey = new URL(request.url).searchParams.get("dns") === "1";
  const dns = survey
    ? Object.fromEntries(
        await Promise.all(
          ["google.com", "supabase.co", "pooler.supabase.com"].map(async (h) => [h, await resolveHost(h)] as const)
        )
      )
    : undefined;

  // Render and Vercel expose the deployed commit under different names.
  const sha = process.env.RENDER_GIT_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA;

  const dbEndpoint = endpoint(process.env.DATABASE_URL);
  const authEndpoint = endpoint(SUPABASE_URL);
  const authDns = await resolveHost(authEndpoint?.split(":")[0] ?? null);

  const [db, auth] = await Promise.all([
    process.env.DATABASE_URL
      ? probe(() => prisma.$queryRaw`SELECT 1`)
      : Promise.resolve<Probe>({
          state: "not-configured",
          code: null,
          hint: "DATABASE_URL saknas i den här tjänsten.",
          detail: null,
        }),
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
      : Promise.resolve<Probe>({
          state: "not-configured",
          code: null,
          hint: "NEXT_PUBLIC_SUPABASE_URL saknas i den här tjänsten.",
          detail: null,
        }),
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
    dbDetail: db.detail,
    // Hostnames only — never the credentials that sit beside them.
    dbHost: dbEndpoint?.split(":")[0] ?? null,
    dbPort: dbEndpoint?.split(":")[1] ?? null,
    auth: auth.state,
    authCode: auth.code,
    authHint: auth.hint,
    authDetail: auth.detail,
    supabaseHost: authEndpoint ?? null,
    supabaseDns: authDns,
    ...(dns ? { dns } : {}),
    time: new Date().toISOString(),
  });
}
