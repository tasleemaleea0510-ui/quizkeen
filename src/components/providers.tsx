"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/client";

type SupabaseContext = {
  supabase: ReturnType<typeof createBrowserClient>;
  session: Session | null;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() =>
    createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  );
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    try {
      supabase.auth.getSession().then(({ data }) => setSession(data?.session ?? null)).catch(() => {});
      const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
      return () => listener?.subscription?.unsubscribe();
    } catch {}
  }, [supabase]);

  return <Context.Provider value={{ supabase, session }}>{children}</Context.Provider>;
}

export function useSupabase() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSupabase must be used within Providers");
  return ctx;
}