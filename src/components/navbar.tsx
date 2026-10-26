"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSupabase } from "@/components/providers";
import TutorialWidget from "@/components/tutorial";
import WornKeen from "@/components/keens/worn-keen";
import { getNavUser } from "@/app/system/actions";
import { ROLE_THEME } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { isGameScreen } from "@/lib/game-screen";
import { School, BarChart3, Layers, Sparkles, Settings, LogOut, Zap } from "lucide-react";

export default function Navbar() {
  const { supabase, session } = useSupabase();
  const pathname = usePathname();
  const [me, setMe] = useState<{ username: string; role: string; accentColor: string | null } | null>(null);

  useEffect(() => {
    if (!session) {
      setMe(null);
      return;
    }
    let cancelled = false;
    getNavUser()
      .then((user) => {
        if (!cancelled) setMe(user);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // A running game is played on a projector and on phones, so the site's own
  // chrome steps aside — the game draws its own bar with the Keen, the score and
  // the fullscreen switch, and a second sticky bar above it would eat the screen.
  // The deck host keeps the navbar because that page has no bar of its own.
  if (isGameScreen(pathname)) return null;

  const theme = ROLE_THEME[me?.role ?? "STUDENT"];

  const items = [
    { href: "/dashboard", label: "Översikt", icon: null },
    { href: "/classroom", label: "Klassrum", icon: School },
    ...(me?.role === "TEACHER" ? [{ href: "/classroom/analytics", label: "Analys", icon: BarChart3 }] : []),
    { href: "/flashcards", label: "Gloskort", icon: Layers },
    { href: "/keens", label: "Keens", icon: Sparkles },
    { href: "/settings", label: "Inställningar", icon: Settings },
  ];

  // Links are anchors, not buttons: a <button> inside an <a> is invalid, and a
  // span that looks like one keeps the tab target on the anchor itself.
  const tabClass = (active: boolean) =>
    cn(
      "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors",
      active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
    );

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="group flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow-sm">
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-white">
            Quiz<span className="text-gradient">Keen</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {session ? (
            <>
              {me && (
                <span
                  className={cn(
                    "mr-1 hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold lg:flex",
                    theme.color,
                    theme.glow ?? ""
                  )}
                >
                  {/* The Keen you are wearing, the way a profile picture works —
                      your character rides along on every page in the app. */}
                  <WornKeen size={24} className="-ml-1" />
                  <span className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    {theme.badge}
                  </span>
                  {/* A chosen name colour wins over the role colour; the role
                      badge next to it already says what you are. */}
                  <span style={me.accentColor ? { color: me.accentColor } : undefined}>{me.username}</span>
                </span>
              )}
              <TutorialWidget />
              {items.map((it) => {
                const Icon = it.icon;
                const active = pathname === it.href || pathname.startsWith(it.href + "/");
                return (
                  <Link key={it.href} href={it.href} className="relative inline-flex">
                    <span className={tabClass(active)}>
                      {Icon && (
                        <Icon className={cn("h-4 w-4", active ? "text-indigo-300" : "text-slate-400")} />
                      )}
                      <span className="hidden sm:inline">{it.label}</span>
                    </span>
                    {/* The tab you are on grows an underline out of its middle. */}
                    <span aria-hidden className="nav-underline" data-active={active} />
                  </Link>
                );
              })}
              <span
                className="ml-1 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 px-3.5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:bg-white/5"
                role="button"
                tabIndex={0}
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
                onKeyDown={async (event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
              >
                <LogOut className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline">Logga ut</span>
              </span>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-xl px-3.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
              >
                Logga in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 text-sm font-semibold text-white shadow-glow-sm ring-1 ring-inset ring-white/15"
              >
                Skapa konto
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
