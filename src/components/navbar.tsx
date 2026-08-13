"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers";
import { Button } from "@/components/ui/button";
import TutorialWidget from "@/components/tutorial";

export default function Navbar() {
  const { supabase, session } = useSupabase();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      supabase
        .from("Profile")
        .select("username")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => setUsername(data?.username ?? null));
    } else {
      setUsername(null);
    }
  }, [session, supabase]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-white">
          Quiz<span className="text-indigo-400">Keen</span>
        </Link>
        <nav className="flex items-center gap-2">
          {session ? (
            <>
              <TutorialWidget />
              <Link href="/dashboard">
                <Button variant="ghost">Översikt</Button>
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