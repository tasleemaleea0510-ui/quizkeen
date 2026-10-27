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

/** What /api/auth/signup answers with. */
type SignupResponse =
  | { ok: true; existing: true }
  | {
      ok: true;
      existing: false;
      userId: string;
      hasSession: boolean;
      /** True when Supabase's mail was down and the account was confirmed directly. */
      noMail: boolean;
      session: { access_token: string; refresh_token: string } | null;
    }
  | { ok: false; error: string };

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
  // Set once the account exists and the person is signed in, but the usual
  // "check your email" screen would be a lie because no mail went out.
  const [ready, setReady] = useState<{ noMail: boolean } | null>(null);

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

    // The account is created by our own route, not by the browser calling
    // supabase.co. A school network or a gateway hiccup used to turn the whole
    // signup into "HTTP 504" before anything was made; the route retries once
    // and answers in Swedish.
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    }).catch(() => null);
    const signup = res ? ((await res.json().catch(() => null)) as SignupResponse | null) : null;
    if (!res || !signup) {
      setError("Kunde inte nå servern — kontrollera uppkopplingen och försök igen.");
      setLoading(false);
      return;
    }
    if (!signup.ok) {
      setError(signup.error);
      setLoading(false);
      return;
    }
    if (signup.existing) {
      setError("Den här e-postadressen har redan ett konto — logga in i stället.");
      setLoading(false);
      return;
    }

    // Only possible if email confirmation is switched off; the route hands back
    // the session it got, and the browser adopts it.
    if (signup.session) await supabase.auth.setSession(signup.session).catch(() => {});

    const made = await createProfile(signup.userId, username, role, email).catch(() => null);
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

    if (signup.session) {
      setReady({ noMail: signup.noMail });
      setLoading(false);
      return;
    }

    // The route had to confirm the account itself because Supabase could not
    // send the mail. Sign in with what was typed and go straight in.
    if (signup.noMail) {
      const attempt = await supabase.auth
        .signInWithPassword({ email: email.trim().toLowerCase(), password })
        .catch(() => null);
      if (!attempt || attempt.error) {
        setError(authErrorSv(attempt?.error?.message || ""));
        setLoading(false);
        return;
      }
      setReady({ noMail: true });
      setLoading(false);
      return;
    }

    // With email confirmation switched on there is no session yet.
    setSent(true);
    setLoading(false);
  }

  if (ready) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
        <Card className="animate-fade-up">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-slate-300">
              {ready.noMail ? "Kontot är klart!" : "Välkommen in!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>
              Du är inloggad som <b className="text-white" data-no-translate>{username}</b>.
            </p>
            {ready.noMail && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
                Vi kunde inte skicka bekräftelsemejlet just nu, så kontot aktiverades direkt i stället. Inget mer
                behövs — du kan börja spela med en gång.
              </p>
            )}
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                router.push("/dashboard");
                router.refresh();
              }}
            >
              Till QuizKeen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
    <div data-accent="violet" className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="grid items-stretch gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {/* ── What you get, before the form asks for anything ───────────── */}
        <section className="surface relative hidden overflow-hidden p-8 lg:block">
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-accent-soft" />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-40 [mask-image:radial-gradient(120%_80%_at_20%_0%,#000,transparent_70%)]"
          />
          <div className="relative flex h-full flex-col">
            <span className="flex items-center gap-2.5">
              <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-glow-sm">
                <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-2xl border border-violet-300/60" />
                <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
              </span>
              <span className="font-display text-2xl font-extrabold tracking-tight text-white">
                Quiz<span className="text-gradient">Keen</span>
              </span>
            </span>

            <h2 className="mt-8 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white">
              Lär dig <span className="text-shine">snabbare</span>.
              <br />
              Tävla mot klassen.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Ett konto är gratis och tar under en minut. Du får XP av varje rätt svar, mynt att handla för och Keens att
              samla.
            </p>

            <ul className="mt-8 space-y-3 text-sm">
              {[
                { emoji: "🎯", title: "Live-quizar", text: "Svara snabbt, klättra på tavlan." },
                { emoji: "🧠", title: "Gloskort", text: "Repetition som faktiskt fastnar." },
                { emoji: "🏆", title: "Framsteg du ser", text: "Nivåer, titlar och dagliga uppdrag." },
              ].map((row, i) => (
                <li
                  key={row.title}
                  className="flex animate-rise-in items-start gap-3"
                  style={{ animationDelay: `${120 + i * 90}ms` }}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-base animate-float">
                    {row.emoji}
                  </span>
                  <span>
                    <span className="block font-bold text-white">{row.title}</span>
                    <span className="block text-slate-400">{row.text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-400">
              Elev eller lärare? Välj roll i formuläret — lärare får klassrum och läxor, elever får uppdrag och topplistan.
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-md lg:max-w-none">
          <div className="mb-6 text-center lg:hidden">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-glow">
              <Zap className="h-6 w-6 text-white" strokeWidth={2.5} />
            </span>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">Gå med i QuizKeen!</h1>
            <p className="mt-1.5 text-sm text-slate-400">Skapa ett konto och börja spela på under en minut.</p>
          </div>

          <div className="surface animate-fade-up relative overflow-hidden p-6 sm:p-7">
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-bright)] to-transparent" />
            <h2 className="font-display text-lg font-extrabold text-white">Skapa konto</h2>
            <p className="mt-1 text-xs text-slate-400">Inget kort, ingen kostnad — bara att köra.</p>

            <form onSubmit={handleRegister} className="mt-5 space-y-3.5">
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
                          ? "bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-glow-sm"
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
              <Link href="/login" className="font-semibold text-violet-300 hover:text-violet-200">
                Logga in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
