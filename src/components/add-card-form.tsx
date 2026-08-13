"use client";
import { useState } from "react";
import { addCard } from "@/app/flashcards/actions";

export default function AddCardForm({ collectionId }: { collectionId: string }) {
  const [front, setFront] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrongs, setWrongs] = useState<string[]>([""]);

  async function submit() {
    const fd = new FormData();
    fd.set("collectionId", collectionId);
    fd.set("frontText", front);
    fd.set("backText", correct);
    wrongs.forEach((w) => fd.append("wrong", w));
    await addCard(fd);
  }

  return (
    <form action={submit} className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-lg font-bold text-white">➕ Add a card</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input value={front} onChange={(e) => setFront(e.target.value)} required placeholder="❓ Question (front)" className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none" />
        <input value={correct} onChange={(e) => setCorrect(e.target.value)} required placeholder="✅ Correct answer" className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none" />
      </div>
      <div className="mt-3 space-y-3">
        {wrongs.map((w, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={w}
              onChange={(e) => setWrongs((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))}
              placeholder={`❌ Fake answer ${i + 1}`}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
            />
            {wrongs.length > 1 && (
              <button type="button" onClick={() => setWrongs((arr) => arr.filter((_, idx) => idx !== i))} className="rounded-xl bg-slate-800 px-3 text-red-400 hover:bg-red-600/20">🗑️</button>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setWrongs((arr) => [...arr, ""])} className="mt-3 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-indigo-300 hover:bg-slate-700">
        ➕ Add one more fake answer
      </button>
      <div className="mt-4">
        <button className="rounded-xl bg-emerald-600 px-6 py-2 font-bold text-white hover:bg-emerald-500">💾 Add card</button>
      </div>
    </form>
  );
}