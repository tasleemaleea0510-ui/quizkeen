/**
 * The Keen economy — every write that touches coins, packs or a collection.
 *
 * Deliberately free of `next/headers` and of any request awareness: it takes a
 * profile id and plain arguments, so the server actions in
 * `src/app/keens/actions.ts` are a thin auth + revalidate layer and this file
 * can be driven directly against the database to prove the money handling.
 *
 * Rules that matter:
 *  - Coins are only ever spent by a guarded `updateMany` that requires the
 *    balance to still cover the price and the wallet to be unfrozen. If two
 *    clicks race, one of them updates zero rows and gets a polite refusal
 *    instead of a negative balance.
 *  - A pack is priced from the catalogue on the server, never from the browser.
 *  - Granting a Keen and taking the coins happen in one transaction, so a
 *    failure can never charge someone and give nothing.
 *  - A duplicate is refunded at the sell price, which is what the market pays
 *    for it, so opening packs and selling are worth the same per Keen.
 */

import { prisma } from "@/lib/prisma";
import {
  FREE_COOLDOWN_MS,
  FREE_PACK,
  KEEN_BY_ID,
  OBTAINABLE_KEEN_IDS,
  PACK_BY_ID,
  RARITY_META,
  dayKey,
  dailyDeals,
  freePackWait,
  isObtainable,
  isObtainableId,
  isTradeable,
  marketPrice,
  rollKeen,
  sellPrice,
  TOTAL_KEENS,
  type AnyPackId,
  type Rarity,
} from "@/lib/keens";

export type Pull = {
  keenId: string;
  rarity: Rarity;
  isNew: boolean;
  refund: number;
  owned: number;
};

export type OpenResult =
  | { ok: true; pulls: Pull[]; coins: number; spent: number; refunded: number }
  | { ok: false; error: "auth" | "pack" | "count" | "coins" | "frozen" | "cooldown" | "banned" | "daily-off" | "hidden" };

export type MarketResult =
  | { ok: true; coins: number; owned: number; price: number }
  | { ok: false; error: "auth" | "keen" | "retired" | "coins" | "frozen" | "banned" | "none" | "none-owned" };

type Viewer = {
  id: string;
  username: string;
  coins: number;
  coinsFrozen: boolean;
  bannedUntil: Date | null;
  dailyBonusDisabled: boolean;
  lastFreePackAt: Date | null;
};

const VIEWER_SELECT = {
  id: true,
  username: true,
  coins: true,
  coinsFrozen: true,
  bannedUntil: true,
  dailyBonusDisabled: true,
  lastFreePackAt: true,
} as const;

async function viewer(profileId: string): Promise<Viewer | null> {
  return prisma.profile.findUnique({ where: { id: profileId }, select: VIEWER_SELECT });
}

function banned(v: Viewer): boolean {
  return !!v.bannedUntil && v.bannedUntil > new Date();
}

/** Coins spent on a market buy, honouring today's discount (recomputed here). */
export function marketPriceFor(keenId: string, date: Date = new Date()): number | null {
  const keen = KEEN_BY_ID[keenId];
  // A Keen that is given out has no price. Returning null here (rather than a
  // number nobody may charge) is what keeps the market honest end to end.
  if (!keen || !isTradeable(keen)) return null;
  const deal = dailyDeals(dayKey(date)).find((d) => d.keen.id === keenId);
  return deal ? deal.price : marketPrice(keen);
}

async function logActivity(username: string, action: string) {
  await prisma.activity.create({ data: { username, action } }).catch(() => {});
}

// ── Opening packs ────────────────────────────────────────────────────────────

