/**
 * What each Keen looks like.
 *
 * The catalogue in `lib/keens.ts` is about game play — rarity, price, odds.
 * This file is only about drawing: every Keen names an archetype and, where it
 * is a creature, a handful of traits (ears, muzzle, tail, extras). The renderer
 * in `components/keens/keen-creature.tsx` turns one row here into a cartoon
 * character drawn from the Keen's own hue, so 48 distinct characters come out of
 * one small table instead of 48 hand-written drawings.
 */

export type Ear = "none" | "cat" | "dog" | "round" | "big" | "long" | "horn" | "stalk";
export type Muzzle = "none" | "cream" | "snout" | "beak" | "trunk";
export type Tail = "none" | "thin" | "curl" | "bushy" | "puff";

export type Look =
  | {
      kind: "critter";
      /** Body silhouette. */
      form?: "blob" | "egg" | "tall" | "wide";
      ears?: Ear;
      muzzle?: Muzzle;
      tail?: Tail;
      /** Ring of fur around the face (lion, unicorn). */
      mane?: number;
      shell?: boolean;
      spots?: boolean;
      wings?: "none" | "dragon" | "butterfly";
      fangs?: boolean;
      whiskers?: boolean;
      /** Eyelidded, heavy-lidded look for the sly ones. */
      face?: "cute" | "sly" | "wide" | "fierce";
    }
  | { kind: "bird"; crest?: boolean; flame?: boolean; friend?: boolean }
  | {
      kind: "object";
      shape:
        | "pencil"
        | "eraser"
        | "backpack"
        | "calculator"
        | "paper"
        | "medal"
        | "telescope"
        | "star"
        | "moon"
        | "comet"
        | "planet"
        | "rocket"
        | "crown"
        | "lollipop"
        | "cookie"
        | "donut"
        | "chocolate"
        | "sundae"
        | "cake"
        | "cupcake"
        | "rainbow"
        | "coil";
    }
  | { kind: "person"; role: "teacher" | "grad" | "astronaut" | "wizard" | "mermaid" };

export const KEEN_LOOKS: Record<string, Look> = {
  // ── Djurpaketet ────────────────────────────────────────────────────────────
  kisse: { kind: "critter", ears: "cat", tail: "curl", whiskers: true },
  vovve: { kind: "critter", ears: "dog", muzzle: "cream", tail: "thin" },
  kaninen: { kind: "critter", form: "egg", ears: "long", muzzle: "cream", tail: "puff" },
  turt: { kind: "critter", form: "wide", shell: true, muzzle: "cream" },
  pippi: { kind: "bird" },
  sly: { kind: "critter", ears: "cat", muzzle: "snout", tail: "bushy", face: "sly" },
  bruno: { kind: "critter", form: "wide", ears: "round", muzzle: "cream" },
  fenrir: { kind: "critter", ears: "cat", muzzle: "snout", tail: "bushy", fangs: true, face: "fierce" },

  // ── Skolpaketet ────────────────────────────────────────────────────────────
  penny: { kind: "object", shape: "pencil" },
  gummi: { kind: "object", shape: "eraser" },
  bag: { kind: "object", shape: "backpack" },
  kalkyl: { kind: "object", shape: "calculator" },
  prov: { kind: "object", shape: "paper" },
  larsson: { kind: "person", role: "teacher" },
  nobel: { kind: "object", shape: "medal" },
  rektor: { kind: "person", role: "grad" },

  // ── Rymdpaketet ────────────────────────────────────────────────────────────
  raffe: { kind: "object", shape: "rocket" },
  stella: { kind: "object", shape: "star" },
  luna: { kind: "object", shape: "moon" },
  kalle: { kind: "object", shape: "comet" },
  tella: { kind: "object", shape: "telescope" },
  astro: { kind: "person", role: "astronaut" },
  saturnus: { kind: "object", shape: "planet" },
  zorg: { kind: "critter", ears: "stalk", face: "wide" },

  // ── Djungelpaketet ─────────────────────────────────────────────────────────
  polly: { kind: "bird", crest: true },
  ving: { kind: "critter", form: "tall", wings: "butterfly", ears: "stalk" },
  abbe: { kind: "critter", ears: "round", muzzle: "cream", tail: "curl" },
  slir: { kind: "object", shape: "coil" },
  groda: { kind: "critter", form: "wide", face: "wide" },
  leo: { kind: "critter", ears: "cat", spots: true, muzzle: "cream", tail: "thin" },
  elsa: { kind: "critter", ears: "big", muzzle: "trunk" },
  leon: { kind: "critter", mane: 34, muzzle: "cream", tail: "thin" },

  // ── Godispaketet ───────────────────────────────────────────────────────────
  klubba: { kind: "object", shape: "lollipop" },
  kex: { kind: "object", shape: "cookie" },
  munk: { kind: "object", shape: "donut" },
  choklad: { kind: "object", shape: "chocolate" },
  glass: { kind: "object", shape: "sundae" },
  tarta: { kind: "object", shape: "cake" },
  cupcake: { kind: "object", shape: "cupcake" },
  rainbow: { kind: "object", shape: "rainbow" },

  // ── Mytiskapaketet ─────────────────────────────────────────────────────────
  uno: { kind: "critter", form: "egg", mane: 30, muzzle: "snout", tail: "thin" },
  drako: { kind: "critter", ears: "horn", muzzle: "snout", wings: "dragon", tail: "thin", fangs: true, face: "fierce" },
  fenix: { kind: "bird", flame: true, crest: true },
  marina: { kind: "person", role: "mermaid" },
  merlin: { kind: "person", role: "wizard" },
  kromakatt: { kind: "critter", ears: "cat", tail: "curl", whiskers: true },
  kromadrake: { kind: "critter", ears: "horn", muzzle: "snout", wings: "dragon", tail: "thin", fangs: true, face: "fierce" },
  kromakrona: { kind: "object", shape: "crown" },
};
