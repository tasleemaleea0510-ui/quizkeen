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
 * A chest, but not three copies of the same lottery.
 *
 * Vault Raiders puts three boxes in front of the player and used to draw every
 * one of them from the same table, which made "choose a chest" a decoration.
 * Each box is now a different bet, printed before the tap: a guaranteed payout,
 * a slice of the biggest rival, or a coin flip that can cost you. That is the
 * decision, and it is why the chest is worth a full screen.
 */
export type ChestKind = "gold" | "steal" | "bust";

export type ChestOffer = {
  id: "safe" | "raid" | "wild";
  name: string;
  blurb: string;
  /** Printed before the tap: "Alltid +90" / "50 / 50". */
  odds: string;
  /** What the box is built to do, for the reveal's accent. */
  kind: ChestKind;
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
  /** `untrace` wipes the trail, `insider` arms one quiet, heavy hack. */
  effect: "untrace" | "insider";
  /** Only one use per match. */
  once: boolean;
};

/** True when this player has already bought the one-shot power. */
export function powerUsed(player: HeistPlayer, power: Power): boolean {
  // A power is spent when it is bought, not when its effect happens to be
  // cleared. Insider is consumed by the next hack; without a separate ledger
  // that would let a player buy it a second time straight afterwards.
  return (player.usedPowers ?? []).includes(power.id);
}

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
  /** Vault Raiders: the three boxes, one tap a round. */
  chests?: ChestOffer[];
  /** Crypto Clash: the power-ups beyond a plain hack. */
  powers?: Power[];
  /** Crypto Clash only: trace added on a landed and a blocked hack, and the
   *  level at which everyone can see you have been hacking. */
  trace?: { success: number; fail: number; exposed: number };
  defenses: Defense[];
  mint: { first: number; second: number; third: number; rest: number; perRaid: number; bonusCap: number };
};

// Defenses are priced as insurance, not as a tax: a 40 % door costs less than
// the raid it answers on a big purse and more than it saves on a small one, so
// protecting the vault is what the leader does and raiding it is what everyone
// else does. The old prices all cost more than they could ever save.
const VAULT_DEFENSES: Defense[] = [
  { id: "door", name: "Ståldörr", cost: 120, kind: "reduce", value: 40, blurb: "Tar bort 40 % av nästa stöld." },
  { id: "grid", name: "Lasergrid", cost: 260, kind: "block", blurb: "Stoppar ett rån helt." },
  { id: "decoy", name: "Skendvalv", cost: 450, kind: "block", charges: 2, blurb: "Stoppar två rån, avslöjar tjuven och kostar tjuven 100 mynt.", reveals: true },
  { id: "cell", name: "Energicell", cost: 100, kind: "energy", blurb: "Ger 1 raid-energi direkt." },
  { id: "walls", name: "Förstärkta väggar", cost: 240, kind: "reduce", value: 40, charges: 2, blurb: "Tar bort 40 % av de två nästa stölderna." },
  { id: "key", name: "Mästernyckel", cost: 100, kind: "discount", blurb: "Nästa rån kostar 1 raid-energi mindre." },
];

const CRYPTO_DEFENSES: Defense[] = [
  { id: "firewall", name: "Brandvägg", cost: 160, kind: "reduce", value: 45, blurb: "Tar bort 45 % av nästa hack." },
  { id: "wallet", name: "Skendosa", cost: 380, kind: "block", blurb: "Stoppar ett hack och avslöjar hackaren.", reveals: true },
  { id: "cleaner", name: "Spårstädare", cost: 180, kind: "trace", value: 30, blurb: "Sänker ditt spår med 30." },
  { id: "slot", name: "Extra verktyg", cost: 350, kind: "slot", blurb: "Höjer max antal verktygsladdningar med 1." },
];

const PIRATE_DEFENSES: Defense[] = [
  { id: "guard", name: "Vaktbesättning", cost: 120, kind: "reduce", value: 35, blurb: "Tar bort 35 % av nästa stöld." },
  { id: "decoy", name: "Skattkista", cost: 350, kind: "block", blurb: "Stoppar ett rån och kostar piraten 100 guld.", reveals: true },
  { id: "cargo", name: "Låst lastutrymme", cost: 420, kind: "protect", value: 500, blurb: "500 guld ligger utanför rånarnas räckhåll hela matchen." },
  { id: "crew", name: "Extra besättning", cost: 250, kind: "slot", blurb: "Höjer ditt maxtak för besättning med 1." },
];

