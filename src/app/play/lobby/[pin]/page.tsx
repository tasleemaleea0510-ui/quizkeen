"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";

const LobbyGame = dynamic(() => import("@/components/lobby-game"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] w-full items-center justify-center rounded-xl border border-white/5 bg-slate-900/40 text-sm text-slate-500">
      Laddar minispelet...
    </div>
  ),
});
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { onlinePlayers } from "@/lib/presence";
import { Users, Hash } from "lucide-react";

function LobbyInner() {
  const params = useParams();
  const search = useSearchParams();
  const pin = params.pin as string;
  const name = search.get("name") || "Spelare";
  const [players, setPlayers] = useState<string[]>([]);
  const supabaseRef = useRef(createClient());
  // players heard from over the position channel, used for instant feedback
  // when presence has not caught up yet
  const seenRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const supabase = supabaseRef.current;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let onTx: ((e: any) => void) | null = null;
    let ticker: ReturnType<typeof setInterval> | undefined;
    let lastMerge = 0;

    const setup = async () => {
      for (const ch of supabase.getChannels()) {
        await supabase.removeChannel(ch);
      }
      if (cancelled) return;

      channel = supabase.channel(`lobby-${pin}`, {
        config: { presence: { key: name } },
      });

      // Presence is the source of truth for who has left, but it is confirmed
      // asynchronously, so names seen in the last few seconds count too. That
      // keeps the list from sitting at (0) while you are clearly online.
      const refresh = () => {
        if (!channel) return;
        const now = Date.now();
        const live = onlinePlayers(channel.presenceState());
        const recent = Object.keys(seenRef.current).filter(
          (n) => n !== name && now - seenRef.current[n] < 10000
        );
        const merged = Array.from(new Set([...live, ...recent]));
        setPlayers((prev) =>
          prev.length === merged.length && prev.every((p, i) => p === merged[i]) ? prev : merged
        );
      };

      channel.on("presence", { event: "sync" }, refresh);
      channel.on("presence", { event: "join" }, refresh);
      channel.on("presence", { event: "leave" }, refresh);

      channel.on("broadcast", { event: "start" }, () => {
        window.location.href = `/play/game/${pin}?name=${encodeURIComponent(name)}`;
      });

      channel.on("broadcast", { event: "pos" }, (msg: any) => {
        const who = (msg.payload as { name?: string } | null)?.name;
        if (who && who !== name) {
          const fresh = !seenRef.current[who];
          seenRef.current[who] = Date.now();
          // throttled so a busy lobby cannot cause a render per packet
          if (fresh || Date.now() - lastMerge > 400) {
            lastMerge = Date.now();
            refresh();
          }
        }
        window.dispatchEvent(new CustomEvent("quizkeen-rx", { detail: msg.payload }));
      });

      onTx = (e: any) => {
        if (channel) {
          channel.send({ type: "broadcast", event: "pos", payload: e.detail });
        }
      };
      window.addEventListener("quizkeen-tx", onTx);

      ticker = setInterval(refresh, 1500);

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED" && !cancelled && channel) {
          await channel.track({ name });
          // show yourself straight away instead of waiting for the next sync
          refresh();
          setTimeout(refresh, 700);
        }
      });
    };

    setup();

    return () => {
      cancelled = true;
      if (ticker) clearInterval(ticker);
      if (onTx) window.removeEventListener("quizkeen-tx", onTx);
      if (channel) supabase.removeChannel(channel);
    };
  }, [pin, name]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="text-center">
        <p className="mb-1 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Hash className="h-3.5 w-3.5" />
          <span>Spel-PIN</span>
        </p>
        <p className="text-gradient animate-gradient-pan bg-[length:200%_auto] font-mono text-5xl font-extrabold tracking-[0.2em]">{pin}</p>
      </div>

      <div className="mt-8">
        <LobbyGame pin={pin} username={name} />
      </div>

      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-indigo-400" />
            <span>Spelare i lobbyn ({players.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {players.map((p) => (
            <span key={p} className="animate-pop rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm font-medium text-slate-200">
              {p}
            </span>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        <span>Väntar på att arrangören startar spelet. Spela minispelet under tiden!</span>
      </div>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Laddar lobbyn...</div>}>
      <LobbyInner />
    </Suspense>
  );
}
