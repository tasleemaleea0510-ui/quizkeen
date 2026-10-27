"use server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardGameXp, type GameWinner } from "@/lib/game-xp";

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

/** The deck battle pays out through the same gate as the quiz game. */
export async function awardXP(deckId: string, winners: GameWinner[]) {
  return awardGameXp({ deckId }, winners);
}