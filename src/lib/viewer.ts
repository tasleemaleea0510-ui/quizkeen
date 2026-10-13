import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Per-request memoised viewer lookup.
 *
 * The root layout and every page need the signed-in user and their profile.
 * Calling Supabase's auth endpoint and querying the profile in both places
 * doubles the cost of every link click, so both go through this instead: one
 * auth round trip and one profile query per request, shared by the whole tree.
 */
export const getViewer = cache(async () => {
  let user = null;
  try {
    const supabase = await createClient();
    const res = await supabase.auth.getUser();
    user = res?.data?.user ?? null;
  } catch {
    user = null;
  }

  const profile = user
    ? await prisma.profile.findUnique({ where: { id: user.id } }).catch(() => null)
    : null;

  return { user, profile };
});

/** Global admin switches, shared by the layout and any page that shows them. */
export const getAdminSettings = cache(async () => {
  try {
    return await prisma.adminSettings.findUnique({ where: { id: 1 } });
  } catch {
    return null;
  }
});
