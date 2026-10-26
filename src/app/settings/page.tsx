import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateUsername, updatePassword } from "./actions";
import ColorForm from "./color-form";
import { ROLE_THEME } from "@/lib/roles";
import { Settings, User, BarChart3, Key, Edit3, Save, Coins, Zap, Award, Palette } from "lucide-react";

const MESSAGES: Record<string, { text: string; ok: boolean }> = {
  taken: { text: "Användarnamnet är redan upptaget. Välj ett annat.", ok: false },
  short: { text: "Användarnamnet måste vara minst 3 tecken.", ok: false },
  saved: { text: "Användarnamnet har uppdaterats.", ok: true },
  passshort: { text: "Lösenordet måste vara minst 6 tecken.", ok: false },
  passsaved: { text: "Lösenordet har ändrats.", ok: true },
  passerr: { text: "Kunde inte byta lösenord just nu. Försök igen om en stund.", ok: false },
  colorsaved: { text: "Din färg är sparad.", ok: true },
  colorcleared: { text: "Du använder rollens färg igen.", ok: true },
  colorbad: { text: "Den färgen gick inte att läsa. Välj en i listan.", ok: false },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { msg?: string; err?: string };
}) {
  const { user, profile } = await getViewer();
  if (!user) redirect("/login");
  if (!profile) redirect("/register");

  const msg = searchParams.msg ? MESSAGES[searchParams.msg] : undefined;
  const isRate = !!searchParams.err && /rate|limit|many|attempt/i.test(searchParams.err);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="flex items-center gap-3.5">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-indigo-400/30 bg-indigo-500/15 text-indigo-300">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="page-title">Inställningar</h1>
          <p className="mt-1 text-sm text-slate-400">Hantera konto, lösenord och profiluppgifter</p>
        </div>
      </div>

      {msg && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            msg.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      {searchParams.err && (
        <p className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-400">
          {isRate
            ? "Spärr: För många lösenordsbyten på kort tid. Vänta några minuter och försök igen."
            : `Information: ${searchParams.err}`}
        </p>
      )}

      <Card className="border-slate-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-400" />
            <span>Profil</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-slate-400">Användarnamn:</span> <b className="text-white">{profile.username}</b></p>
          <p>
            <span className="text-slate-400">Roll:</span>{" "}
            <b className={ROLE_THEME[profile.role]?.color ?? "text-white"}>
              {ROLE_THEME[profile.role]?.label ?? profile.role}
            </b>
          </p>
          <p><span className="text-slate-400">Registrerad:</span> <b className="text-white">{profile.createdAt.toLocaleDateString("sv-SE")}</b></p>
        </CardContent>
      </Card>

      <Card className="border-slate-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
            <span>Statistik</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-8 text-2xl font-extrabold">
          <div className="flex items-center gap-2 text-indigo-400">
            <Award className="h-5 w-5" />
            <span>Lv {profile.level}</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <Zap className="h-5 w-5" />
            <span>{profile.xp} XP</span>
          </div>
          <div className="flex items-center gap-2 text-amber-400">
            <Coins className="h-5 w-5" />
            <span>{profile.coins} mynt</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-indigo-400" />
            <span>Din färg</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ColorForm initial={profile.accentColor} />
        </CardContent>
      </Card>

      <Card className="border-slate-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-indigo-400" />
            <span>Byt användarnamn</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateUsername} className="flex gap-2.5">
            <Input name="username" defaultValue={profile.username} minLength={3} required className="max-w-xs" />
            <Button type="submit" className="gap-1.5 bg-indigo-600 hover:bg-indigo-500">
              <Save className="h-4 w-4" />
              <span>Spara</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4 text-indigo-400" />
            <span>Byt lösenord</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updatePassword} className="flex gap-2.5">
            <Input name="password" type="password" placeholder="Nytt lösenord (6+ tecken)" minLength={6} required className="max-w-xs" />
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500">
              Uppdatera
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}