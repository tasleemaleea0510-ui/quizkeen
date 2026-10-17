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

import { KEEN_SPRITES } from "./keen-sprites";

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

type Recipe = {
  shape: Shape;
  eyes?: Eyes;
  mouth?: Mouth;
  extras?: Extra[];
  /** Object Keens keep their own colours rather than their hue. */
  colors?: Partial<Colors>;
  /** Hand-drawn in `CUSTOM` instead of the generic parts. */
  custom?: Custom;
  /** Gamer pack: the bitmap in `lib/keen-sprites.ts` is the artwork. */
  pixel?: boolean;
  /** Override the face position for tall or wide silhouettes. */
  face?: { cx?: number; cy?: number; gap?: number; r?: number; mouth?: number };
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
  invader: { shape: "blob", pixel: true },
  crewmate: { shape: "blob", pixel: true },
  chubbypig: { shape: "blob", pixel: true },
  creeper: { shape: "blob", pixel: true },
  pixelthorne: { shape: "blob", pixel: true },

  // ── Halloweenpaketet ───────────────────────────────────────────────────────
  pumpkin: { shape: "pumpkin", custom: "halloweenPumpkin" },
  chickenchick: { shape: "cube", custom: "chickCube" },
  chickchicken: { shape: "cube", custom: "chickenCube" },
  frogula: { shape: "wide", custom: "frogula" },
  cookiepumpkin: { shape: "pumpkin", custom: "cookiePumpkin" },
  cookiemummy: { shape: "blob", custom: "cookieMummy" },
  cookieghost: { shape: "ghost", custom: "cookieGhost" },
  pumpkinking: { shape: "pumpkin", custom: "pumpkinKing" },

  // ── Admin ──────────────────────────────────────────────────────────────────
  omeisaurus: { shape: "blob", custom: "omeisaurus", noGloss: true },
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

function pixelLayer(id: string): string | null {
  const sprite = KEEN_SPRITES[id];
  if (!sprite) return null;
  const cols = Math.max(...sprite.rows.map((r) => r.length));
  const rows = sprite.rows.length;
  const box = 56;
  const scale = Math.floor(box / Math.max(cols, rows)) || 1;
  const w = cols * scale;
  const h = rows * scale;
  const ox = (100 - w) / 2;
  const oy = (100 - h) / 2 + 2;

  let out = "";
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const letter = row[x];
      const fill = sprite.palette[letter];
      if (!fill) {
        x += 1;
        continue;
      }
      let run = 1;
      while (x + run < row.length && row[x + run] === letter) run += 1;
      out += `<rect x="${ox + x * scale}" y="${oy + y * scale}" width="${run * scale}" height="${scale}" fill="${fill}"/>`;
      x += run;
    }
  });
  return out;
}

/* ── Hand-drawn characters ───────────────────────────────────────────────── */

