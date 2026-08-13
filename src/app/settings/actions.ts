"use server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

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

  const existing = await prisma.profile.findUnique({ where: username });
  if (existing && existing.id !== user.id) redirect("/settings?msg=taken");

  await prisma.profile.update({ where: { id: user.id }, data: { username } });
  redirect("/settings?msg=saved");
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const password = formData.get("password") as string;
  if (!password || password.length < 6) redirect("/settings?msg=passshort");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/settings?msg=passerr");
  redirect("/settings?msg=passsaved");
}