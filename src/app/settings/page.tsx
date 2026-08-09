import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateUsername } from "./actions";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile) redirect("/register");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-extrabold">⚙️ Settings</h1>

      <Card>
        <CardHeader><CardTitle>👤 Profile</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <p><span className="text-slate-400">Username:</span> <b>{profile.username}</b></p>
          <p><span className="text-slate-400">Role:</span> <b>{profile.role === "TEACHER" ? "🍎 Teacher" : "🎒 Student"}</b></p>
          <p><span className="text-slate-400">Joined:</span> <b>{profile.createdAt.toLocaleDateString()}</b></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>📊 Stats</CardTitle></CardHeader>
        <CardContent className="flex gap-8 text-2xl font-extrabold">
          <span className="text-indigo-400">Lv {profile.level}</span>
          <span className="text-emerald-400">{profile.xp} XP</span>
          <span className="text-amber-400">{profile.coins} 🪙</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>✏️ Change Username</CardTitle></CardHeader>
        <CardContent>
          <form action={updateUsername} className="flex gap-2">
            <Input name="username" defaultValue={profile.username} minLength={3} required />
            <Button type="submit">💾 Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}