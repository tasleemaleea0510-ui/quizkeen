"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { unlock } from "./actions";
import { Crown, Shield, Detective, Lock, Unlock, Check, Clock } from "../components/icons";
import { Tilt, ToolButton, type Tone } from "../components/ui";

type Kind = "OWNER" | "ADMIN" | "SECURITY";

/**
 * The front door.
 *
 * Three ways in, one per role, and each is a card you can read at a glance:
 * what it unlocks, which code opens it, and one big button that says so. The
 * checkerboard tint and the receding grid are the same print the app and the
 * other console screens wear, so this screen is recognisably the same product
 * as `/admin` and `/security` rather than a plain form in front of them.
 */
const CARDS: {
  kind: Kind;
  Icon: typeof Crown;
  title: string;
  tag: string;
  desc: string;
  tone: Tone;
  card: string;
  tint: string;
  badge: string;
  label: string;
  btn: string;
  input: string;
}[] = [
  {
    kind: "OWNER",
    Icon: Crown,
    title: "Ägare",
    tag: "Full kontroll",
    desc: "Låser upp Ägare-kontrollerna: allt Admin och Säkerhet kan göra, plus ägarverktygen.",
    tone: "amber",
    card: "border-amber-500/25 hover:border-amber-400/45",
    tint: "text-amber-500",
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    label: "text-amber-300",
    btn: "bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/40 hover:bg-amber-400",
    input: "focus:border-amber-400 focus:ring-amber-400/20",
  },
  {
    kind: "ADMIN",
    Icon: Shield,
    title: "Admin",
    tag: "Spelare & innehåll",
    desc: "Låser upp Admin-kontrollerna: ban, XP, utskick, live och Admin-Keen.",
    tone: "red",
    card: "border-red-500/25 hover:border-red-400/45",
    tint: "text-red-500",
    badge: "border-red-500/40 bg-red-500/15 text-red-300",
    label: "text-red-300",
    btn: "bg-red-600 text-white shadow-lg shadow-red-950/40 hover:bg-red-500",
    input: "focus:border-red-400 focus:ring-red-400/20",
  },
  {
    kind: "SECURITY",
    Icon: Detective,
    title: "Säkerhet",
    tag: "Moderering",
    desc: "Låser upp Säkerhets-kontrollerna: varningar, tystningar, chatt och loggar.",
    tone: "sky",
    card: "border-sky-500/25 hover:border-sky-400/45",
    tint: "text-sky-500",
    badge: "border-sky-500/40 bg-sky-500/15 text-sky-300",
    label: "text-sky-300",
    btn: "bg-sky-600 text-white shadow-lg shadow-sky-950/40 hover:bg-sky-500",
    input: "focus:border-sky-400 focus:ring-sky-400/20",
  },
];

