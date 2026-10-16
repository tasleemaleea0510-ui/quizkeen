/**
 * Hand-pixelled Keens.
 *
 * Most of the catalogue is drawn from its hue and emoji (see
 * `components/keens/keen-avatar.tsx`). The Gamer pack and the Admin Keen are
 * meant to look like pixel art, so they are the exception: each one is a small
 * bitmap right here, and `components/keens/pixel-sprite.tsx` turns a bitmap into
 * an SVG of solid squares.
 *
 * Why bitmaps instead of PNGs: they scale to any size without blurring, they
 * animate (the reveal, the idle bob) without a second asset, and they cost a few
 * hundred bytes each instead of a file per character. A row is a string, one
 * character per pixel, `.` meaning transparent and any other letter indexing
 * `palette` — so a sprite is editable by eye, in the file, without a tool.
 *
 * `board` picks the plate behind the pixels. `tile` keeps the rarity-hued tile
 * every other Keen uses (a red Crewmate on a red tile), while `dark`, `neon` and
 * `purple` are the themed plates the Gamer pack's design asks for.
 */

export type SpriteBoard = "tile" | "dark" | "neon" | "purple" | "halloween";

export type Sprite = {
  /** One string per pixel row, top to bottom. `.` is transparent. */
  rows: string[];
  /** Letter → colour, for every letter used in `rows`. */
  palette: Record<string, string>;
  board: SpriteBoard;
  /** Plain-language description, for screen readers and alt text. */
  alt: string;
};

