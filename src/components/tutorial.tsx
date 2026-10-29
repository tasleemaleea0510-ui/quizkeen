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
  ShieldCheck,
  GraduationCap,
  Gift,
  Sparkles,
  Zap,
  Flame,
} from "lucide-react";

const KEY = "quizkeen_tutorial_done";

/**
 * The guided tour, in the order a class actually meets the product.
 *
 * It follows one match from the PIN to the podium and only then explains the
 * things that live outside a match (Keens, decks, classrooms). The three game
 * modes get their own entries because they are the part people ask about — the
 * lobby picker is the first thing a host has to choose.
 */
const STEPS = [
  {
    icon: <Gamepad2 className="h-5 w-5 text-indigo-400" />,
    title: "Starta en live-frågesport",
    text: "Välj en quiz och få en sexsiffrig PIN. Projektorn visar PIN-koden, frågorna och poängställningen.",
  },
  {
    icon: <Hash className="h-5 w-5 text-sky-400" />,
    title: "Gå med med PIN-koden",
    text: "Spelare öppnar QuizKeen, trycker “Gå med i ett spel”, skriver PIN-koden och sitt namn — ingen app att ladda ner.",
  },
  {
    icon: <Clock className="h-5 w-5 text-violet-400" />,
    title: "Minispel i lobbyn",
    text: "Ingen tråkig väntan: medan värden startar spelar lobbyn ett minispel ihop.",
  },
  {
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
    title: "Svara snabbt för bonuspoäng",
    text: "Fyra färgade rutor i samma ordning på mobilen och på projektorn. Snabbare rätt svar ger mer XP.",
  },
  {
    icon: <Swords className="h-5 w-5 text-amber-400" />,
    title: "Tre spellägen",
    text: "Vault Raiders, Crypto Clash och Pirate Heist. Värden väljer läge i lobbyn — varje läge har egen valuta, egna regler och egen scen.",
  },
  {
    icon: <Gift className="h-5 w-5 text-amber-400" />,
    title: "Kistor och power-ups",
    text: "Vault Raiders: öppna en kista per fråga — myntregn, skattkarta, spegelbyte, väktarsigill eller stormladdning. Om rånet saknar ett giltigt mål ger valvet tröstpris. Crypto Clash: “Dubbla” din plånbok en gång per match och håll spåret lågt. Pirate Heist: välj smygrån, snabbrån eller full attack.",
  },
  {
    icon: <Shield className="h-5 w-5 text-emerald-400" />,
    title: "Försvara ditt byte",
    text: "Köp lasergrid, brandvägg eller skattkista innan någon hinner råna dig. Ett stoppat rån kan avslöja tjuven.",
  },
  {
    icon: <Zap className="h-5 w-5 text-emerald-400" />,
    title: "XP, mynt och nivåer",
    text: "Rätta svar, gloskort och avklarade läxor ger XP. Nivån räknas alltid fram från din XP, så siffrorna kan aldrig gå isär.",
  },
  {
    icon: <Sparkles className="h-5 w-5 text-fuchsia-400" />,
    title: "Keens att samla",
    text: "Varje spelare har en Keen som sitter på axeln i matcherna. Lås upp fler, öppna paket och handla i marknaden för mynt.",
  },
  {
    icon: <Layers className="h-5 w-5 text-sky-400" />,
    title: "Gloskort och kortlekar",
    text: "Bygg digitala kortlekar och repetera med vändbara kort — det ger XP och funkar som plugg inför prov.",
  },
  {
    icon: <Swords className="h-5 w-5 text-rose-400" />,
    title: "Kortleksstrider",
    text: "Utmana en vän i realtid med en kortlek som grund. Svaren avgör, inte turen.",
  },
  {
    icon: <GraduationCap className="h-5 w-5 text-sky-400" />,
    title: "Klassrum för lärare",
    text: "Skapa klassrum, bjud in elever, dela ut läxor och se vem som är klar — med varningar för den som halkar efter.",
  },
  {
    icon: <Flame className="h-5 w-5 text-amber-400" />,
    title: "Uppdrag och ledartavla",
    text: "Tre nya uppdrag varje dag, och en ledartavla som uppdaterar sig själv var femtonde sekund.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5 text-rose-300" />,
    title: "Roller och trygghet",
    text: "Elev, lärare, säkerhet, admin och ägare har olika vyer. Moderatorer kan stänga av konton och blockera adresser, och ägaren styr allt från kommandokonsolen.",
  },
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
                <p className="mt-1 text-xs text-slate-400">
                  Från PIN-koden till prispallen — och allt runtomkring.
                </p>
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