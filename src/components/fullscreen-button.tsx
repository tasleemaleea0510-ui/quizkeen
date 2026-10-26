"use client";
import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The fullscreen switch for a running game.
 *
 * Games are played on a projector and on phones, so the host wants the page to
 * fill the screen without hunting for the browser's own button. The browser
 * refuses a fullscreen request that is not tied to a click, so there is no way
 * to enter it automatically when a match starts — one tap here is the honest
 * version. State is read from `document.fullscreenElement`, so leaving with Esc
 * puts the icon back by itself.
 */
export default function FullscreenButton({ className }: { className?: string }) {
  const [full, setFull] = useState(false);

  useEffect(() => {
    const sync = () => setFull(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  async function toggle() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Denied (an iframe without permission, for example) — the game still works.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={full ? "Lämna helskärm" : "Helskärm"}
      aria-label={full ? "Lämna helskärm" : "Helskärm"}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-white/25 hover:text-white",
        className
      )}
    >
      {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
    </button>
  );
}
