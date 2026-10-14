"use client";

import { useEffect, useRef, useState } from "react";
import { getChats, sendChat } from "../app/actions";
import { Chat as ChatIcon, Send, Users, Shield, Crown } from "./icons";
import EmojiPicker from "./emoji-picker";

type Session = { role: string; code: string };

const CHANNELS = [
  { id: "hela", label: "Hela chatten", Icon: ChatIcon },
  { id: "agare", label: "Ägaren", Icon: Crown },
  { id: "admins", label: "Admins", Icon: Shield },
  { id: "sakerhet", label: "Säkerhet", Icon: Users },
];

export default function StaffChat({ s, accent }: { s: Session; accent: string }) {
  const [channel, setChannel] = useState("hela");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    async function pull() {
      try {
        const m = await getChats(s, channel);
        if (alive && Array.isArray(m)) setMsgs(m);
      } catch {
        /* best effort — the next tick retries */
      }
    }
    pull();
    const iv = setInterval(pull, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [channel, s]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, channel]);

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

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setNote("");
    try {
      const r = await sendChat(s, channel, body);
      if (r && r.ok === false && r.info) setNote(r.info);
      else setText("");
    } catch {
      setNote("Nätverksfel — försök igen.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-wrap gap-1">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChannel(c.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              channel === c.id ? `${accent} text-white` : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <c.Icon className="h-3.5 w-3.5" />
            {c.label}
          </button>
        ))}
      </div>

      <div ref={listRef} className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1 text-xs">
        {msgs.map((m: any) => (
          <p key={m.id} className="rounded-lg bg-slate-900/60 px-2.5 py-1.5" data-no-translate>
            <b className="text-amber-300">[{m.fromRole || "STAFF"}]</b> <span className="text-slate-100">{m.text}</span>
            <span className="ml-1 text-slate-600">
              · {m.createdAt ? new Date(m.createdAt).toLocaleTimeString("sv-SE") : ""}
            </span>
          </p>
        ))}
        {msgs.length === 0 && <p className="text-slate-500">Inga meddelanden ännu i den här kanalen.</p>}
      </div>

      {note && <p className="mt-2 text-xs font-bold text-red-400">{note}</p>}

      <div className="mt-3 flex items-center gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          maxLength={1000}
          placeholder="Skriv ett meddelande..."
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
        />
        <EmojiPicker onPick={insertEmoji} />
        <button
          type="button"
          onClick={send}
          disabled={sending || !text.trim()}
          className={`flex items-center gap-1.5 rounded-lg ${accent} px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50`}
        >
          <Send className="h-4 w-4" />
          Skicka
        </button>
      </div>
    </div>
  );
}
