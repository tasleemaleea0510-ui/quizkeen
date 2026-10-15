/**
 * Temporary: creates (or deletes) a throwaway account so the Keens pages can be
 * clicked through in a real browser session. Everything it writes is removed
 * again by `node scripts/keen-ui-account.mjs clean`.
 *
 *   node --env-file=.env.local scripts/keen-ui-account.mjs create
 *   node --env-file=.env.local scripts/keen-ui-account.mjs clean
 */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { persistSession: false } });

const EMAIL = "keen-uitest@example.com";
const PASSWORD = "Keen-UiTest-2026!";

const mode = process.argv[2] ?? "create";

if (mode === "create") {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error && !/already/i.test(error.message)) throw error;

  let id = data?.user?.id;
  if (!id) {
    const list = await admin.auth.admin.listUsers();
    id = list.data.users.find((u) => u.email === EMAIL)?.id;
  }
  if (!id) throw new Error("no user id");

  await admin.auth.admin.updateUserById(id, { password: PASSWORD });

  await prisma.profile.upsert({
    where: { id },
    update: { coins: 5000, coinsFrozen: false, tosAccepted: true, lastFreePackAt: null },
    create: { id, username: `uitest${Date.now().toString(36).slice(-5)}`, role: "STUDENT", coins: 5000, tosAccepted: true },
  });

  console.log(JSON.stringify({ id, email: EMAIL, password: PASSWORD }));
} else {
  const list = await admin.auth.admin.listUsers();
  const user = list.data.users.find((u) => u.email === EMAIL);
  if (user) {
    await prisma.keenOpen.deleteMany({ where: { profileId: user.id } }).catch(() => {});
    await prisma.profileKeen.deleteMany({ where: { profileId: user.id } }).catch(() => {});
    const p = await prisma.profile.findUnique({ where: { id: user.id }, select: { username: true } });
    if (p) await prisma.activity.deleteMany({ where: { username: p.username } }).catch(() => {});
    await prisma.profile.deleteMany({ where: { id: user.id } }).catch(() => {});
    const { error } = await admin.auth.admin.deleteUser(user.id);
    console.log("deleted auth user", user.id, error?.message ?? "ok");
  } else {
    console.log("no test user found");
  }
  const left = await prisma.profileKeen.count().catch(() => -1);
  console.log("remaining ProfileKeen rows:", left);
}

await prisma.$disconnect();
