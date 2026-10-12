"use server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function createCollection(formData: FormData) {
  const user = await requireUser();
  const title = (formData.get("title") as string)?.trim();
  if (!title) redirect("/flashcards");
  const description = (formData.get("description") as string)?.trim() || null;
  const col = await prisma.flashcardCollection.create({
    data: { title, description, creatorId: user.id },
  });
  redirect(`/flashcards/${col.id}`);
}

export async function addCard(formData: FormData) {
  await requireUser();
  const collectionId = formData.get("collectionId") as string;
  const frontText = (formData.get("frontText") as string)?.trim();
  const backText = (formData.get("backText") as string)?.trim();
  const wrongs = (formData.getAll("wrong") as string[]).map((w) => w.trim()).filter(Boolean);
  if (!frontText || !backText) redirect(`/flashcards/${collectionId}`);
  const combined = [backText, ...wrongs].join("|");
  await prisma.flashcard.create({ data: { collectionId, frontText, backText: combined } });
  revalidatePath(`/flashcards/${collectionId}`);
  redirect(`/flashcards/${collectionId}`);
}

export async function deleteCollection(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id") as string;
  const col = await prisma.flashcardCollection.findUnique({ where: { id } });
  if (col && col.creatorId === user.id) {
    await prisma.flashcardCollection.delete({ where: { id } });
  }
  redirect("/flashcards");
}