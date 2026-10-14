import { NextResponse } from "next/server";

// Never cached: this endpoint exists to answer two questions in one request —
// "is the live site up?" and "which build is it?".
export const dynamic = "force-dynamic";

export function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;

  return NextResponse.json({
    ok: true,
    app: "QuizKeen",
    // Short commit of the deployment serving this request. Comparing it with
    // `git rev-parse HEAD` proves whether a push actually reached production.
    commit: sha ? sha.slice(0, 7) : "local",
    environment: process.env.VERCEL_ENV ?? "local",
    region: process.env.VERCEL_REGION ?? "local",
    time: new Date().toISOString(),
  });
}
