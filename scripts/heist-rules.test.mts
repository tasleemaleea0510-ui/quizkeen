/**
 * The heist rules, checked away from the UI.
 *
 * Run with: node scripts/heist-rules.test.mts
 * Node strips the types itself, so this needs no test framework and no build.
 *
 * Two kinds of check live here:
 *  - Exact outcomes, so a balance tweak cannot silently change what a button
 *    pays while the button still promises the old number.
 *  - Design invariants, so the three modes keep the shape they were rebuilt
 *    around: one action per question, a risk premium in Pirate, and exposure in
 *    Crypto as a window rather than a permanent tax.
 */
import assert from "node:assert/strict";
import {
  CHEST_FALLBACK_REWARD,
  CHEST_RAID_CAP,
  CHEST_RAID_PCT,
  CHEST_SAFE_REWARD,
  CHEST_WILD_CHANCE,
  CHEST_WILD_LOSS,
  CHEST_WILD_WIN,
  EXPOSED_HACK,
  EXPOSED_TARGET_MULTIPLIER,
  INSIDER_HACK,
  MODE_IDENTITY,
  MODE_RULES,
  PROTECTION_MS,
  RAID_EXPOSURE_FEE,
  TRACE_DECAY,
  addCorrect,
  applyAction,
  breakStreak,
  chestOpen,
  decayTrace,
  exposedBonus,
  exposureAt,
  hackChallengeFor,
  classicStreakBonus,
  heistStreakBonus,
  mintPayout,
  newHeist,
  nextRound,
  powerUsed,
  projectedSteal,
  raidCostFor,
  reachableGold,
  standings,
  type ChestReveal,
  type HeistState,
} from "../src/lib/game-modes.ts";

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    throw err;
  }
}

const seats = [
  { name: "Alva", keen: "k1" },
  { name: "Bo", keen: null },
  { name: "Cia", keen: null },
];

function raid(state: HeistState, who: string, target: string, now: number, style?: string) {
  const out = applyAction(state, who, { kind: "raid", target, style }, now, () => 0);
  assert.equal(out.ok, true, "raid should be accepted");
  return (out as { ok: true; state: HeistState }).state;
}

function setBalance(state: HeistState, who: string, balance: number) {
  state.players[who].balance = balance;
  return state;
}

/** A draw that returns the given values in order, so a chest is predictable. */
function seq(...values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

function openChest(state: HeistState, who: string, rng: () => number) {
  const out = applyAction(state, who, { kind: "chest" }, 1000, rng);
  assert.equal(out.ok, true, "the chest should open");
  return (out as { ok: true; state: HeistState }).state;
}

/** Open a named chest and keep the whole result, reveal included. */
function pullChest(state: HeistState, who: string, chest: number, rng: () => number) {
  const out = applyAction(state, who, { kind: "chest", chest }, 1000, rng);
  assert.equal(out.ok, true, "the chest should open");
  return out as { ok: true; state: HeistState; reveal?: ChestReveal };
}

/** What a Pirate style is worth on average against a purse, after its ante. */
function expected(style: { chance: number; cap: number; pct: number; cost: number }, purse: number) {
  return style.chance * Math.min(style.cap, Math.floor((purse * style.pct) / 100)) - style.cost;
}

console.log("\nOne action economy");
check("the three modes start equal and share the action budget", () => {
  for (const mode of ["vault", "crypto", "pirate"] as const) {
    const h = newHeist(mode, seats);
    const rules = MODE_RULES[mode];
    assert.equal(h.players.Alva.balance, 1000, `${mode} starts on the same purse`);
    assert.equal(h.players.Alva.energy, rules.startEnergy);
    assert.equal(h.players.Alva.maxEnergy, rules.maxEnergy);
    assert.equal(rules.raidCost, 2, `${mode} charges the same action for an attempt`);
    assert.equal(rules.maxEnergy - rules.startEnergy, 2, `${mode} can bank at most two raids`);
  }
});

check("a correct answer pays the mode's currency and one action", () => {
  for (const mode of ["vault", "crypto", "pirate"] as const) {
    let h = newHeist(mode, seats);
    const before = h.players.Alva.energy;
    h = addCorrect(h, "Alva");
    assert.equal(h.players.Alva.balance, 1000 + MODE_RULES[mode].correctBalance);
    assert.equal(h.players.Alva.energy, Math.min(h.players.Alva.maxEnergy, before + 1));
    assert.equal(h.players.Alva.correct, 1);
  }
});

check("energy stops at the cap, the coins do not", () => {
  let h = newHeist("vault", seats);
  for (let i = 0; i < 6; i++) h = addCorrect(h, "Alva");
  assert.equal(h.players.Alva.energy, MODE_RULES.vault.maxEnergy);
  // 100 a hit, plus the streak reward (25/50/75, then capped at 75).
  assert.equal(h.players.Alva.balance, 1900);
  assert.equal(h.players.Alva.streak, 6);
});

check("a streak pays more, but only up to a point", () => {
  assert.equal(heistStreakBonus(1), 0);
  assert.equal(heistStreakBonus(2), 25);
  assert.equal(heistStreakBonus(3), 50);
  assert.equal(heistStreakBonus(4), 75);
  assert.equal(heistStreakBonus(12), 75);
});

check("a wrong answer ends the streak", () => {
  let h = newHeist("vault", seats);
  h = addCorrect(h, "Alva");
  h = addCorrect(h, "Alva");
  assert.equal(h.players.Alva.streak, 2);
  h = breakStreak(h, "Alva");
  assert.equal(h.players.Alva.streak, 0);
  h = addCorrect(h, "Alva");
  // 1000 + 100 + (100 + 25) + 100: after the reset the third hit pays no bonus.
  assert.equal(h.players.Alva.balance, 1325, "the ladder restarts at the first step");
});

check("a new round tops up one action for everyone", () => {
  let h = newHeist("vault", seats);
  h.players.Alva.energy = 1;
  h.players.Bo.energy = 3;
  h.players.Cia.energy = MODE_RULES.vault.maxEnergy;
  h = nextRound(h);
  assert.equal(h.players.Alva.energy, 2);
  assert.equal(h.players.Bo.energy, 4);
  assert.equal(h.players.Cia.energy, MODE_RULES.vault.maxEnergy, "the cap still applies");
});

console.log("\nVault Raiders");
check("a raid steals 15 % and costs two energy", () => {
  let h = newHeist("vault", seats);
  setBalance(h, "Alva", 2000);
  setBalance(h, "Bo", 3000);
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Alva.balance, 2450);
  assert.equal(h.players.Bo.balance, 2550);
  assert.equal(h.players.Alva.energy, 0);
  assert.equal(h.players.Alva.raids, 1);
});