export const KEEN_SPRITES: Record<string, Sprite> = {
  // ── Gamerpaketet ──────────────────────────────────────────────────────────

  /** 57,3 % — the classic eight-bit alien, bright green on near-black. */
  invader: {
    board: "dark",
    alt: "Grön pixel-rymdvarelse på en svart bricka",
    palette: { X: "#7cf03a" },
    rows: [
      "..X.....X..",
      "...X...X...",
      "..XXXXXXX..",
      ".XX.XXX.XX.",
      "XXXXXXXXXXX",
      "X.XXXXXXX.X",
      "X.X.....X.X",
      "...XX.XX...",
    ],
  },

  /** 37 % — a visored space suit with its little backpack, in red. */
  crewmate: {
    board: "tile",
    alt: "Röd pixel-rymddräkt med ljusblått visir",
    palette: { R: "#d63b3b", B: "#9c2626", W: "#a8dcf7" },
    rows: [
      "..RRRRRR..",
      ".RRRRRRRR.",
      ".RRWWWWWRR",
      ".RRWWWWWRR",
      ".RRRRRRRRR",
      "RRRRRRRRRR",
      "RRBRRRRRRR",
      "RRBRRRRRRR",
      "RRBRRRRRRR",
      ".RRRRRRRR.",
      ".RR....RR.",
      ".RR....RR.",
    ],
  },

  /** 5,01 % — a round green snout with quite a temper. */
  chubbypig: {
    board: "tile",
    alt: "Rund grön pixel-gris med vita ögon och tryne",
    palette: { G: "#63c132", D: "#3d9a20", W: "#ffffff", B: "#101c10", S: "#8fd94f" },
    rows: [
      "....G..G....",
      "..GGGGGGGG..",
      ".GGGGGGGGGG.",
      ".GGDDGGDDGG.",
      ".GWWGGGGWWG.",
      ".GBWGGGGWBG.",
      ".GGGGGGGGGG.",
      "..GGSSSSGG..",
      "..GSBSSBSG..",
      "..GGSSSSGG..",
      ".GGGGGGGGGG.",
      "..GGGGGGGG..",
    ],
  },

  /** 0,67 % — a green block with two hollow eyes and a wide frown. */
  creeper: {
    board: "tile",
    alt: "Grön pixel-kub med svarta ögon och mun",
    palette: { G: "#57c33f", B: "#0e2a0e" },
    rows: [
      "GGGGGGGG",
      "GBBGGBBG",
      "GBBGGBBG",
      "GGGGGGGG",
      "GGGBBGGG",
      "GGBBBBGG",
      "GGBBBBGG",
      "GGGBBGGG",
    ],
  },

  /** 0,02 % — the secret: a spiked shadow grinning on a neon-plated board. */
  pixelthorne: {
    board: "neon",
    alt: "Svart taggig pixelvarelse med grönt leende på en lila neonplatta",
    palette: { K: "#0f0a16", E: "#5cf53c", M: "#5cf53c" },
    rows: [
      "......K......",
      "..K...K...K..",
      "..KK..K..KK..",
      ".KKKKKKKKKKK.",
      ".KKEEKKKEEKK.",
      ".KKEEKKKEEKK.",
      ".KKKKKKKKKKK.",
      ".KKMMMMMMMKK.",
      ".KKMKMKMKMKK.",
      "..KKKKKKKKK..",
      "..KKKKKKKKK..",
      "...KKKKKKK...",
      "....KKKKK....",
    ],
  },

  // ── Halloweenpaketet ──────────────────────────────────────────────────────

  /** 55 % — a fat grinning pumpkin with a leaf on its stalk. */
  pumpkin: {
    board: "tile",
    alt: "Orange pixel-pumpa med lysande ögon och flin",
    palette: { S: "#7a4a1d", L: "#3f8f29", O: "#f97316", D: "#c2410c", Y: "#fde68a" },
    rows: [
      ".....SS.....",
      "....SSSSL...",
      "...OOOOOO...",
      "..OOOOOOOO..",
      ".OOOOOOOOOO.",
      ".OYYOOOOYYO.",
      ".OOYYOOYYOO.",
      ".OOOOOOOOOO.",
      ".OOYYYYYYOO.",
      ".OYOOYYOOYO.",
      ".OOOOOOOOOO.",
      "..DDDDDDDD..",
    ],
  },

  /** 30 % — a chicken frozen inside an ice cube, comb and all. */
  chickenchick: {
    board: "tile",
    alt: "Ljusblå pixel-kub med röd kam och kycklingansikte",
    palette: { R: "#e23b3b", B: "#9ad7f5", L: "#cdeeff", D: "#5fa8cf", W: "#ffffff", K: "#14161a", O: "#f59e0b" },
    rows: [
      "...RR.RR....",
      "...RRRRRR...",
      "..BBBBBBBB..",
      ".BBLBBBBBBB.",
      ".BBWWBBWWBB.",
      ".BBWKBBWKBB.",
      ".BBBBBBBBBB.",
      ".BBBBOOBBBB.",
      ".BBBBOOBBBB.",
      ".BBBBBBBBBB.",
      "..BBBBBBBB..",
      "..DDDDDDDD..",
    ],
  },

  /** 30 % — the same cube, sunny side up, with a wattle under the beak. */
  chickchicken: {
    board: "tile",
    alt: "Gul pixel-kub med röd kam, näbb och slör",
    palette: { R: "#e23b3b", Y: "#fbbf24", L: "#fde68a", D: "#d97706", W: "#ffffff", K: "#14161a", O: "#f59e0b" },
    rows: [
      "...RR.RR....",
      "...RRRRRR...",
      "..YYYYYYYY..",
      ".YYLYYYYYYY.",
      ".YYWWYYWWYY.",
      ".YYWKYYWKYY.",
      ".YYYYYYYYYY.",
      ".YYYYOOYYYY.",
      ".YYYYRRYYYY.",
      ".YYYYYYYYYY.",
      "..YYYYYYYY..",
      "..DDDDDDDD..",
    ],
  },

  /** 12 % — a frog in a vampire cape, fangs out, bow tie on. */
  frogula: {
    board: "tile",
    alt: "Grön pixel-groda med vampyrkappa, huggtänder och rosett",
    palette: { G: "#6fcf3f", D: "#3f7f22", W: "#ffffff", K: "#14161a", R: "#d63b3b" },
    rows: [
      "....GGGG....",
      "..GGGGGGGG..",
      ".GGWWGGWWGG.",
      ".GGWKGGWKGG.",
      ".GGGGGGGGGG.",
      ".GGGGGGGGGG.",
      ".GGDDDDDDGG.",
      ".GGWDDDDWGG.",
      "..GGGGGGGG..",
      "..KKKKKKKK..",
      ".KK.RRRR.KK.",
      ".KKKKKKKKKK.",
    ],
  },

  /** 2,6 % — a cookie baked into a pumpkin, one bite gone. */
  cookiepumpkin: {
    board: "tile",
    alt: "Orange pixel-kaka formad som en pumpa med tuggat bett",
    palette: { L: "#4caf50", C: "#e8a33d", D: "#b9762a", K: "#3a1c0c" },
    rows: [
      ".....LL.....",
      "..CCCCCCCC..",
      ".CCCCCCCCCC.",
      "CCCCCCCCCCCC",
      "CCKKCCCCKKCC",
      "CCKKCCCCKKCC",
      "CCCCCCCCCCCC",
      "CCKKKKKKKKCC",
      "CCKCCKKCCKCC",
      "CCCCCCCCCC..",
      ".CCCCCCCC...",
      "..CCCCCC....",
    ],
  },

  /** 2,6 % — a cookie wrapped as a mummy, eyes peeking through. */
  cookiemummy: {
    board: "tile",
    alt: "Beige pixel-kaka lindad som en mumie med ögon",
    palette: { D: "#d9a05b", B: "#f2dcb5", W: "#ffffff", K: "#14161a" },
    rows: [
      "..DDDDDDDD..",
      ".DDBBBBBBDD.",
      "DBBBBBBBBBBD",
      "DBDDBBDDBBBD",
      "DBWWBBBBWWBD",
      "DBWKBBBBWKBD",
      "DBBBBBBBBBBD",
      "DBDDBBDDBBBD",
      "DBBBBBBBBBBD",
      ".DBBBBBBBBD.",
      "..DDDDDDDD..",
      "....DDDD....",
    ],
  },

  /** 0,3 % — the secret: an iced ghost cookie, happy about it. */
  cookieghost: {
    board: "halloween",
    alt: "Ljusblå pixel-spökkaka med glada ögon på en mörklila platta",
    palette: { G: "#bfe9f7", K: "#1d2836", D: "#d9a05b" },
    rows: [
      "...GGGGGG...",
      "..GGGGGGGG..",
      ".GGGGGGGGGG.",
      "GGGGGGGGGGGG",
      "GGKKGGGGKKGG",
      "GGGGGGGGGGGG",
      "GGGKKKKKKGGG",
      "GGGGGGGGGGGG",
      "GGGGGGGGGGGG",
      "GGGGGGGGGGGG",
      ".GG.GG.GG.GG",
      "..D..D..D..D",
    ],
  },

  /** 0,1 % — the Pumpkin King: crowned, bat-winged, on his slime box. */
  pumpkinking: {
    board: "halloween",
    alt: "Krönt orange pixel-pumpahuvud med fladdermusvingar på en lila låda",
    palette: { Y: "#f7c731", O: "#f97316", D: "#c2410c", K: "#1a1024", G: "#5cf53c", P: "#6d28d9" },
    rows: [
      "....YYYY....",
      "...YYYYYY...",
      "..OOOOOOOO..",
      "KKOOOOOOOOKK",
      "KKOYYOOYYOKK",
      "KKOOYYOOYYKK",
      "KKOOOOOOOOKK",
      "..OOYYYYOO..",
      "..OYOOYOOY..",
      "..OOOOOOOO..",
      "GPPPPPPPPPPG",
      ".PPPPPPPPPP.",
    ],
  },

  // ── Admin-Keenen ──────────────────────────────────────────────────────────

  /**
   * The Admin Keen. The design doc draws it as a painted, swirling dragon; this
   * is the pixel stand-in in the same colours (deep red, orange, gold, cream)
   * on the doc's purple plate. Swap in the painted artwork when it exists —
   * `KeenAvatar` prefers a sprite only when one is listed here.
   */
  omeisaurus: {
    board: "purple",
    alt: "Rött och gyllene pixel-drakthuvud med stora ögon på en lila bricka",
    palette: { R: "#c2261c", O: "#f0861e", Y: "#f7c731", W: "#ffffff", B: "#20120a" },
    rows: [
      "..RR......RR..",
      ".RRRR....RRRR.",
      ".OOOOOOOOOOOO.",
      "ORRRRRRRRRRRRO",
      "ORWWWRRRRWWWRO",
      "ORWBWRRRRWBWRO",
      "ORWWWRRRRWWWRO",
      "ORRRYYRRYYRRRO",
      "ORRYRRYYRRYRRO",
      ".ORRRRRRRRRRO.",
      "..OYYYYYYYYO..",
      "..OYYBBBBYYO..",
      "...OYYYYYYO...",
      "....OOOOOO....",
    ],
  },
};

