"use server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeColor } from "@/lib/moderation";

export async function getMyUsername(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "";
  const p = await prisma.profile.findUnique({ where: { id: user.id } });
  return p?.username ?? "";
}

export async function updateUsername(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const username = (formData.get("username") as string)?.trim();
  if (!username || username.length < 3) redirect("/settings?msg=short");

  const existing = await prisma.profile.findUnique({ where: { username } });
  if (existing && existing.id !== user.id) redirect("/settings?msg=taken");

  await prisma.profile.update({ where: { id: user.id }, data: { username } });
  redirect("/settings?msg=saved");
}

/**
 * Your own name colour. Staff can also set it on other people from the
 * moderation panel; this is the self-service half, so a student who is handed
 * a colour can change or drop it without asking anyone.
 */
export async function updateAccentColor(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const raw = (formData.get("color") as string) || "";
  if (!raw.trim()) {
    await prisma.profile.update({ where: { id: user.id }, data: { accentColor: null } });
    redirect("/settings?msg=colorcleared");
  }

  const color = normalizeColor(raw);
  if (!color) redirect("/settings?msg=colorbad");

  await prisma.profile.update({ where: { id: user.id }, data: { accentColor: color } });
  redirect("/settings?msg=colorsaved");
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const password = formData.get("password") as string;
  if (!password || password.length < 6) redirect("/settings?msg=passshort");

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
  if (error) redirect(`/settings?msg=passerr&err=${encodeURIComponent(error.message)}`);
  redirect("/settings?msg=passsaved");
}