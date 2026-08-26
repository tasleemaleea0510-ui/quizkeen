"use client";
import { useEffect, useRef, useState } from "react";
import { getChatHub, getChat, sendTo, requestChat, respondChat } from "./actions";

const EMOJIS = ["😂", "🔥", "", "❤️", "😮", "🤝", "", "🏆"];

export default function ChatPage() {
  const [hub, setHub] = useState<any>(null);
  const [chan, setChan] = useState<string | null>(null);
  const [chanLabel, setChanLabel] = useState("");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [reqName, setReqName] = useState("");
  const [info, setInfo] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let on = true;
    async function pullHub() { const h = await getChatHub(); if (on && h) setHub(h); }
    pullHub();
    const iv = setInterval(pullHub, 5000);
    return () => { on = false; clearInterval(iv); };
  }, []);

  useEffect(() => {
    if (!chan) return;
    let on = true;
    async function pull() { const m = await getChat(chan!); if (on && m) setMsgs(m); }
    pull();
    const iv = setInterval(pull, 4000);
    return () => { on = false; clearInterval(iv); };
  }, [chan]);

  useEffect(() => { boxRef.current?.scrollTo({ top: 999999 }); }, [msgs]);

  if (!hub) return <div className="flex min-h-screen items-center justify-center text-slate-400">💬 Laddar chatten...</div>;

  const me = hub.username;
  const convos: { chan: string; label: string }[] = [];
  hub.classes.forEach((c: any) => {
    convos.push({ chan: `CLASS|${c.id}`, label: `🏫 ${c.name} — klass-chatten` });
    convos.push({ chan: `TS|${c.teacher}|${me}`, label: `🍎 ${c.teacher} (privat)` });
  });
  hub.students.forEach((s: string) => convos.push({ chan: `TS|${me}|${s}`, label: `🎓 ${s} (privat)` }));
  convos.push({ chan: "STU|OWNER", label: "👑 Ägaren" });
  convos.push({ chan: "STU|ADMIN", label: "🛡️ Admin" });
  convos.push({ chan: "STU|SECURITY", label: "🕵️ Säkerhet" });
  hub.reqs.filter((r: any) => r.status === "ACCEPTED").forEach((r: any) => {
    const other = r.from === me ? r.to : r.from;
    const [a, b] = [me, other].sort();
    convos.push({ chan: `DM|${a}|${b}`, label: `🤝 ${other}` });
  });
  const incoming = hub.reqs.filter((r: any) => r.to === me && r.status === "PENDING");

  async function send(t?: string) {
    const body = (t ?? text).trim();
    if (!body || !chan) return;
    await sendTo(chan!, body);
    setText("");
    const m = await getChat(chan!);
    if (m) setMsgs(m);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-white">💬 Chat</h1>
      <p className="mt-1 text-sm text-slate-400">Klass-chattar · privat med lärare & vänner · personalen. Schack-stil, QuizKeen-känsla. ♟️</p>
      {info && <div className="mt-3 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-bold text-indigo-300">{info} <button onClick={() => setInfo("")}>✕</button></div>}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          {incoming.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
              <p className="text-sm font-extrabold text-amber-300">🔔 Chatt-förfrågningar</p>
              {incoming.map((r: any) => (
                <div key={r.id} className="mt-2 flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 text-sm">
                  <span className="font-bold text-white">{r.from} vill chatta!</span>
                  <span className="flex gap-1">
                    <button onClick={async () => { const x = await respondChat(r.id, true); setInfo(x.info || ""); setHub(await getChatHub()); }} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white">✅</button>
                    <button onClick={async () => { const x = await respondChat(r.id, false); setInfo(x.info || ""); setHub(await getChatHub()); }} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white">❌</button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm font-extrabold text-white">📨 Be någon om chatt</p>
            <div className="mt-2 flex gap-2">
              <input value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="användarnamn..." className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white" />
              <button onClick={async () => { const x = await requestChat(reqName); setInfo(x.info || ""); setReqName(""); setHub(await getChatHub()); }} className="rounded-lg bg-indigo-600 px-3 py-1 text-sm font-bold text-white">📨</button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm font-extrabold text-white">🗂️ Dina chatter</p>
            <div className="mt-2 space-y-1">
              {convos.map((c) => (
                <button key={c.chan} onClick={() => { setChan(c.chan); setChanLabel(c.label); }}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${chan === c.chan ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
          {chan ? (
            <>
              <p className="text-sm font-extrabold text-white">{chanLabel}</p>
              <div ref={boxRef} className="mt-3 h-[26rem] space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                {msgs.length === 0 && <p className="text-xs text-slate-500">Inga meddelanden ännu — säj hej! 👋</p>}
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.from === me ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.from === me ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200"}`}>
                      {m.from !== me && <p className="text-[10px] font-extrabold text-slate-400">{m.from}</p>}
                      <p>{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-1">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => send(e)} className="rounded-lg bg-slate-800 px-2 py-1 text-lg hover:bg-slate-700">{e}</button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  placeholder="Skriv ett meddelande..." className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
                <button onClick={() => send()} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-extrabold text-white hover:bg-indigo-500">📨 Skicka</button>
              </div>
            </>
          ) : (
            <div className="flex h-[30rem] items-center justify-center text-slate-500">👈 Välj en chatt till vänster!</div>
          )}
        </div>
      </div>
    </div>
  );
}