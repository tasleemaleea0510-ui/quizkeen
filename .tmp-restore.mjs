import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const before = await db.profile.findUnique({ where: { username: "NickLikesDogs" }, select: { warnings: true } });
console.log("before:", before);
const upd = await db.profile.update({ where: { username: "NickLikesDogs" }, data: { warnings: 0 } });
console.log("restored warnings to:", upd.warnings);
const del = await db.activity.deleteMany({
  where: { username: "[ADMIN]", action: "varnade NickLikesDogs (1/3)", createdAt: { gte: new Date(Date.now() - 10 * 60_000) } },
});
console.log("removed accidental log rows:", del.count);
await db.$disconnect();
