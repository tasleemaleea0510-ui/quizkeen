import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/viewer";
import { createCollection, deleteCollection } from "./actions";
import { Layers, Plus, BookOpen, Trash2 } from "lucide-react";

export default async function FlashcardsPage() {
  const { user } = await getViewer();
  if (!user) redirect("/login");

  const collections = await prisma.flashcardCollection.findMany({
    where: { creatorId: user.id },
    include: { _count: { select: { flashcards: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-600/20 text-indigo-400">
          <Layers className="h-6 w-6" />
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Glos<span className="text-gradient">kort</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">Skapa dina egna gloskort, öva inför prov och testa dina kunskaper.</p>
      </div>

      <form
        action={createCollection}
        className="mt-10 rounded-2xl border border-white/[0.07] bg-slate-900/50 p-6 shadow-card backdrop-blur-xl"
      >
        <div className="flex items-center gap-2 text-base font-bold text-white">
          <Plus className="h-4 w-4 text-indigo-400" />
          <span>Skapa ny kortuppsättning</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            name="title"
            required
            placeholder="Samlingens namn (t.ex. Biologi kap. 4)"
            className="rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <input
            name="description"
            placeholder="Kort beskrivning (valfritt)"
            className="rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-glow-sm transition-all hover:from-indigo-400 hover:to-indigo-500">
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
          <div
            key={c.id}
            className="card-hover flex animate-fade-up flex-col justify-between rounded-2xl border border-white/[0.07] bg-slate-900/50 p-5 backdrop-blur-xl"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-white">{c.title}</h3>
                <span className="whitespace-nowrap rounded-full border border-indigo-500/20 bg-indigo-600/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                  {c._count.flashcards} kort
                </span>
              </div>
              {c.description && <p className="mt-2 line-clamp-2 text-xs text-slate-400">{c.description}</p>}
            </div>
            <div className="mt-5 flex items-center gap-2">
              <Link
                href={`/flashcards/${c.id}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 py-2 text-center text-xs font-semibold text-white transition-all hover:from-indigo-400 hover:to-indigo-500"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Plugga</span>
              </Link>
              <form action={deleteCollection}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  aria-label="Radera"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        ))}
        {collections.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-slate-500">
            Inga gloskort skapade än. Skapa din första uppsättning i formuläret ovan!
          </div>
        )}
      </div>
    </div>
  );
}
