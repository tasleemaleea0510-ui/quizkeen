import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import StudyDeck from "@/components/study-deck";
import AddCardForm from "@/components/add-card-form";
import { ArrowLeft, Layers, Swords } from "lucide-react";

export default async function DeckPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const col = await prisma.flashcardCollection.findUnique({
    where: { id: params.id },
    include: { flashcards: true },
  });
  if (!col) redirect("/flashcards");

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <Link href="/flashcards" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Alla gloskort</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/host/deck/${col.id}`}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-b from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_26px_-12px_rgba(99,102,241,0.9)] ring-1 ring-inset ring-white/15 transition hover:from-indigo-400 hover:to-violet-500"
          >
            <Swords className="h-4 w-4" />
            <span>Starta strid</span>
          </Link>
          <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-200">{col.flashcards.length} kort</span>
        </div>
      </div>
      <div className="mt-8 text-center">
        <span className="eyebrow">
          <Layers className="h-3.5 w-3.5" />
          Gloskort
        </span>
      </div>
      <h1 className="page-title mt-3 text-center">{col.title}</h1>
      {col.description && <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-400">{col.description}</p>}

      <div className="mt-8">
        <StudyDeck cards={col.flashcards.map((f) => ({ id: f.id, front: f.frontText, back: f.backText.split("|")[0] }))} />
      </div>

      <AddCardForm collectionId={col.id} username={profile?.username ?? "kompis"} />
    </div>
  );
}