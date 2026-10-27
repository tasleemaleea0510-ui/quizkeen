import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/viewer";
import { createCollection, deleteCollection } from "./actions";
import PageHeader, { HeaderStat } from "@/components/page-header";
import DeckDueBadge from "@/components/deck-due-badge";
import Spotlight from "@/components/motion/spotlight";
import { Badge } from "@/components/ui/badge";
import { Layers, Plus, BookOpen, Trash2, Brain, Clock, Target, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Gloskort — the sets, and what is waiting in them.
 *
 * The due count on each card comes from the browser's repetition schedule (see
 * `lib/srs.ts`), so it appears a moment after the page rather than being part of
 * the server render. That is the honest way round: the schedule genuinely lives
 * on the device, and a wrong number baked into the HTML would be worse than a
 * number that takes one paint to arrive.
 */
export default async function FlashcardsPage() {
  const { user } = await getViewer();
  if (!user) redirect("/login");

  // The card ids come along, not just their count: the repetition schedule is
  // keyed by card id in the browser, so the due badge needs the same list the
  // study runner will see.
  const collections = await prisma.flashcardCollection
    .findMany({
      where: { creatorId: user.id },
      include: { flashcards: { select: { id: true, frontText: true, backText: true } } },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => []);

  const totalCards = collections.reduce((sum, c) => sum + c.flashcards.length, 0);
  const biggest = collections.reduce((max, c) => Math.max(max, c.flashcards.length), 0);

  return (
    <div data-accent="sky" className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        accent="sky"
        eyebrow="Gloskort"
        icon={Layers}
        title={
          <>
            Kort som kommer <span className="text-shine">tillbaka</span>
          </>
        }
        lead="Repetition i rätt intervall: ett kort du kan får längre och längre mellanrum, ett du missar dyker upp igen direkt. Rätt svar ger XP när passet är klart."
        chips={
          <>
            <HeaderStat icon={Layers} label="set" value={collections.length} tone="sky" />
            <HeaderStat icon={BookOpen} label="kort" value={totalCards} tone="violet" />
            <HeaderStat icon={Target} label="största set" value={biggest} tone="emerald" />
          </>
        }
        actions={
          <Link
            href="/study"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white hover:border-white/20"
          >
            <Brain className="h-4 w-4 text-sky-300" /> Study
          </Link>
        }
      />

      <form action={createCollection} className="surface mt-6 p-6">
        <div className="flex items-center gap-2 text-base font-bold text-white">
          <Plus className="h-4 w-4 text-sky-300" />
          <span>Skapa ny kortuppsättning</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            name="title"
            required
            placeholder="Samlingens namn (t.ex. Biologi kap. 4)"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white backdrop-blur transition-colors placeholder:text-slate-500 focus:border-sky-400/70 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
          <input
            name="description"
            placeholder="Kort beskrivning (valfritt)"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white backdrop-blur transition-colors placeholder:text-slate-500 focus:border-sky-400/70 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <button className="btn-shine mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-sky-500 to-indigo-600 py-3 text-sm font-bold text-white ring-1 ring-inset ring-white/15">
          <Plus className="h-4 w-4" />
          <span>Skapa gloskort</span>
        </button>
      </form>

      <h2 className="mt-8 flex items-center gap-2">
        <Layers className="h-5 w-5 text-sky-300" />
        <span className="section-title">Dina samlingar ({collections.length})</span>
      </h2>

      <div className="stagger-list mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <Spotlight key={c.id} className="surface card-hover flex flex-col justify-between p-5">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-white">{c.title}</h3>
                <Badge tone="sky">{c.flashcards.length} kort</Badge>
              </div>
              {c.description && <p className="mt-2 line-clamp-2 text-xs text-slate-400">{c.description}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <DeckDueBadge collectionId={c.id} cardIds={c.flashcards.map((f) => f.id)} />
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <Link
                href={`/flashcards/${c.id}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-sky-500 to-indigo-600 py-2.5 text-center text-xs font-bold text-white ring-1 ring-inset ring-white/15"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Plugga</span>
              </Link>
              <form action={deleteCollection}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  aria-label={`Radera ${c.title}`}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-slate-400 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </Spotlight>
        ))}
        {collections.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-slate-500">
            <Sparkles className="h-5 w-5 text-sky-300" />
            Inga gloskort än — skapa din första uppsättning i formuläret ovan.
          </div>
        )}
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
        <Clock className="h-3.5 w-3.5" />
        Intervallen är 0 · 1 · 3 · 7 · 16 dagar. Schemat ligger i din webbläsare, per set.
      </p>
    </div>
  );
}
