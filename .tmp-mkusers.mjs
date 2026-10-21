import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
const db = new PrismaClient();
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", { auth: { persistSession: false } });
const pw = "QkModTest!" + Math.random().toString(36).slice(2, 8);
const staffEmail = "qk-modtest-staff@example.com";
const targetEmail = "qk-modtest-target@example.com";

async function ensure(email, username, role) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true });
  if (error && !/already/i.test(error.message)) throw new Error(error.message);
  let id = data?.user?.id;
  if (!id) {
    const { data: list } = await admin.auth.admin.listUsers();
    id = list?.users?.find((u) => u.email === email)?.id;
  }
  if (!id) throw new Error("no auth id for " + email);
  await db.profile.upsert({
    where: { id },
    update: { role, username },
    create: { id, username, role },
  });
  return { id, username, role };
}

const staff = await ensure(staffEmail, "ModTestStaff", "ADMIN");
const target = await ensure(targetEmail, "ModTestTarget", "STUDENT");
console.log(JSON.stringify({ pw, staff, target }));
await db.$disconnect();
