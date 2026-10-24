/**
 * Keens — the collectible characters.
 *
 * A "Keen" is the QuizKeen mascot you collect: you buy packs with coins, each
 * pack rolls a rarity and then a character, and the market lets you buy the one
 * you are missing or sell your duplicates back for coins.
 *
 * The art is not generated: every Keen is a picture in `public/keens/<id>.png`,
 * cropped from the design sheets, and `keenArtSrc` is the single place that turns
 * an id into a file. A pack is filled one pack at a time, so the catalogue below
 * only lists what actually has artwork.
 *
 * Everything below is CONTENT, not data: it is a plain module with no imports,
 * no database access and no randomness until you ask for it, so the exact same
 * catalogue powers the server (which rolls the pack) and the browser (which
 * animates the reveal). The database only stores what a person owns.
 */

export const RARITIES = ["VANLIG", "OVANLIG", "SALLSYNT", "EPISK", "LEGENDARISK", "HEMLIG", "KROMA", "MYSTISK"] as const;
export type Rarity = (typeof RARITIES)[number];

/**
 * The packs on sale, and the only ids `PACKS` may use.
 *
 * One pack is in the file because one pack has art. The rest return here as
 * their characters are drawn, and nothing else in the app assumes a pack exists
 * until it is listed.
 */
export const PACK_IDS = ["gamer"] as const;
export type PackId = (typeof PACK_IDS)[number];

/** The free pack's own id — it draws from the cheap end of what is on sale. */
export const FREE_PACK = "gratis" as const;

/**
 * The starter set's own shelf.
 *
 * The shelf is kept so older collections and the "every account owns these"
 * seeding path still have a name to point at, but it is empty: the starter set
 * is rebuilt with real artwork before it returns.
 */
export const START_PACK = "start" as const;
export type AnyPackId = PackId | typeof FREE_PACK | typeof START_PACK;

/**
 * The Admin Keen's own shelf.
 *
 * It is deliberately NOT in `PACKS`: nothing can buy it, and because it has no
 * odds it can never be rolled either — the only way into a collection is an
 * admin handing it out in QuizKeen Command. It still answers to `keensInPack`,
 * which is what keeps the generic "every Keen" loops honest about it.
 */
export const ADMIN_PACK = "admin" as const;

/**
 * The Owner Keen's own shelf.
 *
 * Same rules as the Admin Keen, but only the owner can hand this one out. It is
 * a separate shelf rather than a flag on the Admin Keen so the vault can label
 * the two gifts differently and the permission check has one obvious thing to
 * ask about.
 */
export const OWNER_PACK = "owner" as const;
export type ShelfId = AnyPackId | typeof ADMIN_PACK | typeof OWNER_PACK;

export type Keen = {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  rarity: Rarity;
  pack: PackId | typeof ADMIN_PACK | typeof START_PACK | typeof OWNER_PACK;
  /** Base hue (0–360), used for the soft colour behind the artwork. */
  hue: number;
};

/** The picture for a Keen. One file per id, no drawing. */
export function keenArtSrc(keen: Pick<Keen, "id">): string {
  return `/keens/${keen.id}.png`;
}

/** True for a Keen handed out by a person rather than rolled by a pack. */
export function isGiftKeen(keen: Keen): boolean {
  return keen.pack === ADMIN_PACK || keen.pack === OWNER_PACK;
}

/** True for the Owner Keen: only the owner can hand it out. */
export function isOwnerKeen(keen: Keen): boolean {
  return keen.pack === OWNER_PACK;
}

/** True for a starter Keen: every account has it, and it cannot be lost. */
export function isStarterKeen(keen: Keen): boolean {
  return keen.pack === START_PACK;
}

/**
 * True for Keens nobody collects — they are held, not earned.
 *
 * Both gifted Keens and the starter set are in this class, and every rule that
 * asks "can this be traded, sold or rolled?" goes through here rather than
 * asking about one specific shelf.
 */
export function isGrantedKeen(keen: Keen): boolean {
  return isGiftKeen(keen) || isStarterKeen(keen);
}

/**
 * Can this Keen be bought and sold in the market?
 *
 * A granted Keen never can, whatever its rarity says — Mystisk is a normal pack
 * tier, and a starter Keen that sold for coins would be a coin printer — so "is
 * it handed out?" is the question the market asks, not "which tier is it?".
 */
