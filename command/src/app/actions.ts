"use server";
import { prisma } from "@/lib/prisma";

export async function unlock(code: string, kind: "OWNER" | "ADMIN" | "SECURITY") {
  const s = await prisma.adminSettings.findUnique({ where: { id: 1 } });
  if (!s) return { ok: false as const };
  if (kind === "OWNER" && code.trim() === s.ownerCode) return { ok: true as const, role: "OWNER" as const, code: s.ownerCode };
  if (kind === "ADMIN" && code.trim() === s.adminCode) return { ok: true as const, role: "ADMIN" as const, code: s.adminCode };
  if (kind === "SECURITY" && code.trim() === s.securityCode) return { ok: true as const, role: "SECURITY" as const, code: s.securityCode };
  return { ok: false as const };
}