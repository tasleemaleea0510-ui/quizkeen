"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSupabase } from "@/components/providers";
import { signInWithName } from "./actions";
import { ArrowRight, User, Zap } from "lucide-react";

export default function LoginPage() {
  const { supabase } = useSupabase();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signInWithName(identifier, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      // The session is handed to the browser client, which is the thing that
      // owns the cookie jar. Relying on the action's own Set-Cookie was why a
      // successful sign-in landed straight back on this page.
      const { error: sessionError } = await supabase.auth.setSession(result.session);
      if (sessionError) {
        setError("Inloggningen lyckades men sessionen kunde inte sparas. Försök igen.");
        return;
      }

      // A full reload so every server component reads the new cookie.
      window.location.href = "/dashboard";
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_14px_34px_-14px_rgba(99,102,241,0.95)] ring-1 ring-inset ring-white/20">
          <Zap className="h-6 w-6 text-white" strokeWidth={2.5} />
        </span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">Välkommen tillbaka!</h1>
        <p className="mt-2 text-sm text-slate-400">Logga in med ditt namn — e-post funkar också.</p>
      </div>

      <Card className="animate-fade-up">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-slate-300">Konto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label
                htmlFor="login-name"
                className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-400"
              >
                Namn eller e-post
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="login-name"
                  placeholder="Abdullah"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-400"
              >
                Lösenord
              </label>
              <Input
                id="login-password"
                type="password"
                placeholder="Ditt lösenord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full gap-2" disabled={pending}>
              {pending ? "Loggar in..." : "Logga in"}
              {!pending && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-400">
            Har inget konto?{" "}
            <Link href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Skapa konto
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
