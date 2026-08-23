"use client";
import { useEffect, useRef, useState } from "react";
import { studentGetChats, studentSendChat } from "@/app/system/actions";

const TARGETS = [
  { id: "OWNER", label: "👑 Ägaren" },
  { id: "ADMIN", label: "🛡️ Admin" },
  { id: "SECURITY", label: "🕵️ Säkerhet" },
];

export default function StudentChatBubble() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("ADMIN");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let on = true;
    async function pull() {
      const m = await studentGetChats(target);
      if (on && m) setMsgs(m);
    }
    pull();
    const iv = setInterval(pull, 5000);
    return () => { on = false; clearInterval(iv); };
  }, [open, target]);

  useEffect(() => { boxRef.current?.scrollTo({ top: 999999 }); }, [msgs]);

  async function send() {
    if (!text.trim()) return;
    await studentSendChat(target, text.trim());
    setText("");
    const m = await studentGetChats(target);
    if (m) setMsgs(m);
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed bottom-4 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl shadow-2xl shadow-indigo-500/40 hover:bg-indigo-500">
        {open ? "✕" : "💬"}
      </button>
      {open && (
        <div className="fixed bottom-20 right-4 z-[60] w-80 rounded-3xl border border-indigo-500/40 bg-slate-900 p-4 shadow-2xl">
          <p className="text-sm font-extrabold text-white">💬 Chatta med personalen</p>
          <div className="mt-2 flex gap-1">
            {TARGETS.map((t) => (
              <button key={t.id} onClick={() => setTarget(t.id)} className={`rounded-lg px-2 py-1 text-xs font-bold ${target === t.id ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}`}>{t.label}</button>
            ))}
          </div>
          <div ref={boxRef} className="mt-2 h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-2">
            {msgs.length === 0 && <p className="text-xs text-slate-500">Skriv till personalen — de svarar från sin konsol! 👋</p>}
            {msgs.map((m) => (
              <div key={m.id} className="rounded-lg bg-slate-900/70 px-2 py-1 text-xs">
                <p className={`font-extrabold ${m.from.startsWith("🎓") ? "text-emerald-300" : "text-amber-300"}`}>{m.from}</p>
                <p className="text-slate-200">{m.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Skriv ett meddelande..." className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white" />
            <button onClick={send} className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-extrabold text-white">📨</button>
          </div>
        </div>
      )}
    </>
  );
}