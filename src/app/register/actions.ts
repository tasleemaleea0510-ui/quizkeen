"use server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkEmail, normalizeEmail, USERNAME_RE } from "@/lib/email-check";

export type SignupCheck = { ok: true } | { ok: false; error: string };
export type ProfileResult = { ok: true } | { ok: false; error: string };

/**
 * Everything a signup must pass BEFORE Supabase creates a user, so the person
 * gets a clear Swedish error instead of a half-made account.
 *
 * Note on trust: the anon key is public, so a determined visitor can still call
 * Supabase's signup endpoint directly and skip this form. `createProfile` below
 * is therefore where the rule is enforced for real — see its comment.
 */
export async function checkRegistration(email: string, username: string): Promise<SignupCheck> {
  const name = (username || "").trim();
  if (!USERNAME_RE.test(name)) {
    return { ok: false, error: "Användarnamnet måste vara 3–20 tecken: bokstäver, siffror eller _." };
  }

  const verdict = await checkEmail(email);
  if (!verdict.ok && verdict.reason === "syntax") {
    return { ok: false, error: "E-postadressen ser inte ut som en riktig adress. Skriv t.ex. namn@exempel.se." };
  }
  if (!verdict.ok) {
    const domain = normalizeEmail(email).split("@")[1] || "domänen";
    return { ok: false, error: `Domänen "${domain}" kan inte ta emot e-post. Använd en adress du verkligen har.` };
  }

  const taken = await prisma.profile
    .findUnique({ where: { username: name }, select: { id: true } })
    .catch(() => null);
  if (taken) return { ok: false, error: "Användarnamnet är upptaget — välj ett annat." };

  return { ok: true };
}

/**
 * Create the profile row every page needs.
 *
 * This is the real gate. A profile is what makes an account usable in QuizKeen
 * (every page redirects back to /register without one), so an address that
 * ducked the form — or a browser that skipped it — never gets one, and the
 * orphaned auth user is deleted again so the address stays free to retry.
 */
export async function createProfile(
  userId: string,
  username: string,
  role: "STUDENT" | "TEACHER"
): Promise<ProfileResult> {
  const name = (username || "").trim();
  if (!USERNAME_RE.test(name)) return { ok: false, error: "Ogiltigt användarnamn." };

  // Ask the auth service what address this account actually has, instead of
  // trusting anything the browser sent us.
  let email = "";
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    email = normalizeEmail(data?.user?.email ?? "");
  } catch {
    email = "";
  }

  const verdict = email ? await checkEmail(email) : { ok: false as const };
  if (!verdict.ok) {
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    return {
      ok: false,
      error: "E-postadressen kunde inte verifieras, så kontot skapades inte. Använd en riktig adress.",
    };
  }

  try {
    await prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, username: name, role },
    });
  } catch {
    // Almost always the unique username running into someone else's.
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    return { ok: false, error: "Användarnamnet är upptaget — välj ett annat." };
  }

  return { ok: true };
}