check("one raid never takes more than 500", () => {
  let h = newHeist("vault", seats);
  setBalance(h, "Bo", 10000);
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Alva.balance, 1500);
  assert.equal(h.players.Bo.balance, 9500);
});

check("without two energy the raid is refused, not resolved", () => {
  const h = newHeist("vault", seats);
  h.players.Alva.energy = 1;
  const out = applyAction(h, "Alva", { kind: "raid", target: "Bo" }, 1000);
  assert.equal(out.ok, false);
  assert.equal(h.players.Bo.balance, 1000);
});

check("you cannot raid yourself", () => {
  const h = newHeist("vault", seats);
  const out = applyAction(h, "Alva", { kind: "raid", target: "Alva" }, 1000);
  assert.equal(out.ok, false);
});

check("a steel door removes 40 % and is spent", () => {
  let h = newHeist("vault", seats);
  setBalance(h, "Bo", 3000);
  h.players.Bo.defenses.push("door");
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Bo.balance, 2730); // 450 → 270 stolen
  assert.deepEqual(h.players.Bo.defenses, []);
});

check("a laser grid blocks the raid completely", () => {
  let h = newHeist("vault", seats);
  setBalance(h, "Bo", 3000);
  h.players.Bo.defenses.push("grid");
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Bo.balance, 3000);
  assert.equal(h.players.Alva.balance, 1000);
  assert.equal(h.players.Alva.energy, 0, "the energy is still spent");
  assert.deepEqual(h.players.Bo.defenses, []);
});

check("reinforced walls absorb two thefts", () => {
  const bought = applyAction(newHeist("vault", seats), "Bo", { kind: "fortify", defense: "walls" }, 1000);
  assert.equal(bought.ok, true);
  let h = (bought as { ok: true; state: HeistState }).state;
  setBalance(h, "Bo", 3000);
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Bo.balance, 2730); // 450 − 40 %
  assert.equal(h.players.Bo.defenses.length, 1, "one charge left");
  h = raid(h, "Cia", "Bo", 32000);
  assert.equal(h.players.Bo.balance, 2485); // 409 − 40 %
  assert.deepEqual(h.players.Bo.defenses, []);
});

check("a partly spent wall is not topped up into three charges", () => {
  let h = newHeist("vault", seats);
  const bought = applyAction(h, "Bo", { kind: "fortify", defense: "walls" }, 1000);
  h = (bought as { ok: true; state: HeistState }).state;
  h.players.Bo.defenses.pop(); // one charge used by an earlier raid
  const again = applyAction(h, "Bo", { kind: "fortify", defense: "walls" }, 2000);
  assert.equal(again.ok, false, "a charged defense is armed or spent, not refilled mid-way");
});

