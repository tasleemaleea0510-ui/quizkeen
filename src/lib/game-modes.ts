/**
 * Three heist modes — the rules, in one place.
 *
 * A quiz match can run as a plain quiz or as one of three economies: Vault
 * Raiders, Crypto Clash or Pirate Heist. All three share the same loop (answer
 * right, earn mode currency, then spend it on a unique choice), so the engine
 * is one file with three rule sets rather than three games.
 *
 * Everything here is pure: a host carries a `HeistState` in memory and this
 * module turns "X raided Y" into the next state. That keeps the whole economy
 * testable without a database, a socket or a browser.
 *
 * Two deliberate simplifications, chosen to keep a classroom match readable:
 *  - Raids resolve against defenses instead of a separate symbol puzzle; the
 *    defense is the gamble.
 *  - The match lasts as long as the quiz, not five wall-clock minutes, because
 *    the quiz is what the class is actually doing.
 *
 * Mint is the permanent reward and is paid in coins (mynt), the app's currency.
 * Match money lives only inside `HeistState` and disappears when it ends.
 */

export type HeistMode = "vault" | "crypto" | "pirate";
/** A match can also be a plain quiz with no economy. */
export type ModeId = HeistMode | "classic";

export type DefenseKind = "block" | "reduce" | "protect" | "energy" | "trace" | "slot" | "discount";

export type Defense = {
  id: string;
  name: string;
  cost: number;
  blurb: string;
  kind: DefenseKind;
  /** Percent taken off a theft for `reduce`, points removed for `trace`,
   *  gold kept out of reach for `protect`. */
  value?: number;
  /** A decoy blocks the raid and exposes who tried. */
  reveals?: boolean;
  /** How many thefts one purchase survives. Defaults to one. */
  charges?: number;
};

export type RaidStyle = {
  id: string;
  name: string;
  cost: number;
  /** 0–1. */
  chance: number;
  pct: number;
  cap: number;
  /** The past tense used in the feed: "Bo smygrånade Cia". */
  verb: string;
};

/**
 * A face-down chest, Gold Quest style.
 *
 * Three identical chests sit in front of the player and only the draw decides
 * what was in the one they tapped. That gamble — a jackpot, a robbery, a swap
 * with the leader, a shield or a storm — is what makes the mode loud in a
 * classroom, so the chest is worth more drama than any single raid. Every pull
 * has a useful outcome; an unavailable rival effect turns into a small payout.
 */
export type ChestKind = "gold" | "steal" | "swap" | "shield" | "storm";

export type ChestOutcome = {
  id: string;
  name: string;
  blurb: string;
  /** Relative chance; the table does not have to add up to 100. */
  weight: number;
  kind: ChestKind;
  /** Coins for `gold`, percent of the rival's purse for `steal`. */
  value?: number;
};

/**
 * What a chest pull did, handed back by the rules so the room can watch it.
 *
 * A chest is the loudest thing in Vault Raiders, and half the fun is that
 * everyone sees the pull rather than just the person who tapped. The host
 * broadcasts one of these to every screen, which is why it is structured data
 * and not a sentence.
 */
export type ChestReveal = {
  /** Who opened it. */
  name: string;
  keen: string | null;
  /** Which of the three chests was tapped, 0–2. */
  chest: number;
  kind: ChestKind;
  /** What was inside: "Myntregn", "Skattkarta", "Spegelbyte". */
  title: string;
  blurb: string;
  /** What it did to the opener's purse — negative on a bad swap. */
  delta: number;
  /** The rival involved, when the chest robbed or traded with someone. */
  rival?: string;
  /** The feed line, so a screen can print the same sentence the host wrote. */
  text: string;
};

/**
 * The short skill drill that rotates through Cyber Hack between quiz questions.
 * The `answer` is checked by the host; the visible puzzle data is also built
 * here so every player sees the same rules for the current round.
 */
export type CyberHackChallenge =
  | { kind: "virus"; title: string; prompt: string; targetCount: number; answer: string }
  | { kind: "blueprint"; title: string; prompt: string; shape: string; options: string[]; answer: string }
  | { kind: "sequence"; title: string; prompt: string; pattern: number[]; answer: string }
  | { kind: "passcode"; title: string; prompt: string; code: string; answer: string }
  | { kind: "reboot"; title: string; prompt: string; holdMs: number; answer: string };

/** Pick the round's Cyber Hack drill consistently on the host and every player. */
export function hackChallengeFor(round: number, playerName: string): CyberHackChallenge {
  let seed = 17;
  for (const char of `${Math.max(0, round)}:${playerName}`) {
    seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
  }
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const kind = ["virus", "blueprint", "sequence", "passcode", "reboot"][Math.max(0, round - 1) % 5];

  if (kind === "virus") {
    return { kind, title: "Purge the signal", prompt: "Catch five moving firewall sparks before they vanish.", targetCount: 5, answer: "5" };
  }
  if (kind === "blueprint") {
    const options = ["triangle", "diamond", "circle", "square"];
    const shape = options[next() % options.length];
    return { kind, title: "Read the blueprint", prompt: "Match the outlined symbol to its name.", shape, options, answer: shape };
  }
  if (kind === "sequence") {
    const pattern = Array.from({ length: 4 }, () => next() % 4);
    return { kind, title: "Trace the signal", prompt: "Watch the signal, then repeat it in the same order.", pattern, answer: pattern.join(",") };
  }
  if (kind === "passcode") {
    const code = String(1000 + (next() % 9000));
    return { kind, title: "Crack the access code", prompt: "Enter the four-digit code shown on the console.", code, answer: code };
  }
  return { kind: "reboot", title: "Reboot the relay", prompt: "Hold the reboot switch until the meter reaches 100%.", holdMs: 1400, answer: "reboot" };
}