export async function openPack(profileId: string, packId: string, count: number): Promise<OpenResult> {
  const pack = PACK_BY_ID[packId];
  if (!pack) return { ok: false, error: "pack" };
  // A pack that is off the shelf cannot be opened even by a request that names it
  // outright: the shop and the server agree, so a stale page cannot buy one.
  if (pack.hidden) return { ok: false, error: "hidden" };
  if (!pack.sizes.includes(count)) return { ok: false, error: "count" };

  const v = await viewer(profileId);
  if (!v) return { ok: false, error: "auth" };
  if (banned(v)) return { ok: false, error: "banned" };

  const isFree = pack.id === FREE_PACK;
  if (isFree && v.dailyBonusDisabled) return { ok: false, error: "daily-off" };
  // Spending is what a frozen wallet blocks; a free pack costs nothing.
  if (!isFree && v.coinsFrozen) return { ok: false, error: "frozen" };

  const spent = pack.price * count;

  // Roll first (pure) so the reveal is decided before any row is written.
  const rolled = Array.from({ length: count }, () => rollKeen(pack.id as AnyPackId));

  // A big open is a dozen statements, so it gets a budget to match: the default
  // five-second transaction timeout is exactly what turned a slow moment into a
  // failed purchase.
  const result = await prisma.$transaction(async (tx) => {
    if (isFree) {
      // Claiming the day IS the guard: two taps arriving together, one wins and
      // the other updates zero rows. No separate read-then-write race.
      const cutoff = new Date(Date.now() - FREE_COOLDOWN_MS + 1000);
      const claimed = await tx.profile.updateMany({
        where: { id: profileId, OR: [{ lastFreePackAt: null }, { lastFreePackAt: { lt: cutoff } }] },
        data: { lastFreePackAt: new Date() },
      });
      if (claimed.count === 0) return { ok: false as const, error: "cooldown" as const };
    } else if (spent > 0) {
      const paid = await tx.profile.updateMany({
        where: { id: profileId, coins: { gte: spent }, coinsFrozen: false },
        data: { coins: { decrement: spent } },
      });
      if (paid.count === 0) return { ok: false as const, error: "coins" as const };
    }

    const pulls: Pull[] = [];
    let refunded = 0;

    // One read for the whole open, then one write per Keen that was actually
    // rolled. The old loop asked the database three times per pull, so a
    // five-pack was a twenty-statement transaction: seconds of waiting, and on a
    // slow connection it hit Prisma's five-second transaction budget and failed
    // outright — that is what made opening packs feel unstable.
    const rows = await tx.profileKeen.findMany({
      where: { profileId, keenId: { in: Array.from(new Set(rolled.map((k) => k.id))) } },
      select: { keenId: true, count: true },
    });
    const current = new Map(rows.map((r) => [r.keenId, r.count]));
    const alreadyHeld = new Set(rows.map((r) => r.keenId));
    const gained = new Map<string, number>();

    for (const keen of rolled) {
      const before = current.get(keen.id) ?? 0;
      // Every copy past the first pays for itself right away, like every pack
      // game does.
      const refund = before > 0 ? sellPrice(keen) : 0;
      refunded += refund;
      const owned = before + 1;
      current.set(keen.id, owned);
      gained.set(keen.id, (gained.get(keen.id) ?? 0) + 1);
      pulls.push({ keenId: keen.id, rarity: keen.rarity, isNew: before === 0, refund, owned });
    }

    for (const [keenId, add] of Array.from(gained.entries())) {
      if (alreadyHeld.has(keenId)) {
        await tx.profileKeen.update({
          where: { profileId_keenId: { profileId, keenId } },
          data: { count: { increment: add }, lastAt: new Date() },
        });
      } else {
        await tx.profileKeen.create({ data: { profileId, keenId, count: add } });
      }
    }

    await tx.keenOpen.createMany({
      data: pulls.map((p) => ({
        profileId,
        username: v.username,
        packId: pack.id,
        keenId: p.keenId,
        rarity: p.rarity,
        isNew: p.isNew,
        refund: p.refund,
        spent,
      })),
    });

    if (refunded > 0) {
      await tx.profile.update({ where: { id: profileId }, data: { coins: { increment: refunded } } });
    }

    const after = await tx.profile.findUnique({ where: { id: profileId }, select: { coins: true } });
    return { ok: true as const, pulls, coins: after?.coins ?? v.coins - spent + refunded, spent, refunded };
  }, { timeout: 20000, maxWait: 10000 });

  if (result.ok) {
    const got = result.pulls
      .map((p) => `${KEEN_BY_ID[p.keenId]?.name ?? p.keenId}${p.isNew ? " (NY!)" : " (dubblett)"}`)
      .join(", ");
    await logActivity(v.username, `öppnade ${pack.name} och fick ${got}`);
  }

  return result;
}

// ── Market ───────────────────────────────────────────────────────────────────

