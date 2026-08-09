import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  const cookieStore = await cookies();
  const cookieNames = cookieStore.getAll().map((c: any) => c.name);
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  const info = {
    cookies: cookieNames,
    userEmail: data.user?.email ?? null,
    authError: error?.message ?? null,
  };
  return (
    <pre className="bg-white p-8 text-black whitespace-pre-wrap">
      {JSON.stringify(info, null, 2)}
    </pre>
  );
}