/**
 * The Keen artwork.
 *
 * One drawing per Keen, as an SVG built from the Keen's own recipe: a
 * rounded-square plate, a glossy body, two big eyes and whatever makes that
 * character itself — ears, horns, a cape, a shell, a slice of cake.
 *
 * Why a generator and not image files: the same drawing has to be a React
 * component in the collection, a 128 px texture inside the Phaser minigame and
 * an alt-texted `img` in the lobby pods. A function that returns an SVG string
 * can be all three (`KeenAvatar` inlines it, `keenArtDataUri` rasterises it), so
 * what you collect is exactly what you race with, at any size, with no assets
 * to ship and no blur.
 *
 * Everything is drawn on one 100×100 grid, in the same order — back extras,
 * body, face, front extras, gloss — so seventy-odd hand-tuned recipes still look
 * like one set.
 */

export type ArtKeen = {
  id: string;
  hue: number;
  name: string;
};

const NS = 'xmlns="http://www.w3.org/2000/svg"';

function hsl(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  return `hsl(${hue.toFixed(1)} ${s}% ${l}%)`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Colors = { light: string; base: string; dark: string; line: string };

function colorsFor(hue: number, over?: Partial<Colors>): Colors {
  return {
    light: hsl(hue, 100, 84),
    base: hsl(hue, 92, 64),
    dark: hsl(hue, 78, 41),
    line: hsl(hue, 62, 24),
    ...over,
  };
}

/* ── Faces ────────────────────────────────────────────────────────────────── */

type Eyes = "big" | "happy" | "sleepy" | "angry" | "alien" | "sparkle";
type Mouth = "smile" | "grin" | "open" | "fang" | "beak" | "tongue" | "flat" | "none";

function eyePair(kind: Eyes, cx: number, cy: number, gap: number, r: number): string {
  const left = cx - gap;
  const right = cx + gap;
  const white = (x: number) =>
    `<ellipse cx="${x}" cy="${cy}" rx="${r}" ry="${r * 1.08}" fill="#ffffff" stroke="rgba(15,23,42,0.22)" stroke-width="1"/>`;
  const pupil = (x: number, dx: number, dy: number, scale = 1) =>
    `<circle cx="${x + dx}" cy="${cy + dy}" r="${r * 0.56 * scale}" fill="#111827"/>` +
    `<circle cx="${x + dx - r * 0.2}" cy="${cy + dy - r * 0.24}" r="${r * 0.24}" fill="#ffffff"/>` +
    `<circle cx="${x + dx + r * 0.22}" cy="${cy + dy + r * 0.22}" r="${r * 0.11}" fill="#ffffff" opacity="0.75"/>`;

  switch (kind) {
    case "happy":
      return `<path d="M${left - r} ${cy + r * 0.2} q${r} ${-r * 1.15} ${r * 2} 0" stroke="#111827" stroke-width="${r * 0.42}" fill="none" stroke-linecap="round"/>` +
        `<path d="M${right - r} ${cy + r * 0.2} q${r} ${-r * 1.15} ${r * 2} 0" stroke="#111827" stroke-width="${r * 0.42}" fill="none" stroke-linecap="round"/>`;
    case "sleepy":
      return white(left) + white(right) +
        pupil(left, 0, r * 0.28, 0.82) + pupil(right, 0, r * 0.28, 0.82) +
        `<path d="M${left - r} ${cy - r * 0.1} h${r * 2}" stroke="${"#111827"}" stroke-width="${r * 0.4}" stroke-linecap="round"/>` +
        `<path d="M${right - r} ${cy - r * 0.1} h${r * 2}" stroke="${"#111827"}" stroke-width="${r * 0.4}" stroke-linecap="round"/>`;
    case "angry":
      return white(left) + white(right) +
        pupil(left, -r * 0.1, r * 0.12, 0.9) + pupil(right, r * 0.1, r * 0.12, 0.9) +
        `<path d="M${left - r} ${cy - r * 0.75} l${r * 1.9} ${r * 0.5}" stroke="#111827" stroke-width="${r * 0.34}" stroke-linecap="round"/>` +
        `<path d="M${right + r} ${cy - r * 0.75} l${-r * 1.9} ${r * 0.5}" stroke="#111827" stroke-width="${r * 0.34}" stroke-linecap="round"/>`;
    case "alien":
      return `<ellipse cx="${left}" cy="${cy}" rx="${r * 1.15}" ry="${r * 1.35}" fill="#0b1020" transform="rotate(-12 ${left} ${cy})"/>` +
        `<ellipse cx="${right}" cy="${cy}" rx="${r * 1.15}" ry="${r * 1.35}" fill="#0b1020" transform="rotate(12 ${right} ${cy})"/>` +
        `<circle cx="${left - r * 0.3}" cy="${cy - r * 0.5}" r="${r * 0.28}" fill="#ffffff" opacity="0.9"/>` +
        `<circle cx="${right - r * 0.3}" cy="${cy - r * 0.5}" r="${r * 0.28}" fill="#ffffff" opacity="0.9"/>`;
    case "sparkle":
      return white(left) + white(right) + pupil(left, 0, 0, 1.1) + pupil(right, 0, 0, 1.1) +
        `<path d="M${left + r * 0.75} ${cy - r * 1.15} l${r * 0.22} ${r * 0.5} l${r * 0.5} ${r * 0.22} l${-r * 0.5} ${r * 0.22} l${-r * 0.22} ${r * 0.5} l${-r * 0.22} ${-r * 0.5} l${-r * 0.5} ${-r * 0.22} l${r * 0.5} ${-r * 0.22} Z" fill="#ffffff" opacity="0.95"/>`;
    default:
      return white(left) + white(right) + pupil(left, 0, r * 0.12) + pupil(right, 0, r * 0.12);
  }
}

function mouthShape(kind: Mouth, cx: number, cy: number, w: number, line: string): string {
  const h = w * 0.62;
  switch (kind) {
    case "smile":
      return `<path d="M${cx - w * 0.5} ${cy} q${w * 0.5} ${h} ${w} 0" stroke="${line}" stroke-width="${w * 0.22}" fill="none" stroke-linecap="round"/>`;
    case "grin":
      return `<path d="M${cx - w * 0.55} ${cy - h * 0.15} q${w * 0.55} ${h * 1.15} ${w * 1.1} 0 z" fill="#3f1220" stroke="${line}" stroke-width="${w * 0.12}"/>` +
        `<path d="M${cx - w * 0.25} ${cy + h * 0.32} q${w * 0.25} ${h * 0.34} ${w * 0.5} 0 z" fill="#fb7185"/>`;
    case "open":
      return `<ellipse cx="${cx}" cy="${cy + h * 0.1}" rx="${w * 0.42}" ry="${h * 0.52}" fill="#3f1220"/>` +
        `<ellipse cx="${cx}" cy="${cy + h * 0.36}" rx="${w * 0.24}" ry="${h * 0.2}" fill="#fb7185"/>`;
    case "fang":
      return `<path d="M${cx - w * 0.5} ${cy - h * 0.1} q${w * 0.5} ${h * 0.95} ${w} 0" stroke="${line}" stroke-width="${w * 0.2}" fill="none" stroke-linecap="round"/>` +
        `<path d="M${cx - w * 0.3} ${cy + h * 0.06} l${w * 0.14} ${h * 0.4} l${w * 0.14} ${-h * 0.4} z" fill="#ffffff"/>` +
        `<path d="M${cx + w * 0.02} ${cy + h * 0.06} l${w * 0.14} ${h * 0.4} l${w * 0.14} ${-h * 0.4} z" fill="#ffffff"/>`;
    case "beak":
      return `<path d="M${cx - w * 0.52} ${cy - h * 0.18} q${w * 0.52} ${-h * 0.5} ${w * 1.04} 0 q${-w * 0.1} ${h * 0.95} ${-w * 0.52} ${h * 0.95} q${-w * 0.42} 0 ${-w * 0.52} ${-h * 0.95} Z" fill="#fb923c" stroke="#c2410c" stroke-width="${w * 0.1}"/>`;
    case "tongue":
      return `<path d="M${cx - w * 0.5} ${cy - h * 0.1} q${w * 0.5} ${h * 0.7} ${w} 0 z" fill="#3f1220"/>` +
        `<path d="M${cx - w * 0.2} ${cy + h * 0.18} q${w * 0.2} ${h * 0.55} ${w * 0.4} 0 z" fill="#fb7185"/>`;
    case "flat":
      return `<path d="M${cx - w * 0.34} ${cy} h${w * 0.68}" stroke="${line}" stroke-width="${w * 0.2}" stroke-linecap="round"/>`;
    default:
      return "";
  }
}

/* ── Extras ───────────────────────────────────────────────────────────────── */

type Extra =
  | "catEars"
  | "pointEars"
  | "dogEars"
  | "bunnyEars"
  | "bearEars"
  | "horns"
  | "antennae"
  | "wings"
  | "cape"
  | "bowtie"
  | "crown"
  | "gradCap"
  | "wizardHat"
  | "halo"
  | "ring"
  | "leaf"
  | "petals"
  | "glasses"
  | "shades"
  | "mane"
  | "trunk"
  | "tusks"
  | "shell"
  | "whiskers"
  | "crest"
  | "flame"
  | "ribbon"
  | "string"
  | "helmet"
  | "spots"
  | "calc"
  | "straps"
  | "pips"
  | "horn";

type Shape =
  | "blob"
  | "egg"
  | "wide"
  | "cube"
  | "star"
  | "moon"
  | "drop"
  | "cloud"
  | "planet"
  | "lolli"
  | "cookie"
  | "cupcake"
  | "ghost"
  | "pumpkin"
  | "pencil"
  | "medal"
  | "paper"
  | "rocket"
  | "dice"
  | "sun"
  | "mushroom"
  | "sundae"
  | "cake"
  | "comet"
  | "disc"
  | "telescope"
  | "donut"
  | "chocolate"
  | "rainbow"
  | "butterfly";

/**
 * The rounded square a Keen is printed on.
 *
 * Every Keen used to sit on the same violet tile, which made the plate fight the
 * character: a green alien on a green-lit violet tile read as one muddy blob at
 * 60 px. A plate is now part of the art direction — near-black for the Gamer
 * pack, neon-framed for the secret, deep purple for the Admin Keen — and the
 * glow behind the character defaults to the Keen's own hue.
 */
type Plate = {
  from: string;
  to: string;
  /** Colour of the light behind the character. Defaults to the Keen's hue. */
  glow?: string;
};

const VIOLET_PLATE: Plate = { from: hsl(262, 58, 38), to: hsl(262, 72, 15) };
/** Halloween: a night sky lit from behind by a candle. */
const NIGHT_PLATE: Plate = { from: "#3d1263", to: "#150424", glow: "#ff9a3c" };
/** Halloween, but lit by the moon rather than a flame. */
const MOON_PLATE: Plate = { from: "#3d1263", to: "#150424", glow: "#e9d5ff" };
/** The frozen half of the chicken pair. */
const FROST_PLATE: Plate = { from: "#123a5c", to: "#071c30", glow: "#7dd3fc" };
/** The sunny half of the chicken pair. */
const HONEY_PLATE: Plate = { from: "#5a3a0a", to: "#241404", glow: "#fbbf24" };
/** The Pumpkin King's crypt. */
const CRYPT_PLATE: Plate = { from: "#2e1065", to: "#0d0420", glow: "#a855f7" };
/**
 * The Gamer pack's arcade black, with the lime glow the design sheet shows.
 *
 * The glow is deliberately a dark lime rather than the character's own bright
 * green: the light sits *behind* the character, so a bright glow painted the
 * whole plate green and the alien vanished into it. Bright characters need a
 * muted halo.
 */
const DARK_PLATE: Plate = { from: "#1c1a24", to: "#07060b", glow: "#122008" };
/** A mossy green corner for the Creeper, so the face reads as a block in grass. */
const MOSS_PLATE: Plate = { from: "#2c4a24", to: "#101f0d", glow: "#16240f" };
/**
 * Pixel Thorne: the sheet puts a black, spiky creature on a lit purple board
 * inside a pink neon frame. The board has to be bright — a near-black plate hid
 * the black character completely.
 */
const VOID_PLATE: Plate = { from: "#6d28d9", to: "#3b0764", glow: "#a21caf" };
/** The Admin Keen's purple, taken from the design sheet. */
const ROYAL_PLATE: Plate = { from: "#8b3ae0", to: "#4c1594", glow: "#c084fc" };

type Recipe = {
  shape: Shape;
  eyes?: Eyes;
  mouth?: Mouth;
  extras?: Extra[];
  /** Object Keens keep their own colours rather than their hue. */
  colors?: Partial<Colors>;
  /** Hand-drawn in `CUSTOM` instead of the generic parts. */
  custom?: Custom;
  /** The tile this Keen is printed on. */
  plate?: Plate;
  /** Override the face position for tall or wide silhouettes. */
  face?: { cx?: number; cy?: number; gap?: number; r?: number; mouthY?: number };
  /** Skip the plate gloss (busy drawings read better without it). */
  noGloss?: boolean;
};

type Custom =
  | "omeisaurus"
  | "frogula"
  | "chickCube"
  | "chickenCube"
  | "halloweenPumpkin"
  | "cookieGhost"
  | "cookieMummy"
  | "cookiePumpkin"
  | "pumpkinKing"
  | "invader"
  | "crewmate"
  | "chubbypig"
  | "creeper"
  | "pixelthorne"
  | "chroma";

const RECIPES: Record<string, Recipe> = {
  // ── Startpaketet ───────────────────────────────────────────────────────────
  keenungen: { shape: "egg", mouth: "beak", extras: ["crest"] },
  blipp: { shape: "cube", extras: ["antennae"], colors: { light: "#bfe3ff", base: "#6aa9e0", dark: "#33689c", line: "#14324d" } },
  puff: { shape: "cloud", eyes: "happy", mouth: "smile", colors: { light: "#ffffff", base: "#dbeafe", dark: "#93b4dd", line: "#33506d" } },
  driz: { shape: "drop", eyes: "big", mouth: "smile", colors: { light: "#b6f0ff", base: "#38bdf8", dark: "#0b6fa4", line: "#08324a" } },
  sunny: { shape: "sun", eyes: "happy", mouth: "grin" },
  blom: { shape: "blob", extras: ["petals", "leaf"], mouth: "smile" },
  svamp: { shape: "mushroom", extras: ["spots"], mouth: "smile" },
  sten: { shape: "blob", eyes: "sleepy", mouth: "flat", colors: { light: "#d6dbe3", base: "#9aa4b2", dark: "#5b6472", line: "#333b47" } },
  popp: { shape: "blob", extras: ["string"], mouth: "grin", colors: { light: "#ffb3c7", base: "#f43f5e", dark: "#a10f31", line: "#5c0620" } },
  tia: { shape: "dice", eyes: "big", mouth: "smile", extras: ["pips"] },

  // ── Djurpaketet ────────────────────────────────────────────────────────────
  kisse: { shape: "blob", extras: ["catEars", "whiskers"], mouth: "grin" },
  vovve: { shape: "blob", extras: ["dogEars"], mouth: "tongue" },
  kaninen: { shape: "egg", extras: ["bunnyEars"], mouth: "smile" },
  turt: { shape: "blob", extras: ["shell"], mouth: "smile", colors: { light: "#a7f3d0", base: "#4ade80", dark: "#15803d", line: "#0b3d21" } },
  pippi: { shape: "blob", extras: ["crest"], mouth: "beak", colors: { light: "#bae6fd", base: "#60a5fa", dark: "#1d4ed8", line: "#122a6b" } },
  sly: { shape: "blob", extras: ["pointEars"], mouth: "grin" },
  bruno: { shape: "wide", extras: ["bearEars"], mouth: "smile", colors: { light: "#d9b48f", base: "#a9703f", dark: "#6b3f1d", line: "#3a1f0c" } },
  fenrir: { shape: "wide", eyes: "angry", mouth: "fang", extras: ["pointEars"], colors: { light: "#cbd5e1", base: "#8b97a8", dark: "#4a5568", line: "#1f2937" } },

  // ── Skolpaketet ────────────────────────────────────────────────────────────
  penny: { shape: "pencil", eyes: "big", mouth: "smile", colors: { light: "#ffe08a", base: "#fbbf24", dark: "#b45309", line: "#5b2d05" } },
  gummi: { shape: "cube", mouth: "smile", colors: { light: "#fbcfe8", base: "#f472b6", dark: "#9d174d", line: "#4c0519" } },
  bag: { shape: "cube", extras: ["straps"], mouth: "smile", colors: { light: "#93c5fd", base: "#3b82f6", dark: "#1e3a8a", line: "#0f1e46" } },
  kalkyl: { shape: "cube", extras: ["calc"], mouth: "smile", face: { cy: 46, mouthY: 60 }, colors: { light: "#d1fae5", base: "#34d399", dark: "#047857", line: "#053b2c" } },
  prov: { shape: "paper", eyes: "happy", mouth: "smile", colors: { light: "#ffffff", base: "#f1f5f9", dark: "#cbd5e1", line: "#475569" } },
  larsson: { shape: "blob", extras: ["glasses", "bowtie"], mouth: "smile", colors: { light: "#fde3c8", base: "#f2c39b", dark: "#c08a5c", line: "#5c3a1c" } },
  nobel: { shape: "medal", mouth: "grin" },
  rektor: { shape: "blob", extras: ["gradCap", "glasses"], mouth: "smile", colors: { light: "#e9d5ff", base: "#c084fc", dark: "#6d28d9", line: "#2e1065" } },

  // ── Rymdpaketet ────────────────────────────────────────────────────────────
  raffe: { shape: "rocket", eyes: "big", mouth: "smile" },
  stella: { shape: "star", eyes: "happy", mouth: "grin", colors: { light: "#fff3b0", base: "#fbbf24", dark: "#b45309", line: "#5b2d05" } },
  luna: { shape: "moon", eyes: "sleepy", mouth: "smile", colors: { light: "#f8fafc", base: "#e2e8f0", dark: "#a8b3c4", line: "#475569" } },
  kalle: { shape: "comet", eyes: "big", mouth: "open" },
  tella: { shape: "telescope", eyes: "big", mouth: "smile", colors: { light: "#a5f3fc", base: "#22d3ee", dark: "#0e7490", line: "#083344" } },
  astro: { shape: "blob", extras: ["helmet"], mouth: "smile", colors: { light: "#e2e8f0", base: "#b8c4d4", dark: "#7b8798", line: "#334155" } },
  saturnus: { shape: "planet", extras: ["ring"], eyes: "big", mouth: "smile", colors: { light: "#fde68a", base: "#f59e0b", dark: "#b45309", line: "#5b2d05" } },
  zorg: { shape: "wide", eyes: "alien", mouth: "grin", extras: ["antennae"], colors: { light: "#c7f9a8", base: "#84cc16", dark: "#3f6212", line: "#1a2e05" } },

  // ── Djungelpaketet ─────────────────────────────────────────────────────────
  polly: { shape: "blob", extras: ["crest"], mouth: "beak", colors: { light: "#a7f3d0", base: "#34d399", dark: "#047857", line: "#053b2c" } },
  ving: { shape: "butterfly", eyes: "big", mouth: "smile", colors: { light: "#e9d5ff", base: "#c084fc", dark: "#7e22ce", line: "#3b0764" } },
  abbe: { shape: "blob", extras: ["bearEars"], mouth: "grin", colors: { light: "#d9b48f", base: "#b07a45", dark: "#74451f", line: "#3a1f0c" } },
  slir: { shape: "drop", eyes: "big", mouth: "tongue", colors: { light: "#bbf7d0", base: "#22c55e", dark: "#15803d", line: "#052e16" } },
  groda: { shape: "wide", eyes: "big", mouth: "grin", extras: ["spots"], colors: { light: "#bbf7d0", base: "#4ade80", dark: "#15803d", line: "#052e16" } },
  leo: { shape: "blob", extras: ["pointEars", "spots"], mouth: "grin" },
  elsa: { shape: "wide", extras: ["dogEars", "tusks"], face: { cy: 50 }, mouth: "smile", colors: { light: "#e2e8f0", base: "#a8b3c4", dark: "#64748b", line: "#243144" } },
  leon: { shape: "wide", extras: ["mane"], mouth: "grin" },

  // ── Godispaketet ───────────────────────────────────────────────────────────
  klubba: { shape: "lolli", eyes: "happy", mouth: "grin" },
  kex: { shape: "cookie", eyes: "big", mouth: "grin", colors: { light: "#f3d3a2", base: "#d9a05b", dark: "#9c6b2f", line: "#4a2c0c" } },
  munk: { shape: "donut", eyes: "happy", mouth: "grin", colors: { light: "#fde3c8", base: "#e8b183", dark: "#b07a4a", line: "#4a2a0f" } },
  choklad: { shape: "chocolate", eyes: "big", mouth: "smile", colors: { light: "#a8763f", base: "#7b4a1f", dark: "#4a2a0f", line: "#241204" } },
  glass: { shape: "sundae", eyes: "happy", mouth: "grin" },
  tarta: { shape: "cake", eyes: "happy", mouth: "grin" },
  cupcake: { shape: "cupcake", eyes: "happy", mouth: "grin" },
  rainbow: { shape: "rainbow", eyes: "happy", mouth: "grin" },

  // ── Mytiskapaketet ─────────────────────────────────────────────────────────
  uno: { shape: "wide", extras: ["horn", "mane"], eyes: "sparkle", mouth: "smile", colors: { light: "#ffffff", base: "#f3e8ff", dark: "#c4b5fd", line: "#6d28d9" } },
  drako: { shape: "wide", extras: ["horns", "wings", "spots"], eyes: "big", mouth: "fang", colors: { light: "#a7f3d0", base: "#34d399", dark: "#047857", line: "#053b2c" } },
  fenix: { shape: "wide", extras: ["flame", "wings"], eyes: "angry", mouth: "beak", colors: { light: "#fed7aa", base: "#fb923c", dark: "#c2410c", line: "#5c1a06" } },
  marina: { shape: "drop", extras: ["petals"], eyes: "big", mouth: "smile", colors: { light: "#a5f3fc", base: "#22d3ee", dark: "#0e7490", line: "#083344" } },
  merlin: { shape: "blob", extras: ["wizardHat"], mouth: "smile", colors: { light: "#e9d5ff", base: "#a855f7", dark: "#6b21a8", line: "#2e1065" } },
  kromakatt: { shape: "blob", extras: ["catEars", "whiskers"], mouth: "grin", custom: "chroma" },
  kromadrake: { shape: "wide", extras: ["horns", "wings"], eyes: "sparkle", mouth: "fang", custom: "chroma" },
  kromakrona: { shape: "blob", extras: ["crown"], eyes: "sparkle", mouth: "grin", custom: "chroma" },

  // ── Gamerpaketet ───────────────────────────────────────────────────────────
  // The pack is pixel-led, but the reference sheet is not all one style: the
  // alien, the creeper and Pixel Thorne are blocky, the Crewmate and the pig are
  // smooth cartoons. Each is drawn the way the sheet draws it, on a dark plate
  // so a bright green character has somewhere to sit.
  invader: { shape: "blob", custom: "invader", noGloss: true, plate: DARK_PLATE },
  crewmate: { shape: "blob", custom: "crewmate", noGloss: true },
  chubbypig: { shape: "blob", custom: "chubbypig", noGloss: true },
  creeper: { shape: "blob", custom: "creeper", noGloss: true, plate: MOSS_PLATE },
  pixelthorne: { shape: "blob", custom: "pixelthorne", noGloss: true, plate: VOID_PLATE },

  // ── Halloweenpaketet ───────────────────────────────────────────────────────
  pumpkin: { shape: "pumpkin", custom: "halloweenPumpkin", noGloss: true, plate: NIGHT_PLATE },
  // The two chicken cubes are the same animal frozen and thawed: the blue one is
  // the ice cube, the yellow one the bird out of it. Each has a plate that
  // matches where it lives.
  chickenchick: { shape: "cube", custom: "chickCube", noGloss: true, plate: FROST_PLATE },
  chickchicken: { shape: "cube", custom: "chickenCube", noGloss: true, plate: HONEY_PLATE },
  frogula: { shape: "wide", custom: "frogula", noGloss: true, plate: MOON_PLATE },
  cookiepumpkin: { shape: "pumpkin", custom: "cookiePumpkin", noGloss: true, plate: NIGHT_PLATE },
  cookiemummy: { shape: "blob", custom: "cookieMummy", noGloss: true, plate: NIGHT_PLATE },
  cookieghost: { shape: "ghost", custom: "cookieGhost", noGloss: true, plate: MOON_PLATE },
  pumpkinking: { shape: "pumpkin", custom: "pumpkinKing", noGloss: true, plate: CRYPT_PLATE },

  // ── Admin ──────────────────────────────────────────────────────────────────
  omeisaurus: {
    shape: "blob",
    custom: "omeisaurus",
    noGloss: true,
    plate: ROYAL_PLATE,
    // The sheet's dragon is a deep red with orange rim light, not the pale
    // orange the hue alone would mix — the gold filigree needs dark to sit on.
    colors: { light: "#ff8a5c", base: "#e2452a", dark: "#a81f13", line: "#6b120c" },
  },
};

const DEFAULT_RECIPE: Recipe = { shape: "blob", eyes: "big", mouth: "smile" };

/* ── Bodies ───────────────────────────────────────────────────────────────── */

type Built = { body: string; back?: string; front?: string; face: { cx: number; cy: number; gap: number; r: number; mouthY: number } };

function buildBody(recipe: Recipe, id: string, c: Colors): Built {
  const fill = `url(#${id}-body)`;
  const stroke = c.line;
  const sw = 2.2;
  const shine = (x: number, y: number, rx: number, ry: number, o = 0.4) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#ffffff" opacity="${o}"/>`;

  const baseFace = { cx: 50, cy: 56, gap: 13, r: 9, mouthY: 72 };
  const rect = (x: number, y: number, w: number, h: number, r: number) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

  switch (recipe.shape) {
    case "egg":
      return {
        body: rect(21, 20, 58, 66, 29) + shine(36, 34, 12, 7),
        face: { ...baseFace, cy: 54, mouthY: 70 },
      };
    case "wide":
      return {
        body: rect(13, 33, 74, 51, 25) + shine(33, 43, 13, 6),
        face: { ...baseFace, cy: 56, gap: 15, r: 9.5, mouthY: 71 },
      };
    case "cube":
      return {
        body: rect(19, 21, 62, 64, 15) + shine(32, 31, 12, 6),
        face: { ...baseFace, cy: 52, mouthY: 69 },
      };
    case "star":
      return {
        body: `<path d="M50 13 L61.5 36 L86 39 L68 56 L73 80 L50 68 L27 80 L32 56 L14 39 L38.5 36 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>` + shine(40, 30, 8, 5, 0.32),
        face: { ...baseFace, cy: 48, gap: 11, r: 8, mouthY: 62 },
      };
    case "moon":
      return {
        body: `<path d="M64 14 a38 38 0 1 0 0 72 a30 30 0 1 1 0 -72 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`,
        back: `<circle cx="66" cy="34" r="5" fill="#ffffff" opacity="0.4"/><circle cx="60" cy="62" r="7" fill="#ffffff" opacity="0.28"/>`,
        face: { cx: 46, cy: 50, gap: 11, r: 8.5, mouthY: 66 },
      };
    case "drop":
      return {
        body: `<path d="M50 12 C60 28 79 43 79 60 a29 29 0 0 1 -58 0 C21 43 40 28 50 12 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` + shine(38, 52, 8, 11, 0.4),
        face: { cx: 50, cy: 56, gap: 12, r: 8.5, mouthY: 71 },
      };
    case "cloud":
      return {
        body:
          `<path d="M28 78 a16 16 0 0 1 -3 -31 a19 19 0 0 1 36 -8 a17 17 0 0 1 24 12 a15 15 0 0 1 -5 27 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
          shine(34, 42, 11, 6, 0.55),
        face: { cx: 50, cy: 60, gap: 13, r: 8.5, mouthY: 72 },
      };
    case "planet":
      return {
        body: `<circle cx="50" cy="53" r="27" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` + shine(38, 39, 10, 7),
        front: `<ellipse cx="50" cy="62" rx="27" ry="7" fill="${c.dark}" opacity="0.18"/>`,
        face: { cx: 50, cy: 52, gap: 11, r: 8, mouthY: 66 },
      };
    case "lolli":
      return {
        back: `<rect x="46" y="58" width="8" height="34" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.6"/>`,
        body: `<circle cx="50" cy="42" r="27" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
          `<path d="M50 42 m0 -20 a20 20 0 0 1 0 40 a13 13 0 0 0 0 -26 a7 7 0 0 1 0 14" fill="none" stroke="#ffffff" stroke-width="4.5" opacity="0.75"/>`,
        face: { cx: 50, cy: 44, gap: 10, r: 7, mouthY: 56 },
      };
    case "cookie":
      return {
        body: `<circle cx="50" cy="53" r="27" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
          `<circle cx="50" cy="53" r="27" fill="none" stroke="#fde68a" stroke-width="1.4" opacity="0.5" transform="translate(0,1)"/>`,
        front: `<circle cx="31" cy="37" r="3.6" fill="#4a2c0c"/><circle cx="67" cy="33" r="3" fill="#4a2c0c"/><circle cx="74" cy="61" r="3.6" fill="#4a2c0c"/><circle cx="25" cy="61" r="3" fill="#4a2c0c"/><circle cx="55" cy="24" r="2.6" fill="#4a2c0c"/>`,
        face: { cx: 50, cy: 54, gap: 11, r: 8.5, mouthY: 70 },
      };
    case "donut":
      return {
        body:
          `<circle cx="50" cy="52" r="29" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
          `<path d="M50 23 a29 29 0 0 1 0 58 a29 29 0 0 0 0 -58" fill="#f9a8d4" opacity="0.85"/>` +
          `<circle cx="50" cy="52" r="29" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.25"/>`,
        front:
          `<circle cx="50" cy="52" r="10" fill="#1a0f33"/>` +
          `<circle cx="50" cy="52" r="10" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.18"/>` +
          `<g fill="#fde68a"><rect x="31" y="30" width="7" height="2.6" rx="1.3" transform="rotate(-20 34 31)"/><rect x="62" y="28" width="7" height="2.6" rx="1.3" transform="rotate(30 65 29)"/><rect x="68" y="50" width="7" height="2.6" rx="1.3" transform="rotate(-40 71 51)"/><rect x="27" y="49" width="7" height="2.6" rx="1.3" transform="rotate(25 30 50)"/></g>`,
        face: { cx: 50, cy: 46, gap: 11, r: 7.6, mouthY: 60 },
      };
    case "chocolate":
      return {
        body:
          `<rect x="24" y="20" width="52" height="64" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
          `<g stroke="${c.dark}" stroke-width="2.4" opacity="0.7">` +
          `<path d="M24 40 h52 M24 60 h52 M42 20 v64 M60 20 v64"/>` +
          `</g>` +
          `<path d="M26 22 q16 10 48 2" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.35"/>`,
        face: { cx: 50, cy: 50, gap: 9, r: 6.4, mouthY: 64 },
      };
    case "rainbow":
      return {
        body:
          `<path d="M18 78 a32 32 0 0 1 64 0 h-12 a20 20 0 0 0 -40 0 Z" fill="#ef4444" stroke="${stroke}" stroke-width="1.6"/>` +
          `<path d="M30 78 a20 20 0 0 1 40 0 h-8 a12 12 0 0 0 -24 0 Z" fill="#22c55e"/>` +
          `<path d="M38 78 a12 12 0 0 1 24 0 h-6 a6 6 0 0 0 -12 0 Z" fill="#38bdf8"/>` +
          `<circle cx="17" cy="80" r="9" fill="#f8fafc" stroke="${stroke}" stroke-width="1.6"/>` +
          `<circle cx="83" cy="80" r="9" fill="#f8fafc" stroke="${stroke}" stroke-width="1.6"/>`,
        face: { cx: 50, cy: 62, gap: 9, r: 6.6, mouthY: 76 },
      };
    case "butterfly":
      return {
        back:
          `<ellipse cx="28" cy="44" rx="19" ry="22" fill="${fill}" stroke="${stroke}" stroke-width="2" transform="rotate(-18 28 44)"/>` +
          `<ellipse cx="72" cy="44" rx="19" ry="22" fill="${fill}" stroke="${stroke}" stroke-width="2" transform="rotate(18 72 44)"/>` +
          `<ellipse cx="31" cy="70" rx="13" ry="14" fill="${c.light}" stroke="${stroke}" stroke-width="2" transform="rotate(-14 31 70)"/>` +
          `<ellipse cx="69" cy="70" rx="13" ry="14" fill="${c.light}" stroke="${stroke}" stroke-width="2" transform="rotate(14 69 70)"/>` +
          `<circle cx="30" cy="42" r="4.6" fill="#fde68a" opacity="0.85"/><circle cx="70" cy="42" r="4.6" fill="#fde68a" opacity="0.85"/>`,
        body: `<ellipse cx="50" cy="56" rx="13" ry="30" fill="${c.dark}" stroke="${stroke}" stroke-width="2"/>` +
          `<path d="M44 26 q-1 -10 -6 -12 M56 26 q1 -10 6 -12" stroke="${stroke}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
        face: { cx: 50, cy: 48, gap: 6.5, r: 5.4, mouthY: 62 },
      };
    case "cupcake":
      return {
        body:
          `<path d="M28 58 h44 l-6 26 a4 4 0 0 1 -4 3 h-24 a4 4 0 0 1 -4 -3 Z" fill="#fcd9b6" stroke="#b07a4a" stroke-width="2"/>` +
          `<path d="M24 56 q6 -22 26 -22 q20 0 26 22 Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>` +
          `<circle cx="50" cy="24" r="5" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.5"/>`,
        face: { cx: 50, cy: 46, gap: 10, r: 7.5, mouthY: 60 },
      };
    case "ghost":
      return {
        body:
          `<path d="M23 46 a27 27 0 0 1 54 0 V86 q-7 -7 -14 0 t-13 0 t-13 0 t-14 0 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`,
        face: { cx: 50, cy: 50, gap: 11, r: 8, mouthY: 64 },
      };
    case "pumpkin":
      return {
        body:
          `<ellipse cx="50" cy="56" rx="31" ry="27" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
          `<ellipse cx="34" cy="56" rx="13" ry="25" fill="${c.dark}" opacity="0.22"/>` +
          `<ellipse cx="66" cy="56" rx="13" ry="25" fill="${c.dark}" opacity="0.22"/>` +
          `<path d="M50 29 q4 -9 0 -15" stroke="#166534" stroke-width="5" fill="none" stroke-linecap="round"/>`,
        face: { cx: 50, cy: 56, gap: 13, r: 9, mouthY: 72 },
      };
    case "pencil":
      return {
        body:
          `<path d="M34 84 V26 a16 16 0 0 1 32 0 V84 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
          `<path d="M34 84 h32 l-6 8 h-20 Z" fill="#fbcfe8" stroke="${stroke}" stroke-width="2"/>` +
          `<path d="M34 26 h32" stroke="${stroke}" stroke-width="2" opacity="0.4"/>`,
        face: { cx: 50, cy: 46, gap: 10, r: 7.5, mouthY: 60 },
      };
    case "medal":
      return {
        back: `<path d="M36 12 h12 l-6 30 Z" fill="#ef4444"/><path d="M52 12 h12 l-6 30 Z" fill="#1d4ed8"/>`,
        body: `<circle cx="50" cy="58" r="25" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/><circle cx="50" cy="58" r="18" fill="none" stroke="#ffffff" stroke-width="2.4" opacity="0.55"/>`,
        face: { cx: 50, cy: 56, gap: 9, r: 7, mouthY: 70 },
      };
    case "paper":
      return {
        body:
          `<path d="M26 12 h34 l14 14 v62 h-48 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
          `<path d="M60 12 v14 h14" fill="${c.dark}" stroke="${stroke}" stroke-width="2"/>`,
        back: `<path d="M34 40 h28 M34 50 h28 M34 60 h20" stroke="${c.dark}" stroke-width="2.4" opacity="0.55"/>`,
        face: { cx: 47, cy: 70, gap: 9, r: 6.5, mouthY: 80 },
      };
    case "rocket":
      return {
        back:
          `<path d="M30 62 l-13 18 h13 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.6"/>` +
          `<path d="M70 62 l13 18 h-13 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.6"/>`,
        body:
          `<path d="M50 8 q20 20 20 46 v28 h-40 V54 q0 -26 20 -46 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
          `<circle cx="50" cy="40" r="12" fill="#dbeafe" stroke="${stroke}" stroke-width="2.2"/>` +
          `<path d="M50 20 q10 4 12 18" stroke="#ffffff" stroke-width="2.4" fill="none" opacity="0.4"/>`,
        front:
          `<path d="M40 82 q10 16 20 0 Z" fill="#fbbf24" stroke="#f97316" stroke-width="1.4"/>` +
          `<path d="M46 84 q4 8 8 0" fill="#fef08a"/>` +
          `<circle cx="50" cy="40" r="12" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.45"/>`,
        face: { cx: 50, cy: 40, gap: 5.5, r: 4.2, mouthY: 47 },
      };
    case "dice":
      return {
        body: `<rect x="18" y="20" width="64" height="64" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`,
        back: `<circle cx="32" cy="34" r="4" fill="#ffffff" opacity="0.9"/><circle cx="68" cy="34" r="4" fill="#ffffff" opacity="0.9"/><circle cx="68" cy="70" r="4" fill="#ffffff" opacity="0.9"/>`,
        face: { cx: 50, cy: 52, gap: 0, r: 0, mouthY: 0 },
      };
    case "sun":
      return {
        back: `<g stroke="#fbbf24" stroke-width="6" stroke-linecap="round">` +
          [0, 45, 90, 135, 180, 225, 270, 315]
            .map((a) => {
              const rad = (a * Math.PI) / 180;
              return `<line x1="${50 + Math.cos(rad) * 28}" y1="${52 + Math.sin(rad) * 28}" x2="${50 + Math.cos(rad) * 38}" y2="${52 + Math.sin(rad) * 38}"/>`;
            })
            .join("") +
          `</g>`,
        body: `<circle cx="50" cy="52" r="25" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`,
        face: { cx: 50, cy: 50, gap: 10, r: 7.5, mouthY: 63 },
      };
    case "mushroom":
      return {
        body:
          `<path d="M18 50 a32 26 0 0 1 64 0 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
          `<path d="M37 50 h26 v22 a13 13 0 0 1 -26 0 Z" fill="#fde3c8" stroke="#b07a4a" stroke-width="2.2"/>`,
        back: `<circle cx="34" cy="40" r="5" fill="#ffffff" opacity="0.85"/><circle cx="56" cy="32" r="4" fill="#ffffff" opacity="0.85"/><circle cx="68" cy="44" r="4.6" fill="#ffffff" opacity="0.85"/>`,
        face: { cx: 50, cy: 62, gap: 8, r: 5.5, mouthY: 72 },
      };
    case "sundae":
      return {
        back:
          `<path d="M30 54 h40 l-7 28 a5 5 0 0 1 -5 4 h-16 a5 5 0 0 1 -5 -4 Z" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="2.4"/>` +
          `<path d="M50 86 l9 7 h-18 Z" fill="#bae6fd" stroke="#7dd3fc" stroke-width="1.6"/>`,
        body:
          `<circle cx="36" cy="46" r="14" fill="${c.light}" stroke="${stroke}" stroke-width="2"/>` +
          `<circle cx="64" cy="46" r="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>` +
          `<circle cx="50" cy="34" r="15" fill="${fill}" stroke="${stroke}" stroke-width="2"/>` +
          `<path d="M30 54 q8 6 20 4 q12 2 20 -4" stroke="#7dd3fc" stroke-width="2.4" fill="none"/>`,
        front:
          `<path d="M50 18 q5 -9 12 -6 q-5 7 -12 6 Z" fill="#ef4444"/>` +
          `<path d="M58 74 l14 -4" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/><ellipse cx="74" cy="69" rx="5" ry="4" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.4"/>` +
          `<g fill="#f472b6"><rect x="38" y="30" width="6" height="2.4" rx="1.2" transform="rotate(-25 41 31)"/><rect x="58" y="26" width="6" height="2.4" rx="1.2" transform="rotate(20 61 27)"/><rect x="61" y="42" width="6" height="2.4" rx="1.2" transform="rotate(-20 64 43)"/></g>`,
        face: { cx: 50, cy: 40, gap: 9, r: 6.8, mouthY: 52 },
      };
    case "cake":
      return {
        body:
          `<path d="M18 62 h64 v24 h-64 Z" fill="#fcd9b6" stroke="${stroke}" stroke-width="2.2"/>` +
          `<path d="M18 54 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 v10 h-64 Z" fill="${fill}" stroke="${stroke}" stroke-width="2.2"/>` +
          `<path d="M18 62 h64" stroke="#fef3c7" stroke-width="4" opacity="0.7"/>` +
          `<path d="M24 86 h52" stroke="${c.dark}" stroke-width="2" opacity="0.35"/>`,
        front:
          `<circle cx="30" cy="46" r="5.2" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.4"/>` +
          `<circle cx="58" cy="44" r="5.2" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.4"/>` +
          `<path d="M30 40 q3 -6 8 -4" stroke="#166534" stroke-width="2.2" fill="none"/>`,
        face: { cx: 50, cy: 72, gap: 9, r: 6.4, mouthY: 82 },
      };
    case "comet":
      return {
        back: `<path d="M52 26 L94 14 L78 34 Z" fill="#fbbf24" opacity="0.55"/><path d="M50 46 L92 52 L64 62 Z" fill="#fb923c" opacity="0.45"/>`,
        body: `<circle cx="36" cy="54" r="24" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`,
        face: { cx: 36, cy: 52, gap: 9, r: 7, mouthY: 66 },
      };
    case "disc":
      return {
        body: `<circle cx="50" cy="54" r="27" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`,
        face: { cx: 50, cy: 52, gap: 11, r: 8.5, mouthY: 68 },
      };
    case "telescope":
      return {
        back: `<path d="M50 52 l-16 34 M50 52 l16 34 M50 52 v30" stroke="#64748b" stroke-width="3.4" stroke-linecap="round"/>`,
        body:
          `<g transform="rotate(-22 50 48)">` +
          `<rect x="18" y="38" width="52" height="20" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="2.2"/>` +
          `<rect x="66" y="34" width="14" height="28" rx="6" fill="${c.dark}" stroke="${stroke}" stroke-width="2.2"/>` +
          `<rect x="24" y="36" width="8" height="24" rx="4" fill="${c.light}" stroke="${stroke}" stroke-width="1.6"/>` +
          `</g>`,
        face: { cx: 50, cy: 48, gap: 8.5, r: 6.6, mouthY: 60 },
      };
    default:
      return {
        body: rect(18, 26, 64, 60, 27) + shine(34, 40, 13, 7),
        face: baseFace,
      };
  }
}

/* ── Extras ───────────────────────────────────────────────────────────────── */

function buildExtras(list: Extra[], c: Colors): { back: string; front: string } {
  let back = "";
  let front = "";

  for (const extra of list) {
    switch (extra) {
      case "catEars":
        front +=
          `<path d="M24 32 l4 -16 l16 8 Z" fill="${c.base}" stroke="${c.line}" stroke-width="2.2" stroke-linejoin="round"/>` +
          `<path d="M76 32 l-4 -16 l-16 8 Z" fill="${c.base}" stroke="${c.line}" stroke-width="2.2" stroke-linejoin="round"/>` +
          `<path d="M29 28 l2 -7 l7 4 Z" fill="#fda4af"/><path d="M71 28 l-2 -7 l-7 4 Z" fill="#fda4af"/>`;
        break;
      case "pointEars":
        front +=
          `<path d="M22 34 L20 12 L42 26 Z" fill="${c.base}" stroke="${c.line}" stroke-width="2.2" stroke-linejoin="round"/>` +
          `<path d="M78 34 L80 12 L58 26 Z" fill="${c.base}" stroke="${c.line}" stroke-width="2.2" stroke-linejoin="round"/>`;
        break;
      case "dogEars":
        front +=
          `<path d="M22 30 q-10 8 -6 24 q10 2 14 -10 Z" fill="${c.dark}" stroke="${c.line}" stroke-width="2"/>` +
          `<path d="M78 30 q10 8 6 24 q-10 2 -14 -10 Z" fill="${c.dark}" stroke="${c.line}" stroke-width="2"/>`;
        break;
      case "bunnyEars":
        back +=
          `<ellipse cx="37" cy="16" rx="8" ry="19" fill="${c.base}" stroke="${c.line}" stroke-width="2.2" transform="rotate(-10 37 16)"/>` +
          `<ellipse cx="63" cy="16" rx="8" ry="19" fill="${c.base}" stroke="${c.line}" stroke-width="2.2" transform="rotate(10 63 16)"/>` +
          `<ellipse cx="37" cy="17" rx="4" ry="12" fill="#fda4af" transform="rotate(-10 37 17)"/>` +
          `<ellipse cx="63" cy="17" rx="4" ry="12" fill="#fda4af" transform="rotate(10 63 17)"/>`;
        break;
      case "bearEars":
        back +=
          `<circle cx="26" cy="32" r="11" fill="${c.base}" stroke="${c.line}" stroke-width="2.2"/>` +
          `<circle cx="74" cy="32" r="11" fill="${c.base}" stroke="${c.line}" stroke-width="2.2"/>` +
          `<circle cx="26" cy="32" r="5" fill="${c.dark}" opacity="0.6"/><circle cx="74" cy="32" r="5" fill="${c.dark}" opacity="0.6"/>`;
        break;
      case "horns":
        back +=
          `<path d="M30 34 q-8 -14 2 -22 q6 10 4 22 Z" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>` +
          `<path d="M70 34 q8 -14 -2 -22 q-6 10 -4 22 Z" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>`;
        break;
      case "horn":
        back += `<path d="M50 26 l7 -18 l-1 20 Z" fill="#fde68a" stroke="#b45309" stroke-width="1.8"/><path d="M50 10 l-4 8 h8 Z" fill="#fff7ed"/>`;
        break;
      case "antennae":
        back +=
          `<path d="M40 26 q-6 -14 -12 -14" stroke="${c.line}" stroke-width="2.6" fill="none"/><circle cx="27" cy="11" r="4" fill="#fbbf24" stroke="${c.line}" stroke-width="1.6"/>` +
          `<path d="M60 26 q6 -14 12 -14" stroke="${c.line}" stroke-width="2.6" fill="none"/><circle cx="73" cy="11" r="4" fill="#fbbf24" stroke="${c.line}" stroke-width="1.6"/>`;
        break;
      case "wings":
        back +=
          `<path d="M26 46 q-22 -6 -22 16 q0 16 14 18 q-6 -16 8 -34 Z" fill="${c.dark}" opacity="0.9"/>` +
          `<path d="M74 46 q22 -6 22 16 q0 16 -14 18 q6 -16 -8 -34 Z" fill="${c.dark}" opacity="0.9"/>`;
        break;
      case "cape":
        back += `<path d="M22 42 q28 -12 56 0 q10 30 -4 44 q-24 -10 -48 0 q-14 -14 -4 -44 Z" fill="#b91c1c" stroke="#7f1d1d" stroke-width="2"/>`;
        break;
      case "bowtie":
        front +=
          `<path d="M50 74 l-14 -7 v14 Z" fill="#111827"/><path d="M50 74 l14 -7 v14 Z" fill="#111827"/>` +
          `<circle cx="50" cy="74" r="4.4" fill="#f59e0b"/>`;
        break;
      case "crown":
        front +=
          `<path d="M33 30 L35 14 L44 21 L50 9 L56 21 L65 14 L67 30 Z" fill="#fbbf24" stroke="#b45309" stroke-width="2" stroke-linejoin="round"/>` +
          `<circle cx="50" cy="25" r="3" fill="#ef4444"/>`;
        break;
      case "gradCap":
        front +=
          `<path d="M50 12 L82 25 L50 38 L18 25 Z" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>` +
          `<path d="M74 28 v12" stroke="#fbbf24" stroke-width="2.6"/><circle cx="74" cy="42" r="3.4" fill="#fbbf24"/>`;
        break;
      case "wizardHat":
        front +=
          `<path d="M50 6 q9 16 12 28 h-24 q3 -12 12 -28 Z" fill="#4c1d95" stroke="#2e1065" stroke-width="2"/>` +
          `<ellipse cx="50" cy="34" rx="26" ry="7" fill="#5b21b6" stroke="#2e1065" stroke-width="2"/>` +
          `<path d="M42 20 h16" stroke="#fbbf24" stroke-width="3"/>`;
        break;
      case "halo":
        back += `<ellipse cx="50" cy="14" rx="17" ry="5" fill="none" stroke="#fde68a" stroke-width="4"/>`;
        break;
      case "ring":
        back += `<ellipse cx="50" cy="60" rx="38" ry="10" fill="none" stroke="${c.dark}" stroke-width="5" opacity="0.85"/><ellipse cx="50" cy="60" rx="38" ry="10" fill="none" stroke="${c.light}" stroke-width="1.6" opacity="0.6"/>`;
        break;
      case "leaf":
        front += `<path d="M50 22 q14 -8 12 6 q-10 4 -12 -6 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.6"/>`;
        break;
      case "petals":
        back +=
          Array.from({ length: 7 }, (_, i) => {
            const a = (i / 7) * Math.PI * 2;
            return `<circle cx="${50 + Math.cos(a) * 26}" cy="${54 + Math.sin(a) * 26}" r="11" fill="${c.light}" stroke="${c.line}" stroke-width="1.6" opacity="0.95"/>`;
          }).join("");
        break;
      case "glasses":
        front +=
          `<circle cx="37" cy="54" r="10" fill="none" stroke="#1f2937" stroke-width="2.6"/>` +
          `<circle cx="63" cy="54" r="10" fill="none" stroke="#1f2937" stroke-width="2.6"/>` +
          `<path d="M47 54 h6" stroke="#1f2937" stroke-width="2.6"/>`;
        break;
      case "shades":
        front += `<path d="M26 48 h48 v9 q-8 8 -16 0 q-8 8 -16 0 q-8 8 -16 0 Z" fill="#111827" opacity="0.92"/>`;
        break;
      case "mane":
        back +=
          Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return `<circle cx="${50 + Math.cos(a) * 27}" cy="${54 + Math.sin(a) * 27}" r="10" fill="${c.dark}" opacity="0.95"/>`;
          }).join("") + `<circle cx="50" cy="54" r="27" fill="${c.dark}" opacity="0.35"/>`;
        break;
      case "trunk":
        front += `<path d="M50 62 q0 16 8 22 q6 -2 4 -9" stroke="${c.base}" stroke-width="11" fill="none" stroke-linecap="round"/>`;
        break;
      case "tusks":
        front += `<path d="M36 72 l-3 9 l6 -1 Z" fill="#ffffff"/><path d="M64 72 l3 9 l-6 -1 Z" fill="#ffffff"/>`;
        break;
      case "shell":
        back += `<path d="M20 60 a30 24 0 0 1 60 0 v18 a30 24 0 0 1 -60 0 Z" fill="${c.dark}" opacity="0.5"/>`;
        break;
      case "whiskers":
        front +=
          `<g stroke="#334155" stroke-width="1.8" opacity="0.7">` +
          `<path d="M18 64 h12 M18 70 h12 M82 64 h-12 M82 70 h-12"/>` +
          `</g>`;
        break;
      case "crest":
        front +=
          `<path d="M50 24 q-4 -14 -12 -16 q0 12 6 18 Z" fill="${c.light}" stroke="${c.line}" stroke-width="1.6"/>` +
          `<path d="M50 22 q2 -16 10 -18 q2 14 -4 20 Z" fill="${c.light}" stroke="${c.line}" stroke-width="1.6"/>`;
        break;
      case "flame":
        back +=
          `<path d="M50 4 q14 16 10 30 q-4 10 -10 10 q-6 0 -10 -10 q-4 -14 10 -30 Z" fill="#fb923c" opacity="0.85"/>` +
          `<path d="M50 12 q8 12 6 20 q-2 7 -6 7 q-4 0 -6 -7 q-2 -8 6 -20 Z" fill="#fde68a" opacity="0.9"/>`;
        break;
      case "ribbon":
        front += `<path d="M50 20 l6 -8 l-6 14 l-6 -14 Z" fill="#ef4444"/>`;
        break;
      case "string":
        front += `<path d="M50 84 q6 8 0 12" stroke="#94a3b8" stroke-width="2" fill="none"/>`;
        break;
      case "helmet":
        front += `<circle cx="50" cy="54" r="30" fill="none" stroke="#e2e8f0" stroke-width="4" opacity="0.9"/><path d="M28 44 q22 -12 44 0" stroke="#7dd3fc" stroke-width="3" fill="none" opacity="0.8"/>`;
        break;
      case "spots":
        front +=
          `<circle cx="30" cy="70" r="4" fill="${c.dark}" opacity="0.45"/>` +
          `<circle cx="70" cy="68" r="4.6" fill="${c.dark}" opacity="0.45"/>` +
          `<circle cx="60" cy="80" r="3.4" fill="${c.dark}" opacity="0.45"/>`;
        break;
      case "calc":
        // Screen and keys live in the bottom third so they never cross the face.
        front += `<rect x="34" y="66" width="32" height="8" rx="2" fill="#0f172a" opacity="0.5"/>` +
          `<g fill="#0f172a" opacity="0.4">` +
          [0, 1].map((row) => [0, 1, 2].map((col) => `<rect x="${35 + col * 10}" y="${76 + row * 5}" width="7" height="3.4" rx="1"/>`).join("")).join("") +
          `</g>`;
        break;
      case "pips":
        front += `<g fill="#ffffff" opacity="0.92"><circle cx="29" cy="31" r="3.4"/><circle cx="71" cy="31" r="3.4"/><circle cx="29" cy="76" r="3.4"/><circle cx="71" cy="76" r="3.4"/></g>`;
        break;
      case "straps":
        front += `<path d="M34 30 q-6 14 -2 28" stroke="${c.dark}" stroke-width="4" fill="none"/><path d="M66 30 q6 14 2 28" stroke="${c.dark}" stroke-width="4" fill="none"/>`;
        break;
    }
  }

  return { back, front };
}

