"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw, Shuffle } from "lucide-react";
import { WornBuddy } from "@/components/keens/worn-keen";

type CardT = { id: string; front: string; back: string };

export default function StudyDeck({ cards }: { cards: CardT[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [order, setOrder] = useState<number[]>(cards.map((_, idx) => idx));

  if (cards.length === 0) {
    return <p className="text-center text-slate-500 py-12">Inga kort än — lägg till ditt första kort nedan.</p>;
  }

  const card = cards[order[i % order.length] ?? 0];

  const go = (d: number) => {
    setFlipped(false);
    setI((p) => (p + d + order.length) % order.length);
  };

  const shuffle = () => {
    setFlipped(false);
    setOrder((o) => [...o].sort(() => Math.random() - 0.5));
    setI(0);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Your Keen studies with you — the same character you show off in a quiz. */}
      <WornBuddy label="Pluggar med dig" right={<span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-400">{order.length} kort</span>} className="w-full max-w-xl" />
      <style>{`
        .qk-scene { perspective: 1200px; }
        .qk-card3d { transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1); }
        .qk-card3d.qk-flipped { transform: rotateY(180deg); }
        .qk-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .qk-back { transform: rotateY(180deg); }
      `}</style>
      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
        <span>Kort {i + 1} av {order.length}</span>
        <span>•</span>
        <span className="text-indigo-400">Klicka på kortet för att vända</span>
      </div>
      {/* How much of the deck is behind you. */}
      <div className="h-1.5 w-full max-w-xl overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-[width] duration-500 ease-out"
          style={{ width: `${((i + 1) / order.length) * 100}%` }}
        />
      </div>
      <div
        key={card.id}
        className="qk-scene w-full max-w-xl animate-keen-rise cursor-pointer"
        onClick={() => setFlipped((f) => !f)}
      >
        <div className={`qk-card3d relative h-72 w-full ${flipped ? "qk-flipped" : ""}`}>
          <div className="qk-face absolute inset-0 flex items-center justify-center rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-indigo-600/30 via-slate-900 to-purple-600/30 p-8 shadow-2xl shadow-indigo-500/10 transition-shadow duration-300 hover:shadow-glow">
            <div className="text-center">
              <p className="mb-2 text-xs uppercase tracking-widest text-indigo-300 font-semibold">Fråga</p>
              <p className="text-2xl font-bold text-white">{card.front}</p>
            </div>
          </div>
          <div className="qk-face qk-back absolute inset-0 flex items-center justify-center rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-600/30 via-slate-900 to-teal-600/30 p-8 shadow-2xl shadow-emerald-500/10 transition-shadow duration-300 hover:shadow-glow-sm">
            <div className="text-center">
              <p className="mb-2 text-xs uppercase tracking-widest text-emerald-300 font-semibold">Svar</p>
              <p className="text-2xl font-bold text-white">{card.back}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button 
          onClick={() => go(-1)} 
          className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.1]"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Föregående</span>
        </button>
        <button 
          onClick={() => setFlipped((f) => !f)} 
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          <RotateCw className="h-4 w-4" />
          <span>Vänd</span>
        </button>
        <button 
          onClick={() => go(1)} 
          className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.1]"
        >
          <span>Nästa</span>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button 
          onClick={shuffle} 
          className="flex items-center gap-1.5 rounded-xl bg-violet-600/30 border border-violet-500/40 px-4 py-2 text-sm font-semibold text-violet-300 hover:bg-violet-600/50 transition-colors"
        >
          <Shuffle className="h-4 w-4" />
          <span>Blanda</span>
        </button>
      </div>
    </div>
  );
}