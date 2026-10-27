"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { verifySession } from "../app/actions";
import { Crown, Shield, Detective, Lock } from "./icons";

/**
 * Whose seat is this, really?
 *
 * The console's gate writes `{ role, code }` into `localStorage`, and every page
 * used to trust whatever it found there: the *browser* decided which console you
 * were looking at. Anybody could open devtools on the command site, type
 * `{"role":"OWNER"}`, reload — and be shown the owner's control room. Every
 * button in it then failed the server check, so nothing could actually be done,
 * but the screens looked exactly like everyone had the keys, and the tools that
 * answered with an empty `info` looked broken rather than forbidden.
 *
 * So each console now asks the server. `verifySession` checks the code against
 * the live codes in the database and answers with the *real* role, which is the
 * only answer that matters — and a browser that lied gets a locked door and a
 * link back to the gate instead of a control room it does not own.
 */
export type Seat = { role: string; code: string } | null;

type Need = "STAFF" | "SECURITY" | "ADMIN" | "OWNER";

const NEED_LABEL: Record<Need, string> = {
  STAFF: "personal",
  SECURITY: "säkerhetskoden",
  ADMIN: "adminkoden",
  OWNER: "ägarkoden",
};

/** The stored seat, once the server has confirmed it. */
export function useConsoleSeat(need: Need) {
  const [seat, setSeat] = useState<Seat>(null);
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    let alive = true;
    let stored: any = null;
    try {
      stored = JSON.parse(localStorage.getItem("cmd_session") || "null");
    } catch {
      stored = null;
    }
    if (!stored?.code) {
      setState("denied");
      return;
    }
    setSeat(stored);
    verifySession(stored, need)
      .then((res) => {
        if (alive) setState(res?.ok ? "ok" : "denied");
      })
      .catch(() => {
        if (alive) setState("denied");
      });
    return () => {
      alive = false;
    };
  }, [need]);

  return { seat, state, setSeat };
}

/** The door, for a browser whose session the server does not recognise. */
export function SeatLocked({ need, onForget }: { need: Need; onForget?: () => void }) {
  const Icon = need === "OWNER" ? Crown : need === "ADMIN" ? Shield : Detective;

  function forget() {
    try {
      localStorage.removeItem("cmd_session");
    } catch {
      /* nothing to clear */
    }
    onForget?.();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="cmd-panel relative isolate w-full max-w-md overflow-hidden p-7 text-center">
        <span aria-hidden className="cmd-checkers-tint pointer-events-none absolute inset-0 text-slate-400" />
        <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <Icon className="h-7 w-7 text-slate-300" />
        </span>
        <h1 className="relative mt-4 text-xl font-extrabold text-white">Den här stolen är inte din</h1>
        <p className="relative mt-2 text-sm leading-relaxed text-slate-400">
          Sessionen i den här webbläsaren klarar inte <b className="text-slate-200">{NEED_LABEL[need]}</b>. Antingen är
          koden bytt sedan du låste upp, eller så har rollen i webbläsaren ändrats vid sidan om servern.
        </p>
        <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            onClick={forget}
            className="cmd-shine inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-white"
          >
            <Lock className="h-4 w-4" /> Till låset
          </Link>
        </div>
        <p className="relative mt-4 text-[11px] text-slate-500">
          Öppningar loggas med roll, tid och adress. Be ägaren om koden om du ska ha den här stolen.
        </p>
      </div>
    </div>
  );
}

/**
 * A small badge saying which seat the server confirmed.
 *
 * It is deliberately wording and not colour: "ÄGARE · verifierad" next to the
 * console title is enough to tell an admin from an owner at a glance, and it
 * makes the invisible server check visible to the person who cannot see it.
 */
export function SeatBadge({ compact = false }: { compact?: boolean }) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let stored: any = null;
    try {
      stored = JSON.parse(localStorage.getItem("cmd_session") || "null");
    } catch {
      stored = null;
    }
    if (!stored?.code) return;
    verifySession(stored, "STAFF")
      .then((res) => {
        if (alive) setRole(res?.ok ? res.role ?? null : null);
      })
      .catch(() => {
        if (alive) setRole(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!role) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500" />
        {compact ? "kontroll..." : "kontrollerar stol"}
      </span>
    );
  }

  const tone =
    role === "OWNER"
      ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
      : role === "ADMIN"
        ? "border-red-400/40 bg-red-500/15 text-red-200"
        : "border-sky-400/40 bg-sky-500/15 text-sky-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${tone}`}
      title="Rollen är kontrollerad mot koderna i databasen"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" />
      {role} · verifierad
    </span>
  );
}