/** Classic: reward accuracy streaks without letting them eclipse the quiz. */
export function classicStreakBonus(streak: number): number {
  // The first correct answer earns the normal score; streak bonus starts on
  // the second consecutive hit and caps before it can beat quiz knowledge.
  return Math.min(75, Math.max(0, Math.floor(streak) - 1) * 15);
}

/** A one-tap power-up, Cyber Hack style. */
export type Power = {
  id: string;
  name: string;
  blurb: string;
  cost: number;
  effect: "double";
  /** Only one use per match. */
  once: boolean;
};

export type ModeRules = {
  id: HeistMode;
  name: string;
  tagline: string;
  /** What the match money is called, and its short form. */
  currency: string;
  currencyShort: string;
  startBalance: number;
  startEnergy: number;
  maxEnergy: number;
  energyName: string;
  correctBalance: number;
  correctEnergy: number;
  /** Standard raid: energy cost (or gold for pirate), share of the target, cap. */
  raidCost: number;
  raidPct: number;
  raidCap: number;
  /** Pirate Heist picks one of these instead of a standard raid. */
  styles?: RaidStyle[];
  /** Vault Raiders: the face-down chests opened once a round. */
  chests?: ChestOutcome[];
  /** Crypto Clash: the power-ups beyond a plain hack. */
  powers?: Power[];
  /** Crypto Clash only: trace added on a landed and a blocked hack, and the
   *  level at which everyone can see you have been hacking. */
  trace?: { success: number; fail: number; exposed: number };
  defenses: Defense[];
  mint: { first: number; second: number; third: number; rest: number; perRaid: number; bonusCap: number };
};

const VAULT_DEFENSES: Defense[] = [
  { id: "door", name: "Ståldörr", cost: 150, kind: "reduce", value: 25, blurb: "Tar bort 25 % av nästa stöld." },
  { id: "grid", name: "Lasergrid", cost: 300, kind: "block", blurb: "Stoppar ett rån helt." },
  { id: "decoy", name: "Skendvalv", cost: 500, kind: "block", charges: 2, blurb: "Stoppar två rån, avslöjar tjuven och kostar tjuven 100 mynt.", reveals: true },
  { id: "cell", name: "Energicell", cost: 150, kind: "energy", blurb: "Ger 1 raid-energi direkt." },
  { id: "walls", name: "Förstärkta väggar", cost: 300, kind: "reduce", value: 25, charges: 2, blurb: "Tar bort 25 % av de två nästa stölderna." },
  { id: "key", name: "Mästernyckel", cost: 150, kind: "discount", blurb: "Nästa rån kostar 1 raid-energi mindre." },
];

const CRYPTO_DEFENSES: Defense[] = [
  { id: "firewall", name: "Brandvägg", cost: 200, kind: "reduce", value: 40, blurb: "Tar bort 40 % av nästa hack." },
  { id: "wallet", name: "Skendosa", cost: 400, kind: "block", blurb: "Stoppar ett hack och avslöjar hackaren.", reveals: true },
  { id: "cleaner", name: "Spårstädare", cost: 200, kind: "trace", value: 30, blurb: "Sänker ditt spår med 30." },
  { id: "slot", name: "Extra verktyg", cost: 400, kind: "slot", blurb: "Höjer max antal verktygsladdningar med 1." },
];

const PIRATE_DEFENSES: Defense[] = [
  { id: "guard", name: "Vaktbesättning", cost: 150, kind: "reduce", value: 30, blurb: "Tar bort 30 % av nästa stöld." },
  { id: "decoy", name: "Skattkista", cost: 400, kind: "block", blurb: "Stoppar ett rån och kostar piraten 100 guld.", reveals: true },
  { id: "cargo", name: "Låst lastutrymme", cost: 500, kind: "protect", value: 500, blurb: "500 guld ligger utanför rånarnas räckhåll." },
];

const VAULT_CHESTS: ChestOutcome[] = [
  { id: "pouch", name: "Myntregn", blurb: "300 mynt rakt ner i valvet.", weight: 30, kind: "gold", value: 300 },
  { id: "jackpot", name: "Guldåder", blurb: "600 mynt — en sällsynt fullträff.", weight: 8, kind: "gold", value: 600 },
  { id: "steal", name: "Skattkarta", blurb: "Tar en andel av en rivals oskyddade mynt.", weight: 22, kind: "steal", value: 20 },
  { id: "swap", name: "Spegelbyte", blurb: "Byter saldo med en slumpad rival.", weight: 8, kind: "swap" },
  { id: "shield", name: "Väktarsigill", blurb: "Stoppar nästa rån helt.", weight: 15, kind: "shield" },
  { id: "storm", name: "Stormladdning", blurb: "Ditt nästa rätta svar ger +180 bonusmynt.", weight: 17, kind: "storm", value: 180 },
];