export function isTradeable(keen: Keen): boolean {
  return RARITY_META[keen.rarity].tradeable && !isGrantedKeen(keen);
}

export type RarityMeta = {
  label: string;
  labelEn: string;
  /** Market price in coins. */
  price: number;
  /** What you get back for a spare copy — a pack duplicate is refunded this. */
  sell: number;
  order: number;
  /** Whether the market trades this rarity at all. */
  tradeable: boolean;
  /** Literal class strings (Tailwind only ships classes it can see in the source). */
  text: string;
  chip: string;
  ring: string;
  glow: string;
  tile: string;
  from: string;
};

export const RARITY_META: Record<Rarity, RarityMeta> = {
  VANLIG: {
    label: "Vanlig",
    labelEn: "Common",
    price: 30,
    sell: 12,
    order: 0,
    tradeable: true,
    text: "text-slate-300",
    chip: "border-slate-500/40 bg-slate-500/15 text-slate-300",
    ring: "border-slate-400/40",
    glow: "shadow-[0_0_20px_-6px_rgba(148,163,184,0.55)]",
    tile: "from-slate-500/20 to-slate-700/10",
    from: "#94a3b8",
  },
  OVANLIG: {
    label: "Ovanlig",
    labelEn: "Uncommon",
    price: 75,
    sell: 30,
    order: 1,
    tradeable: true,
    text: "text-emerald-300",
    chip: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    ring: "border-emerald-400/50",
    glow: "shadow-[0_0_24px_-6px_rgba(52,211,153,0.65)]",
    tile: "from-emerald-500/25 to-emerald-700/10",
    from: "#34d399",
  },
  SALLSYNT: {
    label: "Sällsynt",
    labelEn: "Rare",
    price: 180,
    sell: 72,
    order: 2,
    tradeable: true,
    text: "text-sky-300",
    chip: "border-sky-500/40 bg-sky-500/15 text-sky-300",
    ring: "border-sky-400/50",
    glow: "shadow-[0_0_28px_-6px_rgba(56,189,248,0.7)]",
    tile: "from-sky-500/25 to-sky-700/10",
    from: "#38bdf8",
  },
  EPISK: {
    label: "Episk",
    labelEn: "Epic",
    price: 450,
    sell: 180,
    order: 3,
    tradeable: true,
    text: "text-fuchsia-300",
    chip: "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300",
    ring: "border-fuchsia-400/50",
    glow: "shadow-[0_0_32px_-4px_rgba(232,121,249,0.75)]",
    tile: "from-fuchsia-500/25 to-violet-700/10",
    from: "#e879f9",
  },
  LEGENDARISK: {
    label: "Legendarisk",
    labelEn: "Legendary",
    price: 1100,
    sell: 440,
    order: 4,
    tradeable: true,
    text: "text-amber-300",
    chip: "border-amber-500/50 bg-amber-500/15 text-amber-300",
    ring: "border-amber-400/60",
    glow: "shadow-[0_0_40px_-4px_rgba(251,191,36,0.85)]",
    tile: "from-amber-500/30 to-orange-700/10",
    from: "#fbbf24",
  },
  KROMA: {
    label: "Kroma",
    labelEn: "Chroma",
    price: 3000,
    sell: 1200,
    order: 6,
    tradeable: true,
    text: "text-white",
    chip: "border-white/40 bg-white/10 text-white",
    ring: "border-white/50",
    glow: "shadow-[0_0_48px_-4px_rgba(255,255,255,0.6)]",
    tile: "from-fuchsia-500/30 via-sky-500/20 to-amber-400/20",
    from: "#ffffff",
  },
  HEMLIG: {
    label: "Hemlig",
    labelEn: "Secret",
    price: 2600,
    sell: 950,
    order: 5,
    tradeable: true,
    text: "text-pink-300",
    chip: "border-pink-500/40 bg-pink-500/15 text-pink-300",
    ring: "border-pink-400/60",
    glow: "shadow-[0_0_44px_-4px_rgba(244,114,182,0.8)]",
    tile: "from-pink-500/30 to-purple-800/10",
    from: "#f472b6",
  },
  MYSTISK: {
    label: "Mystisk",
    labelEn: "Mystical",
    price: 3400,
    sell: 1350,
    order: 7,
    tradeable: true,
    text: "text-purple-300",
    chip: "border-purple-400/40 bg-purple-500/15 text-purple-200",
    ring: "border-purple-400/60",
    glow: "shadow-[0_0_44px_-4px_rgba(168,85,247,0.85)]",
    tile: "from-purple-500/30 to-fuchsia-700/10",
    from: "#a855f7",
  },
};

