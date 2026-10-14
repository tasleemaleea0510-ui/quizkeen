"use client";

import { useRef, useState } from "react";
import EmojiPicker from "@/components/emoji-picker";

export default function QkCheck() {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function insertEmoji(emoji: string) {
    const el = inputRef.current;
    if (!el) {
      setText((t) => t + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-bold text-white">Emoji check</h1>
      <input
        ref={inputRef}
        data-testid="msg"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
      />
      <div className="mt-4 flex items-center gap-2">
        <EmojiPicker onPick={insertEmoji} />
        <span data-testid="value" className="text-sm text-slate-300">
          {text}
        </span>
      </div>
    </div>
  );
}
