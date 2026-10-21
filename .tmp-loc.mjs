import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const p = await db.profile.update({
  where: { username: "ModTestTarget" },
  data: { lastIp: "95.123.45.67", ipCountry: "Sweden", ipCountryCode: "SE", ipCity: "Stockholm", ipAt: new Date() },
});
console.log(p.ipCountryCode, p.ipCity, p.lastIp);
await db.$disconnect();
