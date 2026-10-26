"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LOBBY_PING, LOBBY_PONG, lobbyIsLive } from "@/lib/presence";
import { Gamepad2, ArrowRight, Loader2, AlertCircle, Hash, User } from "lucide-react";

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
    const playerName = username.trim();
    const supabase = createClient();
    const channel = supabase.channel(`lobby-${cleanPin}`);
    let found = false;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;

    const foundGame = () => {
      if (found) return;
      found = true;
      if (pingTimer) clearInterval(pingTimer);
      if (deadline) clearTimeout(deadline);
      supabase.removeChannel(channel);
      router.push(`/play/lobby/${cleanPin}?name=${encodeURIComponent(playerName)}`);
    };

    const giveUp = () => {
      if (found) return;
      found = true;
      if (pingTimer) clearInterval(pingTimer);
      supabase.removeChannel(channel);
      setError(`Inget spel hittades med PIN-koden ${cleanPin}. Kontrollera koden och försök igen.`);
      setChecking(false);
      busyRef.current = false;
    };

    // Ask the host directly — a live host answers in milliseconds — and keep
    // presence as a fallback for hosts that are still finishing their join.
    const pingHost = () => {
      if (found) return;
      channel.send({ type: "broadcast", event: LOBBY_PING, payload: { name: playerName } });
    };

    channel.on("broadcast", { event: LOBBY_PONG }, () => foundGame());
    channel.on("presence", { event: "sync" }, () => {
      if (found) return;
      if (lobbyIsLive(channel.presenceState())) foundGame();
    });

    pingTimer = setInterval(pingHost, 1200);
    deadline = setTimeout(giveUp, 6000);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") pingHost();
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_14px_34px_-14px_rgba(99,102,241,0.95)] ring-1 ring-inset ring-white/20">
          <Gamepad2 className="h-6 w-6 text-white" />
        </span>
        <h1 className="page-title">Gå med i ett spel</h1>
        <p className="mt-2 text-sm text-slate-400">Ange spelets PIN-kod och ditt namn för att delta.</p>
      </div>

      <Card className="animate-fade-up">
        <CardContent className="pt-6">
          <form onSubmit={join} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                PIN-kod
              </label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="6 siffror"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                  required
                  inputMode="numeric"
                  className="h-14 pl-10 text-center font-mono text-2xl tracking-[0.35em]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Ditt namn
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Välj ett spelarnamn"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full gap-2" disabled={checking}>
              {checking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Söker efter spel...</span>
                </>
              ) : (
                <>
                  <span>Anslut till lobby</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
