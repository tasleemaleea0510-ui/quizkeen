import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Handing out the Admin Keen.
 *
 * Why this file talks SQL instead of the repository that owns the Keen economy:
 * QuizKeen and QuizKeen Command are two separate deployments sharing ONE
 * database. Command's Prisma schema knows `Profile` (it has to — it moderates
 * them) but it has no `ProfileKeen` model, and adding one would mean shipping a
 * `prisma generate` on the Command side for a single row. A parameterised
 * INSERT needs no model, no migration and no new secret, so that is what this
 * does. The economy itself still belongs to QuizKeen: this helper only ever
 * gives a Keen away, and never touches coins.
 *
 * The one thing that must stay in step with the other repo is the ID. It is the
 * same string as `P(ADMIN_PACK, "MYSTISK", …)` in QuizKeen's
 * `src/lib/keens.ts`; if that Keen is ever renamed, rename it here in the same
 * breath, or the row lands in the database for a Keen the app does not know and
 * the recipient silently gets nothing.
 */
export const ADMIN_KEEN_ID = "omeisaurus";
export const ADMIN_KEEN_NAME = "Omeisaurus";
/** Rarity label in QuizKeen's catalogue — `MYSTISK`, shown as "Mystisk". */
export const ADMIN_KEEN_RARITY = "MYSTISK";

/**
 * The shelf a gifted Keen is filed under in the recipient's pull history.
 *
 * It is not a real pack, so QuizKeen's collection feed prints "Admin-gåva" for
 * it instead of looking up a pack that does not exist.
 */
const GIFT_SHELF = "gava";

/**
 * Who already has it.
 *
 * The console cannot read Keens through Prisma (no model), so this is the one
 * other query it needs — and it earns its keep: the picker can tell an admin
 * that someone already owns the trophy instead of offering a button whose only
 * possible outcome is "already owned".
 */
export async function adminKeenHolders(): Promise<string[]> {
  try {
    const rows = await prisma.$queryRaw<{ profileId: string }[]>`
      SELECT "profileId" FROM "ProfileKeen" WHERE "keenId" = ${ADMIN_KEEN_ID}
    `;
    return rows.map((r) => r.profileId);
  } catch {
    // A missing table must not blank the whole user list: no badge is a fine
    // outcome, and the grant itself reports its own failure.
    return [];
  }
}

export type GrantResult =
  /** `alreadyOwned` is true when the person had it before — nothing was added. */
  | { ok: true; alreadyOwned: boolean }
  | { ok: false; error: "missing" | "db" };

/**
 * Put the Admin Keen in someone's collection, once.
 *
 * `ON CONFLICT DO NOTHING` is what makes this safe to click twice: the second
 * click inserts zero rows, so nobody ends up with two, and the caller can say
 * "they already have it" instead of quietly duplicating a trophy. The row count
 * returned by `$executeRaw` is exactly how we tell the two cases apart.
 */
export async function giveAdminKeen(profileId: string, username: string): Promise<GrantResult> {
  const target = await prisma.profile.findUnique({ where: { id: profileId }, select: { id: true } });
  if (!target) return { ok: false, error: "missing" };

  try {
    const inserted = await prisma.$executeRaw`
      INSERT INTO "ProfileKeen" ("id", "profileId", "keenId", "count", "firstAt", "lastAt")
      VALUES (${randomUUID()}, ${profileId}, ${ADMIN_KEEN_ID}, 1, NOW(), NOW())
      ON CONFLICT ("profileId", "keenId") DO NOTHING
    `;
    if (inserted === 0) return { ok: true, alreadyOwned: true };

    // The pull feed is what makes the gift visible where a person already looks
    // (collection → "Senaste öppningar"), rather than appearing out of nowhere.
    await prisma.$executeRaw`
      INSERT INTO "KeenOpen" ("id", "profileId", "username", "packId", "keenId", "rarity", "isNew", "refund", "spent", "createdAt")
      VALUES (${randomUUID()}, ${profileId}, ${username}, ${GIFT_SHELF}, ${ADMIN_KEEN_ID}, ${ADMIN_KEEN_RARITY}, true, 0, 0, NOW())
    `;

    return { ok: true, alreadyOwned: false };
  } catch {
    // A missing table (an older database) lands here, as does a dropped
    // connection. The console shows a generic failure rather than a stack trace.
    return { ok: false, error: "db" };
  }
}