export async function buyKeen(profileId: string, keenId: string, count = 1): Promise<MarketResult> {
  const keen = KEEN_BY_ID[keenId];
  if (!keen || !isTradeable(keen) || count < 1 || count > 5) return { ok: false, error: "keen" };
  // Only what a pack on sale can still drop is for sale. A Keen from a pack that
  // left the shelf can still be sold if you own it (see `sellKeen`), but it must
  // not be buyable, or the collection total would stop meaning anything.
  if (!isObtainable(keen)) return { ok: false, error: "retired" };

  const v = await viewer(profileId);
  if (!v) return { ok: false, error: "auth" };
  if (banned(v)) return { ok: false, error: "banned" };
  if (v.coinsFrozen) return { ok: false, error: "frozen" };

  const price = marketPriceFor(keenId);
  if (price === null) return { ok: false, error: "keen" };
  const total = price * count;

  const result = await prisma.$transaction(async (tx) => {
    const paid = await tx.profile.updateMany({
      where: { id: profileId, coins: { gte: total }, coinsFrozen: false },
      data: { coins: { decrement: total } },
    });
    if (paid.count === 0) return { ok: false as const, error: "coins" as const };

    const row = await tx.profileKeen.upsert({
      where: { profileId_keenId: { profileId, keenId } },
      create: { profileId, keenId, count },
      update: { count: { increment: count }, lastAt: new Date() },
      select: { count: true },
    });

    await tx.keenOpen.create({
      data: {
        profileId,
        username: v.username,
        packId: "marknad",
        keenId,
        rarity: keen.rarity,
        isNew: row.count === count,
        spent: total,
      },
    });

    const after = await tx.profile.findUnique({ where: { id: profileId }, select: { coins: true } });
    return { ok: true as const, coins: after?.coins ?? v.coins - total, owned: row.count, price };
  });

  if (result.ok) {
    await logActivity(v.username, `köpte ${keen.name} i marknaden för ${result.price} mynt`);
  }
  return result;
}

export async function sellKeen(profileId: string, keenId: string, count = 1): Promise<MarketResult> {
  const keen = KEEN_BY_ID[keenId];
  if (!keen || !isTradeable(keen) || count < 1 || count > 99) return { ok: false, error: "keen" };

  const v = await viewer(profileId);
  if (!v) return { ok: false, error: "auth" };
  if (banned(v)) return { ok: false, error: "banned" };

  const earned = sellPrice(keen) * count;

  const result = await prisma.$transaction(async (tx) => {
    const taken = await tx.profileKeen.updateMany({
      where: { profileId, keenId, count: { gte: count } },
      data: { count: { decrement: count } },
    });
    if (taken.count === 0) return { ok: false as const, error: "none-owned" as const };

    const left = await tx.profileKeen.findUnique({
      where: { profileId_keenId: { profileId, keenId } },
      select: { count: true },
    });
    // An empty row means "never had it"; keeping it around would only make the
    // collection query say "owned" for a Keen that is gone.
    if (left && left.count <= 0) {
      await tx.profileKeen.delete({ where: { profileId_keenId: { profileId, keenId } } });
    }

    const after = await tx.profile.update({
      where: { id: profileId },
      data: { coins: { increment: earned } },
      select: { coins: true },
    });

    await tx.keenOpen.create({
      data: {
        profileId,
        username: v.username,
        packId: "marknad",
        keenId,
        rarity: keen.rarity,
        isNew: false,
        refund: earned,
      },
    });

    return { ok: true as const, coins: after.coins, owned: left?.count ?? 0, price: sellPrice(keen) };
  });

  if (result.ok) {
    await logActivity(v.username, `sålde ${count} × ${keen.name} för ${earned} mynt`);
  }
  return result;
}

