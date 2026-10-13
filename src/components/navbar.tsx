"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSupabase } from "@/components/providers";
import { Button } from "@/components/ui/button";
import TutorialWidget from "@/components/tutorial";
import { ROLE_THEME } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { School, BarChart3, Layers, Settings, LogOut, Zap } from "lucide-react";

export default function Navbar() {
  const { supabase, session } = useSupabase();
  const pathname = usePathname();
  const [me, setMe] = useState<{ username: string; role: string } | null>(null);

  useEffect(() => {
    if (session) {
      supabase
        .from("Profile")
        .select("username, role")
        .eq("id", session.user.id)
        .single()
        .then(({ data }: any) => setMe(data ? { username: data.username, role: data.role } : null));
    } else {
      setMe(null);
    }
  }, [session, supabase]);

  const theme = ROLE_THEME[me?.role ?? "STUDENT"];

  const items = [
    { href: "/dashboard", label: "Översikt", icon: null },
    { href: "/classroom", label: "Klassrum", icon: School },
    ...(me?.role === "TEACHER" ? [{ href: "/classroom/analytics", label: "Analys", icon: BarChart3 }] : []),
    { href: "/flashcards", label: "Gloskort", icon: Layers },
    { href: "/settings", label: "Inställningar", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
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
                  <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    {theme.badge}
                  </span>
                  <span>{me.username}</span>
                </span>
              )}
              <TutorialWidget />
              {items.map((it) => {
                const Icon = it.icon;
                const active = pathname === it.href || pathname.startsWith(it.href + "/");
                return (
                  <Link key={it.href} href={it.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "gap-1.5",
                        active && "bg-white/10 text-white"
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4 text-slate-400" />}
                      <span className="hidden sm:inline">{it.label}</span>
                    </Button>
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
