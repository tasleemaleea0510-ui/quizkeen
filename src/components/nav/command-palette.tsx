"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, LogOut, Volume2, VolumeX, Command } from "lucide-react";
import { NAV_ITEMS, type NavEntry } from "@/lib/nav";
import { isMuted, setMuted } from "@/components/keens/sounds";
import { cn } from "@/lib/utils";

/**
 * ⌘K — every page, one keystroke away.
 *
 * The reason the header can stay calm: nothing is lost when a destination is
 * not a button, because two letters of its name (or of what it means) find it.
 * Matching is a cheap subsequence test over label + hint + keywords, which is
 * what makes "ldt" find Ledartavla and "xpp" find Framsteg.
 *
 * Keyboard first: ⌘K / Ctrl+K opens, arrows move, Enter goes, Escape closes and
 * focus returns to whatever had it. Mouse works too — it is the same list.
 */
type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
};

function score(entry: NavEntry, query: string): number {
  if (!query) return 1;
  const haystack = `${entry.label} ${entry.hint ?? ""} ${entry.keywords ?? ""}`.toLowerCase();
  const q = query.toLowerCase().trim();
  if (haystack.includes(q)) return haystack.indexOf(q) === 0 ? 3 : 2;
  // Subsequence: "ldt" -> "Ledartavla".
  let i = 0;
  for (const ch of haystack) {
    if (ch === q[i]) i++;
    if (i === q.length) return 1;
  }
  return 0;
}

export default function CommandPalette({
  role,
  signedIn,
  onSignOut,
}: {
  role: string | null;
  signedIn: boolean;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [muted, setMutedState] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const items = useMemo(
    () => NAV_ITEMS.filter((item) => !item.roles || item.roles.includes((role ?? "STUDENT") as never)),
    [role]
  );

  const actions: Action[] = useMemo(() => {
    const list: Action[] = [
      {
        id: "sound",
        label: muted ? "Sätt på ljud" : "Stäng av ljud",
        hint: "Keen-ljud, nivåer och svar",
        icon: muted ? VolumeX : Volume2,
        run: () => {
          const next = !isMuted();
          setMuted(next);
          setMutedState(next);
        },
      },
    ];
    if (signedIn) {
      list.push({
        id: "logout",
        label: "Logga ut",
        hint: "Avsluta sessionen",
        icon: LogOut,
        run: onSignOut,
      });
    }
    return list;
  }, [muted, signedIn, onSignOut]);

  const filteredActions = useMemo(
    () => actions.filter((a) => !query || `${a.label} ${a.hint ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    [actions, query]
  );

  const results = useMemo(() => {
    const scored = items
      .map((item) => ({ item, s: score(item, query) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s);
    return scored.map((r) => r.item).slice(0, 9);
  }, [items, query]);

  const total = results.length + filteredActions.length;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  }, []);

  const go = useCallback(
    (index: number) => {
      if (index < results.length) {
        router.push(results[index].href);
        close();
        return;
      }
      const action = filteredActions[index - results.length];
      if (action) {
        action.run();
        close();
      }
    },
    [results, filteredActions, router, close]
  );

  // The keyboard hook lives on the document so ⌘K works from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typingInField =
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
        return;
      }
      if (!open || typingInField) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => (total ? (c + 1) % total : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => (total ? (c - 1 + total) % total : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        go(cursor);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, cursor, total, go]);

  useEffect(() => {
    if (open) {
      setMutedState(isMuted());
      // Focus after paint, so the caret lands inside a visible dialog.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Sök allt (⌘K)"
        aria-label="Sök allt (⌘K)"
        className="group hidden h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-slate-400 transition-colors hover:border-white/25 hover:text-white sm:inline-flex"
      >
        <Search className="h-[18px] w-[18px]" />
        {/* The shortcut is the label: at a glance a magnifier says the rest. */}
        <kbd className="hidden items-center gap-0.5 rounded-md border border-white/10 bg-slate-900/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 transition-colors group-hover:text-slate-200 2xl:inline-flex">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Sök i QuizKeen"
        >
          <button
            type="button"
            aria-label="Stäng"
            onClick={close}
            className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-sm animate-fade-in"
          />

          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-[0_40px_90px_-30px_rgba(0,0,0,1)] animate-fade-up">
            <div className="flex items-center gap-3 border-b border-white/10 px-4">
              <Search className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sök sida, till exempel 'ledar', 'paket' eller 'framsteg'…"
                className="h-14 w-full bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
                aria-label="Sök"
              />
              <kbd className="shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                ESC
              </kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {results.length > 0 && (
                <p className="px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Sidor
                </p>
              )}
              {results.map((item, i) => (
                <button
                  key={item.href}
                  type="button"
                  role="option"
                  aria-selected={cursor === i}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    cursor === i ? "bg-indigo-500/20" : "hover:bg-white/[0.06]"
                  )}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white">{item.label}</span>
                    {item.hint && <span className="block truncate text-xs text-slate-400">{item.hint}</span>}
                  </span>
                  {cursor === i && <CornerDownLeft className="h-3.5 w-3.5 text-indigo-300" />}
                </button>
              ))}

              {filteredActions.length > 0 && (
                <p className="px-3 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Åtgärder
                </p>
              )}
              {filteredActions.map((action, i) => {
                const index = results.length + i;
                return (
                  <button
                    key={action.id}
                    type="button"
                    role="option"
                    aria-selected={cursor === index}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => go(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      cursor === index ? "bg-indigo-500/20" : "hover:bg-white/[0.06]"
                    )}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300">
                      <action.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-white">{action.label}</span>
                      {action.hint && <span className="block truncate text-xs text-slate-400">{action.hint}</span>}
                    </span>
                  </button>
                );
              })}

              {total === 0 && (
                <p className="px-3 py-8 text-center text-sm text-slate-500">
                  Inget matchade “{query}”. Prova ett kortare ord.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-[11px] text-slate-500">
              <span className="flex items-center gap-3">
                <span>↑↓ bläddra</span>
                <span>↵ öppna</span>
              </span>
              <span className="hidden sm:inline">Tips: ⌘K var du än är</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
