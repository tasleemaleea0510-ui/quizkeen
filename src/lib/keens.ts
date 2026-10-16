/**
 * Keens — the collectible characters.
 *
 * A "Keen" is the QuizKeen mascot you collect: you buy packs with coins, each
 * pack rolls a rarity and then a character, and the market lets you buy the one
 * you are missing or sell your duplicates back for coins.
 *
 * Everything below is CONTENT, not data: it is a plain module with no imports,
 * no database access and no randomness until you ask for it, so the exact same
 * catalogue powers the server (which rolls the pack) and the browser (which
 * animates the reveal). The database only stores what a person owns.
 */

export const RARITIES = ["VANLIG", "OVANLIG", "SALLSYNT", "EPISK", "LEGENDARISK", "HEMLIG", "KROMA", "MYSTISK"] as const;
export type Rarity = (typeof RARITIES)[number];

export const PACK_IDS = ["djur", "skola", "rymd", "djungel", "godis", "gamer", "mytisk"] as const;
export type PackId = (typeof PACK_IDS)[number];

/** The free pack's own id — it is not a theme, it draws from every cheap Keen. */
export const FREE_PACK = "gratis" as const;
export type AnyPackId = PackId | typeof FREE_PACK;

/**
 * The Admin Keen's own shelf.
 *
 * It is deliberately NOT in `PACKS`: nothing can buy it, and because it has no
 * odds it can never be rolled either — the only way into a collection is an
 * admin handing it out in QuizKeen Command. It still answers to `keensInPack`,
 * which is what keeps the generic "every Keen" loops honest about it.
 */
export const ADMIN_PACK = "admin" as const;
export type ShelfId = AnyPackId | typeof ADMIN_PACK;

export type Keen = {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  rarity: Rarity;
  pack: PackId | typeof ADMIN_PACK;
  /** Base hue (0–360) for this Keen's body, so the grid looks like a collection. */
  hue: number;
};

/** True for Keens that are given out rather than collected from a pack. */
export function isGiftKeen(keen: Keen): boolean {
  return keen.pack === ADMIN_PACK;
}

export type RarityMeta = {
  label: string;
  labelEn: string;
  /** Market price in coins. */
  price: number;
  /** What you get back for a spare copy — a pack duplicate is refunded this. */
  sell: number;
  order: number;
  /**
   * False for Keens that are handed out and never traded.
   *
   * The market reads this instead of hard-coding a list, so a new untradeable
   * rarity cannot be bought by accident: `buyKeen`/`sellKeen` refuse it and
   * today's deals skip it.
   */
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
    price: 0,
    sell: 0,
    order: 7,
    tradeable: false,
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
  free?: boolean;
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
    id: "djur",
    hidden: true,
    name: "Djurpaketet",
    nameEn: "Animal pack",
    tagline: "Katter, hundar och en och annan varg.",
    taglineEn: "Cats, dogs and the occasional wolf.",
    price: 25,
    emoji: "🐾",
    hue: 35,
    odds: { VANLIG: 50, OVANLIG: 32, SALLSYNT: 13, EPISK: 4.5, LEGENDARISK: 0.5 },
    sizes: [1, 3, 5],
  },
  {
    id: "skola",
    hidden: true,
    name: "Skolpaketet",
    nameEn: "School pack",
    tagline: "Från suddgummi till rektor.",
    taglineEn: "From eraser to principal.",
    price: 40,
    emoji: "🎒",
    hue: 210,
    odds: { VANLIG: 50, OVANLIG: 32, SALLSYNT: 13, EPISK: 4.5, LEGENDARISK: 0.5 },
    sizes: [1, 3, 5],
  },
  {
    id: "rymd",
    hidden: true,
    name: "Rymdpaketet",
    nameEn: "Space pack",
    tagline: "Raketer, planeter och något som tittar tillbaka.",
    taglineEn: "Rockets, planets and something looking back.",
    price: 60,
    emoji: "🚀",
    hue: 260,
    odds: { VANLIG: 50, OVANLIG: 32, SALLSYNT: 13, EPISK: 4.5, LEGENDARISK: 0.5 },
    sizes: [1, 3, 5],
  },
  {
    id: "djungel",
    hidden: true,
    name: "Djungelpaketet",
    nameEn: "Jungle pack",
    tagline: "Vilda djur och en lejonkung.",
    taglineEn: "Wild animals and a lion king.",
    price: 90,
    emoji: "🌴",
    hue: 140,
    odds: { VANLIG: 50, OVANLIG: 32, SALLSYNT: 13, EPISK: 4.5, LEGENDARISK: 0.5 },
    sizes: [1, 3, 5],
  },
  {
    id: "godis",
    hidden: true,
    name: "Godispaketet",
    nameEn: "Candy pack",
    tagline: "Sött, sötare, regnbåge.",
    taglineEn: "Sweet, sweeter, rainbow.",
    price: 140,
    emoji: "🍭",
    hue: 320,
    odds: { VANLIG: 50, OVANLIG: 32, SALLSYNT: 13, EPISK: 4.5, LEGENDARISK: 0.5 },
    sizes: [1, 3, 5],
  },
  {
    id: "gamer",
    name: "Gamerpaketet",
    nameEn: "Gamer pack",
    tagline: "Pixlar, neon och något som rör sig i mörkret.",
    taglineEn: "Pixels, neon and something moving in the dark.",
    price: 180,
    emoji: "🎮",
    hue: 285,
    odds: { VANLIG: 57.3, SALLSYNT: 37, EPISK: 5.01, LEGENDARISK: 0.67, HEMLIG: 0.02 },
    sizes: [1, 3, 5],
  },
  {
    id: "mytisk",
    hidden: true,
    name: "Mytiskapaketet",
    nameEn: "Mythical pack",
    tagline: "Bara det bästa — och Kroma-Keens.",
    taglineEn: "Only the best — and Chroma Keens.",
    price: 300,
    emoji: "🔮",
    hue: 285,
    odds: { EPISK: 58, LEGENDARISK: 34, KROMA: 8 },
    sizes: [1, 3, 5],
  },
];

