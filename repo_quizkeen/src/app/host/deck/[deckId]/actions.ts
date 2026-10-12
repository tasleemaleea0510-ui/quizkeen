"use server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getDeck(deckId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const col = await prisma.flashcardCollection.findUnique({
    where: { id: deckId },
    include: { flashcards: true },
  });
  if (!col || col.creatorId !== user.id) return null;
  return {
    title: col.title,
    cards: col.flashcards.map((f) => ({ front: f.frontText, back: f.backText })),
  };
}

export async function awardXP(winners: { username: string; xp: number; coins: number }[]) {
  for (const w of winners) {
    try {
      const p = await prisma.profile.findUnique({ where: { username: w.username } });
      if (!p) continue;
      const xp = p.xp + w.xp;
      const level = Math.floor(xp / 100) + 1;
      await prisma.profile.update({
        where: { username: w.username },
        data: { xp, coins: p.coins + w.coins, level },
      });
    } catch {}
  }
}