const VAULT_CHEST_OFFERS: ChestOffer[] = [
  {
    id: "safe",
    name: "Säker kista",
    blurb: "Mynt rakt ner i valvet — inget kan gå fel.",
    odds: "Alltid +90",
    kind: "gold",
  },
  {
    id: "raid",
    name: "Råntkista",
    blurb: "Tar 15 % av den rikaste rivalens oskyddade valv, högst 250.",
    odds: "Mot ledaren",
    kind: "steal",
  },
  {
    id: "wild",
    name: "Vågad kista",
    blurb: "Ett myntkast: stort byte eller en tullavgift till valvet.",
    odds: "50 / 50",
    kind: "bust",
  },
];

const CRYPTO_POWERS: Power[] = [
  // Both powers answer the same question — when do you want to be seen? — from
  // opposite sides: one erases the trail, the other spends it on one big hit.
  {
    id: "untrace",
    name: "Spårfritt",
    blurb: "Nollställer ditt spår direkt. En gång per match.",
    cost: 200,
    effect: "untrace",
    once: true,
  },
  {
    id: "insider",
    name: "Insider",
    blurb: "Nästa hack kostar 1 verktyg och tar 25 % (max 1 000). En gång per match.",
    cost: 200,
    effect: "insider",
    once: true,
  },
];

/** The safe chest: the payout that cannot lose. */
export const CHEST_SAFE_REWARD = 90;
/** The raid chest takes this share of the richest rival, capped. */
export const CHEST_RAID_PCT = 15;
export const CHEST_RAID_CAP = 250;
/** The wild chest: one coin flip between this win and this loss. */
export const CHEST_WILD_WIN = 350;
export const CHEST_WILD_LOSS = 100;
export const CHEST_WILD_CHANCE = 0.5;
/** A chest with no useful target still pays this, never nothing. */
export const CHEST_FALLBACK_REWARD = 90;
/** A revealed raider pays this much for walking into the trap. */
export const RAID_EXPOSURE_FEE = 100;
/** Every new question tops the raid energy back up by one. */
export const ROUND_ENERGY = 1;
/** How long a robbed player cannot be hit again. */
export const PROTECTION_MS = 30000;
/** Crypto's trace cools by this much at the start of every question. */
export const TRACE_DECAY = 8;
/** A quiet hack: two tools for a slice of the purse. */
export const QUIET_HACK = { pct: 12, cap: 600 } as const;
/** Going loud: one more tool, a bigger slice, and the whole room knows. */
export const EXPOSED_HACK = { pct: 20, cap: 900, tools: 1, trace: 20 } as const;
/** Insider: one hack at 25 %, for a single tool, whatever the trace says. */
export const INSIDER_HACK = { pct: 25, cap: 1000, tools: 1 } as const;
/**
 * Being exposed has to cost something the victim can feel. Everyone can see an
 * exposed hacker's exact balance, and every hack against them lands bigger: the
 * room knows where the wallet is. Without this, "Avslöjad" was only a bigger
 * hack for the person who got there.
 */
export const EXPOSED_TARGET_MULTIPLIER = 1.5;

/**
 * The three economies, on one skeleton.
 *
 * Every mode starts on the same purse, pays the same kind of correct answer and
 * spends one action resource that refills once per question and once per right
 * answer. What differs is the decision:
 *  - Vault Raiders spends the action on a raid and hands every player one of
 *    three boxes, each a different bet, so the gamble is a real choice.
 *  - Crypto Clash spends it on a hack, and the trace decides whether the hack is
 *    quiet and small or loud and big.
 *  - Pirate Heist spends it on a raid whose odds you choose; the fee is an ante,
 *    not the price of the loot, so bolder dice are worth more on average.
 */
