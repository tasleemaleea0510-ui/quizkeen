import type { Metadata } from "next";
import SandboxDemo from "@/components/sandbox/sandbox-demo";

/**
 * The sandbox — a public, read-only demo.
 *
 * Deliberately outside the auth wall: the whole point is that someone can send
 * the link to a friend who has no account and let them feel the pack reveal, the
 * two pacing systems and the season clock. Nothing on this page talks to the
 * server, so there is nothing to protect and nothing to save.
 */
export const metadata: Metadata = {
  title: "Sandlåda — QuizKeen",
  description:
    "Prova QuizKeen utan konto: öppna ett låtsaspaket, jämför Kahoot- och Blooket-tempot och se säsongsklockan. Inget sparas.",
};

export default function SandboxPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-300">Sandlåda</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Prova QuizKeen utan konto
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        En publik demo för den som vill känna på mekaniken innan de skaffar konto: öppna paket, jämför
        Kahoot- och Blooket-tempot, se säsongsklockan. Sidan visar animationer och låtsasdata — inget
        sparas, inget kostar och inget spel startas.
      </p>

      <div className="mt-8">
        <SandboxDemo />
      </div>
    </div>
  );
}
