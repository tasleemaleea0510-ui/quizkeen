import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  KEENS,
  KEEN_BY_ID,
  MARKET_KEENS,
  OBTAINABLE_KEENS,
  PACK_BY_ID,
  RARITY_META,
  SHELF_PACKS,
  TOTAL_KEENS,
  isGiftKeen,
  isObtainable,
  isTradeable,
  keensInPack,
  rarityOdds,
  rollKeen,
} from "@/lib/keens";
import { HALLOWEEN_EMBLEM, KEEN_SPRITES, PACK_EMBLEMS } from "@/lib/keen-sprites";
import { buyKeen, loadKeenState, openPack, sellKeen } from "@/lib/keens-store";

export const dynamic = "force-dynamic";

const ID = "selftest-halloween-profile";
const USER = "ZZ Selftest Halloween";

/** Deterministic rolls, so a distribution check is a check and not a coin flip. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export async function GET(req: Request) {
  // ?art=1 returns the raw bitmaps, so the shapes can be eyeballed as text.
  if (new URL(req.url).searchParams.has("art")) {
    const art = { ...KEEN_SPRITES, halloween_emblem: HALLOWEEN_EMBLEM };
    return NextResponse.json(
      Object.fromEntries(Object.entries(art).map(([name, s]) => [name, { rows: s.rows, alt: s.alt, board: s.board }]))
    );
  }

  const checks: { name: string; pass: boolean; info?: unknown }[] = [];
  const check = (name: string, pass: boolean, info?: unknown) => checks.push({ name, pass, info });

  // ── the new pack ───────────────────────────────────────────────────────────
  const pack = PACK_BY_ID.halloween;
  check("the Halloween pack exists and is on the shelf", !!pack && SHELF_PACKS.some((p) => p.id === "halloween"), {
    shelf: SHELF_PACKS.map((p) => p.id),
  });
  const odds = pack ? rarityOdds("halloween") : [];
  const sum = odds.reduce((a, r) => a + r.chance, 0);
  check("its odds add up to 100 %", Math.abs(sum - 100) < 0.05, { sum, odds });

  const inPack = keensInPack("halloween");
  check("the pack holds the eight designed Keens", inPack.length === 8, inPack.map((k) => `${k.id}:${k.rarity}`));
  check(
    "every rarity it advertises can actually drop",
    odds.every((r) => inPack.some((k) => k.rarity === r.rarity)),
    odds.map((r) => r.rarity)
  );
  check("all of them are obtainable", inPack.every(isObtainable));

  // 20 000 seeded rolls: every Keen appears, and the rarities land where the odds say.
  const roll = seeded(20261031);
  const hits: Record<string, number> = {};
  for (let i = 0; i < 20000; i++) {
    const keen = rollKeen("halloween", roll);
    hits[keen.id] = (hits[keen.id] ?? 0) + 1;
  }
  check("every Halloween Keen can be rolled", inPack.every((k) => (hits[k.id] ?? 0) > 0), hits);
  const share = (rarity: string) => {
    const ids = inPack.filter((k) => k.rarity === rarity).map((k) => k.id);
    return ids.reduce((a, id) => a + (hits[id] ?? 0), 0) / 20000;
  };
  const brought = {
    common: share("VANLIG"),
    rare: share("SALLSYNT"),
    epic: share("EPISK"),
    legendary: share("LEGENDARISK"),
    secret: share("HEMLIG"),
    mythic: share("MYSTISK"),
  };
  check(
    "the dropped rarity mix follows the printed odds",
    brought.common > 0.5 && brought.common < 0.6 &&
      brought.rare > 0.26 && brought.rare < 0.34 &&
      brought.epic > 0.09 && brought.epic < 0.15 &&
      brought.legendary > 0.01 && brought.legendary < 0.045 &&
      brought.secret > 0.001 && brought.secret < 0.006 &&
      brought.mythic > 0.0002 && brought.mythic < 0.003,
    brought
  );

  // ── the rule that lets a pack's top tier be traded ────────────────────────
  const king = KEEN_BY_ID.pumpkinking;
  const admin = KEEN_BY_ID.omeisaurus;
  check("the Pumpkin King is a tradeable mythic", !!king && isTradeable(king), { rarity: king?.rarity });
  check("the Admin Keen stays untradeable even though Mystisk is tradeable", !!admin && isGiftKeen(admin) && !isTradeable(admin));
  check("the market lists the tradeable newcomers", MARKET_KEENS.some((k) => k.id === "pumpkinking"), MARKET_KEENS.map((k) => k.id));
  check("the market never lists the Admin Keen", !MARKET_KEENS.some((k) => isGiftKeen(k)));
  check("the free pack only drops obtainable Keens", keensInPack("gratis").every(isObtainable), keensInPack("gratis").map((k) => k.id));
  check("the count follows the shelf", TOTAL_KEENS === OBTAINABLE_KEENS.length && TOTAL_KEENS === 14, { TOTAL_KEENS });
  check("every Keen has a unique id", new Set(KEENS.map((k) => k.id)).size === KEENS.length);

  // ── the artwork itself ────────────────────────────────────────────────────
  const art = { ...KEEN_SPRITES, halloween_emblem: HALLOWEEN_EMBLEM, ...PACK_EMBLEMS };
  const brokenArt: string[] = [];
  for (const [name, sprite] of Object.entries(art)) {
    if (!sprite.rows.length || !sprite.alt.trim()) brokenArt.push(`${name}: empty`);
    for (const [y, row] of sprite.rows.entries()) {
      for (const ch of row) if (ch !== "." && !sprite.palette[ch]) brokenArt.push(`${name} r${y}: "${ch}" has no colour`);
    }
  }
  check("every sprite pixel has a colour", brokenArt.length === 0, brokenArt);
  check("every Halloween Keen is drawn", inPack.every((k) => !!KEEN_SPRITES[k.id]), inPack.filter((k) => !KEEN_SPRITES[k.id]).map((k) => k.id));
  check("the pack has its own emblem", PACK_EMBLEMS.halloween === HALLOWEEN_EMBLEM);

  // ── the economy still holds ───────────────────────────────────────────────
  await cleanup();
  await prisma.profile.create({ data: { id: ID, username: USER, coins: 100000 } });
  try {
    await openPack(ID, "halloween", 1);
    const before = await prisma.profile.findUnique({ where: { id: ID }, select: { coins: true } });
    const started = Date.now();
    const five = await openPack(ID, "halloween", 5);
    const ms = Date.now() - started;
    const refunded = five.ok ? five.refunded : 0;
    const after = await prisma.profile.findUnique({ where: { id: ID }, select: { coins: true } });
    check("a five-pack returns five pulls", five.ok && five.pulls.length === 5, five.ok ? { ms } : five);
    check("the wallet matches price minus duplicate refunds", after?.coins === (before?.coins ?? 0) - 1250 + refunded, {
      coins: after?.coins,
      expected: (before?.coins ?? 0) - 1250 + refunded,
      ms,
    });
    check("a five-pack stays quick", ms < 4000, { ms });

    const buyKing = await buyKeen(ID, "pumpkinking", 1);
    const sellKing = await sellKeen(ID, "pumpkinking", 1);
    check("the Pumpkin King can be bought and sold", buyKing.ok && sellKing.ok, { buyKing, sellKing });
    const buyAdmin = await buyKeen(ID, "omeisaurus", 1);
    check("the Admin Keen cannot be bought", !buyAdmin.ok, buyAdmin);
    const state = await loadKeenState(ID);
    check("nothing counts past the total", state.distinct <= TOTAL_KEENS && state.total === TOTAL_KEENS, {
      distinct: state.distinct,
      total: state.total,
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

void RARITY_META;