function customArt(kind: Custom, id: string, c: Colors): { back: string; body: string; front: string; face?: Built["face"] } {
  const grad = `url(#${id}-body)`;

  switch (kind) {
    // The admin dragon: red scale plates, gold curls, small fangs, purple plate.
    case "omeisaurus":
      return {
        back: `<ellipse cx="50" cy="92" rx="34" ry="7" fill="#000" opacity="0.25"/>`,
        body:
          `<path d="M18 44 q0 -22 22 -26 q-6 14 4 22 q6 -18 24 -18 q22 0 22 22 q0 10 -6 16 q8 6 4 16 q-4 10 -18 12 q-6 -8 -18 -8 q-12 0 -18 8 q-14 -2 -18 -12 q-4 -10 4 -16 q-6 -6 -6 -16 Z" fill="${grad}" stroke="#7f1d1d" stroke-width="2.4" stroke-linejoin="round"/>` +
          `<path d="M24 46 q8 6 4 16 M76 46 q-8 6 -4 16" stroke="#fbbf24" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
          `<path d="M30 34 q8 2 10 10 q-8 2 -10 -10 Z" fill="#fbbf24"/><path d="M70 34 q-8 2 -10 10 q8 2 10 -10 Z" fill="#fbbf24"/>` +
          `<path d="M40 70 q10 6 20 0" stroke="#fbbf24" stroke-width="2.2" fill="none"/>` +
          `<path d="M30 76 q6 8 4 14 M70 76 q-6 8 -4 14" stroke="#fbbf24" stroke-width="2" fill="none" opacity="0.85"/>`,
        front:
          `<path d="M36 26 l-6 -12 l10 6 Z" fill="#fef3c7" stroke="#92400e" stroke-width="1.8"/>` +
          `<path d="M64 26 l6 -12 l-10 6 Z" fill="#fef3c7" stroke="#92400e" stroke-width="1.8"/>` +
          `<path d="M43 76 l2 7 l3 -7 Z" fill="#ffffff"/><path d="M52 76 l2 7 l3 -7 Z" fill="#ffffff" clip-rule="evenodd"/>`,
        face: { cx: 50, cy: 52, gap: 14, r: 10, mouthY: 70 },
      };

    // Vampire frog: green frog head, black bat wings, red cape, bow tie, full moon.
    case "frogula":
      return {
        back:
          `<circle cx="22" cy="24" r="13" fill="#fde68a" opacity="0.9"/><circle cx="27" cy="20" r="12" fill="#3b1d6e" opacity="0.85"/>` +
          `<path d="M20 44 q-18 2 -17 20 q6 12 18 10 q-8 -16 -1 -30 Z" fill="#1b1030" stroke="#0b0618" stroke-width="1.6"/>` +
          `<path d="M80 44 q18 2 17 20 q-6 12 -18 10 q8 -16 1 -30 Z" fill="#1b1030" stroke="#0b0618" stroke-width="1.6"/>` +
          `<path d="M22 50 q28 -14 56 0 q8 26 -2 36 q-26 -8 -52 0 q-10 -10 -2 -36 Z" fill="#b91c1c" stroke="#7f1d1d" stroke-width="2"/>`,
        body:
          `<ellipse cx="33" cy="40" rx="13" ry="12" fill="${grad}" stroke="#14532d" stroke-width="2.2"/>` +
          `<ellipse cx="67" cy="40" rx="13" ry="12" fill="${grad}" stroke="#14532d" stroke-width="2.2"/>` +
          `<path d="M20 56 q0 -22 30 -22 q30 0 30 22 q0 24 -30 24 q-30 0 -30 -24 Z" fill="${grad}" stroke="#14532d" stroke-width="2.4"/>` +
          `<path d="M30 40 q6 6 12 2" stroke="#14532d" stroke-width="2" fill="none" opacity="0.5"/>` +
          `<ellipse cx="50" cy="76" rx="16" ry="7" fill="#dcfce7" opacity="0.55"/>`,
        front:
          `<path d="M35 66 l-13 -6 v12 Z" fill="#0b0618"/><path d="M65 66 l13 -6 v12 Z" fill="#0b0618"/>` +
          `<circle cx="50" cy="66" r="4.6" fill="#f59e0b"/>` +
          `<path d="M38 82 l2 8 l3 -8 Z" fill="#ffffff"/><path d="M50 82 l2 8 l3 -8 Z" fill="#ffffff"/>`,
        face: { cx: 50, cy: 54, gap: 14, r: 9.5, mouthY: 76 },
      };

    // The two "Kuben" birds: a yellow frame with a screen-like second face.
    case "chickCube":
    case "chickenCube": {
      const hen = kind === "chickenCube";
      return {
        back: `<ellipse cx="50" cy="88" rx="30" ry="6" fill="#000" opacity="0.22"/>`,
        body:
          `<rect x="15" y="15" width="70" height="70" rx="24" fill="${hen ? "#f59e0b" : "#fde047"}" stroke="#b45309" stroke-width="2.6"/>` +
          `<rect x="22" y="34" width="56" height="46" rx="17" fill="#7dd3fc" stroke="#0369a1" stroke-width="2.4"/>` +
          `<ellipse cx="36" cy="24" rx="9" ry="10" fill="#ffffff" stroke="#b45309" stroke-width="1.4"/>` +
          `<ellipse cx="64" cy="24" rx="9" ry="10" fill="#ffffff" stroke="#b45309" stroke-width="1.4"/>` +
          `<circle cx="37" cy="26" r="4.6" fill="#111827"/><circle cx="63" cy="26" r="4.6" fill="#111827"/>` +
          `<circle cx="35.5" cy="24" r="1.7" fill="#ffffff"/><circle cx="61.5" cy="24" r="1.7" fill="#ffffff"/>` +
          `<path d="M46 15 q4 -11 12 -8 q-3 8 -12 8 Z" fill="${hen ? "#fbbf24" : "#fde047"}" stroke="#b45309" stroke-width="1.6"/>` +
          `<path d="M31 44 q19 -6 38 0" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.55"/>`,
        front:
          `<circle cx="50" cy="16" r="4.6" fill="${hen ? "#dc2626" : "#f472b6"}" stroke="#9d174d" stroke-width="1.2"/>` +
          `<path d="M28 50 q4 10 0 16" stroke="#0369a1" stroke-width="2" fill="none" opacity="0.4"/>` +
          `<path d="M72 50 q-4 10 0 16" stroke="#0369a1" stroke-width="2" fill="none" opacity="0.4"/>`,
        face: { cx: 50, cy: 50, gap: 13, r: 8.5, mouthY: 68 },
      };
    }

    case "halloweenPumpkin":
      return {
        back: "",
        body:
          `<ellipse cx="50" cy="58" rx="32" ry="27" fill="${grad}" stroke="#7c2d12" stroke-width="2.6"/>` +
          `<ellipse cx="32" cy="58" rx="13" ry="25" fill="#9a3412" opacity="0.35"/>` +
          `<ellipse cx="68" cy="58" rx="13" ry="25" fill="#9a3412" opacity="0.35"/>` +
          `<path d="M50 31 q5 -12 -2 -17" stroke="#166534" stroke-width="5" fill="none" stroke-linecap="round"/>`,
        front:
          `<path d="M50 66 q-14 16 -6 20 q8 3 12 -12 q4 15 12 12 q8 -4 -6 -20 Z" fill="#fde68a" opacity="0.9"/>`,
        face: { cx: 50, cy: 58, gap: 14, r: 10, mouthY: 78 },
      };

    case "cookieGhost":
      return {
        back: "",
        body: `<path d="M24 46 a26 26 0 0 1 52 0 V86 q-7 -7 -13 0 t-13 0 t-13 0 t-13 0 Z" fill="${grad}" stroke="#78350f" stroke-width="2.4" stroke-linejoin="round"/>`,
        front: `<circle cx="32" cy="38" r="4" fill="#78350f" opacity="0.45"/><circle cx="64" cy="36" r="3.4" fill="#78350f" opacity="0.45"/><circle cx="70" cy="62" r="4" fill="#78350f" opacity="0.45"/><circle cx="26" cy="64" r="3" fill="#78350f" opacity="0.45"/>`,
        face: { cx: 50, cy: 52, gap: 12, r: 9, mouthY: 68 },
      };

    case "cookieMummy":
      return {
        back: "",
        body:
          `<rect x="18" y="26" width="64" height="60" rx="26" fill="${grad}" stroke="#78350f" stroke-width="2.4"/>` +
          `<path d="M18 44 q16 6 32 0 t32 4 M18 58 q16 6 32 0 t32 4 M18 72 q16 6 32 0 t32 4" stroke="#fef3c7" stroke-width="4" fill="none" opacity="0.65"/>`,
        front: "",
        face: { cx: 50, cy: 50, gap: 12, r: 9, mouthY: 68 },
      };

    case "cookiePumpkin":
      return {
        back: "",
        body:
          `<ellipse cx="50" cy="56" rx="31" ry="27" fill="${grad}" stroke="#78350f" stroke-width="2.6"/>` +
          `<circle cx="30" cy="44" r="4" fill="#78350f" opacity="0.5"/><circle cx="70" cy="42" r="3.4" fill="#78350f" opacity="0.5"/><circle cx="66" cy="66" r="3.6" fill="#78350f" opacity="0.5"/>` +
          `<path d="M50 29 q5 -10 -1 -15" stroke="#166534" stroke-width="5" fill="none" stroke-linecap="round"/>`,
        front: "",
        face: { cx: 50, cy: 56, gap: 13, r: 9, mouthY: 72 },
      };

    case "pumpkinKing":
      return {
        back: `<path d="M20 44 q28 -12 60 0 q10 28 -4 40 q-26 -8 -52 0 q-14 -12 -4 -40 Z" fill="#4c1d95" stroke="#2e1065" stroke-width="2"/>`,
        body:
          `<ellipse cx="50" cy="58" rx="30" ry="26" fill="${grad}" stroke="#7c2d12" stroke-width="2.6"/>` +
          `<ellipse cx="33" cy="58" rx="12" ry="24" fill="#7c2d12" opacity="0.32"/>` +
          `<ellipse cx="67" cy="58" rx="12" ry="24" fill="#7c2d12" opacity="0.32"/>`,
        front:
          `<path d="M34 34 L36 18 L45 26 L50 13 L55 26 L64 18 L66 34 Z" fill="#fbbf24" stroke="#b45309" stroke-width="2" stroke-linejoin="round"/>` +
          `<circle cx="50" cy="29" r="3" fill="#ef4444"/>` +
          `<path d="M50 70 q-12 12 -5 16 q7 3 10 -10 q3 13 10 10 q7 -4 -5 -16 Z" fill="#fde68a" opacity="0.9"/>`,
        face: { cx: 50, cy: 58, gap: 14, r: 10, mouthY: 80 },
      };

    case "chroma":
      return { back: "", body: "", front: "" };
  }
}

