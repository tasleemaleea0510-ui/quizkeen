"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers";
import { Button } from "@/components/ui/button";
import TutorialWidget from "@/components/tutorial";
import { ROLE_THEME } from "@/lib/roles";

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
        .then(({ data }) => setMe(data ? { username: data.username, role: data.role } : null));
    } else {
      setMe(null);
    }
  }, [session, supabase]);

  const theme = ROLE_THEME[me?.role ?? "STUDENT"];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-white">
          Quiz<span className="text-indigo-400">Keen</span>
        </Link>
        <nav className="flex items-center gap-2">
          {session ? (
            <>
              {me && (
                <span className={`hidden items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-sm font-extrabold sm:flex ${theme.color} ${theme.glow ?? ""}`}>
                  {theme.badge} {me.username}
                </span>
              )}
              <TutorialWidget />
              <Link href="/dashboard">
                <Button variant="ghost">Översikt</Button>
              </Link>
              <Link href="/classroom">
                <Button variant="ghost">🏫 Klassrum</Button>
              </Link>
              <Link href="/flashcards">
                <Button variant="ghost">🃏 Gloskort</Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost">⚙️ Inställningar</Button>
              </Link>
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
              >
                Logga ut
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Logga in</Button>
              </Link>
              <Link href="/register">
                <Button>Skapa konto</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}