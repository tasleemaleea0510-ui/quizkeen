"use client";
import { useState } from "react";
import { addCard } from "@/app/flashcards/actions";
import { Plus, Trash2, Swords, Save } from "lucide-react";

export default function AddCardForm({ collectionId, username }: { collectionId: string; username?: string }) {
  const [front, setFront] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrongs, setWrongs] = useState<string[]>([""]);
  const [battleMode, setBattleMode] = useState(false);

  async function submit() {
    const fd = new FormData();
    fd.set("collectionId", collectionId);
    fd.set("frontText", front);
    fd.set("backText", correct);
    if (battleMode) wrongs.forEach((w) => fd.append("wrong", w));
    await addCard(fd);
  }

  return (
    <form action={submit} className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-base font-bold text-white flex items-center gap-2">
        <Plus className="h-4 w-4 text-indigo-400" />
        <span>Lägg till ett kort</span>
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input 
          value={front} 
          onChange={(e) => setFront(e.target.value)} 
          required 
          placeholder="Fråga / Term (framsida)" 
          className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none text-sm" 
        />
        <input 
          value={correct} 
          onChange={(e) => setCorrect(e.target.value)} 
          required 
          placeholder="Rätt svar / Definition" 
          className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none text-sm" 
        />
      </div>

      {battleMode ? (
        <>
          <div className="mt-3 space-y-3">
            {wrongs.map((w, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={w}
                  onChange={(e) => setWrongs((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))}
                  placeholder={`Alternativt svar ${i + 1}`}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none text-sm"
                />
                {wrongs.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => setWrongs((arr) => arr.filter((_, idx) => idx !== i))} 
                    className="rounded-xl bg-slate-800 px-3 text-slate-400 hover:text-red-400 hover:bg-red-600/20 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button 
              type="button" 
              onClick={() => setWrongs((arr) => [...arr, ""])} 
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-slate-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Lägg till fler svarsalternativ</span>
            </button>
            <button 
              type="button" 
              onClick={() => setBattleMode(false)} 
              className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-700 transition-colors"
            >
              Avbryt flervalsläge
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs text-slate-300">
            Vill du starta en strid med de här gloskorten? Lägg till svarsalternativ så att spelarna har val att välja mellan.
          </p>
          <button 
            type="button" 
            onClick={() => setBattleMode(true)} 
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            <Swords className="h-3.5 w-3.5" />
            <span>Aktivera flervalsalternativ</span>
          </button>
        </div>
      )}

      <div className="mt-4">
        <button 
          type="submit" 
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          <Save className="h-4 w-4" />
          <span>Spara kort</span>
        </button>
      </div>
    </form>
  );
}