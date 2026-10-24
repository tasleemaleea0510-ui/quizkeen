/**
 * The Keen catalogue, as much of it as QuizKeen Command needs.
 *
 * Command is a separate deployment from the player site and cannot import from
 * `quizkeen/src`, but the owner's vault has to offer the SAME collectibles the
 * game hands out — a gift of a Keen id the app does not know lands in the
 * database and shows up as nothing. So this file is a copy of the catalogue's
 * identity columns (id, name, rarity, shelf, hue, emoji), generated from
 * `quizkeen/src/lib/keens.ts`.
 *
 * The artwork is a copy of the same PNGs in `command/public/keens`, for the same
 * reason: the vault shows the picture the player will see. Add a Keen to the
 * game, copy its image and this row in the same breath.
 */

export type KeenEntry = {
  id: string;
  name: string;
  /** Same strings the database stores: VANLIG … MYSTISK. */
  rarity: string;
  /** The shelf it belongs to: a pack id, "start", "admin" or "owner". */
  pack: string;
  /** Base hue (0–360) — the soft colour behind the artwork. */
  hue: number;
  emoji: string;
};

/** The picture for a Keen: one file per id, copied from the player site. */
export function keenArtSrc(id: string): string {
  return `/keens/${id}.png`;
}

/** The rarity names staff read in the vault, in the game's own wording. */
export const RARITY_LABEL: Record<string, string> = {
  VANLIG: "Vanlig",
  OVANLIG: "Ovanlig",
  SALLSYNT: "Sällsynt",
  EPISK: "Episk",
  LEGENDARISK: "Legendarisk",
  HEMLIG: "Hemlig",
  KROMA: "Kroma",
  MYSTISK: "Mystisk",
};

/** Shelves in the order the vault shows them; the label is what staff read. */
export const KEEN_SHELVES: { id: string; label: string }[] = [
  { id: "gamer", label: "Gamer" },
  { id: "admin", label: "Admin-gåva" },
  { id: "owner", label: "Ägar-gåva" },
];

export const KEEN_CATALOGUE: KeenEntry[] = [
  // Gamerpaketet
  { id: "invader", name: "Space Invader", rarity: "VANLIG", pack: "gamer", hue: 120, emoji: "👾" },
  { id: "crewmate", name: "Crewmate", rarity: "SALLSYNT", pack: "gamer", hue: 0, emoji: "🚀" },
  { id: "chubbypig", name: "Chubby Pig", rarity: "EPISK", pack: "gamer", hue: 110, emoji: "🐷" },
  { id: "creeper", name: "Creeper", rarity: "LEGENDARISK", pack: "gamer", hue: 130, emoji: "🧟" },
  { id: "pixelthorne", name: "Pixel Thorne", rarity: "HEMLIG", pack: "gamer", hue: 285, emoji: "🦔" },
  // Gåvor — never in a pack. Admins hand out the two `admin` ones (the panel
  // shows them as cards); only the owner may hand out the `owner` ones.
  { id: "doodlekraken", name: "Doodle Kraken", rarity: "MYSTISK", pack: "admin", hue: 205, emoji: "🐙" },
  { id: "omeisaurus", name: "Omeisaurus", rarity: "MYSTISK", pack: "admin", hue: 30, emoji: "🐉" },
  { id: "dragony", name: "DragonY", rarity: "MYSTISK", pack: "owner", hue: 230, emoji: "🐲" },
  { id: "dragonyforest", name: "DragonY (Forest)", rarity: "MYSTISK", pack: "owner", hue: 140, emoji: "🌿" },
  { id: "dragonymoonlight", name: "DragonY (Moonlight)", rarity: "MYSTISK", pack: "owner", hue: 265, emoji: "🌙" },
];

export const KEEN_BY_ID: Record<string, KeenEntry> = Object.fromEntries(
  KEEN_CATALOGUE.map((k) => [k.id, k])
);

/**
 * The Keens an admin may hand out — everything on the `admin` shelf.
 *
 * Kept here, in the client-safe catalogue, because both sides need the same
 * answers: the admin panel draws one card per entry, and the server checks a
 * submitted id against this same list before it writes anything. The first entry
 * is the panel's default selection.
 */
export const ADMIN_KEENS: KeenEntry[] = KEEN_CATALOGUE.filter((k) => k.pack === "admin");
export const ADMIN_KEEN_ID = ADMIN_KEENS[0]?.id ?? "doodlekraken";
