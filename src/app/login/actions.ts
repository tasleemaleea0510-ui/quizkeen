"use server";
import { prisma } from "@/lib/prisma";
import { hasServiceRoleKey, supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabase/server";
import { authErrorSv } from "@/lib/auth-messages";

export type LoginResult = { ok: true } | { ok: false; message: string };

/** One line for every failure, so the form never says which half was wrong. */
const WRONG = "Fel namn eller lösenord. Kontrollera stavningen och försök igen.";

/**
 * Signing in, by username or by email.
 *
 * Supabase only signs in with an email, so a username has to be resolved on the
 * server: the Profile row gives the account id and the admin API gives the
 * address behind it. That lookup never leaves this function — the browser sees
 * "wrong name or password" and nothing else — so a name that does not exist
 * cannot be told apart from one with the wrong password, and no one can walk
 * the form to harvest addresses.
 */
export async function signInWithName(identifier: string, password: string): Promise<LoginResult> {
  const typed = identifier.trim();
  if (!typed || !password) return { ok: false, message: "Fyll i namn och lösenord." };

  let email = typed;

  if (!typed.includes("@")) {
    // Case-insensitive because nobody remembers whether they signed up as
    // "Abdullah" or "abdullah".
    const profile = await prisma.profile
      .findFirst({
        where: { username: { equals: typed, mode: "insensitive" } },
        select: { id: true },
      })
      .catch(() => null);

    if (!profile || !hasServiceRoleKey) return { ok: false, message: WRONG };
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    const resolved = data?.user?.email;
    if (error || !resolved) return { ok: false, message: WRONG };
    email = resolved;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // "Invalid login credentials" is what Supabase says for a wrong password;
    // the generic line also covers a mistyped email so the two paths match.
    const wrong = /invalid login credentials|invalid grant/i.test(error.message);
    return { ok: false, message: wrong ? WRONG : authErrorSv(error.message) };
  }

  return { ok: true };
}
