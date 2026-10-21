"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSupabase } from "@/components/providers";
import { Button } from "@/components/ui/button";
import TutorialWidget from "@/components/tutorial";
import WornKeen from "@/components/keens/worn-keen";
import KeenAvatar from "@/components/keens/keen-avatar";
import { KEEN_BY_ID } from "@/lib/keens";
import { getNavUser } from "@/app/system/actions";
import { ROLE_THEME } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { School, BarChart3, Layers, Sparkles, Settings, LogOut } from "lucide-react";

/**
 * The face of QuizKeen.
 *
 * The logo used to be a lightning glyph, which said "quiz" but nothing about
 * the thing you actually collect. Keenungen is the first Keen every account owns
 * — it is already the mascot of the starter set — so the brand mark is now the
 * mascot itself, drawn by the same renderer as the collection. One fewer icon to
 * keep in sync with the art, and the tab icon is the same drawing.
 */
const MASCOT = KEEN_BY_ID["keenungen"];

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

  const theme = ROLE_THEME[me?.role ?? "STUDENT"];

  const items = [
    { href: "/dashboard", label: "Översikt", icon: null },
    { href: "/classroom", label: "Klassrum", icon: School },
    ...(me?.role === "TEACHER" ? [{ href: "/classroom/analytics", label: "Analys", icon: BarChart3 }] : []),
    { href: "/flashcards", label: "Gloskort", icon: Layers },
    { href: "/keens", label: "Keens", icon: Sparkles },
    { href: "/settings", label: "Inställningar", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <KeenAvatar
            keen={MASCOT}
            size={36}
            className="rounded-xl shadow-glow-sm transition-transform duration-300 group-hover:-rotate-6"
          />
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
                  <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "gap-1.5",
                        active && "bg-white/10 text-white"
                      )}
                    >
                      {Icon && <Icon className={cn("h-4 w-4", active ? "text-indigo-300" : "text-slate-400")} />}
                      <span className="hidden sm:inline">{it.label}</span>
                    </Button>
                    {/* The tab you are on grows an underline out of its middle. */}
                    <span aria-hidden className="nav-underline" data-active={active} />
                  </Link>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="ml-1 gap-1.5 text-slate-300"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
              >
                <LogOut className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline">Logga ut</span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Logga in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Skapa konto</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
