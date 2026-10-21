import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const day = new Date(); day.setUTCHours(0,0,0,0);

const rows = await db.profile.findMany({
  orderBy: [{ pinned: "desc" }, { lastSeenAt: { sort: "desc", nulls: "last" } }],
  take: 300,
  select: { id: true, username: true, role: true, accentColor: true, lastIp: true, ipCountry: true, ipCountryCode: true, ipCity: true, ipAt: true },
});
console.log("ordered list ok, rows:", rows.length);
console.log("first 3:", rows.slice(0,3).map(r => `${r.username}(${r.role})`).join(", "));

const admin = rows.find(r => r.role === "ADMIN");
const student = rows.find(r => r.role === "STUDENT");
console.log("admin:", admin?.username, "student:", student?.username);

const grant = await db.coinGrant.create({
  data: { staffId: admin.id, staffName: admin.username, targetId: student.id, targetName: student.username, amount: 100 },
});
const grouped = await db.coinGrant.groupBy({
  by: ["targetId"],
  where: { staffId: admin.id, createdAt: { gte: day } },
  _sum: { amount: true },
});
console.log("groupBy today:", grouped.map(g => `${g.targetId.slice(0,6)}…=${g._sum.amount}`));

const agg = await db.coinGrant.aggregate({
  where: { staffId: admin.id, targetId: student.id, createdAt: { gte: day } },
  _sum: { amount: true },
});
console.log("admin budget used for one target:", agg._sum.amount, "of 1000");

await db.coinGrant.delete({ where: { id: grant.id } });
console.log("ledger row cleaned up:", (await db.coinGrant.count({ where: { id: grant.id } })) === 0);

// Touch the new columns without changing anything.
const owner = rows.find(r => r.role === "OWNER");
await db.profile.update({ where: { id: owner.id }, data: { accentColor: owner.accentColor, ipCountry: owner.ipCountry } });
console.log("new columns writable (unchanged values)");
await db.$disconnect();
