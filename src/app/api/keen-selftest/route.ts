import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buyKeen,
  loadKeenState,
  marketPriceFor,
  openPack,
  sellAllDuplicates,
  sellKeen,
} from "@/lib/keens-store";
import { KEEN_BY_ID, PACK_BY_ID, RARITY_META } from "@/lib/keens";

// TEMPORARY verification harness — deleted before this change is finished.
// It drives the real store against the real database with a throwaway profile,
// so the money handling (atomic spends, refunds, race protection) is proven
// rather than assumed.
export const dynamic = "force-dynamic";

export async function GET() {
  const id = `selftest-keen-${Math.random().toString(36).slice(2, 10)}`;
  const username = `selftest-${Math.random().toString(36).slice(2, 8)}`;
  const checks: { name: string; pass: boolean; detail?: string }[] = [];
  const check = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, detail });

  const balance = async () => (await prisma.profile.findUnique({ where: { id }, select: { coins: true } }))!.coins;

  try {
    await prisma.profile.create({ data: { id, username, coins: 5000 } });

    // 1. the free pack works once, then is on cooldown
    const free1 = await openPack(id, "gratis", 1);
    check("free pack opens", free1.ok, JSON.stringify(free1).slice(0, 120));
    const free2 = await openPack(id, "gratis", 1);
    check(
      "free pack is refused the second time",
      !free2.ok && free2.error === "cooldown",
      JSON.stringify(free2)
    );
    check("free pack costs nothing", (await balance()) === 5000, `coins=${await balance()}`);

    // 2. a paid pack costs exactly price×count, minus duplicate refunds
    const before = await balance();
    const paid = await openPack(id, "mytisk", 3);
    const after = await balance();
    if (paid.ok) {
      check("paid pack reports spend", paid.spent === 900, `spent=${paid.spent}`);
      check(
        "coins move by spent − refunded",
        before - after === paid.spent - paid.refunded,
        `${before} → ${after}, spent ${paid.spent}, refunded ${paid.refunded}`
      );
      check(
        "refund matches the sell price of duplicates",
        paid.pulls.every((p) => (p.isNew ? p.refund === 0 : p.refund === RARITY_META[p.rarity].sell)),
        JSON.stringify(paid.pulls)
      );
    } else {
      check("paid pack opens", false, JSON.stringify(paid));
    }

    // 3. the drawer and the ledger agree
    const state = await loadKeenState(id);
    const rows = await prisma.profileKeen.findMany({ where: { profileId: id } });
    const opens = await prisma.keenOpen.findMany({ where: { profileId: id } });
    check(
      "collection matches the rows",
      state.distinct === rows.length && rows.every((r) => state.owned[r.keenId] === r.count),
      JSON.stringify(rows)
    );
    check("every pull is logged", opens.length === 4, `opens=${opens.length}`);
    check(
      "no empty rows",
      rows.every((r) => r.count >= 1),
      JSON.stringify(rows.map((r) => [r.keenId, r.count]))
    );

    // 4. can't overspend
    await prisma.profile.update({ where: { id }, data: { coins: 10 } });
    const broke = await openPack(id, "godis", 1);
    check("too few coins is refused", !broke.ok && broke.error === "coins", JSON.stringify(broke));
    check("refused pack left the balance alone", (await balance()) === 10, `coins=${await balance()}`);

    // 5. a frozen wallet cannot spend, but still gets the free pack
    await prisma.profile.update({ where: { id }, data: { coins: 5000, coinsFrozen: true } });
    const frozenPaid = await openPack(id, "djur", 1);
    check("frozen wallet cannot buy a pack", !frozenPaid.ok && frozenPaid.error === "frozen", JSON.stringify(frozenPaid));
    await prisma.profile.update({ where: { id }, data: { lastFreePackAt: null } });
    const frozenFree = await openPack(id, "gratis", 1);
    check("frozen wallet still gets the free pack", frozenFree.ok, JSON.stringify(frozenFree).slice(0, 120));
    await prisma.profile.update({ where: { id }, data: { coinsFrozen: false } });

    // 6. a race for the last coins: exactly one may win
    await prisma.profile.update({ where: { id }, data: { coins: 1500 } });
    const [r1, r2] = await Promise.all([openPack(id, "mytisk", 5), openPack(id, "mytisk", 5)]);
    const wins = [r1, r2].filter((r) => r.ok).length;
    const coinsNow = await balance();
    check("exactly one of two racing packs succeeds", wins === 1, `wins=${wins}`);
    check("racing never drives coins negative", coinsNow >= 0, `coins=${coinsNow}`);
    // The only coins left are duplicate refunds, so they can never exceed the
    // value of the five Keens the winner pulled.
    check("leftovers are only refunds", coinsNow <= 5 * 1200, `coins=${coinsNow}`);

    // 7. market: buy then sell round trip
    await prisma.profile.update({ where: { id }, data: { coins: 10000 } });
    const listed = Object.values(KEEN_BY_ID).find((k) => k.rarity === "SALLSYNT")!;
    const price = marketPriceFor(listed.id)!;
    const buy = await buyKeen(id, listed.id, 2);
    check("market buy works", buy.ok, JSON.stringify(buy));
    check(
      "market buy charges the listed price",
      buy.ok && (await balance()) === 10000 - price * 2,
      `${await balance()} vs ${10000 - price * 2}`
    );
    const sell = await sellKeen(id, listed.id, 1);
    check("market sell works", sell.ok, JSON.stringify(sell));
    check(
      "market sell pays the sell price",
      sell.ok && (await balance()) === 10000 - price * 2 + RARITY_META.SALLSYNT.sell,
      `${await balance()}`
    );
    const tooMany = await sellKeen(id, listed.id, 5);
    check("cannot sell what you don't have", !tooMany.ok && tooMany.error === "none-owned", JSON.stringify(tooMany));

    const lastOne = await sellKeen(id, listed.id, 1);
    check("selling the last copy works", lastOne.ok, JSON.stringify(lastOne));
    const gone = await prisma.profileKeen.findUnique({
      where: { profileId_keenId: { profileId: id, keenId: listed.id } },
    });
    check("an emptied row is removed", gone === null, JSON.stringify(gone));

    // 8. sell every duplicate
    await openPack(id, "djur", 5);
    await openPack(id, "djur", 5);
    const dupState = await loadKeenState(id);
    const expected = Object.values(dupState.owned).reduce((a, n) => a + Math.max(0, n - 1), 0);
    const sellAll = await sellAllDuplicates(id);
    const afterAll = await loadKeenState(id);
    check(
      "sell-all clears every duplicate",
      sellAll.ok && afterAll.dupes === 0 && Object.values(afterAll.owned).every((n) => n === 1),
      JSON.stringify({ sellAll, owned: afterAll.owned })
    );
    check(
      "sell-all pays for the copies it took",
      sellAll.ok && sellAll.sold === expected,
      `${sellAll.ok ? sellAll.sold : "n/a"} vs ${expected}`
    );
    const noDupes = await sellAllDuplicates(id);
    check("sell-all refuses when there is nothing spare", !noDupes.ok, JSON.stringify(noDupes));

    // 9. an unknown pack or a bogus size is rejected before any coin moves
    const badPack = await openPack(id, "inte-en-pack", 1);
    check("unknown pack refused", !badPack.ok && badPack.error === "pack", JSON.stringify(badPack));
    const badCount = await openPack(id, "djur", 7);
    check("unsupported pack size refused", !badCount.ok && badCount.error === "count", JSON.stringify(badCount));
    const badKeen = await buyKeen(id, "finns-inte", 1);
    check("unknown Keen refused", !badKeen.ok && badKeen.error === "keen", JSON.stringify(badKeen));

    // 10. nothing anywhere went below zero
    check("balance never negative at the end", (await balance()) >= 0, `coins=${await balance()}`);
  } catch (e: any) {
    check("harness ran without throwing", false, String(e?.message ?? e));
  } finally {
    await prisma.keenOpen.deleteMany({ where: { profileId: id } }).catch(() => {});
    await prisma.activity.deleteMany({ where: { username } }).catch(() => {});
    await prisma.profileKeen.deleteMany({ where: { profileId: id } }).catch(() => {});
    await prisma.profile.deleteMany({ where: { id } }).catch(() => {});
  }

  const failed = checks.filter((c) => !c.pass);
  return NextResponse.json({
    ok: failed.length === 0,
    passed: checks.length - failed.length,
    failed: failed.length,
    packs: Object.keys(PACK_BY_ID).length,
    keens: Object.keys(KEEN_BY_ID).length,
    checks,
  });
}
