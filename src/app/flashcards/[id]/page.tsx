import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import StudyDeck from "@/components/study-deck";
import { addCard } from "../actions";

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
        <span className="rounded-full bg-indigo-600/20 px-3 py-1 text-xs font-bold text-indigo-300">{col.flashcards.length} cards</span>
      </div>
      <h1 className="mt-4 text-center text-4xl font-extrabold text-white">{col.title}</h1>
      {col.description && <p className="mt-2 text-center text-slate-400">{col.description}</p>}

      <div className="mt-8">
        <StudyDeck cards={col.flashcards.map((f) => ({ id: f.id, front: f.frontText, back: f.backText }))} />
      </div>

      <form action={addCard} className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-bold text-white">➕ Add a card</h2>
        <input type="hidden" name="collectionId" value={col.id} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="frontText" required placeholder="Front (question)" className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none" />
          <input name="backText" required placeholder="Back (answer)" className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none" />
        </div>
        <button className="mt-4 rounded-xl bg-emerald-600 px-6 py-2 font-bold text-white hover:bg-emerald-500">💾 Add card</button>
      </form>
    </div>
  );
}