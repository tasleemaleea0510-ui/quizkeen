import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const stmts = [
  `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "accentColor" TEXT`,
  `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "lastIp" TEXT`,
  `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "ipCountry" TEXT`,
  `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "ipCountryCode" TEXT`,
  `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "ipCity" TEXT`,
  `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "ipAt" TIMESTAMP(3)`,
  `CREATE TABLE IF NOT EXISTS "CoinGrant" (
     "id" TEXT NOT NULL,
     "staffId" TEXT NOT NULL,
     "staffName" TEXT NOT NULL,
     "targetId" TEXT NOT NULL,
     "targetName" TEXT NOT NULL,
     "amount" INTEGER NOT NULL,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "CoinGrant_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE INDEX IF NOT EXISTS "CoinGrant_staffId_targetId_createdAt_idx" ON "CoinGrant"("staffId","targetId","createdAt")`,
  `CREATE INDEX IF NOT EXISTS "CoinGrant_createdAt_idx" ON "CoinGrant"("createdAt")`,
];
for (const sql of stmts) {
  await db.$executeRawUnsafe(sql);
  console.log("ok:", sql.split("\n")[0].slice(0, 70));
}
const [{ n }] = await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "Profile"`);
console.log("profiles:", n);
const roles = await db.$queryRawUnsafe(`SELECT role, count(*)::int AS n FROM "Profile" GROUP BY role ORDER BY role`);
console.log(roles);
await db.$disconnect();