/* ── The renderer ────────────────────────────────────────────────────────── */

export function keenArtSvg(keen: ArtKeen, opts: { locked?: boolean; size?: number } = {}): string {
  const id = `k${keen.id.replace(/[^a-z0-9]/gi, "")}`;
  const recipe = RECIPES[keen.id] ?? DEFAULT_RECIPE;
  const c = colorsFor(keen.hue, recipe.colors);
  // Every plate is the same deep violet, with the Keen's own colour glowing
  // behind it — one designed set instead of seventy unrelated backgrounds.
  const tileHue = 262;
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

  const built = buildBody(recipe, id, c);
  const extras = buildExtras(recipe.extras ?? [], c);
  // Chroma Keens are drawn like everyone else — only the plate changes — so they
  // fall through to the generic parts instead of a hand-drawn character.
  const custom = recipe.custom && recipe.custom !== "chroma" ? customArt(recipe.custom, id, c) : null;
  const face = { ...built.face, ...(custom?.face ?? {}), ...(recipe.face ?? {}) };
  const pixels = recipe.pixel ? pixelLayer(keen.id) : null;

  const faceMarkup = pixels
    ? ""
    : regularFace(face, recipe.eyes ?? "big", recipe.mouth ?? "smile", c.line);

  const chroma = recipe.custom === "chroma"
    ? `<rect x="3" y="3" width="94" height="94" fill="url(#${id}-chroma)" opacity="0.92"/>`
    : "";

  return (
    `<svg ${NS} viewBox="0 0 100 100" ${dims} role="img" aria-label="${label}">` +
    `<defs>` +
    `<linearGradient id="${id}-tile" x1="0.15" y1="0" x2="0.75" y2="1">` +
    `<stop offset="0" stop-color="${hsl(tileHue, 58, 38)}"/>` +
    `<stop offset="1" stop-color="${hsl(tileHue, 72, 15)}"/>` +
    `</linearGradient>` +
    `<radialGradient id="${id}-tilegloss" cx="0.28" cy="0.12" r="0.62">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0.34"/>` +
    `<stop offset="0.65" stop-color="#ffffff" stop-opacity="0.05"/>` +
    `<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<radialGradient id="${id}-glow" cx="0.5" cy="0.55" r="0.62">` +
    `<stop offset="0" stop-color="${hsl(keen.hue, 95, 62)}" stop-opacity="0.55"/>` +
    `<stop offset="0.7" stop-color="${hsl(keen.hue, 90, 50)}" stop-opacity="0.12"/>` +
    `<stop offset="1" stop-color="${hsl(keen.hue, 90, 50)}" stop-opacity="0"/>` +
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
    (custom ? custom.back : "") +
    extras.back +
    (custom ? custom.body : built.body) +
    (pixels ? pixels : "") +
    (custom ? custom.front : "") +
    extras.front +
    faceMarkup +
    (recipe.noGloss ? "" : `<rect x="3" y="3" width="94" height="94" fill="url(#${id}-tilegloss)"/>`) +
    `</g>` +
    `<rect x="3" y="3" width="94" height="94" rx="25" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.4"/>` +
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

/** Ids with a hand-drawn recipe worth checking in the sprite test script. */
export const ART_KEENS: string[] = Object.keys(RECIPES);