/* ── Pixel Keens ─────────────────────────────────────────────────────────── */

type PixelBox = { x: number; y: number; cell: number };

/**
 * A bitmap on a chosen pixel grid, drawn as solid rectangles.
 *
 * `rows` is one string per pixel row and `.` is transparent. Rects are grown by
 * a hair on the right and bottom (0.25 of a unit) so neighbours overlap instead
 * of leaving a seam when the browser scales the SVG — the one artefact that made
 * the old pixel Keens look noisy at 60 px.
 */
function pixelRows(rows: string[], palette: Record<string, string>, box: PixelBox): string {
  let out = "";
  rows.forEach((row, ry) => {
    let rx = 0;
    while (rx < row.length) {
      const letter = row[rx];
      const fill = palette[letter];
      if (!fill) {
        rx += 1;
        continue;
      }
      let run = 1;
      while (rx + run < row.length && row[rx + run] === letter) run += 1;
      out += `<rect x="${box.x + rx * box.cell}" y="${box.y + ry * box.cell}" width="${run * box.cell + 0.25}" height="${box.cell + 0.25}" fill="${fill}"/>`;
      rx += run;
    }
  });
  return out;
}

/** A deterministic spray of squares, for the board behind a pixel character. */
function pixelNoise(size: number, cell: number, colors: string[]): string {
  let out = "";
  let seed = 7;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (seed % 100 < 46) continue;
      out += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${colors[seed % colors.length]}" opacity="${0.18 + ((seed >> 8) % 40) / 100}"/>`;
    }
  }
  return out;
}

