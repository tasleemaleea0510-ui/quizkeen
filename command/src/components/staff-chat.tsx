"use client";
import { useEffect, useState } from "react";
import { getChats, sendChat } from "../app/actions";

const CHANNELS = [
  { id: "hela", label: "🌍 Hela chatten" },
  { id: "agare", label: "👑 Ägaren" },
  { id: "admins", label: "🛡️ Admins" },
  { id: "sakerhet", label: "🕵️ Säkerhet" },
];

export default function StaffChat({ s, accent }: { s: any; accent: string }) {
  const [channel, setChannel] = useState("hela");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    let on = true;
    async function pull() {
      try {
        const m = await getChats(s, channel);
        if (on && Array.isArray(m)) setMsgs(m);
      } catch {}
    }
    pull();
    const iv = setInterval(pull, 5000);
    return () => { on = false; clearInterval(iv); };
  }, [channel, s]);

  async function send() {
    const t = text.trim();
    if (!t) return;
    await sendChat(s, channel, t);
    setText("");
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-wrap gap-1">
        {CHANNELS.map((c) => (
          <button key={c.id} onClick={() => setChannel(c.id)} className={`rounded-lg px-2 py-1 text-xs font-bold ${channel === c.id ? accent + " text-white" : "bg-slate-800 text-slate-300"}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1 text-xs">
        {(msgs || []).map((m: any) => (
          <p key={m.id} className="rounded bg-slate-900/60 px-2 py-1">
            <b className="text-amber-300">[{m.fromRole || "STAFF"}]</b> {m.text}
            <span className="ml-1 text-slate-600">· {m.createdAt ? new Date(m.createdAt).toLocaleTimeString("sv-SE") : ""}</span>
          </p>
        ))}
        {(msgs || []).length === 0 && <p className="text-slate-500">Inga meddelanden ännu — säj hej! 👋</p>}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Skriv ett meddelande..."
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <button onClick={send} className={`rounded-lg ${accent} px-4 py-2 text-sm font-bold text-white`}>📢 Skicka</button>
      </div>
    </div>
  );
}