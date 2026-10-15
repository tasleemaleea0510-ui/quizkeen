import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const n = await p.profile.count();
const ex = await p.profile.findMany({ select: { username: true, coins: true, role: true }, take: 4, orderBy: { createdAt: "asc" } });
console.log("profiles:", n, ex);
const top = await p.profile.findMany({ select: { username: true, coins: true }, orderBy: { coins: "desc" }, take: 5 });
console.log("richest:", top);
await p.$disconnect();
