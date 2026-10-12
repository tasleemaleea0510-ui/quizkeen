import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createCollection, deleteCollection } from "./actions";
import { Layers, Plus, BookOpen, Trash2, PlusCircle } from "lucide-react";

export default async function FlashcardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const collections = await prisma.flashcardCollection.findMany({
    where: { creatorId: user.id },
    include: { _count: { select: { flashcards: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
          <Layers className="h-6 w-6" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Glos<span className="text-indigo-400">kort</span>
        </h1>
        <p className="mt-2 text-slate-400 text-sm">Skapa dina egna gloskort, öva inför prov och testa dina kunskaper.</p>
      </div>

      <form action={createCollection} className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-indigo-500/5">
        <div className="flex items-center gap-2 text-white font-bold text-base">
          <PlusCircle className="h-4 w-4 text-indigo-400" />
          <span>Skapa ny kortuppsättning</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input 
            name="title" 
            required 
            placeholder="Samlingens namn (t.ex. Biologi kap. 4)" 
            className="rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none text-sm" 
          />
          <input 
            name="description" 
            placeholder="Kort beskrivning (valfritt)" 
            className="rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none text-sm" 
          />
        </div>
        <button className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
          <Plus className="h-4 w-4" />
          <span>Skapa gloskort</span>
        </button>
      </form>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Layers className="h-4 w-4 text-indigo-400" />
          <span>Dina samlingar ({collections.length})</span>
        </h2>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <div key={c.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-all hover:border-slate-700 hover:shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-white">{c.title}</h3>
                <span className="whitespace-nowrap rounded-full bg-indigo-600/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/20">
                  {c._count.flashcards} kort
                </span>
              </div>
              {c.description && <p className="mt-2 text-xs text-slate-400 line-clamp-2">{c.description}</p>}
            </div>
            <div className="mt-5 flex items-center gap-2">
              <Link href={`/flashcards/${c.id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-center text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Plugga</span>
              </Link>
              <form action={deleteCollection}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" aria-label="Radera" className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        ))}
        {collections.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-slate-500 rounded-2xl border border-dashed border-slate-800">
            Inga gloskort skapade än. Skapa din första uppsättning i formuläret ovan!
          </div>
        )}
      </div>
    </div>
  );
}