export const RARITY_ORDER: Rarity[] = [...RARITIES].sort((a, b) => RARITY_META[a].order - RARITY_META[b].order);

export type Pack = {
  id: AnyPackId;
  name: string;
  nameEn: string;
  tagline: string;
  taglineEn: string;
  /** Coins per pack. 0 for the free daily one. */
  price: number;
  emoji: string;
  hue: number;
  /** Drop chances in percent — they add up to 100. */
  odds: Partial<Record<Rarity, number>>;
  /** Packs can be opened in these amounts. */
  sizes: number[];
  /** The pack's own cover picture, when the design has one. */
  art?: string;
  free?: boolean;
  /**
   * When the pack landed on the shelf (YYYY-MM-DD).
   *
   * Only used to put a "NEW" ribbon on the most recently added pack, so a fresh
   * theme is visibly the fresh theme without anyone having to remember to move a
   * badge by hand.
   */
  added?: string;
  /**
   * Off the shelf: the pack still exists — its Keens stay in the collection, and
   * the market still sells them — but the shop does not show it and the server
   * refuses to open it. Delete the line to put the pack back on sale.
   */
  hidden?: boolean;
};

export const PACKS: Pack[] = [
  {
    id: FREE_PACK,
    name: "Gratispaketet",
    nameEn: "Free pack",
    tagline: "Ett gratis paket varje dag — missa inte!",
    taglineEn: "One free pack every day — don't miss it!",
    price: 0,
    emoji: "🎁",
    hue: 150,
    odds: { VANLIG: 62, OVANLIG: 30, SALLSYNT: 8 },
    sizes: [1],
    free: true,
  },
  {
    id: "gamer",
    name: "Gamerpaketet",
    nameEn: "Gamer pack",
    tagline: "Pixlar, neon och något som rör sig i mörkret.",
    taglineEn: "Pixels, neon and something moving in the dark.",
    added: "2026-09-12",
    price: 180,
    emoji: "🎮",
    hue: 285,
    // Straight from the design sheet: common 57,3 %, rare 37 %, epic 5,01 %,
    // legendary 0,67 %, secret 0,02 % — 100 % together.
    odds: { VANLIG: 57.3, SALLSYNT: 37, EPISK: 5.01, LEGENDARISK: 0.67, HEMLIG: 0.02 },
    sizes: [1, 3, 5],
    art: "/keens/packs/gamer.png",
  },
];

/**
 * What the shop shows, and what it has taken off the shelf.
 *
 * `PACKS` stays the whole catalogue: rolling, the "which pack drops this" hints
 * and the collection's pack filter all read from it, so hiding a pack changes the
 * shop and nothing else.
 */
export const SHELF_PACKS: Pack[] = PACKS.filter((p) => !p.free && !p.hidden);
export const HIDDEN_PACKS: Pack[] = PACKS.filter((p) => !p.free && p.hidden);

/**
 * The freshest pack on the shelf, or null when nothing carries an `added` date.
 *
 * Derived from the catalogue instead of hard-coded, so deleting one line from the
 * newest pack moves the "NEW" ribbon to the next one down rather than leaving a
 * badge pointing at something that is no longer new.
 */
export const NEWEST_PACK: Pack | null =
  SHELF_PACKS.filter((p) => p.added).sort((a, b) => (a.added! < b.added! ? 1 : -1))[0] ?? null;

/**
 * A pack's chase card: the rarest Keen in it that you have not found yet.
 *
 * What a pack is really worth to a given collection is not its odds but the one
 * character at the top of it you are still missing, which is why the shelf shows
 * this rather than another list of percentages. Falls back to the rarest Keen in
 * the pack (you have them all) and then to nothing for an empty pack.
 */