/** Sell every spare copy at once, keeping one of each. */
export async function sellAllDuplicates(
  profileId: string
): Promise<{ ok: true; coins: number; earned: number; sold: number } | { ok: false; error: string }> {
  const v = await viewer(profileId);
  if (!v) return { ok: false, error: "auth" };
  if (banned(v)) return { ok: false, error: "banned" };

  const rows = await prisma.profileKeen.findMany({
    where: { profileId, count: { gt: 1 } },
    select: { keenId: true, count: true },
  });
  const spare = rows
    .map((r) => ({ keenId: r.keenId, extra: Math.max(0, r.count - 1), keen: KEEN_BY_ID[r.keenId] }))
    .filter((r) => r.keen && r.extra > 0 && isTradeable(r.keen));
  if (!spare.length) return { ok: false, error: "none-owned" };

  const earned = spare.reduce((a, r) => a + sellPrice(r.keen!) * r.extra, 0);
  const sold = spare.reduce((a, r) => a + r.extra, 0);

  const result = await prisma.$transaction(async (tx) => {
    for (const r of spare) {
      await tx.profileKeen.update({
        where: { profileId_keenId: { profileId, keenId: r.keenId } },
        data: { count: 1 },
      });
      await tx.keenOpen.create({
        data: {
          profileId,
          username: v.username,
          packId: "marknad",
          keenId: r.keenId,
          rarity: r.keen!.rarity,
          isNew: false,
          refund: sellPrice(r.keen!) * r.extra,
        },
      });
    }
    const after = await tx.profile.update({
      where: { id: profileId },
      data: { coins: { increment: earned } },
      select: { coins: true },
    });
    return after.coins;
  });

  await logActivity(v.username, `sålde alla dubbletter (${sold} st) för ${earned} mynt`);
  return { ok: true, coins: result, earned, sold };
}

// ── Reading a collection ─────────────────────────────────────────────────────

export type KeenState = {
  coins: number;
  coinsFrozen: boolean;
  dailyBonusDisabled: boolean;
  lastFreePackAt: string | null;
  freeWaitMs: number;
  owned: Record<string, number>;
  distinct: number;
  /** Spare copies you could sell, i.e. everything above one of each. */
  dupes: number;
  total: number;
  recent: { keenId: string; rarity: Rarity; isNew: boolean; refund: number; packId: string; at: string }[];
};

export async function loadKeenState(profileId: string): Promise<KeenState> {
  const [profile, rows, recent] = await Promise.all([
    prisma.profile.findUnique({ where: { id: profileId }, select: VIEWER_SELECT }),
    prisma.profileKeen.findMany({ where: { profileId }, select: { keenId: true, count: true } }),
    prisma.keenOpen.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      take: 14,
      select: { keenId: true, rarity: true, isNew: true, refund: true, packId: true, createdAt: true },
    }),
  ]);

  const owned: Record<string, number> = {};
  let distinct = 0;
  let dupes = 0;
  for (const r of rows) {
    const keen = KEEN_BY_ID[r.keenId];
    if (r.count > 0 && keen) {
      owned[r.keenId] = r.count;
      // A Keen from a pack that is no longer on sale still sits in the showcase,
      // but it is not part of the collection the app counts towards.
      if (isObtainableId(r.keenId)) distinct += 1;
      // Spares that are worth coins — the same filter the cash-out uses, so the
      // number on the button is the number the market pays for.
      if (isTradeable(keen)) dupes += Math.max(0, r.count - 1);
    }
  }

  return {
    coins: profile?.coins ?? 0,
    coinsFrozen: !!profile?.coinsFrozen,
    dailyBonusDisabled: !!profile?.dailyBonusDisabled,
    lastFreePackAt: profile?.lastFreePackAt ? profile.lastFreePackAt.toISOString() : null,
    freeWaitMs: freePackWait(profile?.lastFreePackAt ?? null),
    owned,
    distinct,
    dupes,
    total: TOTAL_KEENS,
    recent: recent.map((r) => ({
      keenId: r.keenId,
      rarity: r.rarity as Rarity,
      isNew: r.isNew,
      refund: r.refund,
      packId: r.packId,
      at: r.createdAt.toISOString(),
    })),
  };
}

/** Top collectors, by number of distinct Keens. */
export async function topCollectors(take = 5) {
  const grouped = await prisma.profileKeen.groupBy({
    by: ["profileId"],
    _count: { _all: true },
    // The leaderboard measures the same collection the rest of the app does.
    where: { keenId: { in: OBTAINABLE_KEEN_IDS } },
  });

  const ids = [...grouped]
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, take * 3)
    .map((g) => g.profileId);

  const profiles = await prisma.profile.findMany({
    where: { id: { in: ids }, shadowed: false },
    select: { id: true, username: true, role: true },
  });

  const counts = new Map(grouped.map((g) => [g.profileId, g._count._all]));
  return profiles
    .map((p) => ({ ...p, count: counts.get(p.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, take);
}

/** Everything a Keen is worth, for the market's "sell" side. */
export function sellQuote(keenId: string) {
  const keen = KEEN_BY_ID[keenId];
  if (!keen) return null;
  return { price: marketPrice(keen), sell: sellPrice(keen), rarity: RARITY_META[keen.rarity] };
}