export const MODE_RULES: Record<HeistMode, ModeRules> = {
  vault: {
    id: "vault",
    name: "Vault Raiders",
    tagline: "Fyll valvet, råna grannen, bygg larm.",
    currency: "Valvmynt",
    currencyShort: "mynt",
    startBalance: 1000,
    startEnergy: 2,
    maxEnergy: 4,
    energyName: "Raid-energi",
    correctBalance: 100,
    correctEnergy: 1,
    raidCost: 2,
    raidPct: 15,
    raidCap: 500,
    chests: VAULT_CHEST_OFFERS,
    defenses: VAULT_DEFENSES,
    mint: { first: 100, second: 70, third: 50, rest: 30, perRaid: 10, bonusCap: 30 },
  },
  crypto: {
    id: "crypto",
    name: "Crypto Clash",
    tagline: "Hacka tyst, eller gå högljutt när spåret redan är högt.",
    currency: "Crypto",
    currencyShort: "crypto",
    startBalance: 1000,
    startEnergy: 2,
    maxEnergy: 4,
    energyName: "Verktyg",
    correctBalance: 120,
    correctEnergy: 1,
    raidCost: 2,
    raidPct: QUIET_HACK.pct,
    raidCap: QUIET_HACK.cap,
    // 22 trace per landed hack and 8 cooling per question means a steady hacker
    // crosses the line around question five — early enough to matter, late
    // enough that it is a decision rather than an accident.
    trace: { success: 22, fail: 32, exposed: 65 },
    powers: CRYPTO_POWERS,
    defenses: CRYPTO_DEFENSES,
    mint: { first: 120, second: 80, third: 50, rest: 30, perRaid: 5, bonusCap: 25 },
  },
  pirate: {
    id: "pirate",
    name: "Pirate Heist",
    tagline: "Välj dina tärningar — djärvare rån tar mer, men missar oftare.",
    currency: "Piratguld",
    currencyShort: "guld",
    startBalance: 1000,
    startEnergy: 2,
    maxEnergy: 4,
    energyName: "Besättning",
    correctBalance: 100,
    correctEnergy: 1,
    raidCost: 2,
    raidPct: 0,
    raidCap: 0,
    styles: [
      // The fee is an ante, not the price of the loot: bolder dice cost a little
      // more and miss more often, but their expected take is higher at every
      // purse size. The old fees (50/200/300) made the bold raids lose money.
      { id: "stealth", name: "Smygrån", cost: 40, chance: 0.85, pct: 8, cap: 300, verb: "smygrånade" },
      { id: "quick", name: "Snabbrån", cost: 60, chance: 0.65, pct: 16, cap: 700, verb: "snabbrånade" },
      { id: "full", name: "Full attack", cost: 90, chance: 0.45, pct: 32, cap: 1200, verb: "gick till full attack mot" },
    ],
    defenses: PIRATE_DEFENSES,
    mint: { first: 110, second: 75, third: 50, rest: 30, perRaid: 10, bonusCap: 30 },
  },
};

export const HEIST_MODES: HeistMode[] = ["vault", "crypto", "pirate"];

/**
 * The one-line reason each mode exists, for the picker and the manual.
 *
 * Three modes that all read "earn currency, raid a rival" are indistinguishable
 * from the outside, which is the confusion this answers: what you earn, what a
 * move costs, the twist that is unique to the mode, and what it can cost you.
 * Every number is read out of `MODE_RULES`, so a balance change updates the
 * poster as well as the panel.
 */
export type ModeIdentity = {
  earns: { sv: string; en: string };
  spends: { sv: string; en: string };
  twist: { sv: string; en: string };
  risk: { sv: string; en: string };
};