/* ── Hand-drawn characters ───────────────────────────────────────────────── */

function customArt(
  kind: Custom,
  id: string,
  c: Colors
): { back: string; body: string; front: string; face?: Built["face"] | null; ornament?: boolean } {
  const grad = `url(#${id}-body)`;

  switch (kind) {
    // Omeisaurus, straight off the Admin sheet: a wide red-orange dragon head
    // filling the plate, gold flame curls over the brow and cheeks, two cream
    // horns, big round eyes, a gold muzzle with a wide grin and two small fangs.
    case "omeisaurus":
      return {
        back: `<ellipse cx="50" cy="93" rx="33" ry="6" fill="#000" opacity="0.3"/>`,
        body:
          `<path d="M50 13c-9 0-19 2-26 10-6 7-9 18-9 31 0 14 5 24 14 30 8 5 14 7 21 7s13-2 21-7c9-6 14-16 14-30 0-13-3-24-9-31-7-8-17-10-26-10Z" fill="${grad}" stroke="#7f1d1d" stroke-width="2.4" stroke-linejoin="round"/>` +
          `<path d="M18 54c0 16 4 27 12 34-6-9-8-21-8-34Z" fill="#ff9a5c" opacity="0.35"/>` +
          `<path d="M82 54c0 16-4 27-12 34 6-9 8-21 8-34Z" fill="#8f1a10" opacity="0.4"/>`,
        front:
          // horns
          `<path d="M31 19c-1-7-6-12-12-14 0 8 4 14 10 18Z" fill="#ffe3a3" stroke="#a16207" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M69 19c1-7 6-12 12-14 0 8-4 14-10 18Z" fill="#ffe3a3" stroke="#a16207" stroke-width="2" stroke-linejoin="round"/>` +
          // gold flame curls across the brow and down the cheeks
          `<g fill="none" stroke="#f7c948" stroke-width="3.4" stroke-linecap="round">` +
          `<path d="M50 20c4 5 4 10 0 15"/>` +
          `<path d="M40 24c5 2 8 7 9 12"/>` +
          `<path d="M60 24c-5 2-8 7-9 12"/>` +
          `<path d="M27 37c5 4 7 10 6 17"/>` +
          `<path d="M73 37c-5 4-7 10-6 17"/>` +
          `<path d="M20 63c4 3 6 9 5 14"/>` +
          `<path d="M80 63c-4 3-6 9-5 14"/>` +
          `</g>` +
          `<g fill="#f7c948"><circle cx="50" cy="17" r="2.6"/><path d="M23 52l3-5 3 5-3 5Z"/><path d="M77 52l-3-5-3 5 3 5Z"/></g>` +
          // eyes
          `<ellipse cx="34.5" cy="44" rx="13.5" ry="14" fill="#fff8ef" stroke="#6b1a10" stroke-width="2"/>` +
          `<ellipse cx="65.5" cy="44" rx="13.5" ry="14" fill="#fff8ef" stroke="#6b1a10" stroke-width="2"/>` +
          `<circle cx="36" cy="46" r="8.4" fill="#241318"/>` +
          `<circle cx="64" cy="46" r="8.4" fill="#241318"/>` +
          `<circle cx="33" cy="42" r="3.2" fill="#ffffff"/><circle cx="61" cy="42" r="3.2" fill="#ffffff"/>` +
          `<circle cx="39.5" cy="50" r="1.6" fill="#ffffff" opacity="0.8"/><circle cx="67.5" cy="50" r="1.6" fill="#ffffff" opacity="0.8"/>` +
          // muzzle, nostrils, grin
          `<path d="M50 57c-9 0-17 3-21 9-4 6-1 13 6 16 5 2 10 3 15 3s10-1 15-3c7-3 10-10 6-16-4-6-12-9-21-9Z" fill="#ffc93c" stroke="#a9540b" stroke-width="2.2"/>` +
          `<ellipse cx="46" cy="64" rx="2.2" ry="1.8" fill="#7f1d1d" opacity="0.7"/><ellipse cx="54" cy="64" rx="2.2" ry="1.8" fill="#7f1d1d" opacity="0.7"/>` +
          `<path d="M34 71c4 7 10 10 16 10s12-3 16-10Z" fill="#5b120c"/>` +
          `<path d="M42 76c2 3 5 4 8 4s6-1 8-4c-2 1-5 2-8 2s-6-1-8-2Z" fill="#e8552a"/>` +
          `<path d="M35 77l3.4-7 3.4 7Z" fill="#fffaf0"/><path d="M57.2 77l3.4-7 3.4 7Z" fill="#fffaf0"/>` +
          // gold jaw plates at the bottom corners
          `<path d="M27 80c2 6 7 11 13 13l-3-10Z" fill="#f0b429" opacity="0.85"/><path d="M73 80c-2 6-7 11-13 13l3-10Z" fill="#f0b429" opacity="0.85"/>`,
        face: null,
      };

    // Vampire frog, from the Halloween sheet: a full moon in a purple night, a
    // red cape, a wide green frog head with two googly eyes on top, a grin with
    // two fangs, and a black bat-wing bow tie with an orange knot.
    case "frogula":
      return {
        back:
          `<circle cx="21" cy="19" r="15" fill="#ffe9a8" opacity="0.95"/>` +
          `<circle cx="27" cy="14" r="4.5" fill="#f5d98a" opacity="0.8"/><circle cx="16" cy="24" r="3" fill="#f5d98a" opacity="0.7"/><circle cx="24" cy="26" r="2.2" fill="#f5d98a" opacity="0.6"/>` +
          `<path d="M17 45c-9 2-14 12-13 24 1 12 9 19 21 19h50c12 0 20-7 21-19 1-12-4-22-13-24Z" fill="#c22030" stroke="#7f1d1d" stroke-width="2.2"/>` +
          `<path d="M22 52c-6 4-9 12-8 21" stroke="#ef4444" stroke-width="3" fill="none" opacity="0.55" stroke-linecap="round"/>`,
        body:
          `<circle cx="32" cy="31" r="15" fill="${grad}" stroke="#14532d" stroke-width="2.2"/>` +
          `<circle cx="68" cy="31" r="15" fill="${grad}" stroke="#14532d" stroke-width="2.2"/>` +
          `<path d="M50 25c-13 0-24 3-30 10-4 5-6 12-6 20 0 13 5 21 13 25 7 4 15 5 23 5s16-1 23-5c8-4 13-12 13-25 0-8-2-15-6-20-6-7-17-10-30-10Z" fill="${grad}" stroke="#14532d" stroke-width="2.4" stroke-linejoin="round"/>` +
          `<ellipse cx="50" cy="71" rx="22" ry="13" fill="#dcfce7" opacity="0.5"/>`,
        front:
          `<circle cx="32" cy="29" r="11.5" fill="#ffffff" stroke="#14532d" stroke-width="2"/>` +
          `<circle cx="68" cy="29" r="11.5" fill="#ffffff" stroke="#14532d" stroke-width="2"/>` +
          `<circle cx="33" cy="30" r="5.6" fill="#101c10"/><circle cx="67" cy="30" r="5.6" fill="#101c10"/>` +
          `<circle cx="31" cy="27.5" r="2.2" fill="#ffffff"/><circle cx="65" cy="27.5" r="2.2" fill="#ffffff"/>` +
          `<circle cx="44" cy="47" r="1.8" fill="#14532d"/><circle cx="56" cy="47" r="1.8" fill="#14532d"/>` +
          // The grin sits above the bow tie, not under it: on the sheet you read
          // the mouth first and the collar second.
          `<path d="M31 53c5 8 12 12 19 12s14-4 19-12" stroke="#14532d" stroke-width="3" fill="none" stroke-linecap="round"/>` +
          `<path d="M38 57l3 8 3-8Z" fill="#ffffff"/><path d="M56 57l3 8 3-8Z" fill="#ffffff"/>` +
          // big bat wings, wider than the face, meeting at an orange knot
          `<path d="M48 84C38 76 20 68 8 74c-5 10 5 20 18 20 10 0 17-4 22-10Z" fill="#0b0618" stroke="#000000" stroke-width="1.4"/>` +
          `<path d="M52 84c10-8 28-16 40-10 5 10-5 20-18 20-10 0-17-4-22-10Z" fill="#0b0618" stroke="#000000" stroke-width="1.4"/>` +
          `<circle cx="50" cy="83" r="5.6" fill="#f59e0b" stroke="#7c2d12" stroke-width="1.4"/>` +
          `<ellipse cx="34" cy="85" rx="9" ry="4.4" fill="#4ade80" stroke="#14532d" stroke-width="1.8"/>` +
          `<ellipse cx="66" cy="85" rx="9" ry="4.4" fill="#4ade80" stroke="#14532d" stroke-width="1.8"/>`,
        face: null,
      };

    // The "Kuben" pair from the Halloween sheet, and they are one animal in two
    // states: `chickCube` is the blue ice cube with the red comb and a yellow
    // screen-face, `chickenCube` is the yellow bird out of the ice with a blue
    // screen-face. Same drawing, swapped palettes — the sheet does exactly that.
    case "chickCube":
    case "chickenCube": {
      const frozen = kind === "chickCube";
      const shell = frozen ? "#a9dcf7" : "#ffd93d";
      const shellEdge = frozen ? "#4f9fc9" : "#c68a05";
      const shellLight = frozen ? "#e9f8ff" : "#fff0a1";
      const panel = frozen ? "#ffd15c" : "#bde9ff";
      const panelEdge = frozen ? "#d99a1c" : "#4f9fc9";
      const panelInk = frozen ? "#c2410c" : "#0369a1";
      const comb = "#e0392b";
      return {
        back: `<ellipse cx="50" cy="90" rx="30" ry="5" fill="#000" opacity="0.22"/>`,
        body:
          // the comb: a floppy red crest on the frozen one, little tufts on the bird
          (frozen
            ? `<path d="M36 15c-5-5-3-12 3-13 4-1 7 2 8 5 3-4 9-4 11 1 2 4 1 8-2 11 4 0 6 4 4 8-2 3-6 3-9 1Z" fill="${comb}" stroke="#9d174d" stroke-width="2" stroke-linejoin="round"/>`
            : `<path d="M43 16c-3-8-1-13 5-16 1 7 3 11 7 15Z" fill="${shellLight}" stroke="${shellEdge}" stroke-width="1.8" stroke-linejoin="round"/>` +
              `<path d="M53 16c1-7 5-10 10-10-2 6-3 9-5 12Z" fill="${shellLight}" stroke="${shellEdge}" stroke-width="1.8" stroke-linejoin="round"/>` +
              `<path d="M36 17c-5-5-10-6-14-4 3 5 6 7 11 8Z" fill="${shellLight}" stroke="${shellEdge}" stroke-width="1.8" stroke-linejoin="round"/>`) +
          `<rect x="13" y="13" width="74" height="73" rx="23" fill="${shell}" stroke="${shellEdge}" stroke-width="2.8"/>` +
          `<path d="M23 21c6-5 14-6 22-5" stroke="#ffffff" stroke-width="3.6" fill="none" stroke-linecap="round" opacity="0.65"/>` +
          (frozen
            ? // frozen frost spikes at the corners
              `<path d="M16 30l-5-3 4 6-6 1 6 3-3 5Z" fill="${shellLight}" stroke="${shellEdge}" stroke-width="1.4" stroke-linejoin="round"/>` +
              `<path d="M84 62l5 3-4 4 5 3-5 4Z" fill="${shellLight}" stroke="${shellEdge}" stroke-width="1.4" stroke-linejoin="round"/>`
            : ""),
        front:
          // top face
          `<ellipse cx="35" cy="35" rx="11" ry="12.5" fill="#ffffff" stroke="#3f3a3a" stroke-width="1.4"/>` +
          `<ellipse cx="65" cy="35" rx="11" ry="12.5" fill="#ffffff" stroke="#3f3a3a" stroke-width="1.4"/>` +
          `<circle cx="36" cy="37" r="6.8" fill="#17141a"/><circle cx="64" cy="37" r="6.8" fill="#17141a"/>` +
          `<circle cx="33.5" cy="33.5" r="2.6" fill="#ffffff"/><circle cx="61.5" cy="33.5" r="2.6" fill="#ffffff"/>` +
          `<circle cx="39" cy="41" r="1.4" fill="#ffffff" opacity="0.85"/><circle cx="67" cy="41" r="1.4" fill="#ffffff" opacity="0.85"/>` +
          // lashes, the detail that makes the sheet's eyes read as a bird's
          `<g stroke="#3f3a3a" stroke-width="1.6" stroke-linecap="round">` +
          `<path d="M25 24l-3-3M30 21l-2-4M70 21l2-4M75 24l3-3"/>` +
          `</g>` +
          `<ellipse cx="21" cy="48" rx="6.5" ry="3.6" fill="#fb7185" opacity="0.55"/>` +
          `<ellipse cx="79" cy="48" rx="6.5" ry="3.6" fill="#fb7185" opacity="0.55"/>` +
          `<path d="M50 39l11 7-11 9-11-9Z" fill="#f97316" stroke="#c2410c" stroke-width="1.6" stroke-linejoin="round"/>` +
          // the screen face, in the opposite colour to the shell
          `<rect x="18" y="56" width="64" height="26" rx="10" fill="${panel}" stroke="${panelEdge}" stroke-width="3.5"/>` +
          `<path d="M25 62c4-3 9-4 14-3" stroke="#ffffff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.8"/>` +
          `<circle cx="38" cy="67" r="7.6" fill="#ffffff" stroke="${panelInk}" stroke-width="1.2"/>` +
          `<circle cx="62" cy="67" r="7.6" fill="#ffffff" stroke="${panelInk}" stroke-width="1.2"/>` +
          `<circle cx="38.6" cy="68" r="4.4" fill="#111827"/><circle cx="61.4" cy="68" r="4.4" fill="#111827"/>` +
          `<circle cx="36.8" cy="66" r="1.6" fill="#ffffff"/><circle cx="59.6" cy="66" r="1.6" fill="#ffffff"/>` +
          `<path d="M50 73l7 5-7 6-7-6Z" fill="#f97316" stroke="#c2410c" stroke-width="1.4" stroke-linejoin="round"/>` +
          // the wattle sits between the beak and the screen, as on the sheet
          `<path d="M45 52c0 6 2 9 5 9s5-3 5-9Z" fill="${comb}" stroke="#9d174d" stroke-width="1.4"/>` +
          // and the little button on the bottom rim
          `<circle cx="50" cy="85" r="3.6" fill="${shellEdge}"/><circle cx="50" cy="85" r="1.6" fill="#4a2a10" opacity="0.7"/>`,
        face: null,
      };
    }

    // The common one: a fat glossy jack-o'-lantern with a brown stalk, three
    // lobes, and a face carved clean through so the candle shows.
    case "halloweenPumpkin":
      return {
        back: `<ellipse cx="50" cy="92" rx="30" ry="5" fill="#000" opacity="0.25"/>`,
        body:
          `<path d="M44 16c-1-6 0-11 3-13 3-1 7-1 10 1 3 2 4 7 3 12Z" fill="#7c3f21" stroke="#4a2410" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M46 14c1-4 2-7 4-8 2 0 4 1 5 3" stroke="#a16207" stroke-width="2" fill="none" opacity="0.7"/>` +
          `<rect x="11" y="15" width="78" height="73" rx="30" fill="${grad}" stroke="#9a3412" stroke-width="2.6"/>` +
          `<path d="M32 22c-6 10-8 24-8 33 0 14 3 24 8 30" stroke="#c2410c" stroke-width="3" fill="none" opacity="0.4"/>` +
          `<path d="M68 22c6 10 8 24 8 33 0 14-3 24-8 30" stroke="#c2410c" stroke-width="3" fill="none" opacity="0.4"/>` +
          `<path d="M22 26c9-6 19-8 28-8" stroke="#ffedd5" stroke-width="5" fill="none" opacity="0.35" stroke-linecap="round"/>`,
        front:
          `<path d="M22 38h18L30 55Z" fill="#ffe08a" stroke="#7c2d12" stroke-width="2.4" stroke-linejoin="round"/>` +
          `<path d="M78 38H60L70 55Z" fill="#ffe08a" stroke="#7c2d12" stroke-width="2.4" stroke-linejoin="round"/>` +
          `<path d="M50 54l6 9H44Z" fill="#ffe08a" stroke="#7c2d12" stroke-width="2.2" stroke-linejoin="round"/>` +
          `<path d="M22 64c4 15 14 21 28 21s24-6 28-21c-8 4-14 9-28 9s-20-5-28-9Z" fill="#ffe08a" stroke="#7c2d12" stroke-width="2.4" stroke-linejoin="round"/>` +
          `<path d="M33 68l4 7 4-7Z" fill="#7c2d12"/><path d="M46 70l4 7 4-7Z" fill="#7c2d12"/><path d="M59 68l4 7 4-7Z" fill="#7c2d12"/>`,
        face: null,
      };

    // The ghost cookie: a golden cookie shell with pale icing inside, a bite out
    // of the top corner, and closed happy eyes.
    case "cookieGhost":
      return {
        back: `<ellipse cx="50" cy="88" rx="28" ry="5" fill="#000" opacity="0.22"/>`,
        body:
          `<path d="M14 30c0-9 7-16 16-16h40c9 0 16 7 16 16v34c0 4-2 7-5 8-3 1-6 4-9 4s-5-3-8-3-5 3-8 3-5-2-8-2-5 2-8 2-6-3-8-3c-3 0-5-3-5-7Z" fill="#d9a05b" stroke="#a9540b" stroke-width="2.6" stroke-linejoin="round"/>` +
          `<path d="M20 31c0-6 5-11 11-11h38c6 0 11 5 11 11v28c0 3-2 5-4 5-3 1-6 4-9 4s-5-3-8-3-5 3-8 3-5-2-8-2-5 2-8 2-6-3-8-3c-3 0-4-2-4-5Z" fill="#c9ecfb" stroke="#87c8e8" stroke-width="1.8" stroke-linejoin="round"/>` +
          // the bite, showing the cookie underneath, plus crumbs
          `<path d="M20 30c0-5 4-10 9-11 3 1 5 4 5 7 0 4-3 8-7 9-3 1-5 0-6 2-1 1-1 1-1-7Z" fill="#d9a05b" stroke="#a9540b" stroke-width="2" stroke-linejoin="round"/>` +
          `<circle cx="40" cy="11" r="3" fill="#d9a05b"/><circle cx="50" cy="7" r="2" fill="#c98b46"/>` +
          `<path d="M26 44c5-4 12-4 16 1" stroke="#1e3a5f" stroke-width="5" fill="none" stroke-linecap="round"/>` +
          `<path d="M58 45c4-5 11-5 16-1" stroke="#1e3a5f" stroke-width="5" fill="none" stroke-linecap="round"/>` +
          `<path d="M42 56q8 8 16 0" stroke="#1e3a5f" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
        front:
          `<ellipse cx="28" cy="54" rx="6" ry="3.6" fill="#7dd3fc" opacity="0.55"/>` +
          `<ellipse cx="72" cy="54" rx="6" ry="3.6" fill="#7dd3fc" opacity="0.55"/>` +
          `<path d="M32 24c8-3 18-3 26 0" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.55" stroke-linecap="round"/>`,
        face: null,
      };

    // The cookie mummy: bandage wraps over a tan cookie, with a black band across
    // the eyes and two angry whites peering out of it.
    case "cookieMummy":
      return {
        back: `<ellipse cx="50" cy="90" rx="28" ry="5" fill="#000" opacity="0.22"/>`,
        body:
          `<rect x="10" y="16" width="80" height="70" rx="20" fill="#e8c9a3" stroke="#a9540b" stroke-width="2.6"/>` +
          `<rect x="14" y="20" width="72" height="62" rx="17" fill="none" stroke="#d9a05b" stroke-width="4" opacity="0.9"/>` +
          `<g fill="none" stroke-linecap="round">` +
          `<path d="M12 30c14 6 30 6 44 2s26-6 32-2" stroke="#f7ecd9" stroke-width="10"/>` +
          `<path d="M12 44c14 6 30 6 44 2s26-6 32-2" stroke="#e3cca9" stroke-width="10"/>` +
          `<path d="M12 62c14 6 30 6 44 2s26-6 32-2" stroke="#f7ecd9" stroke-width="10"/>` +
          `<path d="M12 76c14 6 30 6 44 2s26-6 32-2" stroke="#e3cca9" stroke-width="10"/>` +
          `</g>` +
          `<path d="M16 43h68v10c-14 5-54 5-68 0Z" fill="#14110d"/>`,
        front:
          `<path d="M27 45c5-3 11-1 13 4-4 4-10 4-13 0Z" fill="#ffffff"/>` +
          `<path d="M73 45c-5-3-11-1-13 4 4 4 10 4 13 0Z" fill="#ffffff"/>` +
          // two loose wraps lying over the band, so it reads as wrapped not painted
          `<path d="M12 40c14 6 30 6 44 2s26-6 32-2" stroke="#f7ecd9" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.85"/>` +
          `<path d="M12 57c14 6 30 6 44 2s26-6 32-2" stroke="#e3cca9" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.85"/>`,
        face: null,
      };

    // The cookie pumpkin: a jack-o'-lantern baked into a cookie, crust and all,
    // with a bite out of the bottom corner and the crumbs it left behind.
    case "cookiePumpkin":
      return {
        back: `<ellipse cx="50" cy="90" rx="27" ry="5" fill="#000" opacity="0.25"/>`,
        body:
          `<defs><mask id="${id}-bite"><rect x="0" y="0" width="100" height="100" fill="#ffffff"/><circle cx="94" cy="88" r="17" fill="#000000"/></mask></defs>` +
          `<circle cx="88" cy="80" r="3.2" fill="#d9a05b"/><circle cx="93" cy="70" r="2.2" fill="#c98b46"/><circle cx="82" cy="90" r="2.4" fill="#d9a05b"/>` +
          `<g mask="url(#${id}-bite)">` +
          `<rect x="10" y="12" width="80" height="76" rx="22" fill="${grad}" stroke="#b45309" stroke-width="2.6"/>` +
          `<rect x="15" y="17" width="70" height="66" rx="18" fill="none" stroke="#e0a860" stroke-width="6"/>` +
          `<rect x="15" y="17" width="70" height="66" rx="18" fill="none" stroke="#b45309" stroke-width="1.4" opacity="0.5"/>` +
          `<path d="M20 36c4-7 13-7 17 0-1 7-5 11-8.5 11S21 43 20 36Z" fill="#180f06"/>` +
          `<path d="M80 36c-4-7-13-7-17 0 1 7 5 11 8.5 11S79 43 80 36Z" fill="#180f06"/>` +
          `<path d="M50 44l5 8H45Z" fill="#180f06"/>` +
          `<path d="M22 58c4 13 13 19 28 19s24-6 28-19c-8 4-14 9-28 9s-20-5-28-9Z" fill="#180f06"/>` +
          `<path d="M33 63l4 7 4-7Z" fill="#e6a94f"/><path d="M46 65l4 7 4-7Z" fill="#e6a94f"/><path d="M59 63l4 7 4-7Z" fill="#e6a94f"/>` +
          `</g>`,
        front:
          `<path d="M50 12c-1-6 1-9 4-10 1 4 1 7-1 10Z" fill="#22c55e" stroke="#15803d" stroke-width="1.4" stroke-linejoin="round"/>` +
          `<path d="M49 12c-5-4-10-3-13 1 5 2 9 2 13-1Z" fill="#22c55e" stroke="#15803d" stroke-width="1.4" stroke-linejoin="round"/>` +
          `<path d="M53 12c5-4 10-3 13 1-5 2-9 2-13-1Z" fill="#22c55e" stroke="#15803d" stroke-width="1.4" stroke-linejoin="round"/>`,
        face: null,
      };

    // The Pumpkin King: a crowned jack-o'-lantern sitting in an open treasure
    // chest, bat wings behind it, green slime boiling over the rim and two claws
    // holding the lid.
    case "pumpkinKing":
      return {
        back:
          `<path d="M30 30C18 18 6 17 2 25c-3 8 6 16 14 17 4 1 8 2 12 1Z" fill="#17131d" stroke="#000000" stroke-width="1.6"/>` +
          `<path d="M70 30c12-12 24-13 28-5 3 8-6 16-14 17-4 1-8 2-12 1Z" fill="#17131d" stroke="#000000" stroke-width="1.6"/>` +
          `<rect x="13" y="48" width="74" height="26" rx="9" fill="#3b3b78" stroke="#1d1b3a" stroke-width="2.4"/>`,
        body:
          `<rect x="28" y="25" width="44" height="37" rx="11" fill="${grad}" stroke="#9a3412" stroke-width="2.4"/>` +
          `<path d="M39 27c-3 9-3 23 0 33" stroke="#c2410c" stroke-width="2" fill="none" opacity="0.5"/>` +
          `<path d="M61 27c3 9 3 23 0 33" stroke="#c2410c" stroke-width="2" fill="none" opacity="0.5"/>`,
        front:
          // crown
          `<path d="M34 22 L36 7 L43 14 L50 3 L57 14 L64 7 L66 22Z" fill="#fbbf24" stroke="#b45309" stroke-width="2" stroke-linejoin="round"/>` +
          `<circle cx="50" cy="15" r="2.4" fill="#ef4444"/>` +
          // carved face
          `<path d="M33 33l10-1 2 8-9 3Z" fill="#1a0f06"/>` +
          `<path d="M67 33l-10-1-2 8 9 3Z" fill="#1a0f06"/>` +
          `<path d="M42 45c4 5 12 5 16 0-2 7-4 9-8 9s-6-2-8-9Z" fill="#1a0f06"/>` +
          // slime over the chest rim
          `<path d="M24 55c4-4 10-4 13 0 3-4 9-4 13 0 4-4 10-4 13 0 3 3 2 7-2 8H26c-4-1-5-5-2-8Z" fill="#34d399" stroke="#059669" stroke-width="1.8" stroke-linejoin="round"/>` +
          // chest
          `<rect x="12" y="60" width="76" height="28" rx="8" fill="#2b2b55" stroke="#151430" stroke-width="2.4"/>` +
          `<rect x="12" y="60" width="76" height="9" rx="4" fill="#41417f"/>` +
          `<rect x="43" y="66" width="14" height="13" rx="3" fill="#fbbf24" stroke="#b45309" stroke-width="1.6"/>` +
          `<path d="M50 79v7" stroke="#b45309" stroke-width="2.4"/>` +
          `<circle cx="22" cy="80" r="3" fill="#232348" opacity="0.8"/><circle cx="78" cy="78" r="2.4" fill="#232348" opacity="0.8"/>` +
          // claws gripping the rim
          `<g fill="#0d0b14">` +
          `<path d="M24 58c-3 3-4 7-2 10 2-3 4-5 8-5-3-2-5-3-6-5Z"/>` +
          `<path d="M31 57c-3 3-4 7-2 11 2-3 4-6 8-6-3-2-5-3-6-5Z"/>` +
          `<path d="M38 57c-2 3-3 7-1 10 2-3 4-5 7-6Z"/>` +
          `<path d="M76 58c3 3 4 7 2 10-2-3-4-5-8-5 3-2 5-3 6-5Z"/>` +
          `<path d="M69 57c3 3 4 7 2 11-2-3-4-6-8-6 3-2 5-3 6-5Z"/>` +
          `<path d="M62 57c2 3 3 7 1 10-2-3-4-5-7-6Z"/>` +
          `</g>`,
        face: null,
      };

    // ── Gamerpaketet ────────────────────────────────────────────────────────
    // The alien is drawn on the 11×8 grid the arcade sprite actually uses, so it
    // is chunky on purpose and identical at every size. Cell size is fixed, not
    // scaled to fit, so the four pixels between the antennae stay four pixels.
    case "invader":
      return {
        back: `<rect x="5" y="7" width="90" height="86" rx="23" fill="none" stroke="#7cf03a" stroke-width="1.6" opacity="0.3"/>`,
        body: pixelRows(
          [
            "..X.....X..",
            "...X...X...",
            "..XXXXXXX..",
            ".XX.XXX.XX.",
            "XXXXXXXXXXX",
            "X.XXXXXXX.X",
            "X.X.....X.X",
            "...XX.XX...",
          ],
          { X: "#7cf03a" },
          { x: 11.5, y: 22, cell: 7 }
        ),
        front: "",
        face: null,
        ornament: true,
      };

    // The Crewmate is a clean vector bean, not a bitmap: the sheet draws it
    // smooth, so it gets a curved body, a glossy visor and a little backpack.
    case "crewmate":
      return {
        back: `<rect x="60" y="43" width="20" height="30" rx="8" fill="#8f1d24" stroke="#4a0a0f" stroke-width="2.4"/>`,
        body:
          `<path d="M50 12c-15 0-24 10-24 25v29c0 5 3 8 8 8h32c5 0 8-3 8-8V37c0-15-9-25-24-25Z" fill="${grad}" stroke="#4a0a0f" stroke-width="2.6"/>` +
          `<rect x="34" y="64" width="14" height="23" rx="6" fill="${grad}" stroke="#4a0a0f" stroke-width="2.6"/>` +
          `<rect x="52" y="64" width="14" height="23" rx="6" fill="${grad}" stroke="#4a0a0f" stroke-width="2.6"/>`,
        front:
          `<path d="M33 22c4-6 9-9 15-10" stroke="#ff9a9a" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.5"/>` +
          `<rect x="36" y="30" width="34" height="24" rx="11" fill="#b8e6fb" stroke="#3d7f9e" stroke-width="2.2"/>` +
          `<path d="M42 35c7-2 15-2 22 0" stroke="#ffffff" stroke-width="3.4" fill="none" stroke-linecap="round" opacity="0.85"/>` +
          `<rect x="43" y="36" width="10" height="6" rx="3" fill="#ffffff" opacity="0.9"/>`,
        face: null,
      };

    // Chubby Pig — the round green one from the sheet: ear flaps, heavy lids,
    // a big light snout and a smirk.
    case "chubbypig":
      return {
        back: "",
        body:
          `<path d="M50 15c-10 0-18 3-24 9-6 6-9 16-9 27v13c0 13 8 21 33 21s33-8 33-21V51c0-11-3-21-9-27-6-6-14-9-24-9Z" fill="${grad}" stroke="#2f6b18" stroke-width="2.6"/>` +
          `<path d="M31 23c-2-8-6-12-12-13 1 8 4 13 9 16Z" fill="#6ecb3f" stroke="#2f6b18" stroke-width="2.2" stroke-linejoin="round"/>` +
          `<path d="M69 23c2-8 6-12 12-13-1 8-4 13-9 16Z" fill="#6ecb3f" stroke="#2f6b18" stroke-width="2.2" stroke-linejoin="round"/>`,
        front:
          `<path d="M27 24c-1-4-3-7-6-8 1 4 2 7 5 9Z" fill="#8fd94f"/><path d="M73 24c1-4 3-7 6-8-1 4-2 7-5 9Z" fill="#8fd94f"/>` +
          // heavy lids give the sheet's grumpy look
          `<path d="M28 44c4-3 9-3 12 1" stroke="#2f6b18" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
          `<path d="M60 45c3-4 8-4 12-1" stroke="#2f6b18" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
          `<ellipse cx="36" cy="51" rx="7.4" ry="8.2" fill="#ffffff" stroke="#2f6b18" stroke-width="1.8"/>` +
          `<ellipse cx="64" cy="51" rx="7.4" ry="8.2" fill="#ffffff" stroke="#2f6b18" stroke-width="1.8"/>` +
          `<circle cx="37" cy="52" r="4.2" fill="#15230f"/><circle cx="63" cy="52" r="4.2" fill="#15230f"/>` +
          `<circle cx="35.5" cy="50" r="1.4" fill="#ffffff"/><circle cx="61.5" cy="50" r="1.4" fill="#ffffff"/>` +
          `<ellipse cx="50" cy="64" rx="17" ry="12" fill="#8fd94f" stroke="#2f6b18" stroke-width="2"/>` +
          `<ellipse cx="44" cy="64" rx="2.6" ry="3.4" fill="#2f6b18"/><ellipse cx="56" cy="64" rx="2.6" ry="3.4" fill="#2f6b18"/>` +
          `<path d="M31 76c6 6 12 9 19 9s13-3 19-9" stroke="#2f6b18" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
        face: null,
      };

    // The Creeper is the only character that really is a block: an 8×8 face on
    // a nine-pixel grid, mottled with two greens instead of noise.
    case "creeper":
      return {
        back: "",
        body: pixelRows(
          [
            "GHGHGGHG",
            "GBBGGBBG",
            "GBBGGBBG",
            "HGGHGGHG",
            "GGGBBGGG",
            "GGBBBBGG",
            "GGBBBBGG",
            "HGGHBGGH",
          ],
          { G: "#57c33f", H: "#4ba834", B: "#0e2a0e" },
          { x: 19, y: 19, cell: 7.75 }
        ),
        front: `<rect x="19" y="19" width="62" height="62" fill="none" stroke="#0e2a0e" stroke-width="1.4" opacity="0.5"/>`,
        face: null,
      };

    // Pixel Thorne — the secret: a spiked shadow with a neon grin, on a black
    // board with a pink neon frame and purple pixel spray.
    case "pixelthorne": {
      const spikes: string[] = [];
      const radii = [34, 25, 33, 23, 35, 26, 32, 22, 34, 24, 35, 25, 33, 23, 34, 26, 32, 24, 35, 25];
      radii.forEach((r, i) => {
        const a = (i / radii.length) * Math.PI * 2 - Math.PI / 2;
        const x = 50 + Math.cos(a) * r;
        const y = 51 + Math.sin(a) * r;
        spikes.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
      });
      return {
        back:
          `<g>${pixelNoise(20, 5, ["#a855f7", "#7e22ce", "#c084fc"])}</g>` +
          `<rect x="8" y="8" width="84" height="84" rx="3" fill="none" stroke="#ff2fd0" stroke-width="2.6"/>` +
          `<rect x="11" y="11" width="78" height="78" rx="2" fill="none" stroke="#ff2fd0" stroke-width="1" opacity="0.6"/>` +
          `<rect x="8" y="8" width="84" height="84" rx="3" fill="none" stroke="#ff2fd0" stroke-width="6" opacity="0.18"/>`,
        body:
          `<path d="${spikes.join(" ")}Z" fill="#0f0a16" stroke="#3b1157" stroke-width="1.6" stroke-linejoin="round"/>`,
        front:
          `<path d="M36 38l9-4-2 8-7-1Z" fill="#5cf53c"/><path d="M64 38l-9-4 2 8 7-1Z" fill="#5cf53c"/>` +
          `<path d="M33 55h34l-6 7-5-4-5 5-5-5-5 4Z" fill="#5cf53c"/>`,
        face: null,
        ornament: true,
      };
    }

    case "chroma":
      return { back: "", body: "", front: "" };
  }
}

/* ── The renderer ────────────────────────────────────────────────────────── */

/**
 * The character alone: everything that is drawn on the plate, in back, body and
 * front order.
 *
 * Split out of the card renderer so the minigame can draw the same character on
 * a round runner token instead of a square card — one drawing, two frames, and
 * no second copy of the art to keep in step.
 */
type Parts = { back: string; body: string; front: string; backIsPlate: boolean };

function characterParts(recipe: Recipe, c: Colors, id: string): Parts {
  const built = buildBody(recipe, id, c);
  const extras = buildExtras(recipe.extras ?? [], c);
  // Chroma Keens are drawn like everyone else — only the plate changes — so they
  // fall through to the generic parts instead of a hand-drawn character.
  const custom = recipe.custom && recipe.custom !== "chroma" ? customArt(recipe.custom, id, c) : null;
  const face = { ...built.face, ...(custom?.face ?? {}), ...(recipe.face ?? {}) };
  const faceMarkup =
    custom?.face === null ? "" : regularFace(face, recipe.eyes ?? "big", recipe.mouth ?? "smile", c.line);

  return {
    back: (custom ? custom.back : "") + extras.back,
    body: custom ? custom.body : built.body,
    front: (custom ? custom.front : "") + extras.front + faceMarkup,
    backIsPlate: Boolean(custom?.ornament),
  };
}

export function keenArtSvg(keen: ArtKeen, opts: { locked?: boolean; size?: number } = {}): string {
  const id = `k${keen.id.replace(/[^a-z0-9]/gi, "")}`;
  const recipe = RECIPES[keen.id] ?? DEFAULT_RECIPE;
  const c = colorsFor(keen.hue, recipe.colors);
  // The plate and the light behind the character are part of each Keen's art
  // direction, not a shared violet tile that fights whatever is drawn on it.
  const plate = recipe.plate ?? VIOLET_PLATE;
  const glow = plate.glow ?? hsl(keen.hue, 95, 62);
  const label = escapeXml(keen.name);
  // Inline in React the drawing fills its box; as a data URI it needs real
  // pixel dimensions, because an `<img>` cannot resolve `100%` on its own.
  const dims = opts.size ? `width="${opts.size}" height="${opts.size}"` : 'width="100%" height="100%"';

  // A locked Keen is a mystery: same plate, same silhouette, no character.
  if (opts.locked) {
    return (
      `<svg ${NS} viewBox="0 0 100 100" ${dims} role="img" aria-label="Låst Keen">` +
      `<defs><linearGradient id="${id}-lt" x1="0" y1="0" x2="0.4" y2="1">` +
      `<stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#0b1120"/>` +
      `</linearGradient></defs>` +
      `<rect x="3" y="3" width="94" height="94" rx="25" fill="url(#${id}-lt)"/>` +
      `<ellipse cx="50" cy="64" rx="22" ry="24" fill="#334155"/>` +
      `<circle cx="34" cy="20" r="4" fill="#334155"/><circle cx="66" cy="20" r="4" fill="#334155"/>` +
      `<text x="50" y="72" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" font-weight="800" fill="#64748b">?</text>` +
      `<rect x="3" y="3" width="94" height="94" rx="25" fill="none" stroke="#334155" stroke-width="1.5"/>` +
      `</svg>`
    );
  }

  const parts = characterParts(recipe, c, id);

  const chroma = recipe.custom === "chroma"
    ? `<rect x="3" y="3" width="94" height="94" fill="url(#${id}-chroma)" opacity="0.92"/>`
    : "";

  return (
    `<svg ${NS} viewBox="0 0 100 100" ${dims} role="img" aria-label="${label}">` +
    `<defs>` +
    `<linearGradient id="${id}-tile" x1="0.15" y1="0" x2="0.75" y2="1">` +
    `<stop offset="0" stop-color="${plate.from}"/>` +
    `<stop offset="1" stop-color="${plate.to}"/>` +
    `</linearGradient>` +
    `<radialGradient id="${id}-tilegloss" cx="0.28" cy="0.12" r="0.62">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0.34"/>` +
    `<stop offset="0.65" stop-color="#ffffff" stop-opacity="0.05"/>` +
    `<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<radialGradient id="${id}-glow" cx="0.5" cy="0.55" r="0.62">` +
    `<stop offset="0" stop-color="${glow}" stop-opacity="0.5"/>` +
    `<stop offset="0.7" stop-color="${glow}" stop-opacity="0.12"/>` +
    `<stop offset="1" stop-color="${glow}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<linearGradient id="${id}-body" x1="0.2" y1="0" x2="0.75" y2="1">` +
    `<stop offset="0" stop-color="${c.light}"/>` +
    `<stop offset="0.45" stop-color="${c.base}"/>` +
    `<stop offset="1" stop-color="${c.dark}"/>` +
    `</linearGradient>` +
    `<linearGradient id="${id}-chroma" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#ff5cf0"/><stop offset="0.25" stop-color="#5ce1ff"/>` +
    `<stop offset="0.5" stop-color="#a3ff5c"/><stop offset="0.75" stop-color="#ffd25c"/>` +
    `<stop offset="1" stop-color="#ff5cf0"/>` +
    `</linearGradient>` +
    `<clipPath id="${id}-clip"><rect x="3" y="3" width="94" height="94" rx="25"/></clipPath>` +
    `</defs>` +
    `<rect x="3" y="3" width="94" height="94" rx="25" fill="url(#${id}-tile)"/>` +
    `<g clip-path="url(#${id}-clip)">` +
    chroma +
    `<ellipse cx="50" cy="52" rx="47" ry="45" fill="url(#${id}-glow)"/>` +
    `<path d="M6 88 q22 -16 44 0 t44 -4 v14 H6 Z" fill="#000" opacity="0.18"/>` +
    parts.back +
    parts.body +
    parts.front +
    (recipe.noGloss ? "" : `<rect x="3" y="3" width="94" height="94" fill="url(#${id}-tilegloss)"/>`) +
    `</g>` +
    `<rect x="3" y="3" width="94" height="94" rx="25" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.4"/>` +
    `</svg>`
  );
}

