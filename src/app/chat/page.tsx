"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getChatHub, getChat, sendTo, requestChat, respondChat } from "./actions";
import EmojiPicker from "@/components/emoji-picker";
import { 
  MessageSquare, 
  Send, 
  UserPlus, 
  Check, 
  X, 
  Bell, 
  MessageCircle,
  Ban
} from "lucide-react";

const QUICK_PHRASES = ["Hej!", "Bra spelat!", "Tack!", "Är du redo?", "Ses i klassrummet!"];

export default function ChatPage() {
  const [hub, setHub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [chan, setChan] = useState<string | null>(null);
  const [chanLabel, setChanLabel] = useState("");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [reqName, setReqName] = useState("");
  const [info, setInfo] = useState("");
  const [showQuickBar, setShowQuickBar] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Drop an emoji in at the caret so text can be built with emoji anywhere. */
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

  useEffect(() => {
    let on = true;
    async function pullHub() {
      try {
        const h = await getChatHub();
        if (on) {
          if (h) {
            setHub(h);
            setUnauthenticated(false);
          } else {
            setUnauthenticated(true);
          }
          setLoading(false);
        }
      } catch (err) {
        if (on) {
          setUnauthenticated(true);
          setLoading(false);
        }
      }
    }

    pullHub();

    // Safety timeout: never hang loading indefinitely
    const timer = setTimeout(() => {
      if (on) {
        setLoading(false);
      }
    }, 1500);

    const iv = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      pullHub();
    }, 10000);

    return () => { 
      on = false; 
      clearTimeout(timer);
      clearInterval(iv); 
    };
  }, []);

  useEffect(() => {
    if (!chan) return;
    let on = true;
    async function pull() {
      try {
        if (typeof document !== "undefined" && document.hidden) return;
        const m = await getChat(chan!);
        if (on && m) setMsgs(m);
      } catch {}
    }
    pull();
    const iv = setInterval(pull, 6000);
    return () => { on = false; clearInterval(iv); };
  }, [chan]);

  useEffect(() => { boxRef.current?.scrollTo({ top: 999999 }); }, [msgs]);

  if (loading && !hub && !unauthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-slate-400 gap-3">
        <MessageSquare className="h-6 w-6 animate-pulse text-indigo-400" />
        <span className="text-sm font-medium">Laddar chatten...</span>
      </div>
    );
  }

  if (unauthenticated || !hub) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Logga in för att chatta</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Du behöver vara inloggad på ditt konto för att delta i klass-chattar och skicka meddelanden.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/login" className="w-full">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold">
                Logga in
              </Button>
            </Link>
            <Link href="/register" className="w-full">
              <Button variant="outline" className="w-full font-semibold">
                Skapa konto
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const me = hub.username;
  // "Tysta chatten" from the staff consoles. The line to staff stays open on
  // purpose: a muted user must still be able to ask for help or appeal.
  const mutedHere = Boolean(hub.muted) && !(chan ?? "").startsWith("STU|");
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
    if (!body || !chan || mutedHere) return;
    const r = await sendTo(chan, body).catch(() => ({ ok: false as const, info: "" }));
    if (r && r.ok === false) {
      // Leave the text in the box so a refusal never eats what they typed.
      setInfo(r.info || "Meddelandet kunde inte skickas.");
      return;
    }
    setText("");
    const m = await getChat(chan);
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
          <button onClick={() => setInfo("")} className="text-indigo-400 hover:text-white" aria-label="Stäng"><X className="h-4 w-4" /></button>
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
                  <span className="font-semibold text-white" data-no-translate>{r.from}</span>
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
                      {m.from !== me && <p className="text-[10px] font-bold text-slate-400 mb-0.5" data-no-translate>{m.from}</p>}
                      <p className="leading-relaxed whitespace-pre-wrap break-words" data-no-translate>{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {mutedHere && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">
                  <Ban className="h-4 w-4 shrink-0" />
                  <span>
                    {hub.muted} Du kan fortfarande läsa allt och skriva till personalen.
                  </span>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <input 
                  ref={inputRef}
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  disabled={mutedHere}
                  placeholder={mutedHere ? "Du är tystad i chatten" : "Skriv ett meddelande..."} 
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60" 
                />
                <EmojiPicker onPick={insertEmoji} />
                <button 
                  onClick={() => setShowQuickBar((b) => !b)} 
                  className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${
                    showQuickBar 
                      ? "border-indigo-500 bg-indigo-600/20 text-indigo-300" 
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                  title="Snabbsvar"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Svar</span>
                </button>
                <button 
                  onClick={() => send()} 
                  disabled={mutedHere}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>Skicka</span>
                </button>
              </div>

              {showQuickBar && (
                <div className="mt-2 flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  {QUICK_PHRASES.map((phrase) => (
                    <button 
                      key={phrase} 
                      data-no-translate
                      onClick={() => { setText(phrase); setShowQuickBar(false); }} 
                      className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      {phrase}
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