export function chaseKeen(pack: ShelfId, owned: OwnedMap = {}): Keen | null {
  const list = keensInPack(pack);
  if (!list.length) return null;
  const missing = list.filter((k) => (owned[k.id] ?? 0) === 0);
  const pool = missing.length ? missing : list;
  return pool.reduce((best, k) => (RARITY_META[k.rarity].order > RARITY_META[best.rarity].order ? k : best), pool[0]);
}

const P = (
  // `Keen["pack"]`, not `PackId`: the gift Keens live on their own shelves.
  pack: Keen["pack"],
  rarity: Rarity,
  hue: number,
  id: string,
  name: string,
  nameEn: string,
  emoji: string
): Keen => ({ id, name, nameEn, emoji, rarity, pack, hue });

export const KEENS: Keen[] = [
  // ── Gamerpaketet ───────────────────────────────────────────────────────────
  // One Keen per step of the ladder, straight from the design sheet: common
  // 57,3 %, rare 37 %, epic 5,01 %, legendary 0,67 %, secret 0,02 %.
  P("gamer", "VANLIG", 120, "invader", "Space Invader", "Space Invader", "👾"),
  P("gamer", "SALLSYNT", 0, "crewmate", "Crewmate", "Crewmate", "🚀"),
  P("gamer", "EPISK", 110, "chubbypig", "Chubby Pig", "Chubby Pig", "🐷"),
  P("gamer", "LEGENDARISK", 130, "creeper", "Creeper", "Creeper", "🧟"),
  P("gamer", "HEMLIG", 285, "pixelthorne", "Pixel Thorne", "Pixel Thorne", "🦔"),

  // ── Admin-Keenen ───────────────────────────────────────────────────────────
  // Never on a shelf: an admin in QuizKeen Command hands these out. Both are
  // trophies — one per person — so the panel offers them as a pair of cards.
  P(ADMIN_PACK, "MYSTISK", 205, "doodlekraken", "Doodle Kraken", "Doodle Kraken", "🐙"),
  P(ADMIN_PACK, "MYSTISK", 30, "omeisaurus", "Omeisaurus", "Omeisaurus", "🐉"),

  // ── Ägar-Keenen ────────────────────────────────────────────────────────────
  // Also never on a shelf, and only the owner can hand these out. The two
  // dragons are the same sleeper in different palettes, so they are named after
  // the place each one naps rather than numbered.
  P(OWNER_PACK, "MYSTISK", 230, "dragony", "DragonY", "DragonY", "🐲"),
  P(OWNER_PACK, "MYSTISK", 140, "dragonyforest", "DragonY (Forest)", "DragonY (Forest)", "🌿"),
  P(OWNER_PACK, "MYSTISK", 265, "dragonymoonlight", "DragonY (Moonlight)", "DragonY (Moonlight)", "🌙"),
];

/**
 * One line of personality per Keen.
 *
 * The catalogue above is about game play — rarity, price, odds. These are about
 * the character: what it does when nobody is looking, in the detail card where
 * there is room for a sentence. Kept as a separate map (rather than an eighth
 * argument on every `P(...)` row) so the big table stays readable as a table.
 */
export const KEEN_BIOS: Record<string, string> = {
  // ── Gamerpaketet ──────────────────────────────────────────────────────────
  invader: "Landar i åtta bitar och flyttar sig i sidled.",
  crewmate: "Åtta i besättningen, och en av dem ljuger.",
  chubbypig: "Rund, arg och överraskande svårfångad.",
  creeper: "Kommer tyst, exploderar mitt i provet.",
  pixelthorne: "En skugga med tänder — bara några har sett den.",

  // ── Gåvorna ───────────────────────────────────────────────────────────────
  doodlekraken: "Ritad med krita i marginalen av ett skrivblock — bläck har den aldrig sett.",
  omeisaurus: "Chefens egen drake — delas bara ut av en admin.",
  dragony: "Ägarens drake, som sover på moln och vaktar hela samlingen.",
  dragonyforest: "Sover under mossan i skogen med vingarna som täcke.",
  dragonymoonlight: "Vaknar först när månen står som högst — då vaktar den valvet.",
};

/** The one-liner for a Keen, or an empty string if it has none yet. */
export function keenBio(keen: Keen): string {
  return KEEN_BIOS[keen.id] ?? "";
}

export const KEEN_BY_ID: Record<string, Keen> = Object.fromEntries(KEENS.map((k) => [k.id, k]));
export const PACK_BY_ID: Record<string, Pack> = Object.fromEntries(PACKS.map((p) => [p.id, p]));

