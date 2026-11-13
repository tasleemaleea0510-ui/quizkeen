import SandboxDemo from "./sandbox-demo";

/**
 * The sandbox screen itself, shared by the two routes that show it: the
 * owner-only `/sandbox` and the secret `/sandbox/s/<key>` link.
 *
 * `note` is the one line that differs — the owner's copy points at the secret
 * link, the friend's copy says who it is for.
 */
export default function SandboxScreen({ note }: { note?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-300">Sandlåda</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Prova QuizKeen utan konto
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        En demo för den som vill känna på mekaniken innan de skaffar konto: öppna paket, jämför Kahoot-
        och Blooket-tempot, se säsongsklockan. Sidan visar animationer och låtsasdata — inget sparas,
        inget kostar och inget spel startas.
      </p>
      {note && (
        <p className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-slate-400">
          {note}
        </p>
      )}

      <div className="mt-8">
        <SandboxDemo />
      </div>
    </div>
  );
}
