import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ADMIN_KEEN_ID, KEEN_BY_ID } from "@/lib/keen-catalogue";

/**
 * Handing out Keens.
 *
 * Why this file talks SQL instead of the repository that owns the Keen economy:
 * QuizKeen and QuizKeen Command are two separate deployments sharing ONE
 * database. Command's Prisma schema knows `Profile` (it has to — it moderates
 * them) but it has no `ProfileKeen` model, and adding one would mean shipping a
 * `prisma generate` on the Command side for a couple of rows. A parameterised
 * INSERT needs no model, no migration and no new secret, so that is what this
 * does. The economy itself still belongs to QuizKeen: this helper only ever
 * gives a Keen away or takes one back, and never touches coins.
 *
 * The one thing that must stay in step with the other repo is the catalogue —
 * `lib/keen-catalogue.ts` is a generated copy of it. A gift of an id the game
 * does not know would sit in the database and show up as nothing, so the caller
 * only ever passes an id that came out of that catalogue.
 */

/** The shelf a gifted Keen is filed under in the recipient's pull history. */
const GIFT_SHELF = "gava";

export type GrantResult =
  /** `alreadyOwned` is true when the person had it before — nothing was added. */
  | { ok: true; alreadyOwned: boolean; count: number }
  /** `denied` means the Keen is not on a shelf this caller may hand out. */
  | { ok: false; error: "missing" | "db" | "denied" };

export type TakeResult =
  | { ok: true; removed: boolean; count: number }
  | { ok: false; error: "missing" | "db" | "notowned" };

/**
 * Who already has a given Keen.
 *
 * The console cannot read Keens through Prisma (no model), so this is the one
 * other query it needs — and it earns its keep: a picker can tell staff that
 * someone already owns a Keen instead of offering a button whose only possible
 * outcome is "already owned".
 */
export async function keenHolders(keenId: string): Promise<string[]> {
  try {
    const rows = await prisma.$queryRaw<{ profileId: string }[]>`
      SELECT "profileId" FROM "ProfileKeen" WHERE "keenId" = ${keenId}
    `;
    return rows.map((r) => r.profileId);
  } catch {
    // A missing table must not blank the whole user list: no badge is a fine
    // outcome, and the grant itself reports its own failure.
    return [];
  }
}

/** Profile ids that already own this Admin Keen, for the picker's badges. */
export function adminKeenHolders(keenId: string = ADMIN_KEEN_ID): Promise<string[]> {
  return keenHolders(keenId);
}

/** What one person owns, as ids and counts — the vault's "har den" badges. */
export async function ownedKeens(profileId: string): Promise<{ keenId: string; count: number }[]> {
  try {
    const rows = await prisma.$queryRaw<{ keenId: string; count: number }[]>`
      SELECT "keenId", "count" FROM "ProfileKeen" WHERE "profileId" = ${profileId}
    `;
    return rows.map((r) => ({ keenId: r.keenId, count: Number(r.count) }));
  } catch {
    return [];
  }
}

/**
 * Put a Keen in someone's collection.
 *
 * `stack` adds a duplicate to the count (a Keen you can own twice is what the
 * collection screen shows, and what a market sale expects). `once` leaves an
 * existing row alone — that is the Admin Keen's rule: one trophy per person,
 * and a second click says "already owned" rather than quietly duplicating it.
 */
export async function giveKeen(
  profileId: string,
  username: string,
  keenId: string,
  rarity: string,
  mode: "stack" | "once" = "stack"
): Promise<GrantResult> {
  const target = await prisma.profile.findUnique({ where: { id: profileId }, select: { id: true } });
  if (!target) return { ok: false, error: "missing" };

  try {
    const existing = await prisma.$queryRaw<{ count: number }[]>`
      SELECT "count" FROM "ProfileKeen" WHERE "profileId" = ${profileId} AND "keenId" = ${keenId}
    `;
    const had = existing.length > 0;

    if (had && mode === "once") {
      return { ok: true, alreadyOwned: true, count: Number(existing[0].count) };
    }

    if (had) {
      await prisma.$executeRaw`
        UPDATE "ProfileKeen"
        SET "count" = "count" + 1, "lastAt" = NOW()
        WHERE "profileId" = ${profileId} AND "keenId" = ${keenId}
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "ProfileKeen" ("id", "profileId", "keenId", "count", "firstAt", "lastAt")
        VALUES (${randomUUID()}, ${profileId}, ${keenId}, 1, NOW(), NOW())
        ON CONFLICT ("profileId", "keenId") DO NOTHING
      `;
    }

    // The pull feed is what makes the gift visible where a person already looks
    // (collection → "Senaste öppningar"), rather than appearing out of nowhere.
    await prisma.$executeRaw`
      INSERT INTO "KeenOpen" ("id", "profileId", "username", "packId", "keenId", "rarity", "isNew", "refund", "spent", "createdAt")
      VALUES (${randomUUID()}, ${profileId}, ${username}, ${GIFT_SHELF}, ${keenId}, ${rarity}, ${!had}, 0, 0, NOW())
    `;

    const count = had ? Number(existing[0].count) + 1 : 1;
    return { ok: true, alreadyOwned: had, count };
  } catch {
    // A missing table (an older database) lands here, as does a dropped
    // connection. The console shows a generic failure rather than a stack trace.
    return { ok: false, error: "db" };
  }
}

/**
 * Take one copy back.
 *
 * Only the copy is removed — the pull history is left alone, because "you were
 * given this and it was taken back" is exactly the kind of thing the log should
 * still be able to show afterwards. A row at count 1 is deleted; a stack merely
 * shrinks.
 */
export async function takeKeen(profileId: string, username: string, keenId: string): Promise<TakeResult> {
  const target = await prisma.profile.findUnique({ where: { id: profileId }, select: { id: true } });
  if (!target) return { ok: false, error: "missing" };

  try {
    const existing = await prisma.$queryRaw<{ count: number }[]>`
      SELECT "count" FROM "ProfileKeen" WHERE "profileId" = ${profileId} AND "keenId" = ${keenId}
    `;
    if (!existing.length) return { ok: false, error: "notowned" };

    const count = Number(existing[0].count);
    if (count > 1) {
      await prisma.$executeRaw`
        UPDATE "ProfileKeen" SET "count" = "count" - 1, "lastAt" = NOW()
        WHERE "profileId" = ${profileId} AND "keenId" = ${keenId}
      `;
      return { ok: true, removed: false, count: count - 1 };
    }

    await prisma.$executeRaw`
      DELETE FROM "ProfileKeen" WHERE "profileId" = ${profileId} AND "keenId" = ${keenId}
    `;
    return { ok: true, removed: true, count: 0 };
  } catch {
    return { ok: false, error: "db" };
  }
}

/**
 * Give an Admin Keen (once).
 *
 * The id comes from the browser, so it is checked against the `admin` shelf
 * before anything is written: without that an admin could ask this action for an
 * owner-only Keen and hand it out from a console that must never be able to.
 */
export function giveAdminKeen(
  profileId: string,
  username: string,
  keenId: string = ADMIN_KEEN_ID
): Promise<GrantResult> {
  const entry = KEEN_BY_ID[keenId];
  if (!entry || entry.pack !== "admin") return Promise.resolve({ ok: false, error: "denied" });
  return giveKeen(profileId, username, entry.id, entry.rarity, "once");
}
