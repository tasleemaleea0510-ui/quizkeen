"use client";

import { useEffect, useRef } from "react";
import { Cross, Check } from "./icons";

/**
 * Small styled replacement for window.prompt().
 *
 * The browser prompt is unstyled, blocks the page and can't be translated, so
 * the console uses this instead. The parent controls visibility by rendering
 * it conditionally.
 */
const TONE_RING = {
  indigo: "border-indigo-500/40",
  amber: "border-amber-500/40",
  sky: "border-sky-500/40",
  red: "border-red-500/40",
} as const;

const TONE_BTN = {
  indigo: "bg-indigo-600 hover:bg-indigo-500",
  amber: "bg-amber-600 hover:bg-amber-500",
  sky: "bg-sky-600 hover:bg-sky-500",
  red: "bg-red-600 hover:bg-red-500",
} as const;

/** Styled replacement for window.confirm(). */
export function ConfirmModal({
  title,
  body,
  confirmLabel = "Bekräfta",
  tone = "red",
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  tone?: "indigo" | "amber" | "sky" | "red";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[130] flex animate-cmd-fade items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-md animate-cmd-pop rounded-3xl border ${TONE_RING[tone]} bg-slate-900 p-6 shadow-2xl`}
      >
        <h3 className="text-lg font-extrabold text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{body}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
          >
            <Cross className="h-4 w-4" />
            Avbryt
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg ${TONE_BTN[tone]} py-2 text-sm font-bold text-white`}
          >
            <Check className="h-4 w-4" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PromptModal({
  title,
  label,
  value,
  onChange,
  onCancel,
  onSubmit,
  placeholder,
  hint,
  multiline = false,
  submitLabel = "Spara",
  tone = "indigo",
}: {
  title: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  submitLabel?: string;
  tone?: "indigo" | "amber" | "sky" | "red";
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const toneRing = TONE_RING[tone];
  const toneBtn = TONE_BTN[tone];

  const field =
    "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none";

  return (
    <div className="fixed inset-0 z-[120] flex animate-cmd-fade items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-md animate-cmd-pop rounded-3xl border ${toneRing} bg-slate-900 p-6 shadow-2xl`}>
        <h3 className="text-lg font-extrabold text-white">{title}</h3>
        {label && <label className="mt-3 block text-xs font-bold text-slate-400">{label}</label>}
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder={placeholder}
            className={field}
          />
        ) : (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
            placeholder={placeholder}
            className={field}
          />
        )}
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800"
          >
            <Cross className="h-4 w-4" />
            Avbryt
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg ${toneBtn} py-2 text-sm font-bold text-white`}
          >
            <Check className="h-4 w-4" />
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