const CRYPTO_POWERS: Power[] = [
  {
    id: "double",
    name: "Dubbla",
    blurb: "Fördubblar din crypto — upp till +900. En gång per match.",
    cost: 0,
    effect: "double",
    once: true,
  },
];

/** A chest theft never takes more than this, so one lucky tap cannot end a match. */
export const CHEST_STEAL_CAP = 400;
/** A rival chest with no useful target still gives the opener a consolation payout. */
export const CHEST_FALLBACK_REWARD = 300;
/** "Dubbla" doubles the purse, but never by more than this. */
export const POWER_GAIN_CAP = 900;
/** A revealed raider pays this much for walking into the trap. */
export const RAID_EXPOSURE_FEE = 100;
/** Every new question tops the raid energy back up by one. */
export const ROUND_ENERGY = 1;
/** How long a robbed player cannot be hit again. */
export const PROTECTION_MS = 30000;
const TRACE_DECAY = 10;

export const MODE_RULES: Record<HeistMode, ModeRules> = {
  vault: {
    id: "vault",
    name: "Vault Raiders",
    tagline: "Fyll valvet, råna grannen, bygg larm.",
    currency: "Valvmynt",
    currencyShort: "mynt",
    startBalance: 1000,
    startEnergy: 3,
    maxEnergy: 5,
    energyName: "Raid-energi",
    correctBalance: 100,
    correctEnergy: 1,
    raidCost: 2,
    raidPct: 15,
    raidCap: 500,
    chests: VAULT_CHESTS,
    defenses: VAULT_DEFENSES,
    mint: { first: 100, second: 70, third: 50, rest: 30, perRaid: 10, bonusCap: 30 },
  },
  crypto: {
    id: "crypto",
    name: "Crypto Clash",
    tagline: "Hacka, håll spåret nere och undvik att bli avslöjad.",
    currency: "Crypto",
    currencyShort: "crypto",
    startBalance: 1000,
    startEnergy: 3,
    maxEnergy: 4,
    energyName: "Verktyg",
    correctBalance: 120,
    correctEnergy: 1,
    raidCost: 2,
    raidPct: 12,
    raidCap: 600,
    trace: { success: 15, fail: 25, exposed: 70 },
    powers: CRYPTO_POWERS,
    defenses: CRYPTO_DEFENSES,
    mint: { first: 120, second: 80, third: 50, rest: 30, perRaid: 5, bonusCap: 25 },
  },
  pirate: {
    id: "pirate",
    name: "Pirate Heist",
    tagline: "Betala för risken — ju djärvare rån, desto större byte.",
    currency: "Piratguld",
    currencyShort: "guld",
    startBalance: 1000,
    startEnergy: 0,
    maxEnergy: 0,
    energyName: "Besättning",
    correctBalance: 100,
    correctEnergy: 0,
    raidCost: 0,
    raidPct: 0,
    raidCap: 0,
    styles: [
      // Cheap and reliable against a thin purse; the cap keeps it from being
      // the best answer forever.
      { id: "stealth", name: "Smygrån", cost: 50, chance: 0.85, pct: 10, cap: 300, verb: "smygrånade" },
      // The middle: a real chance to miss, a much bigger ceiling.
      { id: "quick", name: "Snabbrån", cost: 200, chance: 0.65, pct: 18, cap: 600, verb: "snabbrånade" },
      // The comeback play: only pays when the target is rich, which is the point.
      { id: "full", name: "Full attack", cost: 300, chance: 0.45, pct: 40, cap: 1200, verb: "gick till full attack mot" },
    ],
    defenses: PIRATE_DEFENSES,
    mint: { first: 110, second: 75, third: 50, rest: 30, perRaid: 10, bonusCap: 30 },
  },
};

export const HEIST_MODES: HeistMode[] = ["vault", "crypto", "pirate"];

export function isHeistMode(mode: string | null | undefined): mode is HeistMode {
  return mode === "vault" || mode === "crypto" || mode === "pirate";
}

export type HeistPlayer = {
  name: string;
  /** The Keen they wear, so every heist surface can draw a face. */
  keen: string | null;
  /** The account behind the display name, when the player answered signed in. */
  account?: string;
  balance: number;
  energy: number;
  maxEnergy: number;
  defenses: string[];
  trace: number;
  correct: number;
  /** Successful raids, one per distinct rival — what the Mint bonus pays for. */
  raids: number;
  /** Who has already been robbed, so farming one rival earns no bonus. */
  raided: string[];
  protectedUntil: number;
  /** Mästernyckel: the next raid costs one energy less. */
  raidDiscount: number;
  /** The round a chest was last opened in; -1 means none yet. */
  chestRound: number;
  /** Cyber Hack: "Dubbla" is a once-a-match button. */
  doubled: boolean;
  /** Cyber Hack: at most one skill drill can be attempted per question. */
  hackRound: number;
  hackProgress: number;
  hackScore: number;
  /** Vault Raiders: added to the next correct-answer reward, then consumed. */
  nextCorrectBonus: number;
  /** Consecutive correct answers. Every mode pays a small streak reward. */
  streak: number;
};

