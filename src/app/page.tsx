import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          Learn. Play. <span className="text-indigo-400">Compete.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          QuizKeen turns your classroom into a live game show. Host quizzes with a PIN,
          play mini-games in the lobby, earn XP and coins, and climb the leaderboard.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/register">
            <Button size="lg">Start Playing — Free</Button>
          </Link>
          <Link href="/play">
            <Button size="lg" variant="outline">Join a Game</Button>
          </Link>
        </div>
      </div>

      <div className="mt-20 grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>🎮 Live Multiplayer</CardTitle></CardHeader>
          <CardContent className="text-slate-400">
            Teachers host with a 6-digit PIN. The whole class joins and battles live.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>🏃 Lobby Mini-Games</CardTitle></CardHeader>
          <CardContent className="text-slate-400">
            No boring waiting screens — play the jumping game with your friends while the host gets ready.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>🏆 XP, Coins & Levels</CardTitle></CardHeader>
          <CardContent className="text-slate-400">
            Every answer earns XP and coins. Level up and climb the leaderboard.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}