/**
 * What the shop shows, and what it has taken off the shelf.
 *
 * `PACKS` stays the whole catalogue: rolling, the "which pack drops this" hints
 * and the collection's pack filter all read from it, so hiding a pack changes the
 * shop and nothing else. That is deliberate — a hidden pack's Keens are still
 * collectable (the market sells them), they just are not on sale.
 */
export const SHELF_PACKS: Pack[] = PACKS.filter((p) => !p.free && !p.hidden);
export const HIDDEN_PACKS: Pack[] = PACKS.filter((p) => !p.free && p.hidden);

const P = (
  // `Keen["pack"]`, not `PackId`: the Admin Keen lives on its own shelf.
  pack: Keen["pack"],
  rarity: Rarity,
  hue: number,
  id: string,
  name: string,
  nameEn: string,
  emoji: string
): Keen => ({ id, name, nameEn, emoji, rarity, pack, hue });

export const KEENS: Keen[] = [
  // ── Djurpaketet ────────────────────────────────────────────────────────────
  P("djur", "VANLIG", 28, "kisse", "Katten Kisse", "Kisse the Cat", "🐱"),
  P("djur", "VANLIG", 45, "vovve", "Valpen Vovve", "Vovve the Pup", "🐶"),
  P("djur", "OVANLIG", 340, "kaninen", "Kaninen Bus", "Bus the Rabbit", "🐰"),
  P("djur", "OVANLIG", 160, "turt", "Sköldpaddan Turt", "Turt the Turtle", "🐢"),
  P("djur", "OVANLIG", 195, "pippi", "Fågeln Pippi", "Pippi the Bird", "🐦"),
  P("djur", "SALLSYNT", 18, "sly", "Räven Sly", "Sly the Fox", "🦊"),
  P("djur", "EPISK", 25, "bruno", "Björnen Bruno", "Bruno the Bear", "🐻"),
  P("djur", "LEGENDARISK", 220, "fenrir", "Vargen Fenrir", "Fenrir the Wolf", "🐺"),

  // ── Skolpaketet ────────────────────────────────────────────────────────────
  P("skola", "VANLIG", 48, "penny", "Pennan Penny", "Penny the Pencil", "✏️"),
  P("skola", "VANLIG", 200, "gummi", "Suddgummit Gummi", "Gummi the Eraser", "🧽"),
  P("skola", "OVANLIG", 205, "bag", "Ryggsäcken Bag", "Bag the Backpack", "🎒"),
  P("skola", "OVANLIG", 230, "kalkyl", "Miniräknaren Kalkyl", "Kalkyl the Calculator", "🧮"),
  P("skola", "OVANLIG", 0, "prov", "Provpappret Prov", "Prov the Test Paper", "📝"),
  P("skola", "SALLSYNT", 215, "larsson", "Läraren Larsson", "Larsson the Teacher", "🧑‍🏫"),
  P("skola", "EPISK", 42, "nobel", "Nobelpriset Nobel", "Nobel the Prize", "🏅"),
  P("skola", "LEGENDARISK", 225, "rektor", "Rektorn Rector", "Rector the Principal", "🎓"),

  // ── Rymdpaketet ────────────────────────────────────────────────────────────
  P("rymd", "VANLIG", 8, "raffe", "Raketen Raffe", "Raffe the Rocket", "🚀"),
  P("rymd", "VANLIG", 50, "stella", "Stjärnan Stella", "Stella the Star", "⭐"),
  P("rymd", "OVANLIG", 235, "luna", "Månen Luna", "Luna the Moon", "🌙"),
  P("rymd", "OVANLIG", 20, "kalle", "Kometen Kalle", "Kalle the Comet", "☄️"),
  P("rymd", "OVANLIG", 190, "tella", "Teleskopet Tella", "Tella the Telescope", "🔭"),
  P("rymd", "SALLSYNT", 210, "astro", "Astronauten Astro", "Astro the Astronaut", "🧑‍🚀"),
  P("rymd", "EPISK", 30, "saturnus", "Planeten Saturnus", "Saturn the Planet", "🪐"),
  P("rymd", "LEGENDARISK", 120, "zorg", "Alien Zorg", "Zorg the Alien", "👽"),

  // ── Djungelpaketet ─────────────────────────────────────────────────────────
  P("djungel", "VANLIG", 150, "polly", "Papegojan Polly", "Polly the Parrot", "🦜"),
  P("djungel", "VANLIG", 275, "ving", "Fjärilen Ving", "Ving the Butterfly", "🦋"),
  P("djungel", "OVANLIG", 25, "abbe", "Apan Abbe", "Abbe the Monkey", "🐵"),
  P("djungel", "OVANLIG", 130, "slir", "Ormen Slir", "Slir the Snake", "🐍"),
  P("djungel", "OVANLIG", 105, "groda", "Grodan Groda", "Groda the Frog", "🐸"),
  P("djungel", "SALLSYNT", 40, "leo", "Leoparden Leo", "Leo the Leopard", "🐆"),
  P("djungel", "EPISK", 250, "elsa", "Elefanten Elsa", "Elsa the Elephant", "🐘"),
  P("djungel", "LEGENDARISK", 45, "leon", "Lejonet Leon", "Leon the Lion", "🦁"),

  // ── Godispaketet ───────────────────────────────────────────────────────────
  P("godis", "VANLIG", 300, "klubba", "Klubban Klubba", "Klubba the Lollipop", "🍭"),
  P("godis", "VANLIG", 30, "kex", "Keksen Kex", "Kex the Cookie", "🍪"),
  P("godis", "OVANLIG", 330, "munk", "Munken Munk", "Munk the Donut", "🍩"),
  P("godis", "OVANLIG", 20, "choklad", "Chokladen Choklad", "Choklad the Chocolate", "🍫"),
  P("godis", "OVANLIG", 340, "glass", "Glasskupen Glass", "Glass the Sundae", "🍨"),
  P("godis", "SALLSYNT", 350, "tarta", "Tårtan Tårta", "Tårta the Cake", "🎂"),
  P("godis", "EPISK", 315, "cupcake", "Cupcaken Cupcake", "Cupcake the Cupcake", "🧁"),
  P("godis", "LEGENDARISK", 265, "rainbow", "Regnbågsgodiset Rainbow", "Rainbow the Candy", "🌈"),

  // ── Mytiskapaketet ─────────────────────────────────────────────────────────
  P("mytisk", "EPISK", 290, "uno", "Enhörningen Uno", "Uno the Unicorn", "🦄"),
  P("mytisk", "EPISK", 110, "drako", "Drakungen Drako", "Drako the Dragon", "🐉"),
  P("mytisk", "LEGENDARISK", 15, "fenix", "Fenixen Fenix", "Fenix the Phoenix", "🔥"),
  P("mytisk", "LEGENDARISK", 175, "marina", "Sjöjungfrun Marina", "Marina the Mermaid", "🧜"),
  P("mytisk", "LEGENDARISK", 255, "merlin", "Trollkarlen Merlin", "Merlin the Wizard", "🧙"),
  P("mytisk", "KROMA", 0, "kromakatt", "Kroma-Katten", "Chroma Cat", "😻"),
  P("mytisk", "KROMA", 0, "kromadrake", "Kroma-Draken", "Chroma Dragon", "🐲"),
  P("mytisk", "KROMA", 0, "kromakrona", "Kroma-Kronan", "Chroma Crown", "👑"),

  // ── Gamerpaketet ───────────────────────────────────────────────────────────
  // One Keen per step of the ladder, straight from the design doc: common 57,3 %,
  // rare 37 %, epic 5,01 %, legendary 0,67 %, secret 0,02 %.
  P("gamer", "VANLIG", 120, "invader", "Space Invader", "Space Invader", "👾"),
  P("gamer", "SALLSYNT", 0, "crewmate", "Crewmate", "Crewmate", "🚀"),
  P("gamer", "EPISK", 110, "chubbypig", "Chubby Pig", "Chubby Pig", "🐷"),
  P("gamer", "LEGENDARISK", 130, "creeper", "Creeper", "Creeper", "🧟"),
  P("gamer", "HEMLIG", 285, "pixelthorne", "Pixel Thorne", "Pixel Thorne", "🦔"),

  // ── Admin-Keenen ───────────────────────────────────────────────────────────
  // Never on a shelf: an admin in QuizKeen Command hands this one out. See
  // ADMIN_PACK above and lib/keen-grant.ts for the delivery path.
  P(ADMIN_PACK, "MYSTISK", 30, "omeisaurus", "Omeisaurus", "Omeisaurus", "🐉"),
];

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
  return isGiftKeen(keen) || !PACK_BY_ID[keen.pack]?.hidden;
}

