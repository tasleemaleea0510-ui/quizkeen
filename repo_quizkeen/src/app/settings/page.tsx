import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateUsername, updatePassword } from "./actions";

const MESSAGES: Record<string, { text: string; ok: boolean }> = {
  taken: { text: "❌ Det användarnamnet är redan upptaget — någon var snabbare!", ok: false },
  short: { text: "❌ Användarnamnet måste vara minst 3 tecken.", ok: false },
  saved: { text: "✅ Användarnamn uppdaterat!", ok: true },
  passshort: { text: "❌ Lösenordet måste vara minst 6 tecken.", ok: false },
  passsaved: { text: "✅ Lösenord bytt!", ok: true },
  passerr: { text: "❌ Kunde inte byta lösenord just nu. Försök igen om en stund.", ok: false },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { msg?: string; err?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile) redirect("/register");

  const msg = searchParams.msg ? MESSAGES[searchParams.msg] : undefined;
  const isRate = !!searchParams.err && /rate|limit|many|attempt/i.test(searchParams.err);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-extrabold">⚙️ Inställningar</h1>

      {msg && (
        <div
          className={`rounded-xl border px-4 py-3 font-bold ${
            msg.ok
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
              : "border-red-500 bg-red-500/10 text-red-400"
          }`}
        >
          {msg.text}
        </div>
      )}

      {searchParams.err && (
        <p className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-400">
          {isRate
            ? "⏳ Supabase-spärr: för många lösenordsbyten på kort tid. Vänta ~10 minuter och försök igen — ditt konto är fortfarande säkert! 🔒"
            : `🔍 Debug: ${searchParams.err}`}
        </p>
      )}

      <Card>
        <CardHeader><CardTitle>👤 Profil</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <p><span className="text-slate-400">Användarnamn:</span> <b>{profile.username}</b></p>
          <p><span className="text-slate-400">Roll:</span> <b>{profile.role === "TEACHER" ? "🍎 Lärare" : "🎒 Elev"}</b></p>
          <p><span className="text-slate-400">Gick med:</span> <b>{profile.createdAt.toLocaleDateString("sv-SE")}</b></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>📊 Statistik</CardTitle></CardHeader>
        <CardContent className="flex gap-8 text-2xl font-extrabold">
          <span className="text-indigo-400">Lv {profile.level}</span>
          <span className="text-emerald-400">{profile.xp} XP</span>
          <span className="text-amber-400">{profile.coins} 🪙</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>✏️ Byt användarnamn</CardTitle></CardHeader>
        <CardContent>
          <form action={updateUsername} className="flex gap-2">
            <Input name="username" defaultValue={profile.username} minLength={3} required />
            <Button type="submit">💾 Spara</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>🔑 Byt lösenord</CardTitle></CardHeader>
        <CardContent>
          <form action={updatePassword} className="flex gap-2">
            <Input name="password" type="password" placeholder="Nytt lösenord (6+ tecken)" minLength={6} required />
            <Button type="submit">🔒 Uppdatera</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}