/**
 * Can a player still get this Keen?
 *
 * Yes for a Keen from a pack that is on the shelf, and yes for one that is
 * handed out. No for a Keen whose only pack is marked `hidden`: nobody can open
 * that pack, so counting it would promise a collection nobody can complete.
 */
export function isObtainable(keen: Keen): boolean {
  return isGrantedKeen(keen) || !PACK_BY_ID[keen.pack]?.hidden;
}

/**
 * The starter set: what every account owns on purpose.
 *
 * Empty until the set is redrawn with real artwork. The mechanism stays, so
 * adding a Keen on the `start` shelf is all it takes to seed it for everyone.
 */
export const STARTER_KEENS: Keen[] = KEENS.filter(isStarterKeen);
export const STARTER_KEEN_IDS: string[] = STARTER_KEENS.map((k) => k.id);

/** One of each starter Keen, ready to seed a collection with. */
export function starterOwned(): OwnedMap {
  return Object.fromEntries(STARTER_KEEN_IDS.map((id) => [id, 1]));
}

export const OBTAINABLE_KEENS: Keen[] = KEENS.filter(isObtainable);
export const OBTAINABLE_KEEN_IDS: string[] = OBTAINABLE_KEENS.map((k) => k.id);

const OBTAINABLE_IDS = new Set(OBTAINABLE_KEEN_IDS);

/** Same question as `isObtainable`, for a bare id coming out of the database. */
export function isObtainableId(keenId: string): boolean {
  return OBTAINABLE_IDS.has(keenId);
}

export const TOTAL_KEENS = OBTAINABLE_KEENS.length;

/**
 * Keens the market is allowed to show, and the rarities that actually have any.
 *
 * The market renders from these rather than from `KEENS`, so a given-away Keen
 * (and its rarity chip) never appears with a price that cannot be honoured.
 */
export const MARKET_KEENS: Keen[] = OBTAINABLE_KEENS.filter(isTradeable);
export const MARKET_RARITIES: Rarity[] = RARITY_ORDER.filter((r) => MARKET_KEENS.some((k) => k.rarity === r));

/**
 * Tradeable Keens that are no longer obtainable.
 *
 * The market still lists the ones somebody already owns, so a collection built
 * before a pack left the shelf can always be cashed in — but it never offers one
 * for sale, because no pack could ever drop it again.
 */
export function retiredKeens(owned: OwnedMap = {}): Keen[] {
  return KEENS.filter((k) => !isObtainable(k) && isTradeable(k) && (owned[k.id] ?? 0) > 0);
}

/**
 * The Keens a pack can drop.
 *
 * The free pack has no theme of its own: it samples the cheap end of what is on
 * sale, so it can never hand out a Keen from a pack that was taken off the shelf
 * (which would grow a collection past the total the app promises).
 */
export function keensInPack(pack: ShelfId): Keen[] {
  if (pack === FREE_PACK) {
    return OBTAINABLE_KEENS.filter(
      (k) => !isGrantedKeen(k) && RARITY_META[k.rarity].order <= RARITY_META.SALLSYNT.order
    );
  }
  return KEENS.filter((k) => k.pack === pack);
}

export function packPool(pack: string): Keen[] {
  const odds = PACK_BY_ID[pack]?.odds ?? {};
  return keensInPack(pack as ShelfId).filter((k) => (odds[k.rarity] ?? 0) > 0);
}

export function rarityOdds(pack: string): { rarity: Rarity; chance: number }[] {
  const odds = PACK_BY_ID[pack]?.odds ?? {};
  const pool = packPool(pack);
  // A rarity this pack has no Keen left for is dropped and the rest rescaled,
  // because a chance the pack cannot honour is a lie.
  const rows = RARITY_ORDER.filter((r) => (odds[r] ?? 0) > 0 && pool.some((k) => k.rarity === r));
  const total = rows.reduce((a, r) => a + (odds[r] as number), 0) || 1;
  // Two decimals, because the catalogue's rarest rolls live there (0,02 %):
  // rounding those to a tenth would print a secret Keen as "0 %".
  return rows.map((rarity) => ({ rarity, chance: Math.round(((odds[rarity] as number) / total) * 10000) / 100 }));
}

