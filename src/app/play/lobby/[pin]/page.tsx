"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import LobbyGame from "@/components/lobby-game";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function LobbyInner() {
  const params = useParams();
  const search = useSearchParams();
  const pin = params.pin as string;
  const name = search.get("name") || "Player";
  const [players, setPlayers] = useState<string[]>([]);
  const supabaseRef = useRef(
    createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  );

  useEffect(() => {
    const supabase = supabaseRef.current;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      for (const ch of supabase.getChannels()) {
        await supabase.removeChannel(ch);
      }
      if (cancelled) return;

      channel = supabase.channel(`lobby-${pin}`, {
        config: { presence: { key: name } },
      });
      (window as any).__quizkeenChannel = channel;

      channel.on("presence", { event: "sync" }, () => {
        if (!channel) return;
        setPlayers(Object.keys(channel.presenceState()));
      });

      channel.on("broadcast", { event: "start" }, () => {
        window.location.href = `/play/game/${pin}?name=${encodeURIComponent(name)}`;
      });

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED" && !cancelled && channel) {
          await channel.track({ name });
        }
      });
    };

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [pin, name]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="text-center">
        <p className="text-slate-400">Game PIN</p>
        <p className="text-5xl font-extrabold tracking-widest text-indigo-400">{pin}</p>
      </div>
      <div className="mt-8">
        <LobbyGame pin={pin} username={name} />
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>👥 Players ({players.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {players.map((p) => (
            <span key={p} className="rounded-full bg-slate-800 px-3 py-1 text-sm">
              {p}
            </span>
          ))}
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-slate-500">
        Waiting for the host to start... play the mini-game meanwhile! 🏃
      </p>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading lobby...</div>}>
      <LobbyInner />
    </Suspense>
  );
}