/**
 * Shared helpers for the Supabase realtime lobby channels.
 *
 * A bare `channel.track()` gets a random UUID presence key, which made the
 * host show up in the player list as a phantom player. Hosts now join under a
 * sentinel key and are filtered out of every player list, while still counting
 * as "lobby exists" when a player validates a game PIN.
 */
export const HOST_PRESENCE_KEY = "__host__";

export const HOST_PRESENCE_CONFIG = { presence: { key: HOST_PRESENCE_KEY } };

/**
 * Handshake used when someone types a game PIN.
 *
 * Presence only tells us who has *already* finished joining the lobby channel,
 * so a student could be told "no game with that PIN" while the host's page was
 * open but its presence had not propagated yet. The student asks directly, and
 * any live host answers immediately.
 */
export const LOBBY_PING = "quizkeen:ping";
export const LOBBY_PONG = "quizkeen:pong";

type PresenceEntry = { role?: string; name?: string };

export function isHostKey(key: string): boolean {
  return key === HOST_PRESENCE_KEY;
}

function isHostEntry(key: string, entries: PresenceEntry[]): boolean {
  return isHostKey(key) || entries.some((entry) => entry?.role === "host");
}

/** Unique player names currently in a lobby, with front-of-house clients removed. */
export function onlinePlayers(
  state: Record<string, PresenceEntry[] | undefined> | undefined
): string[] {
  const names = new Set<string>();
  for (const [key, entries] of Object.entries(state ?? {})) {
    const list = entries ?? [];
    if (isHostEntry(key, list)) continue;
    if (list.length === 0) {
      names.add(key);
      continue;
    }
    for (const entry of list) {
      const name = typeof entry?.name === "string" ? entry.name.trim() : "";
      names.add(name || key);
    }
  }
  return Array.from(names);
}

/**
 * True when anything is on the lobby channel — the host, a player, or a client
 * from a build that still tracks presence under a random key. Used to check
 * that a game PIN exists before joining.
 */
export function lobbyIsLive(
  state: Record<string, PresenceEntry[] | undefined> | undefined
): boolean {
  return Object.keys(state ?? {}).length > 0;
}