export type HeistEvent = { id: string; at: number; text: string };

export type HeistState = {
  mode: HeistMode;
  round: number;
  players: Record<string, HeistPlayer>;
  /** Newest first, already trimmed. */
  events: HeistEvent[];
};

export type HeistAction =
  | { kind: "raid"; target: string; style?: string }
  | { kind: "fortify"; defense: string }
  /** `chest` is which of the three was tapped, 0–2. */
  | { kind: "chest"; chest?: number }
  | { kind: "power"; power: string }
  | { kind: "hack"; answer: string }
  | { kind: "save" };

export type ActionResult =
  | { ok: true; state: HeistState; reveal?: ChestReveal; feedback?: string }
  | { ok: false; error: string };

export type Standings = { name: string; keen: string | null; balance: number; raids: number; correct: number }[];

const MAX_EVENTS = 14;
let eventSeq = 0;

function clone(state: HeistState): HeistState {
  const players: Record<string, HeistPlayer> = {};
  for (const [name, p] of Object.entries(state.players)) {
    players[name] = { ...p, defenses: [...p.defenses], raided: [...p.raided] };
  }
  return { ...state, players, events: [...state.events] };
}

function pushEvent(state: HeistState, text: string, now: number): void {
  state.events.unshift({ id: `e${++eventSeq}`, at: now, text });
  if (state.events.length > MAX_EVENTS) state.events.length = MAX_EVENTS;
}

export function newHeist(
  mode: HeistMode,
  roster: { name: string; keen: string | null }[]
): HeistState {
  const rules = MODE_RULES[mode];
  const players: Record<string, HeistPlayer> = {};
  for (const who of roster) {
    if (!who.name) continue;
    players[who.name] = {
      name: who.name,
      keen: who.keen ?? null,
      balance: rules.startBalance,
      energy: rules.startEnergy,
      maxEnergy: rules.maxEnergy,
      defenses: [],
      trace: 0,
      correct: 0,
      raids: 0,
      raided: [],
      protectedUntil: 0,
      raidDiscount: 0,
      chestRound: -1,
      doubled: false,
      hackRound: -1,
      hackProgress: 0,
      hackScore: 0,
      nextCorrectBonus: 0,
      streak: 0,
    };
  }
  return { mode, round: 0, players, events: [] };
}

/**
 * What a correct-answer streak is worth on top of the flat reward. The first
 * correct answer pays the normal amount; from the second in a row the reward
 * grows by 25 and caps at 75, so consistency matters without beating knowledge.
 * Classic mode has its own points version in `classicStreakBonus`.
 */
export function heistStreakBonus(streak: number): number {
  return Math.min(75, Math.max(0, Math.floor(streak) - 1) * 25);
}

/**
 * A correct answer: the match currency, a streak step, and (where the mode has
 * it) one energy. Energy stops at the cap; the coins never do.
 */
export function addCorrect(state: HeistState, name: string): HeistState {
  const player = state.players[name];
  if (!player) return state;
  const rules = MODE_RULES[state.mode];
  const next = clone(state);
  const p = next.players[name];
  // `?? 0` keeps a match that was already running when this field shipped
  // from turning every later answer into NaN.
  p.streak = (p.streak ?? 0) + 1;
  p.balance += rules.correctBalance + p.nextCorrectBonus + heistStreakBonus(p.streak);
  p.nextCorrectBonus = 0;
  p.correct += 1;
  if (p.maxEnergy > 0) p.energy = Math.min(p.maxEnergy, p.energy + rules.correctEnergy);
  return next;
}

/**
 * A wrong or missing answer ends the streak ladder. `addCorrect` raises it;
 * this is the other half, called by the host for every seat that missed.
 */
export function breakStreak(state: HeistState, name: string): HeistState {
  const player = state.players[name];
  if (!player || player.streak === 0) return state;
  const next = clone(state);
  next.players[name].streak = 0;
  return next;
}

/**
 * A new question starts a new round.
 *
 * Every round pays out one energy (so a player who missed a question is never
 * locked out of the raid game) and cools trace by ten (so being exposed is a
 * temporary setback rather than a life sentence).
 */
export function nextRound(state: HeistState): HeistState {
  const advanced = clone(state);
  advanced.round += 1;
  for (const p of Object.values(advanced.players)) {
    if (p.maxEnergy > 0) p.energy = Math.min(p.maxEnergy, p.energy + ROUND_ENERGY);
  }
  return decayTrace(advanced) ?? advanced;
}

export function approxBalance(value: number): string {
  if (value <= 0) return "0";
  const step = value >= 1000 ? 100 : 50;
  return `~${Math.round(value / step) * step}`;
}

