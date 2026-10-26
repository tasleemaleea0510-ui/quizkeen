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

  // The front page is bright paper, not the dark app, so the bar wears the same
  // paper. Everywhere else the app is dark and the navbar stays dark with it.
  const light = pathname === "/";
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
      light
        ? active
          ? "bg-slate-900/10 text-slate-900"
          : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900"
        : active
          ? "bg-white/10 text-white"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
    );

  const ghostClass = light
    ? "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900"
    : "text-slate-300 hover:bg-white/5 hover:text-white";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 backdrop-blur-xl",
        light
          ? "border-b-2 border-slate-900/10 bg-[#FFF9F1]/85"
          : "border-b border-white/5 bg-slate-950/70 supports-[backdrop-filter]:bg-slate-950/60"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="group flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl",
              light
                ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_3px_0_rgba(79,70,229,0.35)]"
                : "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow-sm"
            )}
          >
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <span
            className={cn(
              "font-display text-xl font-extrabold tracking-tight",
              light ? "text-slate-900" : "text-white"
            )}
          >
            Quiz
            <span className={light ? "text-violet-600" : "text-gradient"}>Keen</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {session ? (
            <>
              {me && (
                <span
                  className={cn(
                    "mr-1 hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold lg:flex",
                    light
                      ? "border border-slate-900/10 bg-white text-slate-700 shadow-[0_2px_0_rgba(15,23,42,0.05)]"
                      : cn("border border-white/10 bg-white/5", theme.color, theme.glow ?? "")
                  )}
                >
                  {/* The Keen you are wearing, the way a profile picture works —
                      your character rides along on every page in the app. */}
                  <WornKeen size={24} className="-ml-1" />
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                      light ? "bg-slate-100 text-slate-500" : "bg-slate-800/80 text-slate-400"
                    )}
                  >
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
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            active ? (light ? "text-violet-600" : "text-indigo-300") : "text-slate-400"
                          )}
                        />
                      )}
                      <span className="hidden sm:inline">{it.label}</span>
                    </span>
                    {/* The tab you are on grows an underline out of its middle. */}
                    <span aria-hidden className="nav-underline" data-active={active} />
                  </Link>
                );
              })}
              <span
                className={cn(
                  "ml-1 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold",
                  light
                    ? "border-slate-900/15 bg-white text-slate-700 hover:border-slate-900/25"
                    : "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-white/5"
                )}
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
                <LogOut className={cn("h-3.5 w-3.5", light ? "text-slate-500" : "text-slate-400")} />
                <span className="hidden sm:inline">Logga ut</span>
              </span>
            </>
          ) : (
            <>
              <Link href="/login" className={cn("inline-flex h-9 items-center rounded-xl px-3.5 text-sm font-semibold", ghostClass)}>
                Logga in
              </Link>
              <Link
                href="/register"
                className={cn(
                  "inline-flex h-9 items-center rounded-xl px-3.5 text-sm font-semibold",
                  light
                    ? "bg-slate-900 text-white shadow-[0_3px_0_rgba(15,23,42,0.22)]"
                    : "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-glow-sm"
                )}
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
