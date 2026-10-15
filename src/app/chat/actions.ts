"use server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function me() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return null;
    return await prisma.profile.findUnique({ where: { id: data.user.id } });
  } catch (e) {
    return null;
  }
}

/**
 * "Tysta chatten" in the staff consoles writes `chatMutedUntil`.
 * 0 minutes means "for all time" and is stored as the year 2099, so anything
 * past that date is permanent. Returns null when the user may talk.
 */
function mutedMessage(until: Date | null | undefined): string | null {
  if (!until) return null;
  const now = Date.now();
  const end = new Date(until).getTime();
  if (!Number.isFinite(end) || end <= now) return null;
  if (new Date(until).getFullYear() >= 2099) return "Du är tystad i chatten för alltid av personalen.";
  const mins = Math.max(1, Math.ceil((end - now) / 60000));
  if (mins >= 60) return `Du är tystad i chatten i ca ${Math.ceil(mins / 60)} tim av personalen.`;
  return `Du är tystad i chatten i ${mins} min av personalen.`;
}

/** The one channel a muted user may still use: their line to staff. */
function isStaffLine(channel: string) {
  return channel.startsWith("STU|");
}

/**
 * Ghost mode ("Osynlig" in the security console) hides a user's messages in the
 * shared rooms. Two-person conversations (TS|, DM|) are left alone, because a
 * message that silently never arrives would look like a bug to the other side.
 */
function isPrivateLine(channel: string) {
  return channel.startsWith("TS|") || channel.startsWith("DM|");
}

async function canSee(p: any, channel: string): Promise<boolean> {
  try {
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
  } catch (e) {
    return false;
  }
}

export async function getChatHub() {
  try {
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
      rooms.forEach((r) => r.enrollments.forEach((s) => { if (s.student.username !== p.username) set.add(s.student.username); }));
      students = Array.from(set);
    }
    const reqs = await prisma.chatRequest.findMany({ where: { OR: [{ toUser: p.username }, { fromUser: p.username }] }, orderBy: { createdAt: "desc" }, take: 30 });
    return {
      username: p.username,
      role: p.role,
      classes,
      students,
      reqs: reqs.map((r) => ({ id: r.id, from: r.fromUser, to: r.toUser, status: r.status })),
      muted: mutedMessage(p.chatMutedUntil),
    };
  } catch (e) {
    return null;
  }
}

export async function getChat(channel: string) {
  try {
    const p = await me();
    if (!p || !(await canSee(p, channel))) return null;
    const isStaff = ["OWNER", "ADMIN", "SECURITY"].includes(p.role);
    let where: any = { channel };
    if (channel.startsWith("STU|") && !isStaff) {
      where = { channel, OR: [{ fromRole: p.username }, { fromRole: channel.split("|")[1] }] };
    }
    const [msgs, ghosted] = await Promise.all([
      prisma.staffChat.findMany({ where, orderBy: { createdAt: "asc" }, take: 100 }),
      // Staff see everything (that is what the tool is for); a ghosted user sees
      // their own messages so the chat doesn't look broken to them.
      prisma.profile.findMany({ where: { ghostMode: true }, select: { username: true } }),
    ]);
    const hidden = new Set(ghosted.map((g) => g.username));
    const show = (m: { fromRole: string }) =>
      isStaff || isPrivateLine(channel) || m.fromRole === p.username || !hidden.has(m.fromRole);
    return msgs
      .filter(show)
      .map((m) => ({ id: m.id, from: m.fromRole, text: m.text, createdAt: m.createdAt.toISOString() }));
  } catch (e) {
    return [];
  }
}

export async function sendTo(channel: string, text: string) {
  try {
    const p = await me();
    if (!p || !(await canSee(p, channel)) || !text.trim()) return { ok: false };
    const muted = isStaffLine(channel) ? null : mutedMessage(p.chatMutedUntil);
    if (muted) return { ok: false, info: muted };
    await prisma.staffChat.create({ data: { channel, fromRole: p.username, text: text.trim().slice(0, 500) } });
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
}

export async function requestChat(toUser: string) {
  try {
    const p = await me();
    if (!p) return { ok: false, info: "Du måste vara inloggad." };
    const target = await prisma.profile.findUnique({ where: { username: toUser.trim() } });
    if (!target || target.username === p.username) return { ok: false, info: "Kunde inte hitta användaren." };
    const existing = await prisma.chatRequest.findFirst({ where: { fromUser: p.username, toUser: target.username, status: "PENDING" } });
    if (existing) return { ok: false, info: "Förfrågan är redan skickad." };
    await prisma.chatRequest.create({ data: { fromUser: p.username, toUser: target.username } });
    await prisma.profile.update({ where: { id: target.id }, data: { passwordNote: `${p.username} vill chatta med dig! Öppna chatten för att svara.` } });
    return { ok: true, info: `Förfrågan skickad till ${target.username}.` };
  } catch (e) {
    return { ok: false, info: "Ett fel uppstod vid skapande av förfrågan." };
  }
}

export async function respondChat(id: string, accept: boolean) {
  try {
    const p = await me();
    if (!p) return { ok: false };
    const r = await prisma.chatRequest.findUnique({ where: { id } });
    if (!r || r.toUser !== p.username || r.status !== "PENDING") return { ok: false };
    await prisma.chatRequest.update({ where: { id }, data: { status: accept ? "ACCEPTED" : "DECLINED" } });
    return { ok: true, info: accept ? `Du chattar nu med ${r.fromUser}.` : "Förfrågan avslogs." };
  } catch (e) {
    return { ok: false };
  }
}