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

export async function createAssignment(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || profile.role !== "TEACHER") return;
  const classroomId = formData.get("classroomId") as string;
  const quizId = formData.get("quizId") as string;
  const room = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!room || (room.ownerId !== user.id && room.coTeacherId !== user.id)) return;
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return;
  const due = formData.get("dueDate") as string;
  const bonus = parseInt(formData.get("bonusXP") as string) || 20;
  const provlage = formData.get("provlage") === "on";
  await prisma.assignment.create({
    data: {
      title: `📝 ${quiz.title}`,
      classroomId,
      quizId,
      dueDate: due ? new Date(due) : null,
      bonusXP: bonus,
      provlage,
    },
  });
  revalidatePath("/classroom");
}

export async function setQuizPrivate(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const quizId = formData.get("quizId") as string;
  const classroomId = formData.get("classroomId") as string;
  const on = formData.get("on") === "1";
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.creatorId !== user.id) return;
  await prisma.quiz.update({ where: { id: quizId }, data: { isPrivate: on, classroomId: on ? classroomId : null } });
  revalidatePath("/classroom");
}

export async function getLexa(assignmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const a = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { quiz: { include: { questions: { include: { answers: true } } } }, classroom: true },
  });
  if (!a || !a.quiz) return null;
  const enrolled = await prisma.enrollment.findUnique({
    where: { classroomId_studentId: { classroomId: a.classroomId, studentId: user.id } },
  });
  if (!enrolled) return null;
  const done = await prisma.assignmentCompletion.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
  });
  const questions = [...a.quiz.questions]
    .sort(() => Math.random() - 0.5)
    .map((q) => ({
      id: q.id,
      text: q.text,
      answers: [...q.answers].sort(() => Math.random() - 0.5).map((an) => ({ id: an.id, text: an.text, isCorrect: an.isCorrect })),
    }));
  return {
    title: a.title,
    dueDate: a.dueDate ? a.dueDate.toISOString() : null,
    provlage: a.provlage,
    bonusXP: a.bonusXP,
    questions,
    doneScore: done ? done.score : null,
  };
}

export async function completeLexa(assignmentId: string, correct: number, total: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const a = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!a) return { ok: false };
  const enrolled = await prisma.enrollment.findUnique({
    where: { classroomId_studentId: { classroomId: a.classroomId, studentId: user.id } },
  });
  if (!enrolled) return { ok: false };
  const done = await prisma.assignmentCompletion.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
  });
  if (done) return { ok: false, msg: a.provlage ? "❌ Prov-läge: endast ETT försök!" : "Redan gjord!" };
  const score = Math.round((correct / Math.max(1, total)) * 100);
  const xp = correct * 10 + a.bonusXP;
  await prisma.assignmentCompletion.create({ data: { assignmentId, studentId: user.id, score } });
  const p = await prisma.profile.findUnique({ where: { id: user.id } });
  if (p) {
    const newXp = p.xp + xp;
    await prisma.profile.update({
      where: { id: user.id },
      data: { xp: newXp, coins: p.coins + correct * 2, level: Math.floor(newXp / 100) + 1 },
    });
  }
  return { ok: true, score, xp };
}