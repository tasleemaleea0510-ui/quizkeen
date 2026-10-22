import { ShieldAlert } from "lucide-react";

/**
 * What the whole site looks like from a blocked connection.
 *
 * Deliberately not a page inside the app: no navbar, no chat bubble, no login
 * form — a blocked address has nothing to navigate to and nothing to sign in
 * with. It is rendered by the root layout, so every URL answers the same.
 */
export default function IpBlockedScreen({
  reason,
  until,
  ip,
}: {
  reason: string;
  until: string | null;
  ip: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-red-500/40 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/20 text-red-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mt-2 text-2xl font-extrabold text-red-400">Uppkopplingen är blockerad</h1>
        <p className="mt-2 text-sm text-slate-300">{reason}</p>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Det gäller den här uppkopplingen, inte bara ett konto. Ett nytt konto från samma nät
          släpps inte in.
        </p>
        {until && (
          <>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Går ut
            </p>
            <p className="mt-1 font-mono text-lg font-extrabold text-white">{until}</p>
          </>
        )}
        {!until && (
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-red-400/80">
            Ingen sluttid — gäller tills ägaren häver den
          </p>
        )}
        <p className="mt-6 font-mono text-[11px] text-slate-600" data-no-translate>
          {ip}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Tror du att det är fel? Kontakta en lärare eller skolans QuizKeen-ansvariga.
        </p>
      </div>
    </div>
  );
}
