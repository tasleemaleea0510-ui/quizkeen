import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, Trophy, Zap, ArrowRight, Play, Sparkles, Swords, Layers } from "lucide-react";
import Reveal from "@/components/motion/reveal";
import Tilt from "@/components/motion/tilt";

const FEATURES = [
  {
    icon: Gamepad2,
    title: "Live Multiplayer",
    text: "Starta live-frågesporter och kortleksstrider med en 6-siffrig PIN-kod. Hela klassen ansluter och tävlar i realtid.",
    tone: "border-indigo-500/30 bg-indigo-600/20 text-indigo-400",
  },
  {
    icon: Zap,
    title: "Minispel i lobbyn",
    text: "Inga tråkiga vänteskärmar — spela och interagera med dina vänner i lobbyns minispel medan arrangören gör sig redo.",
    tone: "border-violet-500/30 bg-violet-600/20 text-violet-400",
  },
  {
    icon: Trophy,
    title: "XP, mynt & nivåer",
    text: "Varje rätt svar belönas med XP och mynt. Gå upp i nivå, klättra på topplistan och bemästra allt med den inbyggda guiden.",
    tone: "border-amber-500/30 bg-amber-600/20 text-amber-400",
  },
];

const STEPS = [
  { icon: Gamepad2, title: "Starta en quiz", text: "Välj en quiz, få en PIN-kod och dela med klassen." },
  { icon: Layers, title: "Plugga med gloskort", text: "Bygg kortlekar och vänd kort för att träna inför prov." },
  { icon: Swords, title: "Utmana i strid", text: "Kör realtidsstrider på dina kortlekar — vem vinner?" },
  { icon: Sparkles, title: "Samla Keens", text: "Öppna paket, samla figurer och handla sällsynta Keens i marknaden." },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:pt-24">
      <div className="relative text-center">
        <div className="mx-auto mb-6 inline-flex animate-fade-in items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Live flerspelarquiz för hela klassrummet</span>
        </div>
        <h1 className="animate-fade-up font-display text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
          Lär. Spela. <span className="text-gradient animate-gradient-pan bg-[length:200%_auto]">Tävla.</span>
        </h1>
        <p className="animate-fade-up animate-delay-1 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          QuizKeen förvandlar ditt klassrum till en levande frågesport. Starta spel med en PIN-kod, kör
          roliga minispel i lobbyn, samla XP och mynt, och klättra på topplistan.
        </p>
        <div className="animate-fade-up animate-delay-2 mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/register">
            <Button size="lg" className="btn-shine gap-2">
              <span>Börja spela — Gratis</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/play">
            <Button size="lg" variant="outline" className="gap-2">
              <Play className="h-4 w-4 text-indigo-400" />
              <span>Gå med i ett spel</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* A card that leans towards the pointer, one after another on the way in. */}
      <div className="mt-20 grid gap-5 sm:grid-cols-3">
        {FEATURES.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <Reveal key={feature.title} delay={i * 90}>
              <Tilt className="h-full">
                <Card className="card-hover h-full">
                  <CardHeader>
                    <div
                      className={`mb-2 flex h-11 w-11 items-center justify-center rounded-xl border ${feature.tone}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="leading-relaxed text-slate-400">{feature.text}</CardContent>
                </Card>
              </Tilt>
            </Reveal>
          );
        })}
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <Reveal key={step.title} delay={i * 70}>
              <div className="h-full rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2.5 text-white">
                  <Icon className="h-4 w-4 text-indigo-400" />
                  <span className="font-semibold">{step.title}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{step.text}</p>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={80}>
        <Link
          href="/keens"
          className="group mt-14 flex flex-col items-center justify-between gap-4 overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-slate-900/40 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-400/50 hover:shadow-glow-sm sm:flex-row sm:p-8"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-indigo-400/30 bg-indigo-500/20 text-2xl animate-float">
              ✨
            </span>
            <div>
              <p className="font-display text-xl font-extrabold text-white">Samla Keens</p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-400">
                Gamerpaketet är först ut: fem figurer, från vanliga till hemliga. Fler paket är på väg — och två
                Keens delas bara ut av ägaren och en admin. Tjäna mynt genom att svara rätt och öppna paket.
              </p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition-colors group-hover:bg-white/10">
            Till samlingen <ArrowRight className="h-4 w-4 text-indigo-400" />
          </span>
        </Link>
      </Reveal>
    </div>
  );
}
