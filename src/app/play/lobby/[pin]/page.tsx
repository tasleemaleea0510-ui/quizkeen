"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";

const LobbyGame = dynamic(() => import("@/components/lobby-game"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm text-slate-500">
      Laddar minispelet...
    </div>
  ),
});
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import KeenAvatar from "@/components/keens/keen-avatar";
import { onlinePlayerEntries } from "@/lib/presence";
import { KEEN_BY_ID, RARITY_META } from "@/lib/keens";
import { wornIdFromCookieString } from "@/lib/worn";
import { useWorn } from "@/components/keens/worn-keen";
import { getKeenStateAction } from "@/app/keens/actions";
import { Users, Hash, Sparkles, Check, Loader2 } from "lucide-react";

type LobbyPlayer = { name: string; keen: string | null };

function LobbyInner() {
  const params = useParams();
  const search = useSearchParams();
  const pin = params.pin as string;
  const name = search.get("name") || "Spelare";
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const supabaseRef = useRef(createClient());

  // ── The waiting room is the wardrobe ───────────────────────────────────
  // Blooket's waiting room is where your character is chosen and where you see
  // everyone else's. Same here: the Keens you own are the set you can wear, and
  // whatever you pick is what the lobby and the minigame draw for you.
  const { keen: worn, wear } = useWorn();
  const [owned, setOwned] = useState<string[]>([]);
  const [ownedLoaded, setOwnedLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [wearing, setWearing] = useState<string | null>(null);
  const [wearError, setWearError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  // players heard from over the position channel, used for instant feedback
  // when presence has not caught up yet (keyed by name, newest answer wins)
  const seenRef = useRef<Record<string, { at: number; keen: string | null }>>({});

  useEffect(() => {
    const supabase = supabaseRef.current;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let onTx: ((e: any) => void) | null = null;
    let ticker: ReturnType<typeof setInterval> | undefined;
    let lastMerge = 0;
    let live: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      for (const ch of supabase.getChannels()) {
        await supabase.removeChannel(ch);
      }
      if (cancelled) return;

      channel = supabase.channel(`lobby-${pin}`, {
        config: { presence: { key: name } },
      });
      live = channel;
      channelRef.current = channel;

      // Presence is the source of truth for who has left, but it is confirmed
      // asynchronously, so names seen in the last few seconds count too. That
      // keeps the list from sitting at (0) while you are clearly online.
      const refresh = () => {
        if (!channel) return;
        const now = Date.now();
        const merged = new Map<string, string | null>();
        for (const p of onlinePlayerEntries(channel.presenceState())) merged.set(p.name, p.keen);
        for (const [who, info] of Object.entries(seenRef.current)) {
          if (who === name || now - info.at >= 10000 || merged.has(who)) continue;
          merged.set(who, info.keen);
        }
        const next: LobbyPlayer[] = Array.from(merged.entries()).map(([who, keen]) => ({ name: who, keen }));
        setPlayers((prev) =>
          prev.length === next.length && prev.every((p, i) => p.name === next[i].name && p.keen === next[i].keen)
            ? prev
            : next
        );
      };

      channel.on("presence", { event: "sync" }, refresh);
      channel.on("presence", { event: "join" }, refresh);
      channel.on("presence", { event: "leave" }, refresh);

      channel.on("broadcast", { event: "start" }, () => {
        window.location.href = `/play/game/${pin}?name=${encodeURIComponent(name)}`;
      });

      channel.on("broadcast", { event: "pos" }, (msg: any) => {
        const payload = (msg.payload ?? {}) as { name?: string; k?: string | null };
        const who = payload.name;
        if (who && who !== name) {
          const fresh = !seenRef.current[who];
          seenRef.current[who] = { at: Date.now(), keen: payload.k ?? null };
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
          // Read the cookie now, not when the effect ran: the lobby is a client
          // page and a Keen picked while the channel was connecting must not be
          // lost. The cookie is the same one the server action writes.
          await channel.track({ name, keen: wornIdFromCookieString(document.cookie) });
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
      if (channelRef.current === live) channelRef.current = null;
    };
  }, [pin, name]);

  // What you own, for the picker. `null` state from the action means "not
  // signed in", so a guest simply gets no picker instead of an empty one.
  useEffect(() => {
    let alive = true;
    getKeenStateAction()
      .then((state) => {
        if (!alive) return;
        const ids = state
          ? Object.entries(state.owned)
              .filter(([id, count]) => count > 0 && !!KEEN_BY_ID[id])
              .map(([id]) => id)
          : [];
        setOwned(ids);
        setSignedIn(!!state);
        setOwnedLoaded(true);
      })
      .catch(() => alive && setOwnedLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  // Put the new Keen on the presence card everybody reads, and tell the
  // minigame to re-dress the runner. Both are cheap and instant, so the choice
  // lands in the room the moment you click it.
  useEffect(() => {
    if (!channelRef.current) return;
    channelRef.current.track({ name, keen: worn?.id ?? null }).catch(() => {});
    window.dispatchEvent(new Event("quizkeen-wear"));
  }, [name, worn?.id]);

  async function chooseKeen(id: string | null) {
    if (wearing) return;
    setWearing(id ?? "__off__");
    setWearError(null);
    const res = await wear(id);
    setWearing(null);
    if (!res.ok) setWearError(res.message || "Kunde inte byta Keen just nu.");
  }

  const ownedSorted = owned
    .filter((id) => !!KEEN_BY_ID[id])
    .sort((a, b) => {
      const ka = KEEN_BY_ID[a];
      const kb = KEEN_BY_ID[b];
      const byRarity = RARITY_META[kb.rarity].order - RARITY_META[ka.rarity].order;
      return byRarity !== 0 ? byRarity : ka.name.localeCompare(kb.name, "sv");
    });

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
          <span className="text-[11px] font-semibold text-slate-500">Alla bär sin Keen</span>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Ingen här än — du är först!</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {players.map((p) => {
                const keen = p.keen ? KEEN_BY_ID[p.keen] : undefined;
                const isMe = p.name === name;
                return (
                  <div
                    key={p.name}
                    className={`relative flex animate-pop flex-col items-center gap-2 rounded-2xl border px-2 pb-2.5 pt-4 ${
                      isMe
                        ? "border-indigo-400/50 bg-indigo-500/10 shadow-glow-sm"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    {isMe && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                        Du
                      </span>
                    )}
                    {keen ? (
                      <KeenAvatar keen={keen} size={64} className="animate-keen-bob drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)]" />
                    ) : (
                      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-800 text-lg font-extrabold text-slate-400">
                        {p.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="w-full truncate text-center text-xs font-bold text-slate-200">{p.name}</span>
                  </div>
                );
              })}
            </div>
          )}
          {ownedLoaded && !signedIn && (
            <p className="mt-3 text-center text-xs text-slate-500">
              Logga in för att bära en av dina Keens i lobbyn.
            </p>
          )}
        </CardContent>
      </Card>

      {/* The wardrobe sits at the bottom of the waiting room, like Blooket:
          your whole collection in one strip, and whatever you pick is the
          character the lobby and the minigame draw for you. */}
      {ownedLoaded && ownedSorted.length > 0 && (
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span className="text-sm font-bold text-slate-200">Dina Keens</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                <span data-no-translate>{ownedSorted.length}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">
                {worn ? (
                  <>
                    Bär <span className="text-slate-200">{worn.name}</span>
                  </>
                ) : (
                  "Ingen Keen vald"
                )}
              </span>
              {worn && (
                <button
                  type="button"
                  onClick={() => chooseKeen(null)}
                  disabled={!!wearing}
                  className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-400 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
                >
                  Ta av
                </button>
              )}
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {ownedSorted.map((id) => {
              const keen = KEEN_BY_ID[id];
              const active = worn?.id === id;
              const busy = wearing === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => chooseKeen(active ? null : id)}
                  disabled={!!wearing}
                  aria-pressed={active}
                  title={active ? `${keen.name} — bärs nu, tryck för att ta av` : `Bär ${keen.name}`}
                  className={`group relative flex w-[68px] shrink-0 flex-col items-center gap-1 rounded-xl border px-1 pb-1.5 pt-2 transition-all duration-150 disabled:opacity-60 ${
                    active
                      ? "border-indigo-400 bg-indigo-500/20 ring-2 ring-indigo-400/40"
                      : "border-white/10 bg-white/[0.02] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/5"
                  }`}
                >
                  <KeenAvatar keen={keen} size={48} />
                  <span className="w-full truncate text-center text-[9px] font-semibold text-slate-400 group-hover:text-slate-200">
                    {keen.name}
                  </span>
                  {busy && (
                    <span className="absolute inset-0 grid place-items-center rounded-xl bg-slate-950/70">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
                    </span>
                  )}
                  {active && !busy && (
                    <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-indigo-500 text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {wearError && (
            <p className="mt-2 px-1 text-xs font-medium text-rose-300" role="alert">
              {wearError}
            </p>
          )}
          <p className="mt-2 px-1 text-[11px] text-slate-500">
            Tryck på en Keen för att bära den — den syns för alla i lobbyn och blir figuren du styr i minispelet.
          </p>
        </section>
      )}

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
