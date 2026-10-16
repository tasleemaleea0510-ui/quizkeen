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

export type SpriteBoard = "tile" | "dark" | "neon" | "purple";

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
export const PACK_EMBLEMS: Record<string, Sprite> = {
  gamer: KEEN_SPRITES.pixelthorne,
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
};
