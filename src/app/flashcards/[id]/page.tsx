import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import StudyDeck from "@/components/study-deck";
import AddCardForm from "@/components/add-card-form";

export default async function DeckPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const col = await prisma.flashcardCollection.findUnique({
    where: { id: params.id },
    include: { flashcards: true },
  });
  if (!col) redirect("/flashcards");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <Link href="/flashcards" className="text-slate-400 hover:text-white">⬅️ All decks</Link>
        <div className="flex items-center gap-2">
          <Link href={`/host/deck/${col.id}`} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-500">⚔️ Host Battle</Link>
          <span className="rounded-full bg-indigo-600/20 px-3 py-1 text-xs font-bold text-indigo-300">{col.flashcards.length} cards</span>
        </div>
      </div>
      <h1 className="mt-4 text-center text-4xl font-extrabold text-white">{col.title}</h1>
      {col.description && <p className="mt-2 text-center text-slate-400">{col.description}</p>}

      <div className="mt-8">
        <StudyDeck cards={col.flashcards.map((f) => ({ id: f.id, front: f.frontText, back: f.backText.split("|")[0] }))} />
      </div>

      <AddCardForm collectionId={col.id} />
    </div>
  );
}