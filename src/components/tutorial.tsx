"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { 
  HelpCircle, 
  Gamepad2, 
  Hash, 
  Clock, 
  CheckCircle2, 
  Layers, 
  Swords, 
  Trophy, 
  Shield, 
  GraduationCap, 
  Settings 
} from "lucide-react";

const KEY = "quizkeen_tutorial_done";

const STEPS = [
  { icon: <Gamepad2 className="h-5 w-5 text-indigo-400" />, title: "Starta en live-frågesport", text: "Välj en quiz och få en 6-siffrig PIN-kod att dela med hela klassen." },
  { icon: <Hash className="h-5 w-5 text-indigo-400" />, title: "Gå med med en PIN-kod", text: "Spelare väljer “Gå med i ett spel”, anger PIN-koden och sitt namn för att delta i lobbyn." },
  { icon: <Clock className="h-5 w-5 text-indigo-400" />, title: "Minispel i lobbyn", text: "Spela minispelet i väntrummet medan arrangören förbereder start." },
  { icon: <CheckCircle2 className="h-5 w-5 text-indigo-400" />, title: "Svara snabbt för bonuspoäng", text: "Välj bland svarsalternativen. Snabbare svar ger högre poäng." },
  { icon: <Layers className="h-5 w-5 text-indigo-400" />, title: "Gloskort & kortlekar", text: "Skapa digitala kortlekar och vänd kort för att öva själv inför prov." },
  { icon: <Swords className="h-5 w-5 text-indigo-400" />, title: "Kortleksstrider", text: "Utmana vänner i realtidsstrider baserade på dina gloskort." },
  { icon: <Trophy className="h-5 w-5 text-indigo-400" />, title: "XP, mynt & nivåer", text: "Rätta svar ger erfarenhetspoäng och mynt för att klättra på topplistan." },
  { icon: <Shield className="h-5 w-5 text-indigo-400" />, title: "Roller & behörigheter", text: "Systemet har separata vyer för elever, lärare, administratörer och moderatorer." },
  { icon: <GraduationCap className="h-5 w-5 text-indigo-400" />, title: "Lärarverktyg", text: "Lärare kan skapa klassrum, tilldela läxor och granska deltagarstatistik." },
  { icon: <Settings className="h-5 w-5 text-indigo-400" />, title: "Anpassa din profil", text: "Hantera användarnamn och inställningar direkt via inställningspanelen." },
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
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} title="Instruktioner">
        <HelpCircle className="h-4 w-4 text-slate-400" />
      </Button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
                <button
                  onClick={close}
                  className="absolute right-4 top-4 rounded-xl bg-slate-800 px-3 py-1 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
                <h2 className="pr-10 text-2xl font-bold text-white sm:text-3xl">
                  Så fungerar <span className="text-indigo-400">QuizKeen</span>
                </h2>
                <p className="mt-1 text-xs text-slate-400">Snabbguide över funktionerna i plattformen.</p>
                <div className="mt-6 space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                  {STEPS.map((s, i) => (
                    <div key={i} className="flex items-start gap-3.5 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                        {s.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{i + 1}. {s.title}</p>
                        <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{s.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={close} 
                  className="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                  Kom igång
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}