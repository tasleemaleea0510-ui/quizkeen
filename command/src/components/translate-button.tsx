"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Globe } from "./icons";
import { applyTranslations, observeTranslations, readLang, writeLang, type Lang } from "../lib/i18n";

/**
 * Language switch for the whole command console.
 *
 * Works in both directions, instantly — no reload and no "stuck in English"
 * state, because the engine restores every node's original text before it
 * applies the other language.
 */
export default function TranslateButton() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Lang>("sv");
  const pathname = usePathname();

  useEffect(() => {
    setLang(readLang());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTranslations(lang);
    return observeTranslations(lang);
  }, [lang, mounted, pathname]);

  function toggle() {
    const next: Lang = lang === "sv" ? "en" : "sv";
    setLang(next);
    writeLang(next);
  }

  // Hold the spot for one paint so the saved language is used from the start.
  if (!mounted) return <div className="fixed left-3 top-3 z-[999] h-9 w-[104px]" aria-hidden />;

  return (
    <button
      type="button"
      onClick={toggle}
      data-qk-i18n=""
      title={lang === "sv" ? "Byt till engelska" : "Switch to Swedish"}
      aria-label={lang === "sv" ? "Byt till engelska" : "Switch to Swedish"}
      className="fixed left-3 top-3 z-[999] flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-bold text-slate-200 shadow-lg backdrop-blur transition-all hover:scale-105 hover:border-indigo-500/60 hover:text-white active:scale-95"
    >
      <Globe className="h-4 w-4 text-indigo-400" />
      <span className="tracking-wide">{lang === "sv" ? "SV" : "EN"}</span>
      <span className="text-slate-500">/</span>
      <span className="text-slate-400">{lang === "sv" ? "EN" : "SV"}</span>
    </button>
  );
}
