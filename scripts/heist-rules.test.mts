/**
 * The heist rules, checked away from the UI.
 *
 * Run with: node scripts/heist-rules.test.mts
 * Node strips the types itself, so this needs no test framework and no build.
 */
import assert from "node:assert/strict";
import {
  CHEST_FALLBACK_REWARD,
  CHEST_STEAL_CAP,
  MODE_RULES,
  POWER_GAIN_CAP,
  PROTECTION_MS,
  RAID_EXPOSURE_FEE,
  addCorrect,
  applyAction,
  breakStreak,
  chestOpen,
  decayTrace,
  hackChallengeFor,
  classicStreakBonus,
  heistStreakBonus,
  mintPayout,
  newHeist,
  nextRound,
  raidCostFor,
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

console.log("\nVault Raiders");
check("everyone starts equal", () => {
  const h = newHeist("vault", seats);
  assert.equal(h.players.Alva.balance, 1000);
  assert.equal(h.players.Alva.energy, 3);
  assert.equal(h.players.Bo.maxEnergy, 5);
});

check("a correct answer pays coins and one energy", () => {
  let h = newHeist("vault", seats);
  h = addCorrect(h, "Alva");
  assert.equal(h.players.Alva.balance, 1100);
  assert.equal(h.players.Alva.energy, 4);
  assert.equal(h.players.Alva.correct, 1);
});

check("energy stops at the cap, the coins do not", () => {
  let h = newHeist("vault", seats);
  for (let i = 0; i < 6; i++) h = addCorrect(h, "Alva");
  assert.equal(h.players.Alva.energy, 5);
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

check("a new round tops up one energy for everyone", () => {
  let h = newHeist("vault", seats);
  h.players.Alva.energy = 1;
  h.players.Bo.energy = 4;
  h.players.Cia.energy = 5;
  h = nextRound(h);
  assert.equal(h.players.Alva.energy, 2);
  assert.equal(h.players.Bo.energy, 5);
  assert.equal(h.players.Cia.energy, 5, "the cap still applies");
});

check("a new round also cools trace, so being exposed ends", () => {
  let h = newHeist("crypto", seats);
  h.players.Alva.trace = 15;
  h = nextRound(h);
  assert.equal(h.players.Alva.trace, 5);
});

check("a raid steals 15 % and costs two energy", () => {
  let h = newHeist("vault", seats);
  setBalance(h, "Alva", 2000);
  setBalance(h, "Bo", 3000);
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Alva.balance, 2450);
  assert.equal(h.players.Bo.balance, 2550);
  assert.equal(h.players.Alva.energy, 1);
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

check("a steel door removes 25 % and is spent", () => {
  let h = newHeist("vault", seats);
  setBalance(h, "Bo", 3000);
  h.players.Bo.defenses.push("door");
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Bo.balance, 2663); // 450 → 337 stolen
  assert.deepEqual(h.players.Bo.defenses, []);
});

check("a laser grid blocks the raid completely", () => {
  let h = newHeist("vault", seats);
  setBalance(h, "Bo", 3000);
  h.players.Bo.defenses.push("grid");
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Bo.balance, 3000);
  assert.equal(h.players.Alva.balance, 1000);
  assert.equal(h.players.Alva.energy, 1, "the energy is still spent");
  assert.deepEqual(h.players.Bo.defenses, []);
});

check("reinforced walls absorb two thefts", () => {
  const bought = applyAction(newHeist("vault", seats), "Bo", { kind: "fortify", defense: "walls" }, 1000);
  assert.equal(bought.ok, true);
  let h = (bought as { ok: true; state: HeistState }).state;
  setBalance(h, "Bo", 3000);
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Bo.balance, 2663); // 450 − 25 %
  assert.equal(h.players.Bo.defenses.length, 1, "one charge left");
  h = raid(h, "Cia", "Bo", 32000);
  assert.equal(h.players.Bo.balance, 2364); // 399 − 25 %
  assert.deepEqual(h.players.Bo.defenses, []);
});

check("a master key shaves one energy off one raid", () => {
  const bought = applyAction(newHeist("vault", seats), "Alva", { kind: "fortify", defense: "key" }, 1000);
  assert.equal(bought.ok, true);
  let h = (bought as { ok: true; state: HeistState }).state;
  assert.equal(h.players.Alva.balance, MODE_RULES.vault.startBalance - 150);
  const twice = applyAction(h, "Alva", { kind: "fortify", defense: "key" }, 1000);
  assert.equal(twice.ok, false, "one key at a time");
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Alva.energy, 2, "the cheap raid cost one");
  assert.equal(h.players.Alva.raidDiscount, 0, "the key is used up");
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

console.log("\nGold Quest chests");
check("a chest pays its coins", () => {
  const h = openChest(newHeist("vault", seats), "Alva", seq(0));
  assert.equal(h.players.Alva.balance, 1300);
  assert.equal(chestOpen(h, "Alva"), false);
});

check("one chest a round, and the next round has a fresh one", () => {
  const h = openChest(newHeist("vault", seats), "Alva", seq(0));
  const again = applyAction(h, "Alva", { kind: "chest" }, 1000, seq(0));
  assert.equal(again.ok, false, "a second chest in the same round is refused");
  const later = applyAction(nextRound(h), "Alva", { kind: "chest" }, 1000, seq(0));
  assert.equal(later.ok, true);
});

check("a steal chest robs a rival, capped", () => {
  const h = newHeist("vault", seats);
  setBalance(h, "Bo", 3000);
  // 0.4 lands on the steal row, then 0 picks the first rival.
  const next = openChest(h, "Alva", seq(0.4, 0));
  assert.equal(next.players.Bo.balance, 3000 - CHEST_STEAL_CAP);
  assert.equal(next.players.Alva.balance, 1000 + CHEST_STEAL_CAP);
});

check("a swap chest trades purses with a rival", () => {
  const h = newHeist("vault", seats);
  setBalance(h, "Alva", 800);
  setBalance(h, "Bo", 4000);
  // 0.6 lands on the swap row, then 0 picks the first rival.
  const next = openChest(h, "Alva", seq(0.6, 0));
  assert.equal(next.players.Alva.balance, 4000);
  assert.equal(next.players.Bo.balance, 800);
});

check("a shield chest hands over a laser grid", () => {
  const next = openChest(newHeist("vault", seats), "Alva", seq(0.75));
  assert.deepEqual(next.players.Alva.defenses, ["grid"]);
});

check("a storm chest powers up the next correct answer", () => {
  const out = applyAction(newHeist("vault", seats), "Alva", { kind: "chest", chest: 0 }, 1000, seq(0.9));
  assert.equal(out.ok, true);
  let h = (out as { ok: true; state: HeistState }).state;
  assert.equal(h.players.Alva.nextCorrectBonus, 180);
  h = addCorrect(h, "Alva");
  assert.equal(h.players.Alva.balance, 1280);
  assert.equal(h.players.Alva.nextCorrectBonus, 0);
});

check("every configured chest has a reward, including the removal of the dud", () => {
  const chests = MODE_RULES.vault.chests ?? [];
  assert.equal(chests.some((chest) => chest.kind === "dud" || chest.id === "empty"), false);
  assert.equal(chests.reduce((total, chest) => total + chest.weight, 0), 100);
  for (const roll of [0, 0.31, 0.39, 0.62, 0.71, 0.87, 0.99, 1]) {
    const out = pullChest(newHeist("vault", seats), "Alva", 0, seq(roll, 0));
    assert.ok(out.reveal);
    assert.ok(chests.some((chest) => chest.kind === out.reveal?.kind));
  }
});

check("a solo player gets a consolation payout instead of an empty rival chest", () => {
  const solo = newHeist("vault", [{ name: "Alva", keen: null }]);
  const steal = pullChest(solo, "Alva", 0, seq(0.4, 0));
  assert.equal(steal.reveal?.kind, "steal");
  assert.equal(steal.reveal?.delta, CHEST_FALLBACK_REWARD);
  const swap = pullChest(nextRound(solo), "Alva", 0, seq(0.6, 0));
  assert.equal(swap.reveal?.kind, "swap");
  assert.equal(swap.reveal?.delta, CHEST_FALLBACK_REWARD);
});

check("a chest with nothing stealable becomes a consolation payout", () => {
  const h = newHeist("vault", seats);
  h.players.Bo.balance = 0;
  const out = pullChest(h, "Alva", 0, seq(0.4, 0));
  assert.equal(out.reveal?.kind, "steal");
  assert.equal(out.reveal?.delta, CHEST_FALLBACK_REWARD);
  assert.equal(out.state.players.Bo.balance, 0);
});

check("an even-saldo swap pays the consolation reward instead of showing a dud", () => {
  const h = newHeist("vault", seats);
  const out = pullChest(h, "Alva", 0, seq(0.6, 0));
  assert.equal(out.reveal?.kind, "swap");
  assert.equal(out.reveal?.delta, CHEST_FALLBACK_REWARD);
});

check("each of the three chests holds its own thing", () => {
  // One tap chooses between three draws that were already rolled, so the tap is
  // a real decision rather than the same box with three labels on it.
  const kinds = [0, 1, 2].map(
    (chest) => pullChest(newHeist("vault", seats), "Alva", chest, seq(0, 0.4, 0.6)).reveal?.kind
  );
  assert.deepEqual(kinds, ["gold", "steal", "swap"]);
});

check("a chest index outside the three is clamped, not trusted", () => {
  const out = pullChest(newHeist("vault", seats), "Alva", 9, seq(0.4, 0.6, 0.75));
  assert.equal(out.reveal?.chest, 2);
});

check("the pull is handed back so the room can watch it", () => {
  const h = newHeist("vault", seats);
  setBalance(h, "Bo", 3000);
  // Draw one is the pouch, so box two is the steal, then 0 picks the first rival.
  const out = pullChest(h, "Alva", 1, seq(0, 0.4, 0));
  assert.equal(out.reveal?.name, "Alva");
  assert.equal(out.reveal?.chest, 1);
  assert.equal(out.reveal?.kind, "steal");
  assert.equal(out.reveal?.rival, "Bo");
  assert.equal(out.reveal?.delta, CHEST_STEAL_CAP);
  assert.equal(out.reveal?.text, out.state.events[0].text, "the reveal quotes the feed line");
  assert.equal(out.state.players.Bo.balance, 3000 - CHEST_STEAL_CAP);
});

check("a swap reports a loss when it trades down", () => {
  const h = newHeist("vault", seats);
  setBalance(h, "Alva", 5000);
  setBalance(h, "Bo", 400);
  const out = pullChest(h, "Alva", 0, seq(0.6, 0));
  assert.equal(out.reveal?.kind, "swap");
  assert.equal(out.reveal?.delta, -4600, "the reveal must not pretend a bad swap paid");
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
  assert.equal(h.players.Alva.balance, 1200);
  assert.equal(h.players.Alva.hackProgress, 1);
  assert.equal(h.players.Alva.hackScore, 1);
  const duplicate = applyAction(h, "Alva", { kind: "hack", answer: challenge.answer }, 1001);
  assert.equal(duplicate.ok, false);
  h = nextRound(h);
  const secondChallenge = hackChallengeFor(h.round, "Alva");
  const second = applyAction(h, "Alva", { kind: "hack", answer: secondChallenge.answer }, 2000);
  assert.equal(second.ok, true);
  h = (second as { ok: true; state: HeistState }).state;
  assert.equal(h.players.Alva.balance, 1420);
  assert.equal(h.players.Alva.hackProgress, 2);
  assert.equal(h.players.Alva.hackScore, 2);
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
check("a landed hack adds fifteen trace", () => {
  let h = newHeist("crypto", seats);
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Alva.trace, 15);
  assert.equal(h.players.Alva.balance, 1120);
});

check("a blocked hack still adds twenty-five trace", () => {
  let h = newHeist("crypto", seats);
  h.players.Bo.defenses.push("wallet");
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Alva.trace, 25);
  assert.equal(h.players.Bo.balance, 1000);
});

check("trace cools ten at a time and never goes negative", () => {
  let h = newHeist("crypto", seats);
  h.players.Alva.trace = 15;
  h = decayTrace(h) as HeistState;
  assert.equal(h.players.Alva.trace, 5);
  h = decayTrace(h) as HeistState;
  assert.equal(h.players.Alva.trace, 0);
  assert.equal(decayTrace(h), null);
});

check("an extra tool slot is sold once", () => {
  const first = applyAction(newHeist("crypto", seats), "Alva", { kind: "fortify", defense: "slot" }, 1000);
  assert.equal(first.ok, true);
  const h = (first as { ok: true; state: HeistState }).state;
  assert.equal(h.players.Alva.maxEnergy, 5);
  const second = applyAction(h, "Alva", { kind: "fortify", defense: "slot" }, 1000);
  assert.equal(second.ok, false);
});

check("doubling adds at most the cap, once a match", () => {
  const first = applyAction(newHeist("crypto", seats), "Alva", { kind: "power", power: "double" }, 1000);
  assert.equal(first.ok, true);
  const h = (first as { ok: true; state: HeistState }).state;
  assert.equal(h.players.Alva.balance, MODE_RULES.crypto.startBalance + POWER_GAIN_CAP);
  const again = applyAction(h, "Alva", { kind: "power", power: "double" }, 1000);
  assert.equal(again.ok, false);
  assert.equal(h.players.Alva.balance, MODE_RULES.crypto.startBalance + POWER_GAIN_CAP, "the refused press must not pay again");
});

check("an exposed hacker pays an extra tool", () => {
  const h = newHeist("crypto", seats);
  h.players.Alva.trace = 70;
  assert.equal(raidCostFor("crypto", h.players.Alva), 3);
  h.players.Alva.raidDiscount = 1;
  assert.equal(raidCostFor("crypto", h.players.Alva), 2, "a master key still helps");
  const out = applyAction(h, "Alva", { kind: "raid", target: "Bo" }, 1000);
  assert.equal(out.ok, true);
  assert.equal((out as { ok: true; state: HeistState }).state.players.Alva.energy, 1, "3 start − 2 with the key");
});

check("a drill miss that crosses the line exposes the hacker", () => {
  const h = newHeist("crypto", seats);
  h.players.Alva.trace = 65;
  const wrong = applyAction(h, "Alva", { kind: "hack", answer: "not-the-answer" }, 2000);
  assert.equal(wrong.ok, true);
  assert.equal((wrong as { ok: true; state: HeistState }).state.players.Alva.trace, 75);
  assert.match((wrong as { ok: true; state: HeistState }).state.events[0].text, /avslöjad/);
});

check("a power-up from another mode is refused", () => {
  const out = applyAction(newHeist("vault", seats), "Alva", { kind: "power", power: "double" }, 1000);
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
check("a successful quick raid pays the fee and steals", () => {
  let h = newHeist("pirate", seats);
  setBalance(h, "Bo", 3000);
  h = raid(h, "Alva", "Bo", 1000, "quick");
  assert.equal(h.players.Alva.balance, 1000 - 200 + 540); // 18 % of the purse
  assert.equal(h.players.Bo.balance, 2460);
});

check("a failed raid still costs the fee", () => {
  const h = newHeist("pirate", seats);
  setBalance(h, "Bo", 3000);
  const out = applyAction(h, "Alva", { kind: "raid", target: "Bo", style: "full" }, 1000, () => 0.99);
  assert.equal(out.ok, true);
  const next = (out as { ok: true; state: HeistState }).state;
  assert.equal(next.players.Alva.balance, 700);
  assert.equal(next.players.Bo.balance, 3000);
  assert.equal(next.players.Alva.raids, 0);
});

check("you cannot pay a raid you cannot afford", () => {
  const h = newHeist("pirate", seats);
  h.players.Alva.balance = 150;
  const out = applyAction(h, "Alva", { kind: "raid", target: "Bo", style: "full" }, 1000);
  assert.equal(out.ok, false);
});

check("a cargo hold keeps 500 gold out of reach", () => {
  const bought = applyAction(newHeist("pirate", seats), "Bo", { kind: "fortify", defense: "cargo" }, 1000);
  assert.equal(bought.ok, true);
  let h = (bought as { ok: true; state: HeistState }).state;
  setBalance(h, "Bo", 3000);
  h = raid(h, "Alva", "Bo", 1000, "quick");
  assert.equal(h.players.Bo.balance, 2550); // 18 % of (3000 − 500)
  assert.equal(h.players.Alva.balance, 1000 - 200 + 450);
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
  // A rich target makes the all-out raid the best expected play; a poor one
  // makes the cheap sneak better, so the choice depends on the board.
  const expected = (s: { chance: number; cap: number; pct: number; cost: number }, purse: number) =>
    s.chance * Math.min(s.cap, Math.floor((purse * s.pct) / 100)) - s.cost;
  assert.ok(expected(full, 3000) > expected(stealth, 3000));
  assert.ok(expected(stealth, 1000) > expected(full, 1000));
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
  setBalance(h, "Bo", 5000);
  h = raid(h, "Alva", "Bo", 1000);
  h.players.Alva.energy = 5;
  h = raid(h, "Alva", "Bo", 32000);
  assert.equal(h.players.Alva.raids, 1, "one rival, one step");
  h.players.Alva.energy = 5;
  h = raid(h, "Alva", "Cia", 64000);
  assert.equal(h.players.Alva.raids, 2, "a new rival counts again");
});

check("a signed-in seat pays its account, not the nickname", () => {
  const h = newHeist("vault", seats);
  h.players.Alva.account = "alva_account";
  const paid = mintPayout(h).find((p) => p.username === "alva_account");
  assert.ok(paid, "the payout should use the account name");
});

console.log(`\n${passed} checks passed.`);
