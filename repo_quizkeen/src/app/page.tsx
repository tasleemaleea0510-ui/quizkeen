import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, Trophy, Zap, ArrowRight, Play, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Interaktivt lärande i realtid</span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-white">
          Lär. Spela. <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Tävla.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed">
          QuizKeen förvandlar ditt klassrum till en levande frågesport. Starta spel med en PIN-kod, kör roliga minispel i lobbyn, samla XP och mynt, och klättra på topplistan.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="gap-2">
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

      <div className="mt-20 grid gap-6 sm:grid-cols-3">
        <Card className="hover:border-slate-700 transition-colors">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <CardTitle>Live Multiplayer</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-400 leading-relaxed">
            Starta live-frågesporter och kortleksstrider med en 6-siffrig PIN-kod. Hela klassen ansluter och tävlar i realtid.
          </CardContent>
        </Card>
        <Card className="hover:border-slate-700 transition-colors">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Zap className="h-5 w-5" />
            </div>
            <CardTitle>Minispel i lobbyn</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-400 leading-relaxed">
            Inga tråkiga vänteskärmar — spela och interagera med dina vänner i lobbyns minispel medan arrangören gör sig redo.
          </CardContent>
        </Card>
        <Card className="hover:border-slate-700 transition-colors">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
              <Trophy className="h-5 w-5" />
            </div>
            <CardTitle>XP, mynt & nivåer</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-400 leading-relaxed">
            Varje rätt svar belönas med XP och mynt. Gå upp i nivå, klättra på topplistan och bemästra allt med den inbyggda guiden.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}