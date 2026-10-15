"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createProfile, checkRegistration } from "./actions";
import { authErrorSv } from "@/lib/auth-messages";
import { GraduationCap, School, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Server-side gate first: a real email shape, a domain that can receive
    // mail, and a free username. Nothing is created until it passes.
    const gate = await checkRegistration(email, username).catch(() => null);
    if (!gate) {
      setError("Kunde inte nå servern — försök igen.");
      setLoading(false);
      return;
    }
    if (!gate.ok) {
      setError(gate.error);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
    if (error) {
      setError(authErrorSv(error.message));
      setLoading(false);
      return;
    }

    if (data.user) {
      const made = await createProfile(data.user.id, username, role, email).catch(() => null);
      if (!made) {
        setError("Kunde inte skapa profilen — försök igen.");
        setLoading(false);
        return;
      }
      if (!made.ok) {
        // createProfile removes the half-made account again, so drop the
        // session too and let them correct the form.
        await supabase.auth.signOut().catch(() => {});
        setError(made.error);
        setLoading(false);
        return;
      }
    }

    // With email confirmation switched on in Supabase there is no session yet.
    if (!data.session) {
      setSent(true);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
        <Card className="animate-fade-up">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-slate-300">Nästan klart!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>
              Vi har skickat ett mejl till <b className="text-white" data-no-translate>{email}</b>. Öppna det och tryck
              på länken för att aktivera kontot.
            </p>
            <p className="text-slate-400">Hittar du inget mejl? Kolla skräpposten. Adressen måste vara en riktig adress som du äger.</p>
            <Link href="/login" className="inline-block font-semibold text-indigo-400 hover:text-indigo-300">
              Till inloggningen
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow">
          <Zap className="h-6 w-6 text-white" strokeWidth={2.5} />
        </span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">Gå med i QuizKeen!</h1>
        <p className="mt-1.5 text-sm text-slate-400">Skapa ett konto och börja spela på under en minut.</p>
      </div>
      <Card className="animate-fade-up">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-slate-300">Skapa konto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-3.5">
            <Input placeholder="Användarnamn" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Lösenord (6+ tecken)" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-1.5">
              {(["STUDENT", "TEACHER"] as const).map((r) => {
                const Icon = r === "STUDENT" ? GraduationCap : School;
                const active = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
                      active
                        ? "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-glow-sm"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{r === "STUDENT" ? "Elev" : "Lärare"}</span>
                  </button>
                );
              })}
            </div>
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Skapar konto..." : "Skapa konto — Gratis"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-400">
            Redan medlem?{" "}
            <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Logga in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
