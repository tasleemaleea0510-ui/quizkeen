"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

const KEY = "quizkeen_tutorial_done";

const STEPS = [
  { icon: "🎮", title: "Host a Live Quiz", text: "Press “Start Playing”, pick a quiz and get a 6-digit PIN. Share it with the whole class!" },
  { icon: "🕹️", title: "Join with a PIN", text: "Players press “Join a Game”, type the PIN + any name, and jump straight into the lobby." },
  { icon: "🏃", title: "Race While Waiting", text: "No boring waiting! The lobby has a mini-game — run & jump with your friends until the host starts." },
  { icon: "❓", title: "Answer Fast!", text: "Pick from the colored buttons. Correct + fast = more points (up to 150 per question!)." },
  { icon: "🃏", title: "Flashcards", text: "Build decks and flip cards solo to study. Planning a battle? Add fake answers too!" },
  { icon: "⚔️", title: "Flashcard Battles", text: "Host a deck with a PIN — players see the question, race to pick the right side, and the card FLIPS to reveal the answer!" },
  { icon: "🏆", title: "XP, Coins & Levels", text: "Every correct answer earns XP & coins. 100 XP = level up! Climb the leaderboard." },
  { icon: "⚙️", title: "Make It Yours", text: "Change your username & password anytime in Settings." },
];

export default function TutorialWidget() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {}
  }, []);

  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setOpen(false);
  };

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>❓</Button>
      {open &&
        createPortal(
          <div className="qk-tut-scroll fixed inset-0 z-[70] overflow-y-auto bg-black/80 backdrop-blur-sm">
            <style>{`
              .qk-tut-scroll { scrollbar-width: thin; scrollbar-color: #475569 transparent; }
              .qk-tut-scroll::-webkit-scrollbar { width: 8px; }
              .qk-tut-scroll::-webkit-scrollbar-track { background: transparent; }
              .qk-tut-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 8px; }
            `}</style>
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-2xl rounded-3xl border border-indigo-500/40 bg-slate-900 p-6 shadow-2xl shadow-indigo-500/20 sm:p-8">
                <button
                  onClick={close}
                  className="absolute right-4 top-4 rounded-xl bg-slate-800 px-3 py-1 text-lg font-bold text-slate-300 hover:bg-red-600/30 hover:text-white"
                >
                  ✕
                </button>
                <h2 className="pr-10 text-2xl font-extrabold text-white sm:text-3xl">
                  🎓 How to play <span className="text-indigo-400">QuizKeen</span>
                </h2>
                <p className="mt-2 text-slate-400">The 60-second tour — everything you need to dominate!</p>
                <div className="mt-6 space-y-3">
                  {STEPS.map((s, i) => (
                    <div key={i} className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <span className="text-3xl">{s.icon}</span>
                      <div>
                        <p className="font-bold text-white">{i + 1}. {s.title}</p>
                        <p className="mt-1 text-sm text-slate-400">{s.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={close} className="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-lg font-bold text-white hover:bg-indigo-500">
                  🚀 Let&apos;s go!
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}