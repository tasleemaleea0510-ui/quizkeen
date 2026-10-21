import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const rows = await db.activity.findMany({ orderBy: { createdAt: "desc" }, take: 8 });
console.log(rows.map(r => `${r.username} :: ${r.action}`));
await db.$disconnect();
