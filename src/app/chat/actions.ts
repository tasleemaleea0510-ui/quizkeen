"use server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return prisma.profile.findUnique({ where: { id: user.id } });
}

async function canSee(p: any, channel: string): Promise<boolean> {
  if (["OWNER", "ADMIN", "SECURITY"].includes(p.role)) return true;
  if (channel.startsWith("CLASS|")) {
    const room = await prisma.classroom.findUnique({ where: { id: channel.slice(6) }, include: { enrollments: true } });
    if (!room) return false;
    return room.ownerId === p.id || room.coTeacherId === p.id || room.enrollments.some((s) => s.studentId === p.id);
  }
  if (channel.startsWith("TS|") || channel.startsWith("DM|")) {
    const parts = channel.split("|");
    return p.username === parts[1] || p.username === parts[2];
  }
  if (channel.startsWith("STU|")) return true;
  return false;
}

export async function getChatHub() {
  const p = await me();
  if (!p) return null;
  const enr = await prisma.enrollment.findMany({ where: { studentId: p.id }, include: { classroom: { include: { owner: { select: { username: true } } } } } });
  const classes = enr.map((e) => ({ id: e.classroom.id, name: e.classroom.name, teacher: e.classroom.owner.username }));
  let students: string[] = [];
  if (p.role === "TEACHER" || p.role === "OWNER") {
    const rooms = await prisma.classroom.findMany({
      where: p.role === "TEACHER" ? { OR: [{ ownerId: p.id }, { coTeacherId: p.id }] } : {},
      include: { enrollments: { include: { student: { select: { username: true } } } } },
    });
    const set = new Set<string>();
    rooms.forEach((r) => r.enrollments.forEach((s) => set.add(s.student.username)));
    students = Array.from(set);
  }
  const reqs = await prisma.chatRequest.findMany({ where: { OR: [{ toUser: p.username }, { fromUser: p.username }] }, orderBy: { createdAt: "desc" }, take: 30 });
  return {
    username: p.username,
    role: p.role,
    classes,
    students,
    reqs: reqs.map((r) => ({ id: r.id, from: r.fromUser, to: r.toUser, status: r.status })),
  };
}

export async function getChat(channel: string) {
  const p = await me();
  if (!p || !(await canSee(p, channel))) return null;
  let where: any = { channel };
  if (channel.startsWith("STU|") && !["OWNER", "ADMIN", "SECURITY"].includes(p.role)) {
    where = { channel, OR: [{ fromRole: p.username }, { fromRole: channel.split("|")[1] }] };
  }
  const msgs = await prisma.staffChat.findMany({ where, orderBy: { createdAt: "asc" }, take: 100 });
  return msgs.map((m) => ({ id: m.id, from: m.fromRole, text: m.text, createdAt: m.createdAt.toISOString() }));
}

export async function sendTo(channel: string, text: string) {
  const p = await me();
  if (!p || !(await canSee(p, channel)) || !text.trim()) return { ok: false };
  await prisma.staffChat.create({ data: { channel, fromRole: p.username, text: text.trim().slice(0, 500) } });
  return { ok: true };
}

export async function requestChat(toUser: string) {
  const p = await me();
  if (!p) return { ok: false, info: "❌ Logga in!" };
  const target = await prisma.profile.findUnique({ where: { username: toUser.trim() } });
  if (!target || target.username === p.username) return { ok: false, info: "❌ Hittade inte användaren!" };
  const existing = await prisma.chatRequest.findFirst({ where: { fromUser: p.username, toUser: target.username, status: "PENDING" } });
  if (existing) return { ok: false, info: "⏳ Förfrågan redan skickad!" };
  await prisma.chatRequest.create({ data: { fromUser: p.username, toUser: target.username } });
  await prisma.profile.update({ where: { id: target.id }, data: { passwordNote: `🔔 ${p.username} vill chatta med dig! Öppna 💬 Chat för att godkänna eller avslå.` } });
  return { ok: true, info: `📨 Förfrågan skickad till ${target.username}!` };
}

export async function respondChat(id: string, accept: boolean) {
  const p = await me();
  if (!p) return { ok: false };
  const r = await prisma.chatRequest.findUnique({ where: { id } });
  if (!r || r.toUser !== p.username || r.status !== "PENDING") return { ok: false };
  await prisma.chatRequest.update({ where: { id }, data: { status: accept ? "ACCEPTED" : "DECLINED" } });
  return { ok: true, info: accept ? `✅ Nu chattar du med ${r.fromUser}!` : "❌ Förfrågan avslagen." };
}