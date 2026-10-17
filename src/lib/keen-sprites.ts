/**
 * Hand-pixelled Keens.
 *
 * Most of the catalogue is drawn from its hue and emoji (see
 * `components/keens/keen-avatar.tsx`). The Gamer pack, the Halloween pack and the
 * Admin Keen are meant to look like pixel art, so they are the exception: each
 * one is a small bitmap right here, and `components/keens/pixel-sprite.tsx` turns
 * a bitmap into an SVG of solid squares.
 *
 * Why bitmaps instead of PNGs: they scale to any size without blurring, they
 * animate (the reveal, the idle bob) without a second asset, and they cost a few
 * hundred bytes each instead of a file per character. A row is a string, one
 * character per pixel, `.` meaning transparent and any other letter indexing
 * `palette` — so a sprite is editable by eye, in the file, without a tool.
 *
 * Sizes differ on purpose: the Gamer pack is drawn the way the design sheet draws
 * it — flat, chunky, a handful of colours, read at a glance — while the themed
 * plates get a little more room. `PixelSprite` fits whatever it is given into a
 * square, so a 11×8 alien and a 16×16 pumpkin sit on the shelf the same size.
 *
 * `npm run check:sprites` (scripts/check-sprites.mjs) fails on a row that is the
 * wrong width or a letter that is missing from its palette, which is the one
 * mistake this format makes easy.
 *
 * `board` picks the plate behind the pixels. `tile` keeps the rarity-hued tile
 * every other Keen uses (a red Crewmate on a red tile), while `dark`, `neon`,
 * `purple` and `halloween` are the themed plates the pack designs ask for.
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
    alt: "Grön pixel-rymdvarelse med antenner på en svart bricka",
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
    alt: "Rund grön pixel-gris med tryne, öron och lysande ögon",
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

  /** 0,67 % — the mottled green block with two hollow eyes and a wide frown. */
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

  /** 55 % — a fat grinning pumpkin: lit lobes, glowing carvings, leaf on the stalk. */
  pumpkin: {
    board: "tile",
    alt: "Orange pixel-pumpa med grönt blad, lysande ögon och flin",
    palette: {
      S: "#7a4a1d",
      s: "#4b2c10",
      G: "#4ade80",
      g: "#15803d",
      L: "#fdba74",
      O: "#fb8c1a",
      D: "#c2410c",
      Y: "#fde68a",
      W: "#fffbe8",
    },
    rows: [
      "................",
      ".......SSs......",
      "......SSsss.....",
      "......SSsGg.....",
      "......SSsGGg....",
      "......LLLOOODD..",
      "....LLOOOOOOOO..",
      "..LLLOOOOOOOODD.",
      ".LLOOOOOOOOODDD.",
      ".LLOYYOOOOYYODD.",
      ".LOYWYOOOOYWYOD.",
      ".LOOYYYYYYYYODD.",
      ".LOOWYYWYYWYODD.",
      "..LOOOYYYYOODD..",
      "..LOOOOOOOODDD..",
      "...LOOOOODDDD...",
    ],
  },

  /** 30 % — a chicken frozen inside an ice cube, comb and all. */
  chickenchick: {
    board: "tile",
    alt: "Ljusblå pixel-kub av is med röd kam, näbb och chokladkaksbotten",
    palette: {
      R: "#e63946",
      r: "#9d1f2c",
      B: "#cdeeff",
      b: "#8fd0f2",
      L: "#ffffff",
      W: "#ffffff",
      K: "#13202c",
      O: "#f59e0b",
      o: "#b45309",
      C: "#8b5a2b",
      c: "#5c3a17",
      H: "#33200f",
    },
    rows: [
      "......R.R.......",
      ".....RRRRR......",
      ".....rRRRr......",
      "...BBBBBBBBBB...",
      "..BBLLBBBBBBBB..",
      ".BBLLBBBBBBBBBB.",
      ".BBWWBBBBWWBBBB.",
      ".BBWKBBBBWKBBBB.",
      ".BBBBBBBBBBBBBB.",
      ".BBBBBBbOOObBBB.",
      ".BBBBBBbOoObBBB.",
      ".BBBBBBBBBBBBBB.",
      ".BBBbbbbbbbbBBB.",
      ".CCCCCCCCCCCCCC.",
      ".CCCHCCCCHCCCCC.",
      "..cccccccccccc..",
    ],
  },

  /** 30 % — the same cube, sunny side up, with a wattle under the beak. */
  chickchicken: {
    board: "tile",
    alt: "Gul pixel-kub med röd kam, näbb, slör och chokladkaksbotten",
    palette: {
      R: "#e63946",
      r: "#9d1f2c",
      Y: "#fcd34d",
      y: "#f59e0b",
      L: "#fef3c7",
      W: "#ffffff",
      K: "#13202c",
      O: "#f59e0b",
      o: "#b45309",
      C: "#8b5a2b",
      c: "#5c3a17",
      H: "#33200f",
    },
    rows: [
      "......R.R.......",
      ".....RRRRR......",
      ".....rRRRr......",
      "...YYYYYYYYYY...",
      "..YYLLYYYYYYYY..",
      ".YYLLYYYYYYYYYY.",
      ".YYWWYYYYWWYYYY.",
      ".YYWKYYYYWKYYYY.",
      ".YYYYYYYYYYYYYY.",
      ".YYYYYYyOOOyYYY.",
      ".YYYYYYyOoOyYYY.",
      ".YYYYYYRRRRYYYY.",
      ".YYYyyyyyyyyYYY.",
      ".CCCCCCCCCCCCCC.",
      ".CCCCCHCCCCCHCC.",
      "..cccccccccccc..",
    ],
  },

  /** 12 % — a frog in a vampire cape, fangs out, bow tie on, under a full moon. */
  frogula: {
    board: "tile",
    alt: "Grön pixel-groda med vampyrkappa, huggtänder och rosett i månsken",
    palette: {
      P: "#241d5c",
      p: "#150f33",
      M: "#fef9c3",
      m: "#fde68a",
      C: "#0f1117",
      R: "#dc2626",
      G: "#6ee7a8",
      g: "#22c55e",
      W: "#ffffff",
      K: "#0b1a10",
      T: "#fbbf24",
    },
    rows: [
      "..pppppppppppp..",
      ".pPPPPPMMMPPPPp.",
      ".PPPPMMMMMMMMPP.",
      ".PPPPMMMMMMMPPP.",
      ".PPPPmmmmMMMMPP.",
      "..CCCCCCCCCCCC..",
      ".CCRRCCCCCCRRCC.",
      ".CCRRRCCCCRRRCC.",
      "..CCRRGGGGRRCC..",
      "...GGGGGGGGGG...",
      "..GGWWGGWWGGGG..",
      "..GGWKGGWKGGGG..",
      "..gGGGGGGGGGGg..",
      "..gggKWKKWKggg..",
      "...KKKKKKKKKK...",
      "...KKKKTTKKKK...",
    ],
  },

  /** 2,6 % — a pumpkin-baked cookie, chocolate chips and all, with a bite gone. */
  cookiepumpkin: {
    board: "tile",
    alt: "Orange pixel-kaka formad som en pumpa med chokladögon och tuggat bett",
    palette: { S: "#7a4a1d", G: "#4caf50", g: "#2f7d32", C: "#e8a33d", c: "#c07a2a", K: "#3a1c0c" },
    rows: [
      "........SS......",
      "......SSSS......",
      "......SSGGg.....",
      "...CCCCCCCCCC...",
      "..CCCCCCCCCCCC..",
      ".CCCCCCCCCCCCCC.",
      ".CCCCCKKCCKKCCC.",
      ".CCCCCKKCCKKCCC.",
      ".CCCCCCCCCCCCCC.",
      ".CCCCCKKKKKKCCC.",
      ".CCCCCKKCCKKCCC.",
      ".CCCCCKKKKKKCCC.",
      ".CCcccccccc.....",
      ".Cccccccc.C.....",
      "..ccccccc..C....",
      "...ccccc.C......",
    ],
  },

  /** 2,6 % — a cookie wrapped as a mummy, eyes peeking through the bandages. */
  cookiemummy: {
    board: "tile",
    alt: "Beige pixel-kaka lindad som en mumie med vita ögon mellan lagren",
    palette: { B: "#f5e0bb", b: "#e2c391", D: "#c9a06a", K: "#14161a", W: "#ffffff", c: "#5c3a17" },
    rows: [
      "..DDDDDDDDDDDD..",
      ".DBBBBBBBBBBBBD.",
      ".BBBBBbBBBBBBBB.",
      ".BbBBBBBBBbBBBB.",
      ".BBBBBBBBBBBBBB.",
      ".KKKKKKKKKKKKKK.",
      ".KKWWWKKKKWWWKK.",
      ".KKWKWKKKKWKWKK.",
      ".KKWWWKKKKWWWKK.",
      ".BBBBBBBBBBBBBB.",
      ".BbBBBBBBBBBbBB.",
      ".BBBBBbBBBBBBBB.",
      ".DDDDDDDDDDDDDD.",
      "..BBBBBBBBBBBB..",
      "...DDDDDDDDDD...",
      "..c..........c..",
    ],
  },

  /** 0,3 % — the secret: an iced ghost cookie, happy about it. */
  cookieghost: {
    board: "halloween",
    alt: "Ljusblå pixel-spökkaka med glada ögon och vågig kant på en mörklila platta",
    palette: { G: "#dff2fb", g: "#a9dcf2", K: "#141c26", W: "#ffffff", C: "#e8a33d", c: "#c07a2a" },
    rows: [
      "...GGGGGGGGGG...",
      "..GGGGGGGGGGGG..",
      ".GGGWGGGGGGGGGg.",
      "GGGGWGGGGGGGGGgg",
      "GGGGGGGGGGGGGGgg",
      "GGKKGGGGGGKKGGgg",
      "GGKKGGGGGGKKGGgg",
      "GGGGGGGGGGGGGGgg",
      "GGGKKKKKKKKGGGgg",
      "GGGKKKGGKKKGGGgg",
      "GGGGGGGGGGGGGGgg",
      ".GGGGGGGGGGGGGg.",
      ".GGG.GGG.GGG.GG.",
      "..GG...G...GG...",
      "..CCCCCCCCCCCC..",
      "...cccccccccc...",
    ],
  },

  /** 0,1 % — the Pumpkin King: crowned, bat-winged, on his slime box. */
  pumpkinking: {
    board: "halloween",
    alt: "Krönt orange pixel-pumpahuvud med fladdermusvingar på en lila skattkista med slem",
    palette: {
      Y: "#fbbf24",
      y: "#b45309",
      O: "#fb8c1a",
      o: "#c2410c",
      K: "#14090a",
      W: "#fff3c4",
      G: "#5cf53c",
      R: "#b91c1c",
      P: "#6d28d9",
      p: "#4c1d95",
    },
    rows: [
      "..Y..Y..Y..Y..Y.",
      "..YYYYYYYYYYYY..",
      "..yyyyyyyyyyyy..",
      "KKOOOOOOOOOOOOKK",
      "KKOWWOOOOOOWWOKK",
      "RROWWOOOOOOWWORR",
      "KKOOOOOOOOOOOOKK",
      "KKOKKKKKKKKKKOKK",
      "GGooooooooooooGG",
      "GPPPPPPPPPPPPPPG",
      ".PPPPPPPPPPPPPP.",
      ".PPPYYYYYYYYPPP.",
      ".PPPyyyyyyyyPPP.",
      ".PPPPPPPPPPPPPP.",
      "..pppppppppppp..",
      "..GGGGGGGGGGGG..",
    ],
  },

  // ── Admin-Keenen ──────────────────────────────────────────────────────────

  /**
   * Retired: the Admin Keen is drawn from the painted design sheet by
   * `illustrated-avatar.tsx`, which `KeenAvatar` prefers over this bitmap.
   */
  omeisaurus: {
    board: "purple",
    alt: "Rött och gyllene pixel-drakthuvud med horn och tänder på en lila bricka",
    palette: { R: "#c2261c", O: "#f0861e", Y: "#f7c731", W: "#ffffff", B: "#20120a", C: "#fdf0d5" },
    rows: [
      "...Y........Y...",
      "..YYY......YYY..",
      "..CYYY....YYYC..",
      "...RRRRRRRRRRR..",
      "..RROOOOOOOORR..",
      ".RROWWRRRRWWRRO.",
      ".RROWBRRRRBWRRO.",
      ".RRRRRYYRRYYRRR.",
      "..RRRRRRRRRRRR..",
      "..OCCCCCCCCCCO..",
      "..OCCBCCCCBCCCO.",
      "..OOOOOOOOOOOO..",
      "...OOOOOOOOOO...",
      "....OOOOOOOO....",
      ".....YYYYYY.....",
      "......WWWW......",
    ],
  },
};

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
  palette: {
    K: "#0b0616",
    S: "#7a4a1d",
    G: "#4ade80",
    L: "#fdba74",
    O: "#fb8c1a",
    o: "#c2410c",
    Y: "#ffe08a",
    W: "#fff8dc",
  },
  rows: [
    "................",
    "..K...K.........",
    ".KKK.KKK........",
    "...KKK..........",
    "................",
    "......SS........",
    "......SSGG......",
    "....LLOOOOoo....",
    "..LLOOOOOOOOoo..",
    "..OYYOOOOOOYYO..",
    ".LOYWYOOOOYWWOO.",
    ".LOOOOOOOOOOOoo.",
    ".OOOYYYYYYYYOOO.",
    ".OOYWYWWYWYWWOO.",
    ".OOOOOOOOOOOOoo.",
    "..oooooooooooo..",
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
