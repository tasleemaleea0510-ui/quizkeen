"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Sparkles } from "lucide-react";
import { NAV_GROUPS, navItemsIn } from "@/lib/nav";
import { cn } from "@/lib/utils";
import WornKeen from "@/components/keens/worn-keen";
import { ROLE_THEME } from "@/lib/roles";

/**
 * The phone's version of the whole map.
 *
 * Every group, every link, one scroll — no nested menus on a small screen. It
 * slides in from the right, holds the page still behind it, closes on Escape or
 * on a tap outside, and closes itself as soon as a link is followed.
 */
export default function MobileDrawer({
  open,
  onClose,
  me,
  xp,
  coins,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  me: { username: string; role: string; accentColor: string | null } | null;
  xp: number;
  coins: number;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const theme = ROLE_THEME[me?.role ?? "STUDENT"];

  useEffect(() => onClose, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] lg:hidden" role="dialog" aria-modal="true" aria-label="Meny">
      <button
        type="button"
        aria-label="Stäng menyn"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      />

      <aside className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col border-l border-white/10 bg-slate-950/95 backdrop-blur-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <span className="flex items-center gap-3">
            {me ? (
              <span className={cn("flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold", theme.color)}>
                <WornKeen size={22} className="-ml-1" />
                <span style={me.accentColor ? { color: me.accentColor } : undefined}>{me.username}</span>
              </span>
            ) : (
              <span className="text-sm font-bold text-slate-300">Meny</span>
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {me && (
          <div className="flex items-center gap-4 border-b border-white/10 px-4 py-3">
            <div className="flex-1">
              <p className="stat-label">Erfarenhet</p>
              <p className="font-display text-lg font-extrabold text-emerald-300 tabular" data-no-translate>
                {xp.toLocaleString("sv-SE")} XP
              </p>
            </div>
            <div className="flex-1">
              <p className="stat-label">Mynt</p>
              <p className="font-display text-lg font-extrabold text-amber-300 tabular" data-no-translate>
                {coins.toLocaleString("sv-SE")}
              </p>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => {
            const items = navItemsIn(group.id, me?.role);
            if (!items.length) return null;
            return (
              <section key={group.id} className="mb-3">
                <p className="px-2 pb-1.5 pt-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                          active ? "bg-indigo-500/20 text-white" : "text-slate-300 hover:bg-white/[0.06]"
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
                            active ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-200" : "border-white/10 bg-white/[0.04] text-slate-400"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold">{item.label}</span>
                          {item.hint && <span className="block truncate text-xs text-slate-500">{item.hint}</span>}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </nav>

        <footer className="border-t border-white/10 p-4">
          <Link
            href="/keens/packs"
            onClick={onClose}
            className="mb-3 flex items-center justify-between rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-3 py-2.5 text-sm font-bold text-indigo-100"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Dagens gratispaket
            </span>
            <span aria-hidden>→</span>
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white"
          >
            Logga ut
          </button>
        </footer>
      </aside>
    </div>
  );
}
