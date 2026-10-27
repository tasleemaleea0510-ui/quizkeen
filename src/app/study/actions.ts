"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { grantXp } from "@/lib/xp";
import { revalidatePath } from "next/cache";

/**
 * XP for a finished study run — a deck of cards or a solo quiz.
 *
 * Study is the half of the app that has nothing to win, so it has to pay
 * something: a run pays per card answered right, plus a small bonus for
 * finishing. The server decides the amount; the browser only reports what it did
 * (`right` and `total`), which are clamped to the size of the thing being
 * studied, so a doctored call can never pay for cards that do not exist.
 *
 * A daily ceiling keeps practice from becoming the fastest way to farm XP: after
 * `STUDY_RUNS_PER_DAY` runs the studying still works, it just stops paying until
 * tomorrow, and says so plainly.
 */

// Deliberately *not* exported: a "use server" module may only export async
// functions, and a value export here fails the production build with "Only async
// functions are allowed to be exported in a 'use server' file". The number is
// only used below, so it stays a local constant.
const STUDY_RUNS_PER_DAY = 8;
const MAX_XP_PER_RUN = 90;
const MAX_COINS_PER_RUN = 45;
/** A card is worth this much when it is answered right. */
const XP_PER_RIGHT = 4;

export type StudyReward = {
  ok: boolean;
  info: string;
  xp?: number;
  coins?: number;
  capped?: boolean;
  xpTotal?: number;
  coinsTotal?: number;
  level?: number;
};

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function claimStudyReward(input: {
  kind: "deck" | "quiz";
  id: string;
  /** Cards or questions answered right in this run. */
  right: number;
  /** How many the run contained, which bounds `right`. */
  total: number;
}): Promise<StudyReward> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, info: "Du är inte inloggad." };

    const profile = await prisma.profile
      .findUnique({ where: { id: user.id }, select: { id: true, username: true } })
      .catch(() => null);
    if (!profile) return { ok: false, info: "Kontot hittades inte." };

    // The run has to be about something that exists, and a private deck belongs
    // to its owner. This is the same rule the two study pages already apply.
    const [deck, quiz] = await Promise.all([
      input.kind === "deck"
        ? prisma.flashcardCollection
            .findUnique({ where: { id: input.id }, select: { id: true, title: true, creatorId: true, _count: { select: { flashcards: true } } } })
            .catch(() => null)
        : Promise.resolve(null),
      input.kind === "quiz"
        ? prisma.quiz
            .findUnique({ where: { id: input.id }, select: { id: true, title: true, isPrivate: true, creatorId: true, _count: { select: { questions: true } } } })
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    const subject = deck ?? quiz;
    if (!subject) return { ok: false, info: "Det du pluggade hittades inte." };
    if (quiz?.isPrivate && quiz.creatorId !== user.id) {
      return { ok: false, info: "Den quizen är privat." };
    }

    const size = deck
      ? (deck as { _count: { flashcards: number } })._count.flashcards
      : (quiz as { _count: { questions: number } })._count.questions;
    const total = Math.max(1, Math.min(500, Math.floor(Number(input.total) || 0) || size));
    const right = Math.max(0, Math.min(total, Math.floor(Number(input.right) || 0)));

    const runsToday = await prisma.activity
      .count({
        where: {
          username: profile.username,
          action: { startsWith: "PLUGGADE" },
          createdAt: { gte: startOfDay() },
        },
      })
      .catch(() => 0);

    const label = deck ? "gloskortset" : "quizen";
    const name = (subject as { title: string }).title;

    if (runsToday >= STUDY_RUNS_PER_DAY) {
      // Still logged, so the day's work is visible — just not paid twice over.
      await prisma.activity
        .create({
          data: {
            username: profile.username,
            action: `PLUGGADE ${label} ${name} → ${right}/${total} rätt (dagens XP-tak nått)`,
          },
        })
        .catch(() => {});
      return {
        ok: true,
        capped: true,
        info: `Snyggt — ${right}/${total} rätt! Dagens plugg-XP är redan tagen, XP räknas igen imorgon.`,
      };
    }

    const xp = Math.min(MAX_XP_PER_RUN, right * XP_PER_RIGHT + 5);
    const coins = Math.min(MAX_COINS_PER_RUN, right * 2);
    const wallet = await grantXp(profile.id, xp, coins);

    await prisma.activity
      .create({
        data: {
          username: profile.username,
          action: `PLUGGADE ${label} ${name} → ${right}/${total} rätt (+${xp} XP)`,
        },
      })
      .catch(() => {});

    revalidatePath("/study");
    revalidatePath("/progress");
    revalidatePath("/dashboard");

    return {
      ok: true,
      info: `+${xp} XP och +${coins} mynt för ${right}/${total} rätt!`,
      xp,
      coins,
      xpTotal: wallet?.xp,
      coinsTotal: wallet?.coins,
      level: wallet?.level,
    };
  } catch {
    return { ok: false, info: "Kunde inte spara resultatet — försök igen." };
  }
}