export const MODE_IDENTITY: Record<HeistMode, ModeIdentity> = {
  vault: (() => {
    const rules = MODE_RULES.vault;
    return {
      earns: {
        sv: `+${rules.correctBalance} ${rules.currencyShort} per rätt svar`,
        en: `+${rules.correctBalance} ${rules.currencyShort} per correct answer`,
      },
      spends: {
        sv: `${rules.raidCost} ${rules.energyName.toLowerCase()} per rån`,
        en: `${rules.raidCost} ${rules.energyName.toLowerCase()} per raid`,
      },
      twist: {
        sv: `En kista per fråga, ${rules.chests?.length ?? 0} olika vad: säker, mot ledaren eller 50/50`,
        en: `One chest a question, ${rules.chests?.length ?? 0} different bets: safe, leader or 50/50`,
      },
      risk: {
        sv: "Låg — bara den vågade kistan kan kosta dig mynt; ett rån kan blockas men kostar bara energi",
        en: "Low — only the wild chest can cost you coins; a raid can be blocked but only costs energy",
      },
    };
  })(),
  crypto: (() => {
    const rules = MODE_RULES.crypto;
    const exposed = rules.trace?.exposed ?? 65;
    return {
      earns: {
        sv: `+${rules.correctBalance} ${rules.currencyShort} per rätt svar`,
        en: `+${rules.correctBalance} ${rules.currencyShort} per correct answer`,
      },
      spends: {
        sv: `${rules.raidCost} ${rules.energyName.toLowerCase()} per hack`,
        en: `${rules.raidCost} ${rules.energyName.toLowerCase()} per hack`,
      },
      twist: {
        sv: `Vid ${exposed} spår blir hacket högljutt: ${EXPOSED_HACK.tools} verktyg extra men ${EXPOSED_HACK.pct} % (max ${EXPOSED_HACK.cap})`,
        en: `At ${exposed} trace a hack goes loud: ${EXPOSED_HACK.tools} extra tool but ${EXPOSED_HACK.pct}% (max ${EXPOSED_HACK.cap})`,
      },
      risk: {
        sv: `Hög — en avslöjad hackare syns exakt och alla tar ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)} % mer av hen`,
        en: `High — an exposed hacker is shown exactly and everyone takes ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)}% more from them`,
      },
    };
  })(),
  pirate: (() => {
    const rules = MODE_RULES.pirate;
    const styles = rules.styles ?? [];
    const cheapest = Math.min(...styles.map((s) => s.cost));
    const dearest = Math.max(...styles.map((s) => s.cost));
    const boldest = styles[styles.length - 1];
    return {
      earns: {
        sv: `+${rules.correctBalance} ${rules.currencyShort} per rätt svar`,
        en: `+${rules.correctBalance} ${rules.currencyShort} per correct answer`,
      },
      spends: {
        sv: `${rules.raidCost} ${rules.energyName.toLowerCase()} + ${cheapest}–${dearest} ${rules.currencyShort} per rån`,
        en: `${rules.raidCost} ${rules.energyName.toLowerCase()} + ${cheapest}–${dearest} ${rules.currencyShort} per raid`,
      },
      twist: {
        sv: `${styles.length} tärningar: ${Math.round((boldest?.chance ?? 0) * 100)} % chans för ${boldest?.pct ?? 0} % — ju djärvare, desto större förväntat byte`,
        en: `${styles.length} dice: ${Math.round((boldest?.chance ?? 0) * 100)}% chance for ${boldest?.pct ?? 0}% — bolder pays more on average`,
      },
      risk: {
        sv: "Hög — ett misslyckat rån kostar avgiften ändå",
        en: "High — a failed raid keeps the fee",
      },
    };
  })(),
};

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
  /** Cyber Hack: "Insider" is armed and the next hack spends it. */
  insider: boolean;
  /** One-shot powers already bought, by id, so none can be bought twice. */
  usedPowers: string[];
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
    players[name] = {
      ...p,
      defenses: [...p.defenses],
      raided: [...p.raided],
      // A match that started before this field shipped has no ledger yet.
      usedPowers: [...(p.usedPowers ?? [])],
    };
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
      insider: false,
      usedPowers: [],
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
 * Every round pays out one action point (so a player who missed a question is
 * never locked out of the raid game) and cools trace by `TRACE_DECAY`, so being
 * exposed is a window rather than a life sentence.
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
 * What one raid costs, in the mode's own action resource.
 *
 * Every mode charges the same two points for an attempt, which is what makes
 * "one raid per question" true everywhere. Crypto's exposed hacker pays one
 * more tool, an armed Insider needs only one, and a Vault master key shaves one
 * off, never below one. Pirate's gold fee is separate and lives on the style.
 */
