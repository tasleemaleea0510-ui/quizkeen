"use client";
import { useEffect, useRef, useState } from "react";
import { getChatHub, getChat, sendTo, requestChat, respondChat } from "./actions";
import { 
  MessageSquare, 
  Send, 
  UserPlus, 
  Check, 
  X, 
  Bell, 
  Layers, 
  School, 
  User, 
  ShieldAlert, 
  Crown, 
  Shield, 
  CheckCircle2,
  Smile
} from "lucide-react";

const EMOJIS = ["😀", "👍", "❤️", "😮", "🤝", "🎉", "🔥", "💯", "👏", "⭐"];

export default function ChatPage() {
  const [hub, setHub] = useState<any>(null);
  const [chan, setChan] = useState<string | null>(null);
  const [chanLabel, setChanLabel] = useState("");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [reqName, setReqName] = useState("");
  const [info, setInfo] = useState("");
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let on = true;
    async function pullHub() {
      if (document.hidden) return;
      const h = await getChatHub();
      if (on && h) setHub(h);
    }
    pullHub();
    const iv = setInterval(pullHub, 10000);
    return () => { on = false; clearInterval(iv); };
  }, []);

  useEffect(() => {
    if (!chan) return;
    let on = true;
    async function pull() {
      if (document.hidden) return;
      const m = await getChat(chan!);
      if (on && m) setMsgs(m);
    }
    pull();
    const iv = setInterval(pull, 6000);
    return () => { on = false; clearInterval(iv); };
  }, [chan]);

  useEffect(() => { boxRef.current?.scrollTo({ top: 999999 }); }, [msgs]);

  if (!hub) return (
    <div className="flex min-h-screen items-center justify-center text-slate-400 gap-2">
      <MessageSquare className="h-5 w-5 animate-pulse text-indigo-400" />
      <span>Laddar chatten...</span>
    </div>
  );

  const me = hub.username;
  const convos: { chan: string; label: string; badge: string }[] = [];
  hub.classes.forEach((c: any) => {
    convos.push({ chan: `CLASS|${c.id}`, label: `${c.name} (Klassrum)`, badge: "KLASS" });
    convos.push({ chan: `TS|${c.teacher}|${me}`, label: `${c.teacher}`, badge: "LÄRARE" });
  });
  const teacherNames = hub.classes.map((c: any) => c.teacher);
  hub.students.forEach((s: string) => { 
    if (!teacherNames.includes(s)) convos.push({ chan: `TS|${me}|${s}`, label: s, badge: "ELEV" }); 
  });
  convos.push({ chan: "STU|OWNER", label: "Ägaren", badge: "PERSONAL" });
  convos.push({ chan: "STU|ADMIN", label: "Admin", badge: "PERSONAL" });
  convos.push({ chan: "STU|SECURITY", label: "Säkerhet", badge: "PERSONAL" });
  hub.reqs.filter((r: any) => r.status === "ACCEPTED").forEach((r: any) => {
    const other = r.from === me ? r.to : r.from;
    const [a, b] = [me, other].sort();
    convos.push({ chan: `DM|${a}|${b}`, label: other, badge: "DIREKT" });
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
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Chatt</h1>
          <p className="text-xs text-slate-400">Klass-chattar, direktmeddelanden och personalkontakt</p>
        </div>
      </div>

      {info && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-300">
          <span>{info}</span>
          <button onClick={() => setInfo("")} className="text-indigo-400 hover:text-white">✕</button>
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          {incoming.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-300 mb-2">
                <Bell className="h-4 w-4" />
                <span>Chatt-förfrågningar</span>
              </div>
              {incoming.map((r: any) => (
                <div key={r.id} className="mt-2 flex items-center justify-between rounded-xl bg-slate-900/80 border border-slate-800 p-3 text-sm">
                  <span className="font-semibold text-white">{r.from}</span>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={async () => { const x = await respondChat(r.id, true); setInfo(x.info || ""); setHub(await getChatHub()); }} 
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                      title="Acceptera"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={async () => { const x = await respondChat(r.id, false); setInfo(x.info || ""); setHub(await getChatHub()); }} 
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
                      title="Neka"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              <UserPlus className="h-3.5 w-3.5 text-indigo-400" />
              <span>Starta ny chatt</span>
            </div>
            <div className="flex gap-2">
              <input 
                value={reqName} 
                onChange={(e) => setReqName(e.target.value)} 
                placeholder="Användarnamn..." 
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400" 
              />
              <button 
                onClick={async () => { const x = await requestChat(reqName); setInfo(x.info || ""); setReqName(""); setHub(await getChatHub()); }} 
                className="flex items-center justify-center rounded-xl bg-indigo-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Dina konversationer</p>
            <div className="space-y-1">
              {convos.map((c) => (
                <button 
                  key={c.chan} 
                  onClick={() => { setChan(c.chan); setChanLabel(c.label); }}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                    chan === c.chan ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800/70"
                  }`}
                >
                  <span className="truncate pr-2">{c.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    chan === c.chan ? "bg-indigo-700 text-indigo-100" : "bg-slate-800 text-slate-400"
                  }`}>
                    {c.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
          {chan ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-base font-bold text-white">{chanLabel}</span>
              </div>
              <div ref={boxRef} className="mt-3 h-[26rem] space-y-2.5 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                {msgs.length === 0 && (
                  <p className="text-center text-xs text-slate-500 py-10">Inga meddelanden ännu i den här chatten.</p>
                )}
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.from === me ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.from === me ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200"}`}>
                      {m.from !== me && <p className="text-[10px] font-bold text-slate-400 mb-0.5">{m.from}</p>}
                      <p className="leading-relaxed">{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 flex items-center gap-2">
                <input 
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  placeholder="Skriv ett meddelande..." 
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400" 
                />
                <button 
                  onClick={() => setShowEmojiBar((b) => !b)} 
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Reaktioner"
                >
                  <Smile className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => send()} 
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  <span>Skicka</span>
                </button>
              </div>

              {showEmojiBar && (
                <div className="mt-2 flex flex-wrap gap-1 p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => setText((t) => t + e)} className="rounded-lg bg-slate-800/80 px-2 py-1 text-base hover:bg-slate-700 transition-colors">
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-[30rem] flex-col items-center justify-center text-slate-500 gap-2">
              <MessageSquare className="h-8 w-8 text-slate-600 stroke-[1.5]" />
              <p className="text-sm">Välj en konversation i listan för att börja chatta</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}