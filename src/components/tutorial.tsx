"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

const KEY = "quizkeen_tutorial_done";

const STEPS = [
  { icon: "🎮", title: "Starta en live-frågesport", text: "Tryck på “Börja spela”, välj en quiz och få en 6-siffrig PIN-kod. Dela med hela klassen!" },
  { icon: "🕹️", title: "Gå med med en PIN-kod", text: "Spelare trycker på “Gå med i ett spel”, skriver PIN-koden + valfritt namn och hoppar in i lobbyn." },
  { icon: "🏃", title: "Spring medan du väntar", text: "Ingen tråkig väntan! Lobbyn har ett minispel — spring & hoppa med dina vänner tills arrangören startar." },
  { icon: "❓", title: "Svara snabbt!", text: "Välj bland de färgade knapparna. Rätt + snabbt = mer poäng (upp till 150 per fråga!)." },
  { icon: "🃏", title: "Kortlekar", text: "Bygg kortlekar och vänd kort själv för att plugga. Ska du starta en strid? Lägg till fejk-svar också!" },
  { icon: "⚔️", title: "Kortleksstrider", text: "Starta en strid med en PIN-kod — spelarna ser frågan, kämpar om att välja rätt sida, och kortet VÄNDS och avslöjar svaret!" },
  { icon: "🏆", title: "XP, mynt & nivåer", text: "Varje rätt svar ger XP & mynt. 100 XP = nivå upp! Klättra på topplistan." },
  { icon: "🎭", title: "Roller & färger", text: "👑 ÄGARE = glänsande GULD · 🛡️ ADMIN = röd · 🕵️ SÄKERHET = ljusblå · 🍎 LÄRARE = mörkblå · 🎒 ELEV = grå. Din färg syns bredvid ditt namn ÖVERALLT på sajten!" },
  { icon: "🌈", title: "Toppliste-färger", text: "1:a plats = glödande GRÖN · 2:a = lila · 3:e = mörkgul. MEN staff (ägare/admin/säkerhet) behåller ALLTID sin rollfärg — respekt!" },
  { icon: "🍎", title: "Lärarkrafter", text: "Lärare kan skapa klassrum, ge läxor, se klassens statistik och dela med sig XP. Elever kan inte — det är därför det är en KRAFT!" },
  { icon: "⚙️", title: "Gör det till ditt", text: "Byt användarnamn & lösenord när som helst i Inställningar." },
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
                  🎓 Så spelar du <span className="text-indigo-400">QuizKeen</span>
                </h2>
                <p className="mt-2 text-slate-400">Rundturen på 60 sekunder — allt du behöver för att dominera!</p>
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
                  🚀 Nu kör vi!
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}