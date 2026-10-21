import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const rows = await db.profile.findMany({
  where: { OR: [{ username: { in: ["ModTestStaff", "ModTestTarget", "NickLikesDogs"] } }] },
  select: { username: true, coins: true, warnings: true, bannedUntil: true, chatMutedUntil: true, accentColor: true, pinned: true },
});
console.log(rows);
const log = await db.activity.findMany({ orderBy: { createdAt: "desc" }, take: 12 });
console.log(log.map(l => `${l.username} :: ${l.action}`));
const grants = await db.coinGrant.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
console.log(grants);
await db.$disconnect();