/**
 * Packs with artwork of their own — the sprite stamped on the packet.
 *
 * The Gamer pack's design has the secret Keen grinning in the middle of the
 * foil, so the emblem is that same sprite; a pack with no entry here keeps the
 * plain hued tile it has always had.
 */
/**
 * The Halloween pack's own artwork — a design of its own, not a Keen.
 *
 * The partner's sheet has the creatures but no packet, so this is the stand-in:
 * a lantern-lit jack-o'-lantern with a bat overhead, on the dark plate. Painted
 * artwork drops straight in here when it exists, like the Keen sprites above.
 */
export const HALLOWEEN_EMBLEM: Sprite = {
  board: "halloween",
  alt: "Lysande pumpa med fladdermus på en mörklila platta",
  palette: { B: "#1b1130", G: "#3f8f29", O: "#f97316", D: "#c2410c", Y: "#ffe08a" },
  rows: [
    "....B...B.....",
    ".....BBB......",
    "....GGGGGG....",
    "..OOOOOOOOOO..",
    ".OOOOOOOOOOOO.",
    ".OOYYOOOOYYOO.",
    ".OOYYOOOOYYOO.",
    ".OOOOOOOOOOOO.",
    ".OOOYYYYYYOOO.",
    ".OOYOOOOOOYOO.",
    ".OOOOOOOOOOOO.",
    "..OOOOOOOOOO..",
    "...DDDDDDDD...",
    "....OOOOOO....",
  ],
};

