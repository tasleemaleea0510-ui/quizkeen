"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function PlayPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  function join(e: React.FormEvent) {
    e.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setError(null);
    setChecking(true);

    const cleanPin = pin.trim();
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = supabase.channel(`lobby-${cleanPin}`);
    let found = false;

    const timeout = setTimeout(() => {
      if (!found) {
        found = true;
        setError(`😕 Inget spel hittades med PIN-koden ${cleanPin}. Kolla koden och försök igen!`);
        setChecking(false);
        busyRef.current = false;
        supabase.removeChannel(channel);
      }
    }, 2500);

    channel.on("presence", { event: "sync" }, () => {
      if (found) return;
      const count = Object.keys(channel.presenceState()).length;
      if (count > 0) {
        found = true;
        clearTimeout(timeout);
        supabase.removeChannel(channel);
        router.push(`/play/lobby/${cleanPin}?name=${encodeURIComponent(username.trim())}`);
      }
    });

    channel.subscribe();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">🎮 Gå med i ett spel</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={join} className="space-y-4">
            <Input placeholder="PIN-kod (6 siffror)" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={6} required />
            <Input placeholder="Ditt namn" value={username} onChange={(e) => setUsername(e.target.value)} required />
            {error && (
              <div className="rounded-xl border border-red-500 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={checking}>
              {checking ? "🔍 Kollar PIN-koden..." : "🚀 Gå med!"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}