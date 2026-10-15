"use client";

import { useEffect, useState } from "react";
import { readLang, type Lang } from "../lib/i18n";
import { HELP, MATRIX, pick, type ConsoleKind, type HelpItem } from "../lib/help";
import { Cross, Help as HelpIcon, Warning } from "./icons";

/**
 * The "what does this button do?" guide.
 *
 * Two ways in, one set of content:
 *   - `HelpPanel`  — the full guide as a tab inside the console;
 *   - `HelpButton` — the round ? button in the corner that opens it as a modal
 *                    from anywhere, so nobody has to leave the user they were
 *                    working on.
 *
 * The guide follows the console's own SV/EN switch. It renders the chosen
 * language itself and is wrapped in `data-no-translate`, because the DOM
 * translation engine works word by word and would turn a Swedish sentence into
 * half English.
 */

const TONE: Record<ConsoleKind, { text: string; border: string; soft: string; button: string; chip: string }> = {
  OWNER: {
    text: "text-amber-300",
    border: "border-amber-500/40",
    soft: "bg-amber-500/5",
    button: "bg-amber-600 hover:bg-amber-500",
    chip: "bg-amber-500/15 text-amber-200",
  },
  ADMIN: {
    text: "text-red-400",
    border: "border-red-500/40",
    soft: "bg-red-500/5",
    button: "bg-red-600 hover:bg-red-500",
    chip: "bg-red-500/15 text-red-200",
  },
  SECURITY: {
    text: "text-sky-300",
    border: "border-sky-500/40",
    soft: "bg-sky-500/5",
    button: "bg-sky-600 hover:bg-sky-500",
    chip: "bg-sky-500/15 text-sky-200",
  },
};

const T = {
  help: "Hjälp & guide||Help & guide",
  how: "Så gör du||How",
  rules: "Bra att veta||Good to know",
  matrix: "Vem får göra vad?||Who's allowed to do what?",
  colOwner: "Ägare||Owner",
  colAdmin: "Admin||Admin",
  colSecurity: "Säkerhet||Security",
  close: "Stäng||Close",
};

/** Current console language, kept in sync with the SV/EN button. */
export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>("sv");
  useEffect(() => {
    setLang(readLang());
    const sync = () => setLang(readLang());
    window.addEventListener("qk-lang", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("qk-lang", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return lang;
}

function Item({ item, lang, tone }: { item: HelpItem; lang: Lang; tone: (typeof TONE)[ConsoleKind] }) {
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <p className={`text-sm font-extrabold ${tone.text}`}>{pick(item.name, lang)}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">{pick(item.what, lang)}</p>
      {item.how && (
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          <b className="text-slate-300">{pick(T.how, lang)}: </b>
          {pick(item.how, lang)}
        </p>
      )}
      {item.warn && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1.5 text-xs font-bold leading-relaxed text-amber-300">
          <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{pick(item.warn, lang)}</span>
        </p>
      )}
    </li>
  );
}

/** The guide itself, both languages, in the console's own colours. */
export function HelpGuide({ kind, lang }: { kind: ConsoleKind; lang: Lang }) {
  const doc = HELP[kind];
  const tone = TONE[kind];

  return (
    <div data-no-translate className="space-y-8">
      <header>
        <h2 className={`flex items-center gap-2 text-2xl font-extrabold ${tone.text}`}>
          <HelpIcon className="h-6 w-6" />
          {pick(doc.title, lang)}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">{pick(doc.lead, lang)}</p>
      </header>

      <section className={`rounded-2xl border ${tone.border} ${tone.soft} p-4`}>
        <h3 className={`text-sm font-extrabold ${tone.text}`}>{pick(T.rules, lang)}</h3>
        <ul className="mt-2 space-y-1.5">
          {doc.rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-slate-300">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone.button}`} />
              <span>{pick(rule, lang)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className={`text-sm font-extrabold ${tone.text}`}>{pick(T.matrix, lang)}</h3>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2 font-bold"> </th>
                <th className="px-3 py-2 font-bold text-amber-300">{pick(T.colOwner, lang)}</th>
                <th className="px-3 py-2 font-bold text-red-300">{pick(T.colAdmin, lang)}</th>
                <th className="px-3 py-2 font-bold text-sky-300">{pick(T.colSecurity, lang)}</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row, i) => (
                <tr key={i} className="border-t border-slate-800 align-top">
                  <td className="px-3 py-2 font-bold text-white">{pick(row.what, lang)}</td>
                  <td className="px-3 py-2 text-slate-300">{pick(row.owner, lang)}</td>
                  <td className="px-3 py-2 text-slate-300">{pick(row.admin, lang)}</td>
                  <td className="px-3 py-2 text-slate-300">{pick(row.security, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {doc.sections.map((section, i) => (
        <section key={section.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-white">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone.button} text-xs font-extrabold text-white`}>
              {i + 1}
            </span>
            {pick(section.title, lang)}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{pick(section.lead, lang)}</p>

          {section.steps && (
            <ol className="mt-3 space-y-2">
              {section.steps.map((step, n) => (
                <li key={n} className="flex items-start gap-2 text-sm leading-relaxed text-slate-300">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs font-bold ${tone.chip}`}>
                    {n + 1}
                  </span>
                  <span>{pick(step, lang)}</span>
                </li>
              ))}
            </ol>
          )}

          {section.groups.map((group) => (
            <div key={group.title} className="mt-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{pick(group.title, lang)}</h4>
              <ul className="mt-2 space-y-2">
                {group.items.map((item, k) => (
                  <Item key={k} item={item} lang={lang} tone={tone} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/** The guide as its own tab inside the console. */
export function HelpPanel({ kind }: { kind: ConsoleKind }) {
  const lang = useLang();
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
      <HelpGuide kind={kind} lang={lang} />
    </div>
  );
}

/** The round ? button, always reachable, opens the same guide in a modal. */
export function HelpButton({ kind }: { kind: ConsoleKind }) {
  const [open, setOpen] = useState(false);
  const lang = useLang();
  const tone = TONE[kind];

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={pick(T.help, lang)}
        aria-label={pick(T.help, lang)}
        data-no-translate
        className={`fixed bottom-4 left-4 z-[105] flex items-center gap-2 rounded-full ${tone.button} px-4 py-3 text-sm font-extrabold text-white shadow-xl transition-transform hover:scale-105 active:scale-95`}
      >
        <HelpIcon className="h-5 w-5" />
        <span className="hidden sm:inline">{pick(T.help, lang)}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[140] flex items-stretch justify-center bg-black/80 p-2 backdrop-blur-sm sm:items-start sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className={`flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl border ${tone.border} bg-slate-950 shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-extrabold text-white">
                <HelpIcon className={`h-4 w-4 ${tone.text}`} />
                {pick(T.help, lang)}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-700"
              >
                <Cross className="h-3.5 w-3.5" />
                {pick(T.close, lang)}
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6">
              <HelpGuide kind={kind} lang={lang} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
