"use client";
import { useEffect, useRef, useState } from "react";
import { getChats, sendChat } from "../app/actions";

type S = { role: string; code: string };

const CHANNELS: Record<string, { id: string; label: string }[]> = {
  OWNER: [
    { id: "STAFF", label: "👥 Hela chatten" },
    { id: "OWNER|ADMIN", label: "👑+🛡️ Admins" },
    { id: "OWNER|SECURITY", label: "👑+🕵️ Säkerhet" },
    { id: "STU|OWNER", label: "🎓 Elever → dig" },
  ],
  ADMIN: [
    { id: "STAFF", label: "👥 Hela chatten" },
    { id: "OWNER|ADMIN", label: "🛡️+👑 Ägaren" },
    { id: "ADMIN|SECURITY", label: "🛡️+🕵️ Säkerhet" },
    { id: "STU|ADMIN", label: "🎓 Elever → dig" },
  ],
  SECURITY: [
    { id: "STAFF", label: "👥 Hela chatten" },
    { id: "OWNER|SECURITY", label: "🕵️+👑 Ägaren" },
    { id: "ADMIN|SECURITY", label: "🕵️+🛡️ Admins" },
    { id: "STU|SECURITY", label: "🎓 Elever → dig" },
  ],
};

const ROLE_STYLE: Record<string, string> = { OWNER: "text-amber-300", ADMIN: "text-red-400", SECURITY: "text-sky-300" };
const ROLE_ICON: Record<string, string> = { OWNER: "👑", ADMIN: "🛡️", SECURITY: "🕵️" };

export default function StaffChat({ s, accent }: { s: S; accent: string }) {
  const chans = CHANNELS[s.role] ?? [];
  const [chan, setChan] = useState(chans[0]?.id ?? "STAFF");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let on = true;
    async function pull() {
      const m = await getChats(s, chan);
      if (on && m) setMsgs(m);
    }
    pull();
    const iv = setInterval(pull, 4000);
    return () => { on = false; clearInterval(iv); };
  }, [chan]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: 999999 });
  }, [msgs]);

  async function send() {
    if (!text.trim()) return;
    await sendChat(s, chan, text.trim());
    setText("");
    const m = await getChats(s, chan);
    if (m) setMsgs(m);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {chans.map((c) => (
          <button key={c.id} onClick={() => setChan(c.id)}
            className={`rounded-lg px-2 py-1 text-xs font-bold ${chan === c.id ? `${accent} text-white` : "bg-slate-800 text-slate-300"}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div ref={boxRef} className="mt-2 h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        {msgs.length === 0 && <p className="text-xs text-slate-500">Inga meddelanden ännu — säj hej! 👋</p>}
        {msgs.map((m) => (
          <div key={m.id} className="rounded-lg bg-slate-900/60 px-3 py-2 text-xs">
            <p className={`font-extrabold ${ROLE_STYLE[m.from] ?? (m.from.startsWith("🎓") ? "text-emerald-300" : "text-slate-300")}`}>
              {ROLE_ICON[m.from] ?? ""} {m.from} <span className="ml-1 font-normal text-slate-600">{new Date(m.createdAt).toLocaleTimeString("sv-SE")}</span>
            </p>
            <p className="mt-0.5 text-slate-200">{m.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Skriv ett meddelande..." maxLength={500}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
        <button onClick={send} className={`rounded-lg ${accent} px-4 py-2 text-sm font-extrabold text-white`}>📨 Skicka</button>
      </div>
    </div>
  );
}