check("a master key shaves one energy off one raid", () => {
  const bought = applyAction(newHeist("vault", seats), "Alva", { kind: "fortify", defense: "key" }, 1000);
  assert.equal(bought.ok, true);
  let h = (bought as { ok: true; state: HeistState }).state;
  assert.equal(h.players.Alva.balance, MODE_RULES.vault.startBalance - 100);
  const twice = applyAction(h, "Alva", { kind: "fortify", defense: "key" }, 1000);
  assert.equal(twice.ok, false, "one key at a time");
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Alva.energy, 1, "the cheap raid cost one");
  assert.equal(h.players.Alva.raidDiscount, 0, "the key is used up");
  // Two energy left in the tank is not enough for a second raid.
  const refused = applyAction(h, "Alva", { kind: "raid", target: "Cia" }, 17000);
  assert.equal(refused.ok, false, "the next raid costs two again");
  h.players.Alva.energy = 2;
  h = raid(h, "Alva", "Cia", 17000);
  assert.equal(h.players.Alva.energy, 0, "the next raid costs two again");
});

check("a robbed player is protected for a whole question", () => {
  let h = newHeist("vault", seats);
  setBalance(h, "Bo", 5000);
  h = raid(h, "Alva", "Bo", 1000);
  const out = applyAction(h, "Cia", { kind: "raid", target: "Bo" }, 2000);
  assert.equal(out.ok, false);
  assert.equal(PROTECTION_MS, 30000);
  const early = applyAction(h, "Cia", { kind: "raid", target: "Bo" }, 29999);
  assert.equal(early.ok, false);
  const later = applyAction(h, "Cia", { kind: "raid", target: "Bo" }, 31000);
  assert.equal(later.ok, true);
});

check("a decoy blocks, names the thief and charges the trap fee", () => {
  let h = newHeist("vault", seats);
  setBalance(h, "Bo", 3000);
  h.players.Bo.defenses.push("decoy", "decoy");
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Bo.balance, 3000);
  assert.equal(h.players.Alva.balance, 1000 - RAID_EXPOSURE_FEE);
  assert.equal(h.players.Bo.defenses.length, 1, "the second charge stays armed");
  assert.match(h.events[0].text, /avslöjade/);
});

check("buying a shield needs the coins and stacks nothing", () => {
  const h = newHeist("vault", seats);
  h.players.Alva.balance = 500;
  h.players.Alva.energy = 1;
  const ok = applyAction(h, "Alva", { kind: "fortify", defense: "grid" }, 1000);
  assert.equal(ok.ok, true);
  const again = applyAction((ok as { ok: true; state: HeistState }).state, "Alva", { kind: "fortify", defense: "grid" }, 1000);
  assert.equal(again.ok, false);
  const broke = newHeist("vault", seats);
  broke.players.Alva.balance = 100;
  const poor = applyAction(broke, "Alva", { kind: "fortify", defense: "grid" }, 1000);
  assert.equal(poor.ok, false);
  assert.equal(broke.players.Alva.balance, 100, "a failed purchase must not charge");
});

console.log("\nClassic mode");
check("streak bonus rewards consistency but has a clear cap", () => {
  assert.equal(classicStreakBonus(0), 0);
  assert.equal(classicStreakBonus(1), 0);
  assert.equal(classicStreakBonus(2), 15);
  assert.equal(classicStreakBonus(6), 75);
  assert.equal(classicStreakBonus(12), 75);
});

console.log("\nVault Raiders chests");
check("the three boxes are three different bets, not one lottery", () => {
  const offers = MODE_RULES.vault.chests ?? [];
  assert.equal(offers.length, 3);
  assert.deepEqual(
    offers.map((offer) => offer.id),
    ["safe", "raid", "wild"],
    "the pick screen can name every box before the tap"
  );
  assert.equal(new Set(offers.map((offer) => offer.kind)).size, 3, "each box reads differently");
});

check("the safe chest always pays, and less than a correct answer", () => {
  const h = openChest(newHeist("vault", seats), "Alva", seq(0));
  assert.equal(h.players.Alva.balance, 1000 + CHEST_SAFE_REWARD);
  assert.equal(chestOpen(h, "Alva"), false);
  assert.ok(CHEST_SAFE_REWARD < MODE_RULES.vault.correctBalance, "luck must not beat knowledge");
});

check("one chest a round, and the next round has a fresh one", () => {
  const h = openChest(newHeist("vault", seats), "Alva", seq(0));
  const again = applyAction(h, "Alva", { kind: "chest" }, 1000, seq(0));
  assert.equal(again.ok, false, "a second chest in the same round is refused");
  const later = applyAction(nextRound(h), "Alva", { kind: "chest" }, 1000, seq(0));
  assert.equal(later.ok, true);
});

