import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const rows = await db.profile.findMany({ where: { username: { contains: "Abdullah", mode: "insensitive" } }, select: { username: true, role: true } });
console.log(rows.map(r => JSON.stringify(r.username) + " " + r.role));
await db.$disconnect();