export function defenseById(mode: HeistMode, id: string): Defense | undefined {
  return MODE_RULES[mode].defenses.find((d) => d.id === id);
}

/**
 * What one raid costs, in the mode's own energy. Pirate raids are bought with
 * gold (see `styles`), so they report zero here; an exposed Crypto hacker pays
 * one extra tool, and a master key shaves one off, never below one.
 */
export function raidCostFor(mode: HeistMode, player: HeistPlayer): number {
  const rules = MODE_RULES[mode];
  if (rules.styles || rules.raidCost <= 0) return 0;
  const exposed = rules.trace && player.trace >= rules.trace.exposed ? 1 : 0;
  const discount = player.raidDiscount > 0 ? 1 : 0;
  return Math.max(1, rules.raidCost + exposed - discount);
}

/** How many of a defense a player still holds. A wall counts twice. */
export function ownedCharges(player: HeistPlayer, id: string): number {
  return player.defenses.filter((d) => d === id).length;
}

/** True when the shop should refuse to sell this again. */
export function maxedOut(mode: HeistMode, player: HeistPlayer, defense: Defense): boolean {
  if (defense.kind === "protect" || defense.kind === "block" || defense.kind === "reduce") {
    return ownedCharges(player, defense.id) >= (defense.charges ?? 1);
  }
  if (defense.kind === "discount") return player.raidDiscount > 0;
  // One extra tool slot per match, like every other permanent upgrade.
  if (defense.kind === "slot") return player.maxEnergy > MODE_RULES[mode].maxEnergy;
  return false;
}

/** Gold the target's Cargo Hold keeps out of reach. */
export function protectedGold(mode: HeistMode, player: HeistPlayer): number {
  return player.defenses.reduce((sum, id) => {
    const d = defenseById(mode, id);
    return d?.kind === "protect" ? sum + (d.value ?? 0) : sum;
  }, 0);
}

/** True when this player still has a chest to open this round. */
export function chestOpen(state: HeistState, name: string): boolean {
  const player = state.players[name];
  if (!player || !MODE_RULES[state.mode].chests) return false;
  return player.chestRound !== state.round;
}

/** Weighted draw. `r` is 0–1 so the tests can force a branch. */
function drawChest(chests: ChestOutcome[], r: number): ChestOutcome {
  const total = chests.reduce((sum, c) => sum + c.weight, 0);
  // Clamp injected/untrusted random sources too: r === 1 used to fall through
  // to the last row, which was the old dud when a stale bundle was in use.
  const roll = Math.min(1 - Number.EPSILON, Math.max(0, r)) * total;
  let remaining = roll;
  for (const chest of chests) {
    remaining -= chest.weight;
    if (remaining < 0) return chest;
  }
  return chests[0];
}

/** One of the other seats, chosen by the draw. */
function randomRival(state: HeistState, name: string, r: number): HeistPlayer | undefined {
  const rivals = Object.values(state.players).filter((p) => p.name !== name);
  if (rivals.length === 0) return undefined;
  return rivals[Math.min(rivals.length - 1, Math.floor(r * rivals.length))];
}

/** The defense that answers an incoming raid: a block first, then a reduction. */
function findDefense(mode: HeistMode, target: HeistPlayer, kind: "block" | "reduce"): Defense | undefined {
  for (const id of target.defenses) {
    const d = defenseById(mode, id);
    if (d && d.kind === kind) return d;
  }
  return undefined;
}

function removeDefense(target: HeistPlayer, id: string): void {
  const at = target.defenses.indexOf(id);
  if (at >= 0) target.defenses.splice(at, 1);
}

/**
 * Resolve one action.
 *
 * `rng` is injectable so the tests can prove a failed Pirate raid without
 * hunting for a lucky number. Everything is host-side; a player only ever
 * sends an intention.
 */
