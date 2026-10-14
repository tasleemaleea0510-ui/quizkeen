"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { unlock } from "./actions";
import { Crown, Shield, Detective, Lock, Unlock } from "../components/icons";

type Kind = "OWNER" | "ADMIN" | "SECURITY";

const CARDS: {
  kind: Kind;
  Icon: typeof Crown;
  title: string;
  desc: string;
  box: string;
  text: string;
  border: string;
  btn: string;
  focus: string;
  glow: string;
}[] = [
  {
    kind: "OWNER",
    Icon: Crown,
    title: "ÄGARE",
    desc: "Ange den 8-siffriga koden för att låsa upp ÄGARE-kontroller.",
    box: "bg-amber-500/15 text-amber-300 border border-amber-500/40",
    text: "text-amber-300",
    border: "border-amber-500/30",
    btn: "bg-amber-600 hover:bg-amber-500",
    focus: "focus:border-amber-400",
    glow: "shadow-amber-500/10",
  },
  {
    kind: "ADMIN",
    Icon: Shield,
    title: "ADMIN",
    desc: "Ange den 8-siffriga koden för att låsa upp ADMIN-kontroller.",
    box: "bg-red-500/15 text-red-300 border border-red-500/40",
    text: "text-red-400",
    border: "border-red-500/30",
    btn: "bg-red-600 hover:bg-red-500",
    focus: "focus:border-red-400",
    glow: "shadow-red-500/10",
  },
  {
    kind: "SECURITY",
    Icon: Detective,
    title: "SÄKERHET",
    desc: "Ange den 8-siffriga koden för att låsa upp SÄKERHET-kontroller.",
    box: "bg-sky-500/15 text-sky-300 border border-sky-500/40",
    text: "text-sky-300",
    border: "border-sky-500/30",
    btn: "bg-sky-600 hover:bg-sky-500",
    focus: "focus:border-sky-400",
    glow: "shadow-sky-500/10",
  },
];

export default function Gate() {
  const router = useRouter();
  const [codes, setCodes] = useState<Record<Kind, string>>({ OWNER: "", ADMIN: "", SECURITY: "" });
  const [errs, setErrs] = useState<Record<Kind, boolean>>({ OWNER: false, ADMIN: false, SECURITY: false });
  const [busy, setBusy] = useState<Kind | null>(null);
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
    if (busy) return;
    setBusy(kind);
    setErrs((e) => ({ ...e, [kind]: false }));
    try {
      const res = await unlock(codes[kind], kind);
      if (res?.ok) {
        localStorage.setItem("cmd_session", JSON.stringify({ role: res.role, code: res.code }));
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
      <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-amber-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-red-600/20 blur-3xl" />

      <div className="relative mx-auto max-w-xl px-4 py-20">
        <div className="text-center">
          <p className="text-2xl font-extrabold text-white">
            Quiz<span className="text-indigo-400">Keen</span>
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            COMMAND <span className="text-indigo-400">CENTER</span>
          </h1>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-slate-500">
            <Lock className="h-3.5 w-3.5" />
            Endast för betrodda. Alla öppningar loggas.
          </p>
        </div>

        {saved?.role && (
          <div className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 px-5 py-4">
            <p className="text-sm text-slate-300">
              Senast inloggad som <b className="text-white">{saved.role}</b>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openSaved}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
              >
                Fortsätt
              </button>
              <button
                type="button"
                onClick={forgetSaved}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Glöm
              </button>
            </div>
          </div>
        )}

        {CARDS.map((c) => (
          <div
            key={c.kind}
            className={`mt-8 rounded-3xl border ${c.border} bg-slate-900/60 p-8 text-center shadow-xl backdrop-blur ${c.glow}`}
          >
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl ${c.box}`}>
              <c.Icon className="h-10 w-10" />
            </div>
            <h2 className={`mt-4 text-3xl font-extrabold ${c.text}`}>{c.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{c.desc}</p>
            <input
              value={codes[c.kind]}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                setCodes((p) => ({ ...p, [c.kind]: digits }));
                setErrs((p) => ({ ...p, [c.kind]: false }));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") tryUnlock(c.kind);
              }}
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              placeholder="Ange 8-siffrig kod"
              className={`mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-center text-lg tracking-[0.3em] text-white placeholder:tracking-normal placeholder:text-slate-500 focus:outline-none ${c.focus}`}
            />
            {errs[c.kind] && (
              <p className="mt-2 text-sm font-bold text-red-400">Fel kod. Försök igen.</p>
            )}
            <button
              type="button"
              onClick={() => tryUnlock(c.kind)}
              disabled={busy !== null || codes[c.kind].length !== 8}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl ${c.btn} py-3 text-lg font-extrabold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Unlock className="h-5 w-5" />
              {busy === c.kind ? "Kontrollerar..." : `LÅS UPP ${c.title}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
