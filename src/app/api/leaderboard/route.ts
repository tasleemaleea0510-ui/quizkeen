import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { readBoard, type BoardScope } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

/**
 * The board, as JSON, for the live component.
 *
 * Read-only and cheap: one query for the rows, one for the caller's own rank.
 * Signed out is allowed — a newcomer seeing the names at the top of the school
 * is the point — but only a signed-in request can be told which row is *them*.
 *
 * `no-store` on both ends: this is the number that must be current when a staff
 * member resets a total in the console, and a cached board is exactly the
 * "it doesn't update" bug.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const scopeParam = url.searchParams.get("scope");
  const scope: BoardScope =
    scopeParam === "elever" || scopeParam === "klass" ? (scopeParam as BoardScope) : "alla";
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 10));

  let viewerId: string | null = null;
  let viewerName: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const me = await prisma.profile
        .findUnique({ where: { id: user.id }, select: { username: true } })
        .catch(() => null);
      viewerId = user.id;
      viewerName = me?.username ?? null;
    }
  } catch {
    // Signed out, or auth is having a bad day: the public board still works.
  }

  const board = await readBoard({ scope, limit, viewerId, viewerName });

  return NextResponse.json(
    { ...board, at: Date.now() },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
