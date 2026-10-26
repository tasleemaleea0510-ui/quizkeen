"use client";
import { usePathname } from "next/navigation";
import { isGameScreen } from "@/lib/game-screen";
import { cn } from "@/lib/utils";

export default function Footer() {
  // A game fills the screen down to the last pixel, so the footer sits this one
  // out — scrolling past the answers to reach a copyright line helps nobody.
  const pathname = usePathname();
  if (isGameScreen(pathname)) return null;

  // The front page is light paper, so its footer is too — a dark strip under a
  // cream page would look like a different site.
  const light = pathname === "/";

  return (
    <footer
      className={cn(
        "relative py-8",
        light ? "border-t-2 border-slate-900/10 bg-[#FFF9F1]" : "mt-16 border-t border-white/5"
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row sm:text-left">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} QuizKeen — Lär. Spela. Tävla.
        </p>
        <p className={cn("text-xs", light ? "text-slate-400" : "text-slate-600")}>Byggt av Abdullah Shafi</p>
      </div>
    </footer>
  );
}