check("the raid chest takes from the leader, capped", () => {
  const h = newHeist("vault", seats);
  setBalance(h, "Bo", 3000);
  setBalance(h, "Cia", 2400);
  const next = pullChest(h, "Alva", 1, seq(0)).state;
  const take = Math.min(CHEST_RAID_CAP, Math.floor((3000 * CHEST_RAID_PCT) / 100));
  assert.equal(next.players.Bo.balance, 3000 - take);
  assert.equal(next.players.Cia.balance, 2400, "only the richest is raided");
  assert.equal(next.players.Alva.balance, 1000 + take);
  assert.equal(take, CHEST_RAID_CAP, "15 % of 3 000 is more than the cap");
});

check("the raid chest follows the leader, not a fixed seat", () => {
  const h = newHeist("vault", seats);
  setBalance(h, "Bo", 400);
  setBalance(h, "Cia", 1200);
  const out = pullChest(h, "Alva", 1, seq(0));
  assert.equal(out.reveal?.rival, "Cia");
  assert.equal(out.reveal?.delta, 180, "15 % of 1 200, under the cap");
});

check("the raid chest pays a consolation when nobody has anything to take", () => {
  const h = newHeist("vault", seats);
  h.players.Bo.balance = 0;
  h.players.Cia.balance = 0;
  const out = pullChest(h, "Alva", 1, seq(0));
  assert.equal(out.reveal?.delta, CHEST_FALLBACK_REWARD);
  assert.equal(out.state.players.Alva.balance, 1000 + CHEST_FALLBACK_REWARD);
});

check("the wild chest wins or loses on one coin flip", () => {
  const win = pullChest(newHeist("vault", seats), "Alva", 2, seq(CHEST_WILD_CHANCE - 0.01));
  assert.equal(win.reveal?.kind, "gold");
  assert.equal(win.reveal?.delta, CHEST_WILD_WIN);
  assert.equal(win.state.players.Alva.balance, 1000 + CHEST_WILD_WIN);

  const loss = pullChest(newHeist("vault", seats), "Alva", 2, seq(CHEST_WILD_CHANCE));
  assert.equal(loss.reveal?.kind, "bust");
  assert.equal(loss.reveal?.delta, -CHEST_WILD_LOSS, "the reveal must not hide a bad box");
  assert.equal(loss.state.players.Alva.balance, 1000 - CHEST_WILD_LOSS);
});

check("the wild chest can empty a purse but never overdraw it", () => {
  const h = newHeist("vault", seats);
  setBalance(h, "Alva", 40);
  const out = pullChest(h, "Alva", 2, seq(0.9));
  assert.equal(out.reveal?.delta, -40);
  assert.equal(out.state.players.Alva.balance, 0);
});

check("the three boxes are resolved by index, and a bad index is clamped", () => {
  const kinds = [0, 1, 2].map(
    (chest) => pullChest(newHeist("vault", seats), "Alva", chest, seq(0.9)).reveal?.kind
  );
  assert.deepEqual(kinds, ["gold", "steal", "bust"]);
  const clamped = pullChest(newHeist("vault", seats), "Alva", 9, seq(0.9));
  assert.equal(clamped.reveal?.chest, 2);
});

check("the pull is handed back so the room can watch it", () => {
  const h = newHeist("vault", seats);
  setBalance(h, "Bo", 3000);
  const out = pullChest(h, "Alva", 1, seq(0));
  assert.equal(out.reveal?.name, "Alva");
  assert.equal(out.reveal?.chest, 1);
  assert.equal(out.reveal?.kind, "steal");
  assert.equal(out.reveal?.rival, "Bo");
  assert.equal(out.reveal?.delta, CHEST_RAID_CAP);
  assert.equal(out.reveal?.text, out.state.events[0].text, "the reveal quotes the feed line");
  assert.equal(out.state.players.Bo.balance, 3000 - CHEST_RAID_CAP);
});

check("the other modes have no chests", () => {
  for (const mode of ["crypto", "pirate"] as const) {
    const out = applyAction(newHeist(mode, seats), "Alva", { kind: "chest" }, 1000);
    assert.equal(out.ok, false);
  }
});

console.log("\nCyber Hack skill drills");
check("the five skill challenges rotate deterministically", () => {
  const kinds = [1, 2, 3, 4, 5].map((round) => hackChallengeFor(round, "Alva").kind);
  assert.deepEqual(kinds, ["virus", "blueprint", "sequence", "passcode", "reboot"]);
  assert.deepEqual(hackChallengeFor(3, "Alva"), hackChallengeFor(3, "Alva"));
  assert.notDeepEqual(hackChallengeFor(3, "Alva"), hackChallengeFor(3, "Bo"));
});

