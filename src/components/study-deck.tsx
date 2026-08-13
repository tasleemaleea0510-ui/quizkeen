"use client";
import { useState } from "react";

type CardT = { id: string; front: string; back: string };

export default function StudyDeck({ cards }: { cards: CardT[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [order, setOrder] = useState<number[]>(cards.map((_, idx) => idx));

  if (cards.length === 0) {
    return <p className="text-center text-slate-500">No cards yet — add your first one below! 👇</p>;
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
      <style>{`
        .qk-scene { perspective: 1200px; }
        .qk-card3d { transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1); }
        .qk-card3d.qk-flipped { transform: rotateY(180deg); }
        .qk-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .qk-back { transform: rotateY(180deg); }
      `}</style>
      <p className="text-sm text-slate-400">Card {i + 1} / {order.length} — click the card to flip! ✨</p>
      <div className="qk-scene w-full max-w-xl cursor-pointer" onClick={() => setFlipped((f) => !f)}>
        <div className={`qk-card3d relative h-72 w-full ${flipped ? "qk-flipped" : ""}`}>
          <div className="qk-face absolute inset-0 flex items-center justify-center rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-indigo-600/30 via-slate-900 to-purple-600/30 p-8 shadow-2xl shadow-indigo-500/20">
            <div className="text-center">
              <p className="mb-2 text-xs uppercase tracking-widest text-indigo-300">Question</p>
              <p className="text-2xl font-bold text-white">{card.front}</p>
            </div>
          </div>
          <div className="qk-face qk-back absolute inset-0 flex items-center justify-center rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-600/30 via-slate-900 to-teal-600/30 p-8 shadow-2xl shadow-emerald-500/20">
            <div className="text-center">
              <p className="mb-2 text-xs uppercase tracking-widest text-emerald-300">Answer</p>
              <p className="text-2xl font-bold text-white">{card.back}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button onClick={() => go(-1)} className="rounded-xl bg-slate-800 px-5 py-2 font-bold text-white hover:bg-slate-700">⬅️ Prev</button>
        <button onClick={() => setFlipped((f) => !f)} className="rounded-xl bg-indigo-600 px-6 py-2 font-bold text-white hover:bg-indigo-500">🔄 Flip</button>
        <button onClick={() => go(1)} className="rounded-xl bg-slate-800 px-5 py-2 font-bold text-white hover:bg-slate-700">Next ➡️</button>
        <button onClick={shuffle} className="rounded-xl bg-purple-600 px-5 py-2 font-bold text-white hover:bg-purple-500">🎲 Shuffle</button>
      </div>
    </div>
  );
}