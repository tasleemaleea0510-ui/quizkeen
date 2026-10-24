/**
 * The heist rules, checked away from the UI.
 *
 * Run with: node scripts/heist-rules.test.mts
 * Node strips the types itself, so this needs no test framework and no build.
 */
import assert from "node:assert/strict";
import {
  MODE_RULES,
  addCorrect,
  applyAction,
  decayTrace,
  mintPayout,
  newHeist,
  standings,
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
  assert.equal(h.players.Alva.balance, 1600);
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

check("a steel door removes 20 % and is spent", () => {
  let h = newHeist("vault", seats);
  setBalance(h, "Bo", 3000);
  h.players.Bo.defenses.push("door");
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Bo.balance, 2640); // 450 → 360 stolen
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
  assert.equal(h.players.Bo.balance, 2618); // 450 − 15 %
  assert.equal(h.players.Bo.defenses.length, 1, "one charge left");
  h = raid(h, "Cia", "Bo", 17000);
  assert.equal(h.players.Bo.balance, 2285); // 392 − 15 %
  assert.deepEqual(h.players.Bo.defenses, []);
});

check("a master key shaves one energy off one raid", () => {
  const bought = applyAction(newHeist("vault", seats), "Alva", { kind: "fortify", defense: "key" }, 1000);
  assert.equal(bought.ok, true);
  let h = (bought as { ok: true; state: HeistState }).state;
  assert.equal(h.players.Alva.balance, 400);
  const twice = applyAction(h, "Alva", { kind: "fortify", defense: "key" }, 1000);
  assert.equal(twice.ok, false, "one key at a time");
  h = raid(h, "Alva", "Bo", 1000);
  assert.equal(h.players.Alva.energy, 2, "the cheap raid cost one");
  assert.equal(h.players.Alva.raidDiscount, 0, "the key is used up");
  h = raid(h, "Alva", "Cia", 17000);
  assert.equal(h.players.Alva.energy, 0, "the next raid costs two again");
});

check("a robbed player is protected for fifteen seconds", () => {
  let h = newHeist("vault", seats);
  setBalance(h, "Bo", 5000);
  h = raid(h, "Alva", "Bo", 1000);
  const out = applyAction(h, "Cia", { kind: "raid", target: "Bo" }, 2000);
  assert.equal(out.ok, false);
  const later = applyAction(h, "Cia", { kind: "raid", target: "Bo" }, 17000);
  assert.equal(later.ok, true);
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
  assert.equal(h.players.Alva.balance, 1250); // 1000 − 200 + 450
  assert.equal(h.players.Bo.balance, 2550);
});

check("a failed raid still costs the fee", () => {
  const h = newHeist("pirate", seats);
  setBalance(h, "Bo", 3000);
  const out = applyAction(h, "Alva", { kind: "raid", target: "Bo", style: "full" }, 1000, () => 0.99);
  assert.equal(out.ok, true);
  const next = (out as { ok: true; state: HeistState }).state;
  assert.equal(next.players.Alva.balance, 650);
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
  assert.equal(h.players.Bo.balance, 2625); // 15 % of (3000 − 500)
  assert.equal(h.players.Alva.balance, 1175);
  assert.deepEqual(h.players.Bo.defenses, ["cargo"], "the hold is not spent");
});

check("every style must be named", () => {
  const h = newHeist("pirate", seats);
  const out = applyAction(h, "Alva", { kind: "raid", target: "Bo" }, 1000);
  assert.equal(out.ok, false);
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
  h = raid(h, "Alva", "Bo", 17000);
  assert.equal(h.players.Alva.raids, 1, "one rival, one step");
  h.players.Alva.energy = 5;
  h = raid(h, "Alva", "Cia", 34000);
  assert.equal(h.players.Alva.raids, 2, "a new rival counts again");
});

check("a signed-in seat pays its account, not the nickname", () => {
  const h = newHeist("vault", seats);
  h.players.Alva.account = "alva_account";
  const paid = mintPayout(h).find((p) => p.username === "alva_account");
  assert.ok(paid, "the payout should use the account name");
});

console.log(`\n${passed} checks passed.`);