check("a successful drill pays a growing capped combo reward and can only be used once per round", () => {
  let h = newHeist("crypto", seats);
  h = nextRound(h);
  const challenge = hackChallengeFor(h.round, "Alva");
  const first = applyAction(h, "Alva", { kind: "hack", answer: challenge.answer }, 1000);
  assert.equal(first.ok, true);
  h = (first as { ok: true; state: HeistState }).state;
  assert.equal(h.players.Alva.balance, 1120);
  assert.equal(h.players.Alva.hackProgress, 1);
  assert.equal(h.players.Alva.hackScore, 1);
  const duplicate = applyAction(h, "Alva", { kind: "hack", answer: challenge.answer }, 1001);
  assert.equal(duplicate.ok, false);
  h = nextRound(h);
  const secondChallenge = hackChallengeFor(h.round, "Alva");
  const second = applyAction(h, "Alva", { kind: "hack", answer: secondChallenge.answer }, 2000);
  assert.equal(second.ok, true);
  h = (second as { ok: true; state: HeistState }).state;
  assert.equal(h.players.Alva.balance, 1260);
  assert.equal(h.players.Alva.hackProgress, 2);
  assert.equal(h.players.Alva.hackScore, 2);
});

check("the drill pays less than a correct answer plus its streak", () => {
  const topDrill = 100 + 60;
  const answerWithStreak = MODE_RULES.crypto.correctBalance + heistStreakBonus(4);
  assert.ok(topDrill < answerWithStreak, "the side hack is a bonus, not the main income");
});

check("a wrong drill adds trace and breaks the streak", () => {
  let h = newHeist("crypto", seats);
  h = nextRound(h);
  const challenge = hackChallengeFor(h.round, "Alva");
  const success = applyAction(h, "Alva", { kind: "hack", answer: challenge.answer }, 1000);
  h = (success as { ok: true; state: HeistState }).state;
  h = nextRound(h);
  const wrong = applyAction(h, "Alva", { kind: "hack", answer: "not-the-answer" }, 2000);
  assert.equal(wrong.ok, true);
  h = (wrong as { ok: true; state: HeistState }).state;
  assert.equal(h.players.Alva.trace, 10);
  assert.equal(h.players.Alva.hackProgress, 0);
  assert.equal(h.players.Alva.hackScore, 1);
});

console.log("\nCrypto Clash");
check("a quiet hack costs two tools and adds 22 trace", () => {
  let h = newHeist("crypto", seats);
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Alva.trace, MODE_RULES.crypto.trace?.success);
  assert.equal(h.players.Alva.balance, 1120);
  assert.equal(h.players.Alva.energy, 0);
});

check("a blocked hack adds 32 trace", () => {
  let h = newHeist("crypto", seats);
  h.players.Bo.defenses.push("wallet");
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Alva.trace, MODE_RULES.crypto.trace?.fail);
  assert.equal(h.players.Bo.balance, 1000);
});

check("trace cools at the start of a question and never goes negative", () => {
  let h = newHeist("crypto", seats);
  h.players.Alva.trace = 15;
  h = decayTrace(h) as HeistState;
  assert.equal(h.players.Alva.trace, 15 - TRACE_DECAY);
  h = decayTrace(h) as HeistState;
  assert.equal(h.players.Alva.trace, 0);
  assert.equal(decayTrace(h), null);
});

check("an extra tool slot is sold once", () => {
  const first = applyAction(newHeist("crypto", seats), "Alva", { kind: "fortify", defense: "slot" }, 1000);
  assert.equal(first.ok, true);
  const h = (first as { ok: true; state: HeistState }).state;
  assert.equal(h.players.Alva.maxEnergy, MODE_RULES.crypto.maxEnergy + 1);
  const second = applyAction(h, "Alva", { kind: "fortify", defense: "slot" }, 1000);
  assert.equal(second.ok, false);
});

check("an exposed hacker trades one tool for a bigger hack", () => {
  const h = newHeist("crypto", seats);
  h.players.Alva.trace = MODE_RULES.crypto.trace?.exposed ?? 65;
  h.players.Alva.energy = 4;
  assert.equal(raidCostFor("crypto", h.players.Alva), MODE_RULES.crypto.raidCost + EXPOSED_HACK.tools);
  assert.equal(projectedSteal("crypto", h.players.Bo, { raider: h.players.Alva }), 200);
  const out = applyAction(h, "Alva", { kind: "raid", target: "Bo" }, 1000);
  assert.equal(out.ok, true);
  const next = (out as { ok: true; state: HeistState }).state;
  assert.equal(next.players.Alva.energy, 1, "the loud hack spent three tools");
  assert.equal(next.players.Alva.balance, 1200, "20 % of 1 000 instead of 12 %");
  assert.equal(next.players.Alva.trace, 100, "the loud hack also adds its extra trace");
  assert.match(next.events[0].text, /högljutt/);
});

