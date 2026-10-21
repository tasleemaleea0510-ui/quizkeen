import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
const db = new PrismaClient();
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", { auth: { persistSession: false } });

const staff = await db.profile.findUnique({ where: { username: "ModTestStaff" }, select: { id: true } });
const target = await db.profile.findUnique({ where: { username: "ModTestTarget" }, select: { id: true } });
const ids = [staff?.id, target?.id].filter(Boolean);

console.log("coin grants removed:", (await db.coinGrant.deleteMany({ where: { OR: [{ targetName: { contains: "ModTest" } }, { staffName: { contains: "ModTest" } }] } })).count);
console.log("activity removed:", (await db.activity.deleteMany({ where: { OR: [{ action: { contains: "ModTest" } }, { username: { contains: "ModTest" } }] } })).count);
console.log("page visits removed:", (await db.pageVisit.deleteMany({ where: { username: { contains: "ModTest" } } })).count);
console.log("profiles removed:", (await db.profile.deleteMany({ where: { id: { in: ids } } })).count);

for (const email of ["qk-modtest-staff@example.com", "qk-modtest-target@example.com"]) {
  const { data } = await admin.auth.admin.listUsers();
  const u = data?.users?.find((x) => x.email === email);
  if (u) {
    const { error } = await admin.auth.admin.deleteUser(u.id);
    console.log("auth delete", email, error ? error.message : "ok");
  } else {
    console.log("auth delete", email, "not found");
  }
}

const [{ n }] = await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "Profile"`);
console.log("profiles remaining:", n);
const nick = await db.profile.findUnique({ where: { username: "NickLikesDogs" }, select: { warnings: true } });
console.log("NickLikesDogs warnings:", nick?.warnings);
await db.$disconnect();
