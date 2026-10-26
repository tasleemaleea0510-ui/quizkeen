"use client";
import { usePathname } from "next/navigation";
import { isGameScreen } from "@/lib/game-screen";

export default function Footer() {
  // A game fills the screen down to the last pixel, so the footer sits this one
  // out — scrolling past the answers to reach a copyright line helps nobody.
  const pathname = usePathname();
  if (isGameScreen(pathname)) return null;

  return (
    <footer className="relative mt-16 border-t border-white/5 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row sm:text-left">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} QuizKeen — Lär. Spela. Tävla.
        </p>
        <p className="text-xs text-slate-600">Byggt av Abdullah Shafi</p>
      </div>
    </footer>
  );
}
