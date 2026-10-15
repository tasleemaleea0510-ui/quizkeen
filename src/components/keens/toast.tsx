"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "ok" | "err" | "info";
export type Toast = { id: number; text: string; tone: Tone };

/** A handful of small messages stacked in the corner. */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const push = useCallback((text: string, tone: Tone = "info") => {
    const id = next.current++;
    setToasts((list) => [...list.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  return { toasts, push, dismiss };
}

export function Toasts({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = t.tone === "ok" ? CheckCircle2 : t.tone === "err" ? TriangleAlert : Info;
        return (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-left text-sm font-semibold shadow-raise backdrop-blur-xl animate-keen-rise",
              t.tone === "ok" && "border-emerald-500/40 bg-emerald-500/12 text-emerald-200",
              t.tone === "err" && "border-red-500/40 bg-red-500/12 text-red-200",
              t.tone === "info" && "border-white/10 bg-slate-900/90 text-slate-200"
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span data-no-translate>{t.text}</span>
          </button>
        );
      })}
    </div>
  );
}