export function applyAction(
  state: HeistState,
  name: string,
  action: HeistAction,
  now: number,
  rng: () => number = Math.random
): ActionResult {
  const rules = MODE_RULES[state.mode];
  if (!state.players[name]) return { ok: false, error: "Du är inte med i den här matchen." };

  if (action.kind === "save") {
    // Saving is a real choice in the rulebook, and here it simply means
    // keeping everything — no state change, no cost.
    return { ok: true, state };
  }

  const next = clone(state);
  const me = next.players[name];

  if (action.kind === "fortify") {
    const defense = defenseById(state.mode, action.defense);
    if (!defense) return { ok: false, error: "Den försvararen finns inte i det här läget." };
    if (me.balance < defense.cost) {
      return { ok: false, error: `Du behöver ${defense.cost} ${rules.currencyShort} för ${defense.name}.` };
    }
    const passive = defense.kind === "block" || defense.kind === "reduce" || defense.kind === "protect";
    if (passive && ownedCharges(me, defense.id) >= (defense.charges ?? 1)) {
      return { ok: false, error: `Du har redan ${defense.name}.` };
    }
    if (defense.kind === "discount" && me.raidDiscount > 0) {
      return { ok: false, error: `Du har redan ${defense.name}.` };
    }
    if (defense.kind === "slot" && me.maxEnergy > rules.maxEnergy) {
      return { ok: false, error: `Du har redan ${defense.name}.` };
    }
    if (defense.kind === "energy" && me.energy >= me.maxEnergy) {
      return { ok: false, error: `${rules.energyName} är redan full.` };
    }

    me.balance -= defense.cost;

    if (defense.kind === "energy") {
      me.energy = Math.min(me.maxEnergy, me.energy + 1);
      pushEvent(next, `${name} köpte ${defense.name} och fick 1 ${rules.energyName.toLowerCase()}.`, now);
    } else if (defense.kind === "discount") {
      me.raidDiscount = 1;
      pushEvent(next, `${name} köpte ${defense.name} — nästa rån blir billigare.`, now);
    } else if (defense.kind === "slot") {
      me.maxEnergy += 1;
      me.energy += 1;
      pushEvent(next, `${name} köpte ${defense.name} och har nu plats för ${me.maxEnergy}.`, now);
    } else if (defense.kind === "trace") {
      me.trace = Math.max(0, me.trace - (defense.value ?? 30));
      pushEvent(next, `${name} tvättade bort ${defense.value ?? 30} spår.`, now);
    } else {
      // Passive defenses are charged: one purchase of a two-charge wall pushes
      // the id twice, so each theft removes exactly one charge.
      const charges = defense.charges ?? 1;
      for (let i = 0; i < charges; i += 1) me.defenses.push(defense.id);
      pushEvent(next, `${name} köpte ${defense.name}.`, now);
    }
    return { ok: true, state: next };
  }

  // ── Gold Quest chest ───────────────────────────────────────────────────
  if (action.kind === "chest") {
    const chests = rules.chests;
    if (!chests) return { ok: false, error: "Det här läget har inga kistor." };
    // One tap a round: without this a player could sit on the chest button and
    // gamble the whole match away between two questions.
    if (me.chestRound === next.round) {
      return { ok: false, error: "Du har redan öppnat en kista den här rundan." };
    }
    // Which of the three chests was tapped, and not just decoration. Each box
    // gets its own draw, so the three really do hold different things and the
    // tap is the decision; a caller that sends no index gets the first box.
    const chest = typeof action.chest === "number" ? Math.min(2, Math.max(0, Math.floor(action.chest))) : 0;
    me.chestRound = next.round;

    let roll = rng();
    for (let i = 0; i < chest; i += 1) roll = rng();
    const outcome = drawChest(chests, roll);
    // Measured rather than assumed: a swap can leave the opener poorer than
    // they started, and the reveal has to say so out loud.
    const before = me.balance;
    let rival: string | undefined;

    if (outcome.kind === "gold") {
      const coins = outcome.value ?? 0;
      me.balance += coins;
      pushEvent(next, `${name} öppnade ${outcome.name}: +${coins} ${rules.currencyShort}.`, now);
    } else if (outcome.kind === "steal") {
      const victim = randomRival(next, name, rng());
      if (!victim) {
        me.balance += CHEST_FALLBACK_REWARD;
        pushEvent(
          next,
          `${name} öppnade ${outcome.name}, men det fanns ingen att råna — valvet gav ${CHEST_FALLBACK_REWARD} ${rules.currencyShort} i tröstpris.`,
          now
        );
      } else {
        rival = victim.name;
        const steal = Math.max(
          0,
          Math.min(CHEST_STEAL_CAP, victim.balance - protectedGold(state.mode, victim), Math.floor((victim.balance * (outcome.value ?? 0)) / 100))
        );
        if (steal > 0) {
          victim.balance -= steal;
          me.balance += steal;
        } else {
          me.balance += CHEST_FALLBACK_REWARD;
        }
        pushEvent(
          next,
          steal > 0
            ? `${name} öppnade ${outcome.name} och rånade ${victim.name}: ${steal} ${rules.currencyShort}.`
            : `${name} öppnade ${outcome.name}, men ${victim.name} hade inget oskyddat guld — valvet gav ${CHEST_FALLBACK_REWARD} ${rules.currencyShort} i tröstpris.`,
          now
        );
      }
    } else if (outcome.kind === "swap") {
      const partner = randomRival(next, name, rng());
      if (!partner) {
        me.balance += CHEST_FALLBACK_REWARD;
        pushEvent(
          next,
          `${name} öppnade ${outcome.name}, men ingen fanns att byta med — valvet gav ${CHEST_FALLBACK_REWARD} ${rules.currencyShort} i tröstpris.`,
          now
        );
      } else if (partner.balance === me.balance) {
        rival = partner.name;
        me.balance += CHEST_FALLBACK_REWARD;
        pushEvent(
          next,
          `${name} öppnade ${outcome.name}, men saldona var lika — valvet gav ${CHEST_FALLBACK_REWARD} ${rules.currencyShort} i tröstpris.`,
          now
        );
      } else {
        rival = partner.name;
        const mine = me.balance;
        me.balance = partner.balance;
        partner.balance = mine;
        pushEvent(
          next,
          `${name} bytte saldo med ${partner.name} — sitter nu på ${me.balance} ${rules.currencyShort}.`,
          now
        );
      }
    } else if (outcome.kind === "shield") {
      // The seal arms the mode's block defense, not a hardcoded id. Holding a
      // second one pays out in coins instead of stacking into an unraidable
      // vault.
      const shield = rules.defenses.find((d) => d.kind === "block");
      if (!shield || me.defenses.includes(shield.id)) {
        me.balance += CHEST_FALLBACK_REWARD;
        pushEvent(
          next,
          `${name} hade redan ${shield?.name ?? "ett skydd"} — sigillet gav ${CHEST_FALLBACK_REWARD} ${rules.currencyShort} i stället.`,
          now
        );
      } else {
        me.defenses.push(shield.id);
        pushEvent(next, `${name} hittade ${shield.name} i kistan.`, now);
      }
    } else if (outcome.kind === "storm") {
      me.nextCorrectBonus += outcome.value ?? 180;
      pushEvent(next, `${name} laddade en storm: nästa rätta svar ger +${outcome.value ?? 180} ${rules.currencyShort}.`, now);
    }

    const reveal: ChestReveal = {
      name,
      keen: me.keen,
      chest,
      kind: outcome.kind,
      title: outcome.name,
      blurb: outcome.blurb,
      delta: me.balance - before,
      rival,
      // The branch above already wrote the sentence, so a screen never has to
      // invent its own wording for what happened.
      text: next.events[0]?.text ?? "",
    };
    return { ok: true, state: next, reveal };
  }

  // ── Cyber Hack: a skill drill between questions ────────────────────────
  if (action.kind === "hack") {
    if (state.mode !== "crypto") return { ok: false, error: "Hackutmaningen finns bara i Crypto Clash." };
    if (me.hackRound === state.round) return { ok: false, error: "Du har redan försökt hacka den här frågan." };

    const player = me;
    const challenge = hackChallengeFor(state.round, name);
    const success = action.answer === challenge.answer;
    player.hackRound = state.round;
    player.hackScore += success ? 1 : 0;
    player.hackProgress = success ? player.hackProgress + 1 : 0;

    if (success) {
      const reward = 180 + Math.min(120, player.hackProgress * 20);
      player.balance += reward;
      player.energy = Math.min(player.maxEnergy, player.energy + 1);
      player.trace = Math.max(0, player.trace - 10);
      pushEvent(next, `${name} löste ${challenge.title}: +${reward} crypto och ett verktyg.`, now);
      return { ok: true, state: next, feedback: `Hack lyckades! +${reward} crypto · +1 verktyg · −10 spår · hackkedja ${player.hackProgress}.` };
    }

    player.trace = Math.min(100, player.trace + 10);
    pushEvent(next, `${name} missade ${challenge.title} och lämnade ett spår.`, now);
    if (rules.trace && player.trace >= rules.trace.exposed) {
      pushEvent(next, `${name} är avslöjad — spåret är uppe i ${player.trace}. Hacket kostar nu ett extra verktyg.`, now);
    }
    return { ok: true, state: next, feedback: "Inte den här gången — +10 spår. En hackkedja bröts; nästa utmaning öppnar snart." };
  }


  // ── Cyber Hack power-up ─────────────────────────────────────────────────
  if (action.kind === "power") {
    const power = rules.powers?.find((p) => p.id === action.power);
    if (!power) return { ok: false, error: "Den power-upen finns inte i det här läget." };
    if (power.once && me.doubled) return { ok: false, error: `Du har redan använt ${power.name} en gång.` };
    if (me.balance < power.cost) {
      return { ok: false, error: `Du behöver ${power.cost} ${rules.currencyShort} för ${power.name}.` };
    }
    me.balance -= power.cost;
    // Doubling is a comeback tool, not an instant win: the gain is capped.
    const gain = power.effect === "double" ? Math.min(POWER_GAIN_CAP, me.balance) : 0;
    me.balance += gain;
    me.doubled = true;
    pushEvent(next, `${name} använde ${power.name}: +${gain} ${rules.currencyShort} (${me.balance} totalt).`, now);
    return { ok: true, state: next };
  }

  // ── Raid / hack ────────────────────────────────────────────────────────
  const target = next.players[action.target];
  if (!target) return { ok: false, error: "Välj en motståndare först." };
  if (target.name === name) return { ok: false, error: "Du kan inte råna dig själv." };
  if (target.protectedUntil > now) {
    const left = Math.ceil((target.protectedUntil - now) / 1000);
    return { ok: false, error: `${target.name} är skyddad i ${left} s till.` };
  }

  const style = rules.styles?.find((s) => s.id === action.style);
  if (rules.styles && !style) return { ok: false, error: "Välj ett rån först." };

  if (style) {
    // Pirate Heist: the fee is gold, and the raid itself can fail.
    if (me.balance < style.cost) {
      return { ok: false, error: `Du behöver ${style.cost} ${rules.currencyShort} för ${style.name}.` };
    }
    me.balance -= style.cost;
    if (rng() > style.chance) {
      pushEvent(next, `${name} misslyckades med ${style.name.toLowerCase()} mot ${target.name}.`, now);
      return { ok: true, state: next };
    }
  } else if (rules.raidCost > 0) {
    // Mästernyckel shaves one energy off a single raid and an exposed Crypto
    // hacker pays one more; neither can push the cost below one.
    const cost = raidCostFor(state.mode, me);
    if (me.energy < cost) {
      const exposed = Boolean(rules.trace && me.trace >= rules.trace.exposed);
      return {
        ok: false,
        error: `Du behöver ${cost} ${rules.energyName.toLowerCase()}${exposed ? " — du är avslöjad, så hacket kostar 1 extra" : ""}.`,
      };
    }
    me.energy -= cost;
    if (me.raidDiscount > 0) me.raidDiscount = 0;
  }

  const pct = style ? style.pct : rules.raidPct;
  const cap = style ? style.cap : rules.raidCap;
  // Cargo Hold keeps a slice of the purse out of every raid.
  const reachable = Math.max(0, target.balance - protectedGold(state.mode, target));
  let steal = Math.min(cap, Math.floor((reachable * pct) / 100));

  // A defense is only spent when there was something to defend.
  if (steal > 0) {
    const block = findDefense(state.mode, target, "block");
    if (block) {
      removeDefense(target, block.id);
      steal = 0;
      // A trap that exposes the thief costs them something. Without this a
      // decoy was just a more expensive version of a plain block; now the
      // reveal is a rule, and the projector can name who tried.
      const penalty = block.reveals ? Math.min(RAID_EXPOSURE_FEE, Math.max(0, me.balance)) : 0;
      if (penalty > 0) me.balance -= penalty;
      const attempt = rules.id === "crypto" ? "hack" : "rån";
      pushEvent(
        next,
        block.reveals
          ? `${target.name}s ${block.name} stoppade ${name}s ${attempt} och avslöjade tjuven${penalty > 0 ? ` (−${penalty} ${rules.currencyShort})` : ""}.`
          : `${target.name}s ${block.name} stoppade ett ${attempt}.`,
        now
      );
    } else {
      const reduce = findDefense(state.mode, target, "reduce");
      if (reduce) {
        removeDefense(target, reduce.id);
        steal = Math.floor(steal * (1 - (reduce.value ?? 0) / 100));
        pushEvent(next, `${target.name}s ${reduce.name} tog bort ${reduce.value ?? 0} % av stölden.`, now);
      }
    }
  } else {
    pushEvent(next, `${name} kom inte åt ${target.name}s ${rules.id === "crypto" ? "crypto" : "guld"}.`, now);
  }

  steal = Math.max(0, Math.min(steal, reachable));
  if (steal > 0) {
    me.balance += steal;
    target.balance -= steal;
    // The bonus pays for variety: a second hit on the same rival still steals,
    // but it does not add another Mint step.
    if (!me.raided.includes(target.name)) {
      me.raided.push(target.name);
      me.raids += 1;
    }
    const verb = style ? style.verb : rules.id === "crypto" ? "hackade" : "rånade";
    pushEvent(next, `${name} ${verb} ${target.name}: ${steal} ${rules.currencyShort}.`, now);
  }
  // Every attempt buys the victim a moment of peace, blocked or not. Thirty
  // seconds covers a whole question, so nobody can be hit four times while the
  // host reads the next one.
  target.protectedUntil = now + PROTECTION_MS;

  if (rules.trace) {
    me.trace = Math.min(100, me.trace + (steal > 0 ? rules.trace.success : rules.trace.fail));
    if (me.trace >= rules.trace.exposed) {
      pushEvent(next, `${name} är avslöjad — spåret är uppe i ${me.trace}.`, now);
    }
  }

  return { ok: true, state: next };
}

