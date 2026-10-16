"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buyKeen, loadKeenState, openPack, sellAllDuplicates, sellKeen, type KeenState } from "@/lib/keens-store";
import { KEEN_BY_ID, PACKS } from "@/lib/keens";

/**
 * The thin layer between the browser and the economy in `lib/keens-store.ts`:
 * who is asking, and what the pages should show afterwards.
 *
 * Every reason a purchase can fail has one Swedish sentence, so a client
 * component can render the result without knowing anything about the rules.
 *
 * Kept private on purpose: a "use server" file may only export async
 * functions, so this map lives here as a plain const rather than a public one.
 */
const KEEN_ERRORS: Record<string, string> = {
  auth: "Du måste vara inloggad.",
  pack: "Det paketet finns inte.",
  hidden: "Det paketet är inte till salu just nu.",
  count: "Du kan inte öppna så många paket på en gång.",
  coins: "Du har inte tillräckligt med mynt. Spela en quiz och tjäna fler!",
  frozen: "Din myntplånbok är fryst, så du kan inte handla just nu.",
  cooldown: "Du har redan öppnat dagens gratispaket — kom tillbaka imorgon!",
  banned: "Ditt konto är avstängt och kan inte handla.",
  "daily-off": "Daglig bonus är avstängd på ditt konto.",
  keen: "Den Keen finns inte.",
  retired: "Den Keen går inte att köpa längre — paketet den kom ifrån är inte till salu.",
  "none-owned": "Du äger ingen sådan Keen att sälja.",
  none: "Inget att sälja.",
  server: "Servern hann inte med — inga mynt drogs. Försök igen!",
  unknown: "Något gick fel. Försök igen.",
};

function fail(error: string) {
  return { ok: false as const, message: KEEN_ERRORS[error] ?? KEEN_ERRORS.unknown };
}

function touch() {
  revalidatePath("/keens");
  revalidatePath("/keens/packs");
  revalidatePath("/keens/market");
  revalidatePath("/dashboard");
}

async function currentUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Run a store call and never throw at the browser.
 *
 * A failed database call would otherwise reject the server action: the client's
 * `await` never settles as a reply, and the button that started it spins for
 * ever. A plain refusal is something the UI can show and recover from.
 */
async function attempt<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export type OpenPackReply =
  | { ok: true; pulls: { keenId: string; rarity: string; isNew: boolean; refund: number; owned: number }[]; coins: number; spent: number; refunded: number; packId: string }
  | { ok: false; message: string };

export async function openPackAction(packId: string, count = 1): Promise<OpenPackReply> {
  const userId = await currentUserId();
  if (!userId) return fail("auth");
  if (!PACKS.some((p) => p.id === packId)) return fail("pack");

  const opened = Math.trunc(count) || 1;
  const result = await attempt(() => openPack(userId, packId, opened));
  if (!result) return fail("server");
  if (!result.ok) return fail(result.error);
  // Charged for five, hands over five. The reveal counts the pulls it is given,
  // so a short reply would look like the pack ate the difference.
  if (result.pulls.length !== opened) return fail("server");

  touch();
  return {
    ok: true,
    pulls: result.pulls.map((p) => ({
      keenId: p.keenId,
      rarity: KEEN_BY_ID[p.keenId]?.rarity ?? p.rarity,
      isNew: p.isNew,
      refund: p.refund,
      owned: p.owned,
    })),
    coins: result.coins,
    spent: result.spent,
    refunded: result.refunded,
    packId,
  };
}

export type MarketReply = { ok: true; coins: number; owned: number; price: number; keenId: string } | { ok: false; message: string };

export async function buyKeenAction(keenId: string, count = 1): Promise<MarketReply> {
  const userId = await currentUserId();
  if (!userId) return fail("auth");
  if (!KEEN_BY_ID[keenId]) return fail("keen");

  const result = await attempt(() => buyKeen(userId, keenId, Math.trunc(count) || 1));
  if (!result) return fail("server");
  if (!result.ok) return fail(result.error);

  touch();
  return { ok: true, coins: result.coins, owned: result.owned, price: result.price, keenId };
}

export async function sellKeenAction(keenId: string, count = 1): Promise<MarketReply> {
  const userId = await currentUserId();
  if (!userId) return fail("auth");
  if (!KEEN_BY_ID[keenId]) return fail("keen");

  const result = await attempt(() => sellKeen(userId, keenId, Math.trunc(count) || 1));
  if (!result) return fail("server");
  if (!result.ok) return fail(result.error);

  touch();
  return { ok: true, coins: result.coins, owned: result.owned, price: result.price, keenId };
}

export async function sellDuplicatesAction(): Promise<
  { ok: true; coins: number; earned: number; sold: number } | { ok: false; message: string }
> {
  const userId = await currentUserId();
  if (!userId) return fail("auth");

  const result = await attempt(() => sellAllDuplicates(userId));
  if (!result) return fail("server");
  if (!result.ok) return fail(result.error);

  touch();
  return { ok: true, coins: result.coins, earned: result.earned, sold: result.sold };
}

/** Fresh numbers for a client component that just animated something. */
export async function getKeenStateAction(): Promise<KeenState | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  try {
    return await loadKeenState(userId);
  } catch {
    return null;
  }
}
