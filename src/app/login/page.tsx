"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSupabase } from "@/components/providers";
import { signInWithName } from "./actions";
import WornKeen from "@/components/keens/worn-keen";
import { ArrowRight, User, Zap, Sparkles, Trophy, Flame, ShieldCheck } from "lucide-react";

/**
 * Drop every auth cookie the browser is holding, including half-written chunks
 * ("…-auth-token.0", ".1") and copies set for a parent domain.
 *
 * A long-lived browser can end up with two cookies of the same name, and the
 * server then reads the stale one while the browser shows the fresh one — the
 * sign-in lands on /dashboard and is billed back to /login in the same breath.
 * Clearing the jar before a new session is written removes that whole class of
 * failure, and costs nothing when there is nothing to clear.
 */
function clearStaleAuthCookies() {
  const host = window.location.hostname;
  const domains = [host, `.${host}`, `.${host.replace(/^[^.]+\./, "")}`];
  for (const part of document.cookie.split("; ")) {
    const name = part.split("=")[0];
    if (!name || !name.startsWith("sb-") || !name.includes("-auth-token")) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; path=/; max-age=0`;
      document.cookie = `${name}=; path=/; max-age=0; domain=${domain}`;
    }
  }
}

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
      clearStaleAuthCookies();
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

      // A full reload so every server component reads the new cookie;
      // `replace` keeps the login form out of the back button's history.
      window.location.replace("/dashboard");
    });
  }

  return (
    <div data-accent="indigo" className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      <div className="grid items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── The pitch, next to the form ────────────────────────────────── */}
        <section className="surface relative hidden overflow-hidden p-8 lg:block">
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-accent-soft" />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-40 [mask-image:radial-gradient(120%_80%_at_20%_0%,#000,transparent_70%)]"
          />

          <div className="relative flex h-full flex-col">
            <span className="flex items-center gap-2.5">
              <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow-sm">
                <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-2xl border border-indigo-300/60" />
                <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
              </span>
              <span className="font-display text-2xl font-extrabold tracking-tight text-white">
                Quiz<span className="text-gradient">Keen</span>
              </span>
            </span>

            <h2 className="mt-8 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white">
              Välkommen <span className="text-shine">tillbaka</span>.
              <br />
              Din svit väntar.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              XP:n, mynten och Keensen finns kvar precis där du lämnade dem. Logga in och ta dagens uppdrag innan
              lektionen börjar.
            </p>

            <ul className="mt-8 space-y-3 text-sm">
              {[
                { icon: Flame, text: "Dagens uppdrag: tre små mål, XP att hämta" },
                { icon: Trophy, text: "Ledartavlan uppdateras live — se din placering" },
                { icon: Sparkles, text: "Ett gratispaket Keens varje dag" },
                { icon: ShieldCheck, text: "Din framstegssida visar vad du faktiskt lärt dig" },
              ].map((row) => (
                <li key={row.text} className="flex items-start gap-3 text-slate-300">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
                    <row.icon className="h-3.5 w-3.5 text-indigo-300" />
                  </span>
                  {row.text}
                </li>
              ))}
            </ul>

            <div className="mt-auto flex items-center gap-3 pt-8">
              <WornKeen size={40} />
              <p className="text-xs leading-relaxed text-slate-500">
                Alla siffror räknas ut på servern — nivå, XP och ledartavla kan inte hamna i otakt.
              </p>
            </div>
          </div>
        </section>

        {/* ── The form ───────────────────────────────────────────────────── */}
        <section className="surface p-6 sm:p-8">
          <div className="text-center lg:text-left">
            <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow-sm ring-1 ring-inset ring-white/20 lg:mx-0">
              <Zap className="h-6 w-6 text-white" strokeWidth={2.5} />
            </span>
            <h1 className="page-title">Logga in</h1>
            <p className="mt-1.5 text-sm text-slate-400">Ditt namn funkar — e-post går också.</p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-name" className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
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
                  className="h-12 rounded-2xl pl-10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
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
                className="h-12 rounded-2xl"
              />
            </div>

            {error && (
              <p className="animate-shake rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="btn-shine w-full gap-2" disabled={pending}>
              {pending ? "Loggar in…" : "Logga in"}
              {!pending && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Har inget konto?{" "}
            <Link href="/register" className="font-semibold text-indigo-300 hover:text-indigo-200">
              Skapa konto
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
