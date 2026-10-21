import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const p = await db.profile.update({ where: { username: "ModTestStaff" }, data: { role: "SECURITY" } });
console.log(p.username, p.role);
await db.$disconnect();