export const PACK_EMBLEMS: Record<string, Sprite> = {
  gamer: KEEN_SPRITES.pixelthorne,
  halloween: HALLOWEEN_EMBLEM,
};

/** The plate behind a sprite, as inline styles (Tailwind can't ship these). */
export const SPRITE_BOARDS: Record<Exclude<SpriteBoard, "tile">, { background: string; boxShadow: string }> = {
  dark: {
    background: "linear-gradient(160deg, #0d1017 0%, #04050a 100%)",
    boxShadow: "0 0 34px -6px rgba(124,240,58,0.7)",
  },
  neon: {
    background: "repeating-linear-gradient(135deg, #360d5e 0 6%, #4b1385 6% 12%)",
    boxShadow: "0 0 34px -6px rgba(255,47,208,0.65)",
  },
  purple: {
    background: "linear-gradient(160deg, #7b2fbb 0%, #4c1a86 100%)",
    boxShadow: "0 0 34px -6px rgba(168,85,247,0.8)",
  },
  // Night: near-black violet in a diagonal weave, lit from below by a candle.
  halloween: {
    background: "repeating-linear-gradient(135deg, #170d2b 0 6%, #26134a 6% 12%)",
    boxShadow: "0 0 34px -6px rgba(249,115,22,0.8)",
  },
};
