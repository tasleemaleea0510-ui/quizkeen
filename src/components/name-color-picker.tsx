"use client";

import { useEffect, useState } from "react";
import { ACCENT_PALETTE, normalizeColor } from "@/lib/moderation";
import { cn } from "@/lib/utils";
import { Check, RotateCcw } from "lucide-react";

/**
 * The colour a player's name is drawn in.
 *
 * Sixteen fixed swatches plus the system picker. Keeping the palette in code
 * means a colour always exists in the stylesheet's vocabulary; the picker still
 * accepts any hex because people like their exact shade.
 */
export default function NameColorPicker({
  value,
  onPick,
  disabled = false,
  compact = false,
}: {
  value: string | null;
  onPick: (color: string | null) => void | Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [current, setCurrent] = useState<string | null>(value ?? null);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState<string>(value ?? "#818cf8");

  // The panel re-renders with fresh data after every action; follow it unless
  // the user is mid-pick.
  useEffect(() => setCurrent(value ?? null), [value]);

  async function choose(color: string | null) {
    if (busy || disabled) return;
    setBusy(true);
    setCurrent(color);
    try {
      await onPick(color);
    } finally {
      setBusy(false);
    }
  }

  const off = busy || disabled;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", compact ? "" : "max-w-[280px]")}>
      {ACCENT_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          disabled={off}
          onClick={() => choose(c)}
          aria-label={`Färg ${c}`}
          aria-pressed={current === c}
          className={cn(
            "relative h-6 w-6 rounded-full ring-1 ring-inset ring-white/20 transition-transform hover:scale-110 disabled:opacity-40",
            current === c && "ring-2 ring-white/80"
          )}
          style={{ backgroundColor: c }}
        >
          {current === c && <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-slate-950" strokeWidth={3} />}
        </button>
      ))}

      <label
        className={cn(
          "flex h-6 cursor-pointer items-center gap-1 rounded-full border border-white/15 px-2 text-[10px] font-bold text-slate-300 hover:border-white/40",
          off && "cursor-not-allowed opacity-40"
        )}
        title="Välj en egen färg"
      >
        Egen
        <input
          type="color"
          className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
          value={custom}
          disabled={off}
          onChange={(e) => {
            const clean = normalizeColor(e.target.value) ?? "#818cf8";
            setCustom(clean);
            choose(clean);
          }}
        />
      </label>

      <button
        type="button"
        disabled={off}
        onClick={() => choose(null)}
        className="flex h-6 items-center gap-1 rounded-full border border-white/10 px-2 text-[10px] font-bold text-slate-400 hover:border-white/30 hover:text-white disabled:opacity-40"
        title="Använd rollens färg"
      >
        <RotateCcw className="h-3 w-3" /> Rollfärg
      </button>
    </div>
  );
}
