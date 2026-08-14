"use server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function clearPasswordNote() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await prisma.profile.update({ where: { id: user.id }, data: { passwordNote: null } });
}

export async function getPasswordNote() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const p = await prisma.profile.findUnique({ where: { id: user.id }, select: { passwordNote: true } });
  return p?.passwordNote ?? null;
}

export async function logActivity(username: string, action: string) {
  await prisma.activity.create({ data: { username, action } });
}