"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers";
import { Button } from "@/components/ui/button";
import TutorialWidget from "@/components/tutorial";
import { School, BarChart3, Layers, Settings, LogOut } from "lucide-react";

export default function Navbar() {
  const { supabase, session } = useSupabase();
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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-white hover:opacity-90 transition-opacity">
          Quiz<span className="text-indigo-400">Keen</span>
        </Link>
        <nav className="flex items-center gap-2">
          {session ? (
            <>
              {me && (
                <span className={`hidden items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-xs font-bold sm:flex ${theme.color} ${theme.glow ?? ""}`}>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono tracking-wider uppercase text-slate-400">{theme.badge}</span>
                  <span>{me.username}</span>
                </span>
              )}
              <TutorialWidget />
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">Översikt</Button>
              </Link>
              <Link href="/classroom">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <School className="h-4 w-4 text-slate-400" />
                  <span>Klassrum</span>
                </Button>
              </Link>
              {me?.role === "TEACHER" && (
                <Link href="/classroom/analytics">
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <BarChart3 className="h-4 w-4 text-slate-400" />
                    <span>Analys</span>
                  </Button>
                </Link>
              )}
              <Link href="/flashcards">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <span>Gloskort</span>
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Settings className="h-4 w-4 text-slate-400" />
                  <span>Inställningar</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-slate-300"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
              >
                <LogOut className="h-3.5 w-3.5 text-slate-400" />
                <span>Logga ut</span>
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