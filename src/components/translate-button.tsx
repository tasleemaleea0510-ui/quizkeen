"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import {
  applyTranslations,
  observeTranslations,
  readLang,
  writeLang,
  type Lang,
} from "@/lib/i18n";

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
    // Let React finish hydrating the streamed page before touching its text;
    // rewriting first made hydration compare words it never rendered.
    const first = window.setTimeout(() => applyTranslations(lang), 120);
    const stop = observeTranslations(lang);
    // The root layout renders `<html lang="sv">`, and React writes that
    // attribute back every time it reconciles the document — after a soft
    // navigation too, not just on hydration. A one-shot fix therefore lost the
    // race and left an English page claiming `lang="sv"`. Watch the attribute
    // and put our language back each time React resets it; setting it to a
    // value it already has mutates nothing, so this cannot loop.
    const html = document.documentElement;
    const syncLang = () => {
      if (html.lang !== lang) html.lang = lang;
    };
    syncLang();
    const langWatch = new MutationObserver(syncLang);
    langWatch.observe(html, { attributes: true, attributeFilter: ["lang"] });
    return () => {
      window.clearTimeout(first);
      stop();
      langWatch.disconnect();
    };
  }, [lang, mounted, pathname]);

  function toggle() {
    const next: Lang = lang === "sv" ? "en" : "sv";
    setLang(next);
    writeLang(next);
  }

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      data-qk-i18n=""
      title={lang === "sv" ? "Switch to English" : "Byt till svenska"}
      aria-label={lang === "sv" ? "Switch to English" : "Byt till svenska"}
      className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/95 px-3 py-1.5 text-xs font-bold text-slate-200 shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:border-indigo-500/50 hover:bg-slate-800 active:scale-95"
    >
      <Languages className="h-3.5 w-3.5 text-indigo-400" />
      <span>{lang === "sv" ? "EN" : "SV"}</span>
    </button>
  );
}