check("an exposed target is easier to rob, and the panel promises the same number", () => {
  const h = newHeist("crypto", seats);
  h.players.Bo.trace = MODE_RULES.crypto.trace?.exposed ?? 65;
  const expectedTake = Math.min(
    Math.floor(MODE_RULES.crypto.raidCap * EXPOSED_TARGET_MULTIPLIER),
    Math.floor((1000 * MODE_RULES.crypto.raidPct * EXPOSED_TARGET_MULTIPLIER) / 100)
  );
  assert.equal(exposedBonus("crypto", h.players.Bo), EXPOSED_TARGET_MULTIPLIER);
  assert.equal(projectedSteal("crypto", h.players.Bo, { raider: h.players.Alva }), expectedTake);
  const out = applyAction(h, "Alva", { kind: "raid", target: "Bo" }, 1000);
  assert.equal(out.ok, true);
  const next = (out as { ok: true; state: HeistState }).state;
  assert.equal(next.players.Bo.balance, 1000 - expectedTake, "an exposed purse is easier to find");
  assert.equal(next.players.Alva.balance, 1000 + expectedTake);
});

check("a calm target gives no exposure bonus, in Crypto or any other mode", () => {
  const h = newHeist("crypto", seats);
  h.players.Bo.trace = (MODE_RULES.crypto.trace?.exposed ?? 65) - 1;
  assert.equal(exposedBonus("crypto", h.players.Bo), 1);
  assert.equal(exposedBonus("vault", h.players.Bo), 1);
  assert.equal(projectedSteal("crypto", h.players.Bo, { raider: h.players.Alva }), 120);
});

check("exposure is a window, not a permanent tax", () => {
  const h = newHeist("crypto", seats);
  h.players.Alva.trace = (MODE_RULES.crypto.trace?.exposed ?? 65) - 1;
  const loud = applyAction(h, "Alva", { kind: "raid", target: "Bo" }, 1000);
  const next = (loud as { ok: true; state: HeistState }).state;
  assert.ok(next.players.Alva.trace >= (MODE_RULES.crypto.trace?.exposed ?? 65));
  let cooled = next;
  for (let i = 0; i < 5; i++) cooled = nextRound(cooled);
  assert.ok(cooled.players.Alva.trace < (MODE_RULES.crypto.trace?.exposed ?? 65), "the trace falls back under the line");
});

check("a drill miss that crosses the line exposes the hacker", () => {
  const h = newHeist("crypto", seats);
  h.players.Alva.trace = MODE_RULES.crypto.trace?.exposed ?? 65;
  const wrong = applyAction(h, "Alva", { kind: "hack", answer: "not-the-answer" }, 2000);
  assert.equal(wrong.ok, true);
  const next = (wrong as { ok: true; state: HeistState }).state;
  assert.equal(next.players.Alva.trace, 75);
  assert.match(next.events[0].text, /avslöjad/);
});

check("Spårfritt wipes the trace, once per match, and is not free", () => {
  let h = newHeist("crypto", seats);
  h.players.Alva.trace = 60;
  h.players.Alva.balance = 1000;
  const out = applyAction(h, "Alva", { kind: "power", power: "untrace" }, 1000);
  assert.equal(out.ok, true);
  h = (out as { ok: true; state: HeistState }).state;
  assert.equal(h.players.Alva.trace, 0, "the trail is gone");
  assert.equal(h.players.Alva.balance, 800, "and it cost its 200 crypto");
  const again = applyAction(h, "Alva", { kind: "power", power: "untrace" }, 2000);
  assert.equal(again.ok, false, "a one-shot power cannot be bought twice");
});

check("Spårfritt is refused when you cannot pay for it", () => {
  const h = newHeist("crypto", seats);
  h.players.Alva.trace = 40;
  h.players.Alva.balance = 100;
  const out = applyAction(h, "Alva", { kind: "power", power: "untrace" }, 1000);
  assert.equal(out.ok, false);
  assert.equal(h.players.Alva.trace, 40, "nothing happened to the trace");
});

check("Insider arms one cheap, heavy hack and is spent by it", () => {
  let h = newHeist("crypto", seats);
  h.players.Alva.balance = 1000;
  h.players.Alva.trace = 80; // exposed, which Insider ignores
  const bought = applyAction(h, "Alva", { kind: "power", power: "insider" }, 1000);
  assert.equal(bought.ok, true);
  h = (bought as { ok: true; state: HeistState }).state;
  assert.equal(h.players.Alva.balance, 800);
  assert.equal(h.players.Alva.insider, true);
  assert.equal(raidCostFor("crypto", h.players.Alva), INSIDER_HACK.tools);
  const armed = h.players.Alva;
  const insidersTake = Math.floor((1000 * INSIDER_HACK.pct) / 100);
  assert.equal(projectedSteal("crypto", h.players.Bo, { raider: armed }), insidersTake);
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Alva.insider, false, "the hack spends the power");
  assert.equal(h.players.Alva.balance, 800 + insidersTake);
  const again = applyAction(h, "Alva", { kind: "power", power: "insider" }, 2000);
  assert.equal(again.ok, false, "the ledger still says it was bought");
});