/**
 * The minigame's runner token.
 *
 * The card is a stamp: a square plate with a character printed on it. At 60 px
 * in a scrolling lobby that reads as a coloured blob, and the Admin dragon was
 * the worst of them. So the runner drops the plate for a round token in the
 * Keen's own colour, lifts the character to fill the frame and keeps a dark rim —
 * the same trick a game avatar uses, and the character stays the same drawing.
 */
export function keenRunnerSvg(keen: ArtKeen, opts: { size?: number } = {}): string {
  const id = `r${keen.id.replace(/[^a-z0-9]/gi, "")}`;
  const recipe = RECIPES[keen.id] ?? DEFAULT_RECIPE;
  const c = colorsFor(keen.hue, recipe.colors);
  const parts = characterParts(recipe, c, id);
  const dims = opts.size ? `width="${opts.size}" height="${opts.size}"` : 'width="100%" height="100%"';
  const rim = recipe.plate?.glow ?? hsl(keen.hue, 90, 62);

  return (
    `<svg ${NS} viewBox="0 0 100 100" ${dims} role="img" aria-label="${escapeXml(keen.name)}">` +
    `<defs>` +
    // The token is only lightly tinted by the Keen's hue: a strongly coloured
    // backdrop swallowed the brighter characters (a lime alien on a lime disc).
    `<linearGradient id="${id}-bg" x1="0.2" y1="0" x2="0.85" y2="1">` +
    `<stop offset="0" stop-color="${hsl(keen.hue, 24, 22)}"/>` +
    `<stop offset="1" stop-color="${hsl(keen.hue, 34, 8)}"/>` +
    `</linearGradient>` +
    `<clipPath id="${id}-clip"><circle cx="50" cy="50" r="46"/></clipPath>` +
    // The character paints itself with this gradient, so the runner has to
    // define it too — without it every runner rendered with no body at all.
    `<linearGradient id="${id}-body" x1="0.2" y1="0" x2="0.75" y2="1">` +
    `<stop offset="0" stop-color="${c.light}"/>` +
    `<stop offset="0.45" stop-color="${c.base}"/>` +
    `<stop offset="1" stop-color="${c.dark}"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<circle cx="50" cy="50" r="46" fill="url(#${id}-bg)"/>` +
    `<g clip-path="url(#${id}-clip)">` +
    `<circle cx="50" cy="62" r="40" fill="${rim}" opacity="0.2"/>` +
    `<g transform="translate(50 49) scale(1.12) translate(-50 -49)">` +
    (parts.backIsPlate ? "" : parts.back) +
    parts.body +
    parts.front +
    `</g>` +
    `</g>` +
    `<circle cx="50" cy="50" r="46" fill="none" stroke="#0b1120" stroke-width="3"/>` +
    `<circle cx="50" cy="50" r="44" fill="none" stroke="#ffffff" stroke-opacity="0.24" stroke-width="1.6"/>` +
    `</svg>`
  );
}