export function raidCostFor(mode: HeistMode, player: HeistPlayer): number {
  const rules = MODE_RULES[mode];
  if (rules.id === "crypto") {
    if (player.insider) return INSIDER_HACK.tools;
    const exposed = Boolean(rules.trace && player.trace >= rules.trace.exposed);
    return rules.raidCost + (exposed ? EXPOSED_HACK.tools : 0);
  }
  if (rules.styles) return rules.raidCost;
  return Math.max(1, rules.raidCost - (player.raidDiscount > 0 ? 1 : 0));
}

/** How many of a defense a player still holds. A wall counts twice. */
export function ownedCharges(player: HeistPlayer, id: string): number {
  return player.defenses.filter((d) => d === id).length;
}

/**
 * True when the shop should refuse to sell this again.
 *
 * A charged defense is armed until it is used up, not topped up mid-way: a
 * two-charge wall that could be refilled at one charge would quietly become a
 * three-charge wall, which is not what the shop says it sells.
 */
export function maxedOut(mode: HeistMode, player: HeistPlayer, defense: Defense): boolean {
  if (defense.kind === "protect" || defense.kind === "block" || defense.kind === "reduce") {
    return ownedCharges(player, defense.id) > 0;
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

/** What is actually on the table if you raid this player right now. */
export function reachableGold(mode: HeistMode, target: HeistPlayer): number {
  return Math.max(0, target.balance - protectedGold(mode, target));
}

/**
 * What the attacker's move is worth before the target's block or reduction
 * answers it. The three numbers that decide a raid live here and nowhere else,
 * so the button, the feed and the host cannot disagree about the odds.
 */
export type AttackTuning = {
  pct: number;
  cap: number;
  chance: number;
  /** Pirate's gold ante; zero in the other modes. */
  fee: number;
  exposed: boolean;
  insider: boolean;
};

export function attackTuning(
  mode: HeistMode,
  player: HeistPlayer,
  style?: RaidStyle
): AttackTuning {
  const rules = MODE_RULES[mode];
  if (style) {
    return { pct: style.pct, cap: style.cap, chance: style.chance, fee: style.cost, exposed: false, insider: false };
  }
  const exposed = Boolean(rules.trace && player.trace >= rules.trace.exposed);
  if (mode === "crypto" && player.insider) {
    return { pct: INSIDER_HACK.pct, cap: INSIDER_HACK.cap, chance: 1, fee: 0, exposed, insider: true };
  }
  if (mode === "crypto" && exposed) {
    return { pct: EXPOSED_HACK.pct, cap: EXPOSED_HACK.cap, chance: 1, fee: 0, exposed, insider: false };
  }
  return { pct: rules.raidPct, cap: rules.raidCap, chance: 1, fee: 0, exposed, insider: false };
}

/**
 * What a raid would take before the target's block or reduction answers it.
 *
 * The panel shows this number on every rival so the choice between a cheap
 * sneak and an all-out attack is made on evidence rather than on arithmetic
 * the player has to do in their head between two questions. It is also what
 * `applyAction` resolves, so the promise on the button and the outcome cannot
 * disagree.
 */
export function projectedSteal(
  mode: HeistMode,
  target: HeistPlayer,
  opts: { raider?: HeistPlayer; style?: RaidStyle } = {}
): number {
  const tuning = opts.raider
    ? attackTuning(mode, opts.raider, opts.style)
    : opts.style
      ? { pct: opts.style.pct, cap: opts.style.cap }
      : { pct: MODE_RULES[mode].raidPct, cap: MODE_RULES[mode].raidCap };
  const bonus = exposedBonus(mode, target);
  return Math.max(
    0,
    Math.min(Math.floor(tuning.cap * bonus), Math.floor((reachableGold(mode, target) * tuning.pct * bonus) / 100))
  );
}

/** The trace level at which a Crypto hacker is exposed, or null in other modes. */
export function exposureAt(mode: HeistMode): number | null {
  return MODE_RULES[mode].trace?.exposed ?? null;
}

/**
 * How much easier an exposed player is to rob, as a multiplier.
 *
 * Only Crypto Clash has a trace, and only while the target is over the line.
 * Read by the button, the feed and `applyAction`, so the faint "+50 %" on a
 * rival's row is the number the hack actually pays.
 */
export function exposedBonus(mode: HeistMode, target: HeistPlayer): number {
  const rules = MODE_RULES[mode];
  if (!rules.trace) return 1;
  return target.trace >= rules.trace.exposed ? EXPOSED_TARGET_MULTIPLIER : 1;
}

/** True when this player still has a chest to open this round. */
export function chestOpen(state: HeistState, name: string): boolean {
  const player = state.players[name];
  if (!player || !MODE_RULES[state.mode].chests) return false;
  return player.chestRound !== state.round;
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
    // One source of truth for the shop: the same `maxedOut` the panel uses to
    // grey the card also refuses the purchase if a stale client asks anyway.
    if (maxedOut(state.mode, me, defense)) {
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

  // ── Vault Raiders chest ────────────────────────────────────────────────
  if (action.kind === "chest") {
    const offers = rules.chests;
    if (!offers) return { ok: false, error: "Det här läget har inga kistor." };
    // One tap a round: without this a player could sit on the chest button and
    // gamble the whole match away between two questions.
    if (me.chestRound === next.round) {
      return { ok: false, error: "Du har redan öppnat en kista den här rundan." };
    }
    // The three boxes are three different bets, not three draws from one table.
    // The index is the decision; a caller that sends none gets the safe box.
    const index = typeof action.chest === "number" ? Math.min(offers.length - 1, Math.max(0, Math.floor(action.chest))) : 0;
    const offer = offers[index];
    me.chestRound = next.round;

    const before = me.balance;
    let rival: string | undefined;
    let kind: ChestKind = offer.kind;
    let text: string;

    if (offer.id === "safe") {
      me.balance += CHEST_SAFE_REWARD;
      text = `${name} öppnade ${offer.name}: +${CHEST_SAFE_REWARD} ${rules.currencyShort}.`;
    } else if (offer.id === "raid") {
      // The raid box takes from the leader, whose purse the room can already
      // see. A slice of the biggest vault is why it is worth skipping the sure
      // payout — and why a fat vault should buy a defense.
      const victim = Object.values(next.players)
        .filter((p) => p.name !== name)
        .sort((a, b) => reachableGold(state.mode, b) - reachableGold(state.mode, a))[0];
      const reachable = victim ? reachableGold(state.mode, victim) : 0;
      const steal = victim ? Math.min(CHEST_RAID_CAP, Math.floor((reachable * CHEST_RAID_PCT) / 100)) : 0;
      if (victim && steal > 0) {
        rival = victim.name;
        victim.balance -= steal;
        me.balance += steal;
        text = `${name} öppnade ${offer.name} och tog ${steal} ${rules.currencyShort} från ${victim.name}.`;
      } else {
        kind = "gold";
        me.balance += CHEST_FALLBACK_REWARD;
        text = `${name} öppnade ${offer.name}, men inget låg inom räckhåll — valvet gav ${CHEST_FALLBACK_REWARD} ${rules.currencyShort}.`;
      }
    } else {
      // The only box that can cost coins. That risk is what makes the safe box
      // a real option instead of the one nobody taps.
      if (rng() < CHEST_WILD_CHANCE) {
        kind = "gold";
        me.balance += CHEST_WILD_WIN;
        text = `${name} öppnade ${offer.name} och vann: +${CHEST_WILD_WIN} ${rules.currencyShort}.`;
      } else {
        const loss = Math.min(CHEST_WILD_LOSS, me.balance);
        me.balance -= loss;
        kind = "bust";
        text = `${name} öppnade ${offer.name} och förlorade ${loss} ${rules.currencyShort}.`;
      }
    }

    pushEvent(next, text, now);
    const reveal: ChestReveal = {
      name,
      keen: me.keen,
      chest: index,
      kind,
      title: offer.name,
      blurb: offer.blurb,
      delta: me.balance - before,
      rival,
      text,
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
      // A side drill should be a bonus, not a second quiz: it pays a little more
      // than one correct answer and less than an answer plus a streak.
      const reward = 100 + Math.min(60, player.hackProgress * 20);
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
    if (power.once && powerUsed(me, power)) return { ok: false, error: `Du har redan använt ${power.name} en gång.` };
    if (me.balance < power.cost) {
      return { ok: false, error: `Du behöver ${power.cost} ${rules.currencyShort} för ${power.name}.` };
    }
    me.balance -= power.cost;
    // The ledger is written on purchase, so a power whose effect is consumed by
    // the next hack is still a once-a-match purchase.
    me.usedPowers = [...(me.usedPowers ?? []), power.id];
    if (power.effect === "untrace") {
      const wiped = me.trace;
      me.trace = 0;
      pushEvent(
        next,
        wiped > 0
          ? `${name} använde ${power.name} och nollställde spåret (−${wiped}).`
          : `${name} använde ${power.name} utan att ha något spår att tvätta.`,
        now
      );
    } else {
      me.insider = true;
      pushEvent(
        next,
        `${name} använde ${power.name}: nästa hack kostar 1 verktyg och tar ${INSIDER_HACK.pct} % (max ${INSIDER_HACK.cap}).`,
        now
      );
    }
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

  // One action cost for every mode, checked before anything is spent. Pirate's
  // gold ante is checked here too, so a refused raid never quietly eats crew.
  const cost = raidCostFor(state.mode, me);
  if (me.energy < cost) {
    const exposed = Boolean(
      rules.id === "crypto" && !me.insider && rules.trace && me.trace >= rules.trace.exposed
    );
    return {
      ok: false,
      error: `Du behöver ${cost} ${rules.energyName.toLowerCase()}${exposed ? " — du är avslöjad, så hacket kostar 1 extra" : ""}.`,
    };
  }
  if (style && me.balance < style.cost) {
    return { ok: false, error: `Du behöver ${style.cost} ${rules.currencyShort} för ${style.name}.` };
  }
  me.energy -= cost;
  if (me.raidDiscount > 0) me.raidDiscount = 0;
  if (style) me.balance -= style.cost;

  // Pirate Heist is the one mode where the dice can simply say no. The ante is
  // kept, and the victim still gets their quiet moment so a losing streak
  // cannot be farmed onto one player.
  if (style && rng() > style.chance) {
    target.protectedUntil = now + PROTECTION_MS;
    pushEvent(
      next,
      `${name} misslyckades med ${style.name.toLowerCase()} mot ${target.name} — avgiften är förbrukad.`,
      now
    );
    return { ok: true, state: next };
  }

  // Cargo Hold keeps a slice of the purse out of every raid.
  const reachable = reachableGold(state.mode, target);
  const armedInsider = state.mode === "crypto" && me.insider && !style;
  const tuning = attackTuning(state.mode, me, style);
  let steal = projectedSteal(state.mode, target, { raider: me, style });

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
    pushEvent(next, `${name} kom inte åt ${target.name}s ${rules.currencyShort}.`, now);
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
    const verb = style
      ? style.verb
      : rules.id === "crypto"
        ? tuning.insider
          ? "gick inifrån och hackade"
          : tuning.exposed
            ? "hackade högljutt"
            : "hackade"
        : "rånade";
    pushEvent(next, `${name} ${verb} ${target.name}: ${steal} ${rules.currencyShort}.`, now);
  }
  // Every attempt buys the victim a moment of peace, blocked or not. Thirty
  // seconds covers a whole question, so nobody can be hit four times while the
  // host reads the next one.
  target.protectedUntil = now + PROTECTION_MS;

  // Insider is spent by the attempt, whether it landed or was blocked: it was
  // bought to make one hack, not to wait for a better board.
  if (armedInsider) me.insider = false;

  if (rules.trace) {
    const before = me.trace;
    // Going loud adds its own trace on top of the hack's, so exposure is a
    // window you spend rather than a state you can camp in.
    const loud = tuning.exposed && !tuning.insider ? EXPOSED_HACK.trace : 0;
    me.trace = Math.min(100, me.trace + (steal > 0 ? rules.trace.success : rules.trace.fail) + loud);
    // Announce the crossing once, not every hack while it lasts.
    if (before < rules.trace.exposed && me.trace >= rules.trace.exposed) {
      pushEvent(next, `${name} är avslöjad — spåret är uppe i ${me.trace}.`, now);
    }
  }

  return { ok: true, state: next };
}

/** Crypto Clash: trace cools by `TRACE_DECAY` per round. Returns null if nothing moved. */
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
