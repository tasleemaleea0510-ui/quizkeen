import { NextResponse } from "next/server";
import { readBroadcast } from "@/lib/broadcast";

export const dynamic = "force-dynamic";

/**
 * The live broadcast, for every visitor — signed in or not.
 *
 * The banner used to be fed by a server action that started with a Supabase
 * auth round-trip. That meant a signed-out visitor's banner depended on an auth
 * call it never needed, and when auth was slow or unreachable the notice
 * silently never arrived. This route touches only the database.
 *
 * `now` is the server's clock, so the client can show a countdown without
 * trusting the visitor's timezone or a drifted laptop clock.
 */
export async function GET() {
  const broadcast = await readBroadcast();
  return NextResponse.json(
    { broadcast, now: Date.now() },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
