import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createCollection, deleteCollection } from "./actions";

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
        <h1 className="text-5xl font-extrabold tracking-tight text-white">
          🃏 Glos<span className="text-indigo-400">kort</span>
        </h1>
        <p className="mt-3 text-slate-400">Bygg dina egna gloskort. Vänd. Lär. Dominera. ✨</p>
      </div>

      <form action={createCollection} className="mt-10 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-600/20 via-slate-900 to-purple-600/20 p-6 shadow-xl shadow-indigo-500/10">
        <h2 className="text-lg font-bold text-white">✨ Skapa nya gloskort</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="title" required placeholder="Kortens namn (t.ex. Bio kap. 4)" className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none" />
          <input name="description" placeholder="Beskrivning (valfritt)" className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none" />
        </div>
        <button className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-500">🚀 Skapa gloskort</button>
      </form>

      <h2 className="mt-10 text-xl font-bold text-white">📚 Dina gloskort ({collections.length})</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <div key={c.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-all hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-white">{c.title}</h3>
              <span className="whitespace-nowrap rounded-full bg-indigo-600/20 px-3 py-1 text-xs font-bold text-indigo-300">{c._count.flashcards} kort</span>
            </div>
            {c.description && <p className="mt-2 text-sm text-slate-400">{c.description}</p>}
            <div className="mt-4 flex gap-2">
              <Link href={`/flashcards/${c.id}`} className="flex-1 rounded-xl bg-indigo-600 py-2 text-center text-sm font-bold text-white hover:bg-indigo-500">🎴 Plugga</Link>
              <form action={deleteCollection}>
                <input type="hidden" name="id" value={c.id} />
                <button className="rounded-xl bg-slate-800 px-3 py-2 text-sm text-red-400 hover:bg-red-600/20">🗑️</button>
              </form>
            </div>
          </div>
        ))}
        {collections.length === 0 && (
          <p className="text-slate-500">Inga gloskort än — skapa dina första här ovanför! ☝️</p>
        )}
      </div>
    </div>
  );
}