/** One rarity's real chance in a pack, as the pack's own chip shows it. */
export function rarityChance(pack: string, rarity: Rarity): number {
  return rarityOdds(pack).find((row) => row.rarity === rarity)?.chance ?? 0;
}

/**
 * Roll one Keen from a pack: first a rarity by weight, then a uniform pick
 * among that rarity's members. `rand` is injectable so the logic can be tested
 * without luck.
 */
export function rollKeen(pack: AnyPackId, rand: () => number = Math.random): Keen {
  const pool = packPool(pack);
  const table = rarityOdds(pack);
  const total = table.reduce((a, r) => a + r.chance, 0) || 1;
  let roll = rand() * total;
  let rarity: Rarity = table[0]?.rarity ?? "VANLIG";
  for (const row of table) {
    roll -= row.chance;
    if (roll <= 0) {
      rarity = row.rarity;
      break;
    }
  }
  const candidates = pool.filter((k) => k.rarity === rarity);
  const list = candidates.length ? candidates : pool;
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

/**
 * The pack that can drop a given Keen — shown as "hint" on locked cards.
 *
 * `null` for the gift Keens: no pack contains them, so callers must say "gift"
 * rather than render an empty name.
 */
export function dropsFrom(keen: Keen): Pack | null {
  return PACK_BY_ID[keen.pack] ?? null;
}

export function marketPrice(keen: Keen): number {
  return RARITY_META[keen.rarity].price;
}

export function sellPrice(keen: Keen): number {
  return RARITY_META[keen.rarity].sell;
}

// ── Free daily pack ──────────────────────────────────────────────────────────

export const FREE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Milliseconds until the free pack is ready again; 0 when it is ready now. */
export function freePackWait(lastFreePackAt: Date | string | null | undefined, now: number = Date.now()): number {
  if (!lastFreePackAt) return 0;
  const last = typeof lastFreePackAt === "string" ? Date.parse(lastFreePackAt) : lastFreePackAt.getTime();
  if (!Number.isFinite(last)) return 0;
  return Math.max(0, last + FREE_COOLDOWN_MS - now);
}

export function freePackReady(lastFreePackAt: Date | string | null | undefined, now: number = Date.now()): boolean {
  return freePackWait(lastFreePackAt, now) === 0;
}

export function formatWait(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

// ── Market deals ─────────────────────────────────────────────────────────────

export const DEAL_OFF = 30; // percent off
export const DEALS_PER_DAY = 3;

/**
 * Today's discounts.
 *
 * A pure function of the date, so the server that prices the purchase and the
 * browser that shows the sticker agree — no "the deal changed under me" bugs.
 */
export function dailyDeals(dateKey: string): { keen: Keen; price: number; off: number }[] {
  // MARKET_KEENS, not every Keen: a deal has to be something the market can
  // actually sell. Kroma Keens are the top of the market and never get
  // discounted, and a Keen that is handed out has no price to discount at all.
  const pool = MARKET_KEENS.filter((k) => k.rarity !== "KROMA");
  if (!pool.length) return [];
  let seed = 0;
  for (let i = 0; i < dateKey.length; i++) seed = (seed * 31 + dateKey.charCodeAt(i)) >>> 0;
  const used = new Set<number>();
  const out: { keen: Keen; price: number; off: number }[] = [];
  for (let n = 0; n < DEALS_PER_DAY && n < pool.length; n++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    let idx = seed % pool.length;
    let guard = 0;
    while (used.has(idx) && guard++ < pool.length) idx = (idx + 1) % pool.length;
    used.add(idx);
    const keen = pool[idx];
    const price = Math.max(1, Math.round((marketPrice(keen) * (100 - DEAL_OFF)) / 100));
    out.push({ keen, price, off: DEAL_OFF });
  }
  return out;
}

/** UTC day key (2026-10-15) — the same string in every timezone. */
export function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// ── Daily spotlight ──────────────────────────────────────────────────────────

/**
 * Today's Keen: one character, the same for everyone, until midnight UTC.
 *
 * It is drawn from the chase tiers (Episk and up) because a spotlight on the
 * fifth common is not a spotlight — and it is a pure function of the date, so
 * the server and every browser agree on who it is.
 */
export function keenOfTheDay(dateKey: string, pool?: Keen[]): Keen | null {
  const chase = (pool ?? OBTAINABLE_KEENS).filter((k) => RARITY_META[k.rarity].order >= RARITY_META.EPISK.order);
  const list = chase.length ? chase : pool ?? OBTAINABLE_KEENS;
  if (!list.length) return null;
  let seed = 0;
  for (let i = 0; i < dateKey.length; i++) seed = (seed * 31 + dateKey.charCodeAt(i)) >>> 0;
  seed = (seed * 1103515245 + 12345) >>> 0;
  return list[seed % list.length];
}

// ── Collection helper ────────────────────────────────────────────────────────

export type OwnedMap = Record<string, number>;

export function collectionStats(owned: OwnedMap) {
  // Only Keens that are still obtainable count towards the total, so a retired
  // one can never push a collection past 100 %.
  const distinct = Object.keys(owned).filter((id) => isObtainableId(id) && owned[id] > 0).length;
  const copies = Object.values(owned).reduce((a, n) => a + n, 0);
  // Only spares worth coins: the "sell all duplicates" button must never promise
  // more than the market pays, and it skips Keens that cannot be sold.
  const dupes = Object.entries(owned).reduce((a, [id, n]) => {
    const keen = KEEN_BY_ID[id];
    if (!keen || !isTradeable(keen)) return a;
    return a + Math.max(0, n - 1);
  }, 0);
  const percent = TOTAL_KEENS ? Math.min(100, Math.round((distinct / TOTAL_KEENS) * 100)) : 0;
  const best = KEENS.reduce<Keen | null>((acc, k) => {
    if (!owned[k.id]) return acc;
    if (!acc) return k;
    return RARITY_META[k.rarity].order > RARITY_META[acc.rarity].order ? k : acc;
  }, null);
  return { distinct, copies, dupes, percent, best };
}

export function packProgress(owned: OwnedMap, pack: AnyPackId) {
  const list = keensInPack(pack);
  const have = list.filter((k) => owned[k.id] > 0).length;
  return { have, total: list.length, percent: list.length ? Math.round((have / list.length) * 100) : 0 };
}

// ── Collector rank ───────────────────────────────────────────────────────────

/**
 * What a collection is worth, and what that makes you.
 *
 * Counting Keens alone makes a shelf of commons look the same as a shelf with a
 * hidden Keen on it, so a Keen is worth its rung on the ladder: a common is a
 * point, and the crown of a pack is worth eight. The thresholds are fractions of
 * what the current catalogue can actually hold, so adding a pack grows the ladder
 * instead of leaving its top rungs unreachable.
 */
export const MAX_COLLECTOR_POINTS: number = OBTAINABLE_KEENS.reduce(
  (sum, k) => sum + RARITY_META[k.rarity].order + 1,
  0
);

const rung = (fraction: number) => Math.round(MAX_COLLECTOR_POINTS * fraction);

export const RANKS: { points: number; label: string; labelEn: string }[] = [
  { points: 0, label: "Nyfiken", labelEn: "Curious" },
  { points: rung(0.08), label: "Samlare", labelEn: "Collector" },
  { points: rung(0.2), label: "Jägare", labelEn: "Hunter" },
  { points: rung(0.4), label: "Kännare", labelEn: "Connoisseur" },
  { points: rung(0.65), label: "Mästare", labelEn: "Master" },
  { points: rung(0.9), label: "Legendar", labelEn: "Legend" },
  { points: MAX_COLLECTOR_POINTS, label: "Keen-Kungen", labelEn: "Keen King" },
];

/** A collection's score: one point for a common, eight for a Mystisk. */
export function collectorPoints(owned: OwnedMap): number {
  return Object.entries(owned).reduce((sum, [id, count]) => {
    const keen = KEEN_BY_ID[id];
    if (!keen || count <= 0 || !isObtainable(keen)) return sum;
    return sum + RARITY_META[keen.rarity].order + 1;
  }, 0);
}

/** Current rank, and how far the next one is. */
export function collectorRank(owned: OwnedMap) {
  const points = collectorPoints(owned);
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (points >= RANKS[i].points) index = i;
  const rank = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  const progress = next ? Math.min(1, (points - rank.points) / Math.max(1, next.points - rank.points)) : 1;
  const toNext = next ? Math.max(0, next.points - points) : 0;
  return { points, rank, index, next, progress, toNext };
}