function regularFace(
  at: { cx: number; cy: number; gap: number; r: number; mouthY: number },
  eyes: Eyes,
  mouth: Mouth,
  line: string
): string {
  const blush =
    `<ellipse cx="${at.cx - at.gap - at.r * 1.5}" cy="${at.cy + at.r * 1.25}" rx="${at.r * 0.8}" ry="${at.r * 0.5}" fill="#fb7185" opacity="0.35"/>` +
    `<ellipse cx="${at.cx + at.gap + at.r * 1.5}" cy="${at.cy + at.r * 1.25}" rx="${at.r * 0.8}" ry="${at.r * 0.5}" fill="#fb7185" opacity="0.35"/>`;

  if (at.r <= 0) return "";
  return (
    eyePair(eyes, at.cx, at.cy, at.gap, at.r) +
    mouthShape(mouth, at.cx, at.mouthY, 16, line) +
    blush
  );
}

/**
 * The same drawing, as a data URI — what Phaser turns into a texture.
 *
 * 256 px is four times the biggest size the minigame draws a runner at, so the
 * downscale is smooth instead of crunchy.
 */
export function keenArtDataUri(keen: ArtKeen, size = 256): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(keenArtSvg(keen, { size }))}`;
}

/** The round runner token, as a data URI — what the minigame rasterises. */
export function keenRunnerDataUri(keen: ArtKeen, size = 128): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(keenRunnerSvg(keen, { size }))}`;
}

/** Ids with a hand-drawn recipe worth checking in the sprite test script. */
export const ART_KEENS: string[] = Object.keys(RECIPES);
