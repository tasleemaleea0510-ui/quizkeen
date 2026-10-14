"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "./icons";

/**
 * Emoji picker for staff chat.
 *
 * The trigger is a hand-drawn icon (no emoji in the chrome), while the palette
 * inserts real emoji into the message — so staff can type things like
 * "great game 🎉" without leaving the console.
 */

type Group = { label: string; emojis: string[] };

const GROUPS: Group[] = [
  {
    label: "Glada",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😍", "🥰", "😘", "😜", "🤪", "🤗", "🤩", "😎", "🥳", "😏", "😢", "😭", "😤", "😡", "🤯", "😴", "🤔"],
  },
  {
    label: "Händer",
    emojis: ["👍", "👎", "👏", "🙌", "🙏", "🤝", "👊", "✌️", "🤞", "🤟", "👋", "💪", "🫡", "🖐️", "☝️"],
  },
  {
    label: "Hjärtan",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💖", "💝", "💔", "💯", "✨", "⭐", "🌟", "🔥", "⚡", "🎉", "🎊", "🏆", "🥇"],
  },
  {
    label: "Djur",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🦄", "🐢", "🐙", "🦋"],
  },
  {
    label: "Mat",
    emojis: ["🍎", "🍌", "🍉", "🍇", "🍓", "🍒", "🍕", "🍔", "🌭", "🍟", "🌮", "🍩", "🍪", "🎂", "🍰", "🍫", "🍿", "🥤", "☕", "🍦"],
  },
  {
    label: "Saker",
    emojis: ["🎮", "🎧", "🎵", "🎨", "📚", "✏️", "📝", "💻", "📱", "🚀", "🧠", "💡", "🔔", "⏰", "📌", "🎯", "🎈", "🎁", "🧩", "⚽"],
  },
];

export default function EmojiPicker({
  onPick,
  label = "Emoji",
}: {
  onPick: (emoji: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative" data-no-translate>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={label}
        aria-label={label}
        aria-expanded={open}
        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
          open ? "border-indigo-500 bg-indigo-600/20 text-indigo-300" : "border-slate-700 bg-slate-900 text-slate-400 hover:text-white"
        }`}
      >
        <Smile className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute bottom-12 right-0 z-50 w-72 rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-2xl">
          <div className="mb-2 flex flex-wrap gap-1">
            {GROUPS.map((g, i) => (
              <button
                key={g.label}
                type="button"
                onClick={() => setTab(i)}
                className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-colors ${
                  tab === i ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto">
            {GROUPS[tab].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onPick(emoji)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none transition-transform hover:scale-125 hover:bg-slate-800"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
