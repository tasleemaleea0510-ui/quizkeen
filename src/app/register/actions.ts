"use server";
import { prisma } from "@/lib/prisma";

export async function createProfile(userId: string, username: string, role: "STUDENT" | "TEACHER") {
  await prisma.profile.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, username, role },
  });
}