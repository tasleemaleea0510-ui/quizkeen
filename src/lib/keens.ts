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

export const RARITIES = ["VANLIG", "OVANLIG", "SALLSYNT", "EPISK", "LEGENDARISK", "KROMA"] as const;
export type Rarity = (typeof RARITIES)[number];

export const PACK_IDS = ["djur", "skola", "rymd", "djungel", "godis", "mytisk"] as const;
export type PackId = (typeof PACK_IDS)[number];

/** The free pack's own id — it is not a theme, it draws from every cheap Keen. */
export const FREE_PACK = "gratis" as const;
export type AnyPackId = PackId | typeof FREE_PACK;

export type Keen = {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  rarity: Rarity;
  pack: PackId;
  /** Base hue (0–360) for this Keen's body, so the grid looks like a collection. */
  hue: number;
};

export type RarityMeta = {
  label: string;
  labelEn: string;
  /** Market price in coins. */
  price: number;
  /** What you get back for a spare copy — a pack duplicate is refunded this. */
  sell: number;
  order: number;
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
    order: 5,
    text: "text-white",
    chip: "border-white/40 bg-white/10 text-white",
    ring: "border-white/50",
    glow: "shadow-[0_0_48px_-4px_rgba(255,255,255,0.6)]",
    tile: "from-fuchsia-500/30 via-sky-500/20 to-amber-400/20",
    from: "#ffffff",
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
    id: "mytisk",
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

const P = (
  pack: PackId,
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
];

export const KEEN_BY_ID: Record<string, Keen> = Object.fromEntries(KEENS.map((k) => [k.id, k]));
export const PACK_BY_ID: Record<string, Pack> = Object.fromEntries(PACKS.map((p) => [p.id, p]));
export const TOTAL_KEENS = KEENS.length;

export function keensInPack(pack: AnyPackId): Keen[] {
  if (pack === FREE_PACK) return KEENS.filter((k) => RARITY_META[k.rarity].order <= RARITY_META.SALLSYNT.order);
  return KEENS.filter((k) => k.pack === pack);
}

export function packPool(pack: AnyPackId): Keen[] {
  const odds = PACK_BY_ID[pack]?.odds ?? {};
  return keensInPack(pack).filter((k) => (odds[k.rarity] ?? 0) > 0);
}

export function rarityOdds(pack: AnyPackId): { rarity: Rarity; chance: number }[] {
  const odds = PACK_BY_ID[pack]?.odds ?? {};
  return RARITY_ORDER.filter((r) => (odds[r] ?? 0) > 0).map((rarity) => ({ rarity, chance: odds[rarity] as number }));
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

/** Cheapest pack that can drop a given Keen — shown as "hint" on locked cards. */
export function dropsFrom(keen: Keen): Pack {
  return PACK_BY_ID[keen.pack];
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
  const pool = KEENS.filter((k) => k.rarity !== "KROMA");
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
  const distinct = Object.keys(owned).filter((id) => KEEN_BY_ID[id] && owned[id] > 0).length;
  const copies = Object.values(owned).reduce((a, n) => a + n, 0);
  const dupes = Object.entries(owned).reduce((a, [id, n]) => a + (KEEN_BY_ID[id] ? Math.max(0, n - 1) : 0), 0);
  const percent = Math.round((distinct / TOTAL_KEENS) * 100);
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
