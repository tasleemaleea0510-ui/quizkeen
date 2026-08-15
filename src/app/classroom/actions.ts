"use server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClassroom(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || profile.role !== "TEACHER") return;
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  await prisma.classroom.create({
    data: { name, description: (formData.get("description") as string)?.trim() || null, joinCode, ownerId: user.id },
  });
  revalidatePath("/classroom");
}

export async function joinClassroom(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const room = await prisma.classroom.findUnique({ where: { joinCode: code } });
  if (!room) return;
  const existing = await prisma.enrollment.findUnique({
    where: { classroomId_studentId: { classroomId: room.id, studentId: user.id } },
  });
  if (existing) return;
  await prisma.enrollment.create({ data: { classroomId: room.id, studentId: user.id } });
  revalidatePath("/classroom");
}

export async function addCoTeacher(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const roomId = formData.get("roomId") as string;
  const username = (formData.get("username") as string)?.trim();
  const room = await prisma.classroom.findUnique({ where: { id: roomId } });
  if (!room || room.ownerId !== user.id) return;
  const teacher = await prisma.profile.findUnique({ where: { username } });
  if (!teacher || teacher.role !== "TEACHER") return;
  await prisma.classroom.update({ where: { id: roomId }, data: { coTeacherId: teacher.id } });
  revalidatePath("/classroom");
}