"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { unlock } from "./actions";

const CARDS = [
  {
    kind: "OWNER" as const,
    icon: "👑",
    title: "ÄGARE",
    desc: "Ange den 8-siffriga koden för att låsa upp ÄGARE-kontroller.",
    box: "bg-amber-500",
    text: "text-amber-300",
    border: "border-amber-500/30",
    btn: "bg-amber-600 hover:bg-amber-500",
    focus: "focus:border-amber-400",
    glow: "shadow-amber-500/10",
  },
  {
    kind: "ADMIN" as const,
    icon: "🛡️",
    title: "ADMIN",
    desc: "Ange den 8-siffriga koden för att låsa upp ADMIN-kontroller.",
    box: "bg-red-600",
    text: "text-red-400",
    border: "border-red-500/30",
    btn: "bg-red-600 hover:bg-red-500",
    focus: "focus:border-red-400",
    glow: "shadow-red-500/10",
  },
  {
    kind: "SECURITY" as const,
    icon: "🕵️",
    title: "SÄKERHET",
    desc: "Ange den 8-siffriga koden för att låsa upp SÄKERHET-kontroller.",
    box: "bg-sky-500",
    text: "text-sky-300",
    border: "border-sky-500/30",
    btn: "bg-sky-600 hover:bg-sky-500",
    focus: "focus:border-sky-400",
    glow: "shadow-sky-500/10",
  },
];

export default function Gate() {
  const router = useRouter();
  const [codes, setCodes] = useState<Record<string, string>>({ OWNER: "", ADMIN: "", SECURITY: "" });
  const [errs, setErrs] = useState<Record<string, boolean>>({ OWNER: false, ADMIN: false, SECURITY: false });
  const [busy, setBusy] = useState(false);

  async function tryUnlock(kind: "OWNER" | "ADMIN" | "SECURITY") {
    setBusy(true);
    const res = await unlock(codes[kind], kind);
    setBusy(false);
    if (res.ok) {
      localStorage.setItem("cmd_session", JSON.stringify({ role: res.role, code: res.code }));
      router.push(`/${res.role.toLowerCase()}`);
    } else {
      setErrs((e) => ({ ...e, [kind]: true }));
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-amber-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-red-600/20 blur-3xl" />
      <div className="relative mx-auto max-w-xl px-4 py-16">
        <div className="text-center">
          <p className="text-2xl font-extrabold text-white">
            Quiz<span className="text-indigo-400">Keen</span>
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            COMMAND <span className="text-indigo-400">CENTER</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">Endast för betrodda. Alla öppningar loggas. 👁️</p>
        </div>

        {CARDS.map((c) => (
          <div key={c.kind} className={`mt-8 rounded-3xl border ${c.border} bg-slate-900/60 p-8 text-center shadow-xl backdrop-blur ${c.glow}`}>
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl ${c.box} text-4xl`}>{c.icon}</div>
            <h2 className={`mt-4 text-3xl font-extrabold ${c.text}`}>{c.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{c.desc}</p>
            <input
              value={codes[c.kind]}
              onChange={(e) => {
                setCodes((p) => ({ ...p, [c.kind]: e.target.value }));
                setErrs((p) => ({ ...p, [c.kind]: false }));
              }}
              maxLength={8}
              placeholder="Ange 8-siffrig kod"
              className={`mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-center text-white placeholder:text-slate-500 focus:outline-none ${c.focus}`}
            />
            {errs[c.kind] && <p className="mt-2 text-sm font-bold text-red-400">❌ Fel kod. Försök igen.</p>}
            <button
              onClick={() => tryUnlock(c.kind)}
              disabled={busy}
              className={`mt-4 w-full rounded-xl ${c.btn} py-3 text-lg font-extrabold text-white`}
            >
              🔓 LÅS UPP {c.title}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}