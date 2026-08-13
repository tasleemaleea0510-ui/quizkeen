import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          Lär. Spela. <span className="text-indigo-400">Tävla.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          QuizKeen förvandlar ditt klassrum till en live gameshow. Starta frågesporter med en PIN-kod, spela minispel i lobbyn, samla XP och mynt, och klättra på topplistan.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/register">
            <Button size="lg">Börja spela — Gratis</Button>
          </Link>
          <Link href="/play">
            <Button size="lg" variant="outline">Gå med i ett spel</Button>
          </Link>
        </div>
      </div>

      <div className="mt-20 grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>🎮 Live Multiplayer</CardTitle></CardHeader>
          <CardContent className="text-slate-400">
            Vem som helst kan starta live-frågesporter & ⚔️ kortleksstrider med en 6-siffrig PIN-kod. Hela klassen går med och tävlar i realtid.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>🏃 Minispel i lobbyn</CardTitle></CardHeader>
          <CardContent className="text-slate-400">
            Inga tråkiga vänteskärmar — spring & hoppa med dina vänner i lobbyns minispel medan arrangören gör sig redo.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>🏆 XP, mynt & nivåer</CardTitle></CardHeader>
          <CardContent className="text-slate-400">
            Varje rätt svar ger XP & mynt. Gå upp i nivå, klättra på topplistan och bemästra allt med den inbyggda guiden!
          </CardContent>
        </Card>
      </div>
    </div>
  );
}