export default function Gate() {
  const router = useRouter();
  const [codes, setCodes] = useState<Record<Kind, string>>({ OWNER: "", ADMIN: "", SECURITY: "" });
  const [errs, setErrs] = useState<Record<Kind, boolean>>({ OWNER: false, ADMIN: false, SECURITY: false });
  const [busy, setBusy] = useState<Kind | null>(null);
  // The role that just unlocked, held for a beat so the card can flash green
  // before the console navigates away.
  const [unlocked, setUnlocked] = useState<Kind | null>(null);
  const [saved, setSaved] = useState<{ role: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cmd_session");
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      /* ignore a corrupt session */
    }
  }, []);

  async function tryUnlock(kind: Kind) {
    if (busy || codes[kind].length !== 8) return;
    setBusy(kind);
    setErrs((e) => ({ ...e, [kind]: false }));
    try {
      const res = await unlock(codes[kind], kind);
      if (res?.ok) {
        localStorage.setItem("cmd_session", JSON.stringify({ role: res.role, code: res.code }));
        setUnlocked(kind);
        // Let the confirmation land before the route changes.
        await new Promise((resolve) => setTimeout(resolve, 260));
        router.push(`/${res.role.toLowerCase()}`);
      } else {
        setErrs((e) => ({ ...e, [kind]: true }));
      }
    } catch {
      setErrs((e) => ({ ...e, [kind]: true }));
    } finally {
      setBusy(null);
    }
  }

  function openSaved() {
    if (saved?.role) router.push(`/${saved.role.toLowerCase()}`);
  }

  function forgetSaved() {
    try {
      localStorage.removeItem("cmd_session");
    } catch {
      /* nothing to do */
    }
    setSaved(null);
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:pt-16">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <header className="relative isolate overflow-hidden rounded-[2rem] border border-white/[0.07] bg-slate-950/70 px-6 py-10 text-center shadow-2xl sm:px-10 sm:py-12">
          <span aria-hidden className="cmd-checkers-tint absolute inset-0 text-indigo-500" />
          <span aria-hidden className="cmd-checkers-floor absolute text-indigo-400 opacity-60" />
          <span aria-hidden className="cmd-hero-glow absolute text-indigo-500" />

          <div className="relative">
            <p className="flex items-center justify-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.28em] text-slate-400">
              <span className="relative grid h-2 w-2 place-items-center text-indigo-400">
                <span className="absolute inset-0 animate-cmd-pulse-ring rounded-full border border-current" />
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              </span>
              QuizKeen
            </p>

            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
              COMMAND{" "}
              <span className="animate-cmd-pan bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 bg-[length:200%_auto] bg-clip-text text-transparent">
                CENTER
              </span>
            </h1>

            <p className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-2 text-sm leading-relaxed text-slate-400">
              <Lock className="h-4 w-4 shrink-0 animate-cmd-breathe text-slate-500" />
              Endast för betrodda. Alla öppningar loggas.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              {CARDS.map((c) => (
                <span
                  key={c.kind}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold ${c.badge}`}
                >
                  <c.Icon className="h-3.5 w-3.5" />
                  {c.title}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* ── Saved session ────────────────────────────────────────────── */}
        {saved?.role && (
          <div className="cmd-panel mt-5 flex animate-cmd-slide-down flex-wrap items-center justify-between gap-4 p-4 sm:px-5">
            <p className="flex items-center gap-2 text-sm text-slate-300">
              <Clock className="h-4 w-4 shrink-0 text-slate-500" />
              Senast inloggad som <b className="font-extrabold text-white">{saved.role}</b>
            </p>
            <div className="flex flex-wrap gap-2">
              <ToolButton label="Fortsätt" Icon={Unlock} tone="indigo" variant="solid" onClick={openSaved} />
              <ToolButton label="Glöm sessionen" Icon={Lock} onClick={forgetSaved} />
            </div>
          </div>
        )}

        {/* ── One card per role ────────────────────────────────────────── */}
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {CARDS.map((c, index) => {
            const done = unlocked === c.kind;
            const wrong = errs[c.kind];
            const working = busy === c.kind;

            return (
              <div
                key={c.kind}
                style={{ animationDelay: `${120 + index * 110}ms` }}
                className="animate-cmd-fade-up"
              >
                <Tilt max={5} className="h-full">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      tryUnlock(c.kind);
                    }}
                    className={`cmd-panel relative isolate flex h-full flex-col overflow-hidden p-6 transition-colors duration-300 sm:p-7 ${
                      c.card
                    } ${done ? "border-emerald-400/60 shadow-emerald-500/20" : ""}`}
                  >
                    <span
                      aria-hidden
                      className={`cmd-checkers-tint pointer-events-none absolute inset-0 ${
                        done ? "text-emerald-500" : c.tint
                      }`}
                    />

                    <div className="relative flex items-start justify-between gap-3">
                      <div
                        className={`relative grid h-14 w-14 place-items-center rounded-2xl border ${
                          done ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300" : c.badge
                        }`}
                      >
                        {done && (
                          <span className="pointer-events-none absolute inset-0 animate-cmd-pulse-ring rounded-2xl border-2 border-emerald-400/80" />
                        )}
                        <c.Icon className="h-7 w-7" />
                      </div>
                      <span
                        className={`rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${
                          done ? "text-emerald-300" : c.label
                        }`}
                      >
                        {done ? "Upplåst" : c.tag}
                      </span>
                    </div>

                    <h2 className="relative mt-5 text-2xl font-extrabold tracking-tight text-white">{c.title}</h2>
                    <p className="relative mt-2 text-sm leading-relaxed text-slate-400">{c.desc}</p>

                    <div className="relative mt-auto pt-6">
                      <label className="block">
                        <span className="mb-2 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                          <span>Kod</span>
                          <span className="tabular-nums">{codes[c.kind].length}/8</span>
                        </span>
                        <input
                          value={codes[c.kind]}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                            setCodes((p) => ({ ...p, [c.kind]: digits }));
                            setErrs((p) => ({ ...p, [c.kind]: false }));
                          }}
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={8}
                          aria-label={`Åttasiffrig kod för ${c.title}`}
                          placeholder="••••••••"
                          className={`w-full rounded-xl border bg-slate-950/70 px-4 py-3.5 text-center text-lg font-bold tracking-[0.45em] text-white placeholder:tracking-[0.35em] placeholder:text-slate-600 focus:outline-none focus:ring-2 ${
                            wrong ? "animate-cmd-shake border-red-500/70" : "border-white/10"
                          } ${c.input}`}
                        />
                      </label>

                      <p aria-live="polite" className="mt-2 min-h-[1.25rem] text-sm font-bold text-red-400">
                        {wrong ? "Fel kod. Försök igen." : ""}
                      </p>

                      <button
                        type="submit"
                        disabled={busy !== null || codes[c.kind].length !== 8}
                        className={`cmd-shine flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${
                          done
                            ? "animate-cmd-stamp bg-emerald-600 text-white"
                            : working
                              ? "animate-pulse " + c.btn
                              : c.btn
                        }`}
                      >
                        {done ? (
                          <Check className="h-5 w-5" />
                        ) : working ? (
                          <Lock className="h-5 w-5 animate-cmd-breathe" />
                        ) : (
                          <Unlock className="h-5 w-5" />
                        )}
                        {done ? "Upplåst!" : working ? "Kontrollerar…" : `Lås upp ${c.title}`}
                      </button>

                      <p className="mt-3 text-center text-[11px] text-slate-500">
                        {codes[c.kind].length === 8 ? "Tryck Enter för att låsa upp" : "Åtta siffror krävs"}
                      </p>
                    </div>
                  </form>
                </Tilt>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[11px] text-slate-600">
          QuizKeen Command · åtkomst loggas med roll och tid
        </p>
      </div>
    </div>
  );
}
