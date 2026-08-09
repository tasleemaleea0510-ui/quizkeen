"use server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function updateUsername(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const username = (formData.get("username") as string)?.trim();
  if (!username || username.length < 3) redirect("/settings");

  try {
    await prisma.profile.update({ where: { id: user.id }, data: { username } });
  } catch {}
  redirect("/settings");
}