/**
 * The whole obtainable catalogue — what "samla N figurer" actually counts.
 *
 * It follows the shelf instead of the file: putting a pack back on sale (delete
 * its `hidden: true`) grows this set again, and every counter in the app with it.
 */
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
export const MARKET_KEENS: Keen[] = OBTAINABLE_KEENS.filter((k) => RARITY_META[k.rarity].tradeable);
export const MARKET_RARITIES: Rarity[] = RARITY_ORDER.filter((r) => MARKET_KEENS.some((k) => k.rarity === r));

/**
 * Tradeable Keens that are no longer obtainable.
 *
 * The market still lists the ones somebody already owns, so a collection built
 * before a pack left the shelf can always be cashed in — but it never offers one
 * for sale, because no pack could ever drop it again.
 */
export function retiredKeens(owned: OwnedMap = {}): Keen[] {
  return KEENS.filter((k) => !isObtainable(k) && RARITY_META[k.rarity].tradeable && (owned[k.id] ?? 0) > 0);
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
    return OBTAINABLE_KEENS.filter((k) => !isGiftKeen(k) && RARITY_META[k.rarity].order <= RARITY_META.SALLSYNT.order);
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
  // because a chance the pack cannot honour is a lie: the free pack used to
  // advertise "Ovanlig 30 %" while nothing uncommon could ever come out of it.
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
 * `null` for the Admin Keen: no pack contains it, so callers must say "gift"
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
  let seed = 0;
  for (let i = 0; i < dateKey.length; i++) seed = (seed * 31 + dateKey.charCodeAt(i)) >>> 0;
  const used = new Set<number>();
  const out: { keen: Keen; price: number; off: number }[] = [];
  for (let n = 0; n < DEALS_PER_DAY; n++) {
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
    if (!keen || !RARITY_META[keen.rarity].tradeable) return a;
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
