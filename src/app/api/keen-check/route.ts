import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  KEENS,
  MARKET_KEENS,
  OBTAINABLE_KEENS,
  RARITY_META,
  TOTAL_KEENS,
  dailyDeals,
  dayKey,
  isObtainable,
  keensInPack,
  rarityOdds,
} from "@/lib/keens";
import { buyKeen, loadKeenState, marketPriceFor, openPack, sellAllDuplicates, sellKeen } from "@/lib/keens-store";

export const dynamic = "force-dynamic";

const ID = "selftest-keen-profile";
const USER = "ZZ Selftest Keen";

export async function GET() {
  const checks: { name: string; pass: boolean; info?: unknown }[] = [];
  const check = (name: string, pass: boolean, info?: unknown) => checks.push({ name, pass, info });

  // ── catalogue ──────────────────────────────────────────────────────────────
  check("TOTAL_KEENS is the obtainable set", TOTAL_KEENS === OBTAINABLE_KEENS.length, {
    total: TOTAL_KEENS,
    ids: OBTAINABLE_KEENS.map((k) => k.id),
  });
  check("free pack only drops obtainable Keens", keensInPack("gratis").every((k) => OBTAINABLE_KEENS.includes(k)), keensInPack("gratis").map((k) => k.id));
  check("free pack odds are honest", rarityOdds("gratis").every((r) => keensInPack("gratis").some((k) => k.rarity === r.rarity)), rarityOdds("gratis"));
  check("market shows no untradeable Keen", MARKET_KEENS.every((k) => RARITY_META[k.rarity].tradeable), MARKET_KEENS.map((k) => k.id));
  check("every obtainable Keen exists in the catalogue", OBTAINABLE_KEENS.every((k) => KEENS.includes(k)));
  const deals = dailyDeals(dayKey());
  check("every deal is a Keen the market can sell", deals.every((d) => isObtainable(d.keen)), deals.map((d) => d.keen.id));
  check("every deal price is the price the server charges", deals.every((d) => marketPriceFor(d.keen.id) === d.price), deals.map((d) => [d.keen.id, d.price, marketPriceFor(d.keen.id)]));

  // ── scratch profile ────────────────────────────────────────────────────────
  await cleanup();
  await prisma.profile.create({ data: { id: ID, username: USER, coins: 100000 } });

  try {
    // Warm the connection and the compiler first: a cold first query is not what
    // a player waits for on their fifth pack.
    await openPack(ID, "gamer", 1);

    const single = Date.now();
    await openPack(ID, "gamer", 1);
    const oneMs = Date.now() - single;
    const triple = Date.now();
    await openPack(ID, "gamer", 3);
    const threeMs = Date.now() - triple;

    const beforeFive = await prisma.profile.findUnique({ where: { id: ID }, select: { coins: true } });
    const started = Date.now();
    const five = await openPack(ID, "gamer", 5);
    const ms = Date.now() - started;
    const perStatement = Math.round((oneMs / 4) * 10) / 10;
    check("a five-pack returns five pulls", five.ok && five.pulls.length === 5, five.ok ? { ms, pulls: five.pulls.length } : five);
    const refunded = five.ok ? five.refunded : 0;
    const afterFive = await prisma.profile.findUnique({ where: { id: ID }, select: { coins: true } });
    check("the wallet matches price minus duplicate refunds", afterFive?.coins === (beforeFive?.coins ?? 0) - 900 + refunded, {
      coins: afterFive?.coins,
      expected: (beforeFive?.coins ?? 0) - 900 + refunded,
      ms,
    });
    check("a five-pack is quick", ms < 4000, { ms, onePackMs: oneMs, threePackMs: threeMs, perStatement });

    const rows = await prisma.keenOpen.count({ where: { profileId: ID } });
    check("one history row per pull", rows === 10, { rows });
    const owned = await prisma.profileKeen.findMany({ where: { profileId: ID }, select: { keenId: true, count: true } });
    check("collection rows match the pulls", owned.reduce((a, r) => a + r.count, 0) === 10, owned);

    const retiredBuy = await buyKeen(ID, "kisse", 1);
    check("a Keen from a retired pack cannot be bought", !retiredBuy.ok && retiredBuy.error === "retired", retiredBuy);
    const liveBuy = await buyKeen(ID, "invader", 1);
    check("a Keen from a pack on sale can be bought", liveBuy.ok, liveBuy);

    const nine = await openPack(ID, "gamer", 9);
    check("an impossible amount is refused", !nine.ok && nine.error === "count", nine);
    const hidden = await openPack(ID, "djur", 1);
    check("a hidden pack is refused", !hidden.ok && hidden.error === "hidden", hidden);

    const free = await openPack(ID, "gratis", 1);
    check("the free pack opens once", free.ok, free.ok ? free.pulls : free);
    const freeAgain = await openPack(ID, "gratis", 1);
    check("the free pack then waits", !freeAgain.ok && freeAgain.error === "cooldown", freeAgain);

    // The complaint behind "9 shown but only 3 paid": the button's number and the
    // payout have to be the same number.
    const state = await loadKeenState(ID);
    const fresh = await prisma.profileKeen.findMany({ where: { profileId: ID }, select: { keenId: true, count: true } });
    const sold = await sellAllDuplicates(ID);
    check("sell-all pays for exactly the duplicates it showed", sold.ok && sold.sold === state.dupes, {
      shown: state.dupes,
      sold: sold.ok ? sold.sold : sold,
    });
    const sellable = fresh.reduce((a, r) => {
      const keen = KEENS.find((k) => k.id === r.keenId);
      return a + (keen && RARITY_META[keen.rarity].tradeable ? Math.max(0, r.count - 1) : 0);
    }, 0);
    check("the duplicate count only lists what can be sold", state.dupes === sellable, { shown: state.dupes, sellable });

    const afterSell = await loadKeenState(ID);
    check("selling leaves at most one of each", afterSell.dupes === 0, { dupes: afterSell.dupes });

    // You may sell what you hold, but never more than you hold.
    await openPack(ID, "gamer", 3);
    const held = await prisma.profileKeen.findMany({ where: { profileId: ID }, select: { keenId: true, count: true } });
    const spare = held.find((r) => r.count > 1);
    if (spare) {
      const allowed = await sellKeen(ID, spare.keenId, spare.count - 1);
      const lastOne = await sellKeen(ID, spare.keenId, 1);
      const tooMany = await sellKeen(ID, spare.keenId, 1);
      check("you cannot sell more copies than you own", allowed.ok && lastOne.ok && !tooMany.ok, { allowed, lastOne, tooMany });
    } else {
      check("you cannot sell more copies than you own", false, "no duplicate rolled in three packs");
    }
    const afterDistinct = await loadKeenState(ID);
    check("no collection counts past the total", afterDistinct.distinct <= TOTAL_KEENS && afterDistinct.total === TOTAL_KEENS, {
      distinct: afterDistinct.distinct,
      total: afterDistinct.total,
    });
  } finally {
    await cleanup();
  }

  const failed = checks.filter((c) => !c.pass);
  return NextResponse.json({ ok: failed.length === 0, failed: failed.length, checks }, { status: 200 });
}

async function cleanup() {
  await prisma.profileKeen.deleteMany({ where: { profileId: ID } });
  await prisma.keenOpen.deleteMany({ where: { profileId: ID } });
  await prisma.activity.deleteMany({ where: { username: USER } });
  await prisma.profile.deleteMany({ where: { id: ID } });
}
