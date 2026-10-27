"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { grantXp } from "@/lib/xp";
import { dayKey, questClaimKey, questsForDay } from "@/lib/quests";
import { readQuestProgress } from "@/lib/quests-server";
import { revalidatePath } from "next/cache";

/**
 * Claim a daily quest.
 *
 * The client shows the button, but the server decides: it re-reads today's
 * progress from the tables, refuses a quest that is not one of *today's* three,
 * and refuses a second claim of the same quest.
 *
 * The "only once" rule is enforced with an advisory lock rather than a read
 * followed by a write. Without it, two eager clicks could both pass the check
 * and pay out twice — and this is the one place in the app where a double-click
 * costs real XP.
 */
export type ClaimResult = {
  ok: boolean;
  info: string;
  xp?: number;
  coins?: number;
  /** The wallet after the grant, so the header can update without a reload. */
  xpTotal?: number;
  coinsTotal?: number;
  level?: number;
};

export async function claimQuest(questId: string): Promise<ClaimResult> {
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

    const day = dayKey();
    const quest = questsForDay(day).find((q) => q.id === questId);
    if (!quest) return { ok: false, info: "Det uppdraget är inte dagens uppdrag." };

    const progress = await readQuestProgress(profile.id, profile.username, day);
    const done = progress[quest.metric] ?? 0;
    if (done < quest.target) {
      return {
        ok: false,
        info: `Inte klart än — ${done}/${quest.target}. ${quest.hint}`,
      };
    }

    const marker = questClaimKey(day, quest.id);
    const claimed = await prisma.$transaction(async (tx) => {
      // Serialises two claims of the same marker, whichever instance they land on.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${marker}))`;
      const existing = await tx.activity.count({
        where: { username: profile.username, action: marker },
      });
      if (existing) return false;
      await tx.activity.create({ data: { username: profile.username, action: marker } });
      return true;
    });

    if (!claimed) return { ok: false, info: "Du har redan hämtat det här uppdraget idag." };

    const wallet = await grantXp(profile.id, quest.xp, quest.coins);
    await prisma.activity
      .create({
        data: {
          username: profile.username,
          action: `hämtade uppdraget "${quest.title}" (+${quest.xp} XP, +${quest.coins} mynt)`,
        },
      })
      .catch(() => {});

    revalidatePath("/quests");
    revalidatePath("/dashboard");

    return {
      ok: true,
      info: `${quest.emoji} ${quest.title} — +${quest.xp} XP och +${quest.coins} mynt!`,
      xp: quest.xp,
      coins: quest.coins,
      xpTotal: wallet?.xp,
      coinsTotal: wallet?.coins,
      level: wallet?.level,
    };
  } catch {
    return { ok: false, info: "Något gick fel. Försök igen." };
  }
}
