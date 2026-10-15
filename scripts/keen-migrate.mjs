/**
 * Temporary: applies the Keens schema (Profile.lastFreePackAt, ProfileKeen,
 * KeenOpen) over the pooled connection the app itself uses, because
 * `prisma db push` hangs against Supabase's pgBouncer port. Idempotent, and the
 * DDL matches what Prisma generates so a later db push sees no drift.
 * Deleted once the tables exist.
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const statements = [
  `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "lastFreePackAt" TIMESTAMP(3)`,
  `CREATE TABLE IF NOT EXISTS "ProfileKeen" (
     "id" TEXT NOT NULL,
     "profileId" TEXT NOT NULL,
     "keenId" TEXT NOT NULL,
     "count" INTEGER NOT NULL DEFAULT 1,
     "firstAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "ProfileKeen_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ProfileKeen_profileId_keenId_key" ON "ProfileKeen"("profileId", "keenId")`,
  `CREATE INDEX IF NOT EXISTS "ProfileKeen_profileId_idx" ON "ProfileKeen"("profileId")`,
  `CREATE INDEX IF NOT EXISTS "ProfileKeen_keenId_idx" ON "ProfileKeen"("keenId")`,
  `DO $$ BEGIN
     ALTER TABLE "ProfileKeen" ADD CONSTRAINT "ProfileKeen_profileId_fkey"
       FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "KeenOpen" (
     "id" TEXT NOT NULL,
     "profileId" TEXT NOT NULL,
     "username" TEXT NOT NULL,
     "packId" TEXT NOT NULL,
     "keenId" TEXT NOT NULL,
     "rarity" TEXT NOT NULL,
     "isNew" BOOLEAN NOT NULL DEFAULT true,
     "refund" INTEGER NOT NULL DEFAULT 0,
     "spent" INTEGER NOT NULL DEFAULT 0,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "KeenOpen_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE INDEX IF NOT EXISTS "KeenOpen_profileId_createdAt_idx" ON "KeenOpen"("profileId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "KeenOpen_createdAt_idx" ON "KeenOpen"("createdAt")`,
];

try {
  for (const sql of statements) {
    await p.$executeRawUnsafe(sql);
    console.log("ok:", sql.split("\n")[0].slice(0, 80));
  }

  const cols = await p.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'Profile' AND column_name = 'lastFreePackAt'`
  );
  const tables = await p.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('ProfileKeen','KeenOpen') ORDER BY table_name`
  );
  console.log("VERIFIED", JSON.stringify({ cols, tables }));
} catch (e) {
  console.error("FAILED:", e?.message ?? e);
  process.exitCode = 1;
} finally {
  await p.$disconnect();
}