/** Crypto Clash: trace cools by 10 per round. Returns null if nothing moved. */
export function decayTrace(state: HeistState): HeistState | null {
  if (!MODE_RULES[state.mode].trace) return null;
  let changed = false;
  const next = clone(state);
  for (const p of Object.values(next.players)) {
    if (p.trace > 0) {
      p.trace = Math.max(0, p.trace - TRACE_DECAY);
      changed = true;
    }
  }
  return changed ? next : null;
}

export function standings(state: HeistState): Standings {
  return Object.values(state.players)
    .map((p) => ({ name: p.name, keen: p.keen, balance: p.balance, raids: p.raids, correct: p.correct }))
    .sort((a, b) => b.balance - a.balance || b.correct - a.correct);
}

/**
 * What a finished match pays. Placement Mint plus a per-raid bonus, capped so
 * one dominant player cannot farm the same rival all night.
 */
export function mintPayout(state: HeistState): { username: string; mint: number }[] {
  const rules = MODE_RULES[state.mode];
  const order = Object.values(state.players).sort((a, b) => b.balance - a.balance || b.correct - a.correct);
  return order.map((p, i) => {
    const base = i === 0 ? rules.mint.first : i === 1 ? rules.mint.second : i === 2 ? rules.mint.third : rules.mint.rest;
    const bonus = Math.min(rules.mint.bonusCap, p.raids * rules.mint.perRaid);
    return { username: p.account ?? p.name, mint: base + bonus };
  });
}