check("each power is used up by its own ledger, not a shared flag", () => {
  const h = newHeist("crypto", seats);
  h.players.Alva.balance = 1000;
  const untrace = MODE_RULES.crypto.powers?.find((p) => p.id === "untrace");
  const insider = MODE_RULES.crypto.powers?.find((p) => p.id === "insider");
  assert.ok(untrace && insider);
  const bought = applyAction(h, "Alva", { kind: "power", power: "untrace" }, 1000);
  const next = (bought as { ok: true; state: HeistState }).state;
  assert.equal(powerUsed(next.players.Alva, untrace), true);
  assert.equal(powerUsed(next.players.Alva, insider), false, "Spårfritt does not spend Insider");
});

check("a power-up from another mode is refused", () => {
  const out = applyAction(newHeist("vault", seats), "Alva", { kind: "power", power: "insider" }, 1000);
  assert.equal(out.ok, false);
});

check("the trace cleaner wipes thirty points", () => {
  const h = newHeist("crypto", seats);
  h.players.Alva.trace = 50;
  h.players.Alva.balance = 500;
  const out = applyAction(h, "Alva", { kind: "fortify", defense: "cleaner" }, 1000);
  assert.equal(out.ok, true);
  assert.equal((out as { ok: true; state: HeistState }).state.players.Alva.trace, 20);
});

console.log("\nPirate Heist");
check("a successful quick raid pays the ante and steals", () => {
  let h = newHeist("pirate", seats);
  setBalance(h, "Bo", 3000);
  h = raid(h, "Alva", "Bo", 1000, "quick");
  assert.equal(h.players.Alva.balance, 1000 - 60 + 480); // 16 % of the purse
  assert.equal(h.players.Bo.balance, 2520);
  assert.equal(h.players.Alva.energy, 0, "the crew is spent too");
});

check("a failed raid keeps the ante and the crew", () => {
  const h = newHeist("pirate", seats);
  setBalance(h, "Bo", 3000);
  const out = applyAction(h, "Alva", { kind: "raid", target: "Bo", style: "full" }, 1000, () => 0.99);
  assert.equal(out.ok, true);
  const next = (out as { ok: true; state: HeistState }).state;
  assert.equal(next.players.Alva.balance, 910);
  assert.equal(next.players.Alva.energy, 0);
  assert.equal(next.players.Bo.balance, 3000);
  assert.equal(next.players.Alva.raids, 0);
});

check("you cannot pay a raid you cannot afford", () => {
  const h = newHeist("pirate", seats);
  h.players.Alva.balance = 50;
  const out = applyAction(h, "Alva", { kind: "raid", target: "Bo", style: "full" }, 1000);
  assert.equal(out.ok, false);
  assert.equal(h.players.Alva.energy, 2, "a refused raid does not eat crew");
});

check("a cargo hold keeps 500 gold out of reach", () => {
  const bought = applyAction(newHeist("pirate", seats), "Bo", { kind: "fortify", defense: "cargo" }, 1000);
  assert.equal(bought.ok, true);
  let h = (bought as { ok: true; state: HeistState }).state;
  setBalance(h, "Bo", 3000);
  h = raid(h, "Alva", "Bo", 1000, "quick");
  assert.equal(h.players.Bo.balance, 2600); // 16 % of (3000 − 500)
  assert.equal(h.players.Alva.balance, 1000 - 60 + 400);
  assert.deepEqual(h.players.Bo.defenses, ["cargo"], "the hold is not spent");
});

check("every style must be named", () => {
  const h = newHeist("pirate", seats);
  const out = applyAction(h, "Alva", { kind: "raid", target: "Bo" }, 1000);
  assert.equal(out.ok, false);
});

check("the three pirate styles are a real risk ladder", () => {
  const styles = MODE_RULES.pirate.styles ?? [];
  assert.equal(styles.length, 3);
  const [stealth, quick, full] = styles;
  assert.ok(stealth.cost < quick.cost && quick.cost < full.cost);
  assert.ok(stealth.chance > quick.chance && quick.chance > full.chance);
  assert.ok(stealth.cap < quick.cap && quick.cap < full.cap);
  // The whole point of the redesign: bolder dice must pay more on average, or
  // nobody would ever choose them. That has to hold at both a thin and a fat
  // purse, not only at the cap.
  for (const purse of [1000, 1500, 2000, 3000]) {
    assert.ok(expected(stealth, purse) > 0, `sneak is profitable at ${purse}`);
    assert.ok(expected(quick, purse) > expected(stealth, purse), `quick beats sneak at ${purse}`);
    assert.ok(expected(full, purse) > expected(quick, purse), `full beats quick at ${purse}`);
  }
});

