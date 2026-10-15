/** Temporary: read-only peek at the throwaway test account's Keen ledger. */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const profile = await p.profile.findFirst({
  where: { username: { startsWith: "uitest" } },
  select: { id: true, username: true, coins: true, lastFreePackAt: true },
});
if (!profile) {
  console.log("no test profile");
} else {
  const rows = await p.profileKeen.findMany({ where: { profileId: profile.id }, select: { keenId: true, count: true } });
  const opens = await p.keenOpen.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { packId: true, keenId: true, isNew: true, refund: true, spent: true, createdAt: true },
  });
  console.log(JSON.stringify({ profile: { ...profile, lastFreePackAt: !!profile.lastFreePackAt }, distinct: rows.length, rows, opens }, null, 1));
}
await p.$disconnect();