console.log("\nStandings and Mint");
check("the biggest purse leads", () => {
  const h = newHeist("vault", seats);
  h.players.Cia.balance = 4000;
  assert.equal(standings(h)[0].name, "Cia");
});

check("placement Mint plus a capped raid bonus", () => {
  const h = newHeist("vault", seats);
  h.players.Alva.balance = 5000;
  h.players.Alva.raids = 9;
  h.players.Bo.balance = 2000;
  h.players.Cia.balance = 1000;
  const paid = mintPayout(h);
  assert.equal(paid[0].mint, MODE_RULES.vault.mint.first + MODE_RULES.vault.mint.bonusCap);
  assert.equal(paid[1].mint, MODE_RULES.vault.mint.second);
  assert.equal(paid[2].mint, MODE_RULES.vault.mint.third);
});

check("robbing the same rival twice pays one bonus step", () => {
  let h = newHeist("vault", seats);
  h = raid(h, "Alva", "Bo", 1000);
  h.players.Alva.energy = 2;
  h = raid(h, "Alva", "Bo", 32000);
  assert.equal(h.players.Alva.raids, 1, "variety is what the Mint bonus pays for");
});

check("a signed-in seat pays its account, not the nickname", () => {
  const h = newHeist("vault", seats);
  h.players.Alva.account = "alva@example.com";
  h.players.Alva.balance = 4000;
  const paid = mintPayout(h);
  const mine = paid.find((p) => p.username === "alva@example.com");
  assert.ok(mine, "the payout should use the account name");
});

console.log("\nPanel honesty and mode identity");
check("the projected steal is what a raid actually takes", () => {
  let h = newHeist("vault", seats);
  setBalance(h, "Bo", 2000);
  const projected = projectedSteal(h.mode, h.players.Bo);
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Bo.balance, 2000 - projected, "the button promises the outcome");
});

check("a projected steal respects the cap and the cargo hold", () => {
  const h = newHeist("pirate", seats);
  setBalance(h, "Bo", 9000);
  h.players.Bo.defenses.push("cargo");
  const full = MODE_RULES.pirate.styles?.find((s) => s.id === "full");
  assert.ok(full, "the all-out style exists");
  assert.equal(projectedSteal(h.mode, h.players.Bo, { style: full }), full.cap, "capped, not 32 % of 9000");
  assert.equal(reachableGold(h.mode, h.players.Bo), 9000 - 500, "the hold is out of reach");
});

check("only Crypto Clash has an exposure line", () => {
  assert.equal(exposureAt("crypto"), MODE_RULES.crypto.trace?.exposed);
  assert.equal(exposureAt("vault"), null);
  assert.equal(exposureAt("pirate"), null);
});

check("the mode identity quotes the rules it describes", () => {
  for (const id of ["vault", "crypto", "pirate"] as const) {
    const rules = MODE_RULES[id];
    assert.ok(
      MODE_IDENTITY[id].earns.sv.includes(String(rules.correctBalance)),
      `${id} should quote its own reward`
    );
    assert.ok(MODE_IDENTITY[id].twist.en.length > 0 && MODE_IDENTITY[id].risk.en.length > 0);
  }
  assert.ok(MODE_IDENTITY.crypto.twist.en.includes(String(MODE_RULES.crypto.trace?.exposed)));
  const cheapest = Math.min(...(MODE_RULES.pirate.styles ?? []).map((s) => s.cost));
  assert.ok(MODE_IDENTITY.pirate.spends.sv.includes(String(cheapest)), "pirate quotes its cheapest ante");
});

check("every raid cost in every mode is one action plus the mode's own cost", () => {
  for (const mode of ["vault", "crypto", "pirate"] as const) {
    const h = newHeist(mode, seats);
    assert.equal(raidCostFor(mode, h.players.Alva), MODE_RULES[mode].raidCost);
    // A raid is affordable at the start, and leaves the player unable to raid
    // again without a new question or a correct answer.
    const out = applyAction(
      h,
      "Alva",
      { kind: "raid", target: "Bo", style: mode === "pirate" ? "stealth" : undefined },
      1000,
      () => 0
    );
    assert.equal(out.ok, true, `${mode} can raid at the start`);
    const next = (out as { ok: true; state: HeistState }).state;
    assert.equal(
      next.players.Alva.energy,
      MODE_RULES[mode].startEnergy - MODE_RULES[mode].raidCost,
      `${mode} spends exactly one raid's action`
    );
    assert.equal(raidCostFor(mode, next.players.Alva), MODE_RULES[mode].raidCost);
  }
});

console.log(`\n${passed} checks passed.`);
