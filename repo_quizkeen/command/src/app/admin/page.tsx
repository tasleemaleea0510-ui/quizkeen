"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminData, adminBan, adminUnban, adminRequestBan, adminGiveXP, adminSetBroadcast,
  requestLive, muteChat, unmuteChat, togglePin, setSecretNote, spyOnChats,
} from "../actions";
import StaffChat from "../../components/staff-chat";
import LiveViewer from "../../components/live-viewer";

type S = { role: string; code: string };
const QUICK = [
  { label: "5 min", min: 5 },
  { label: "1 tim", min: 60 },
  { label: "1 dag", min: 1440 },
];

export default function AdminPage() {
  const router = useRouter();
  const [s, setS] = useState<S | null>(null);
  const [data, setData] = useState<any>(null);
  const [info, setInfo] = useState("");
  const [liveFor, setLiveFor] = useState<any>(null);
  const [bc, setBc] = useState("");
  const [askFor, setAskFor] = useState<string | null>(null);
  const [askMin, setAskMin] = useState(2880);
  const [askReason, setAskReason] = useState("");
  const [section, setSection] = useState<"users" | "chats" | "broadcast" | "chat" | "log">("users");
  const [chats, setChats] = useState<any>(null);

  useEffect(() => {
    let sess: S | null = null;
    try { sess = JSON.parse(localStorage.getItem("cmd_session") || "null"); } catch {}
    if (!sess || sess.role !== "ADMIN") { router.replace("/"); return; }
    setS(sess);
    getAdminData(sess).then((d) => (d ? setData(d) : router.replace("/")));
    const iv = setInterval(() => getAdminData(sess).then((d) => d && setData(d)), 20000);
    return () => clearInterval(iv);
  }, [router]);

  useEffect(() => {
    if (section === "chats" && s) spyOnChats(s).then(setChats);
  }, [section, s]);

  async function refresh() { if (s) setData(await getAdminData(s)); }

  if (!s || !data) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">🛡️ Laddar RED COMMAND...</div>;

  const banned = data.users.filter((u: any) => u.bannedUntil).length;

  const nav = [
    { id: "users", icon: "👥", label: "Users" },
    { id: "chats", icon: "🕵️", label: "Chat Spy" },
    { id: "broadcast", icon: "📢", label: "Broadcast" },
    { id: "chat", icon: "💬", label: "Staff Chat" },
    { id: "log", icon: "📜", label: "Log" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6">
      <style>{`.red-glow{box-shadow:0 0 24px rgba(220,38,38,.25)}.red-title{text-shadow:0 0 12px rgba(248,113,113,.8)}`}</style>
      <div className="mx-auto max-w-7xl">
        {liveFor && <LiveViewer username={liveFor.username} peerId={liveFor.pid} onClose={() => setLiveFor(null)} />}

        <div className="red-glow rounded-3xl border border-red-500/40 bg-red-500/5 p-6">
          <h1 className="red-title text-3xl font-extrabold text-red-400">🛡️ ADMIN — RED COMMAND</h1>
          <p className="mt-1 text-sm text-slate-400">🎁 Belöna (max 500, 3/dag) · ⛔ Banna (5min/1tim/1dag) · längre? <b className="text-amber-400">Be ägaren om lov!</b> 👑 Allt loggas. 👁️</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-slate-300">👥 {data.users.length} användare</span>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-red-400">⛔ {banned} bannade</span>
          </div>
        </div>

        {info && <div className="mt-4 rounded-xl border border-red-500/40 bg-slate-900 px-4 py-2 text-sm font-bold text-red-300">{info}</div>}

        <div className="mt-6 grid gap-4 lg:grid-cols-[220px_1fr]">
          {/* SIDEBAR */}
          <div className="space-y-2">
            {nav.map((n) => (
              <button key={n.id} onClick={() => setSection(n.id as any)} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold transition ${section === n.id ? "bg-red-600 text-white shadow-lg" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}>
                <span className="mr-2">{n.icon}</span>{n.label}
              </button>
            ))}
          </div>

          {/* CONTENT */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            {section === "users" && (
              <div>
                <h2 className="text-xl font-extrabold text-white">👥 Användare</h2>
                <div className="mt-4 max-h-[36rem] space-y-2 overflow-y-auto pr-1">
                  {data.users.map((u: any) => (
                    <div key={u.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-white">
                          {u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < 120000 ? "🟢" : "⚪"} {u.username} <span className="ml-1 text-xs text-slate-500">{u.role} · Lv {u.level} · {u.xp} XP</span>
                          {u.livePath && <span className="ml-2 rounded bg-emerald-500/10 px-1 text-xs text-emerald-400">👀 {u.livePath}</span>}
                          {u.bannedUntil && <span className="ml-2 rounded-full bg-red-600/20 px-2 py-0.5 text-xs font-bold text-red-400">⛔ BANNAD</span>}
                        </p>
                        {(u.role === "STUDENT" || u.role === "TEACHER") &&
                          (u.bannedUntil ? (
                            <button onClick={async () => { await adminUnban(s, u.username); setInfo(`✅ ${u.username} är fri!`); refresh(); }} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white">✅ Unbanna</button>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              <button onClick={async () => { const pid = "qk-staff-" + Date.now(); await requestLive(s, u.id, u.username, pid); setLiveFor({ username: u.username, pid }); }} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white">🎥 Live</button>
                              {[50, 200, 500].map((g) => (
                                <button key={g} onClick={async () => { const r = await adminGiveXP(s, u.id, u.username, g); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500">🎁 +{g}</button>
                              ))}
                              <input type="number" placeholder="+XP (max 500)" className="w-24 rounded-lg border border-emerald-500/40 bg-slate-950 px-2 py-1 text-xs text-white"
                                onKeyDown={async (e) => { if (e.key === "Enter") { const v = parseInt((e.target as any).value) || 0; const r = await adminGiveXP(s, u.id, u.username, v); setInfo(r.info || ""); refresh(); } }} />
                              {QUICK.map((q) => (
                                <button key={q.min} onClick={async () => { await adminBan(s, u.username, q.min, ""); setInfo(`⛔ ${u.username} bannad ${q.label}!`); refresh(); }} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-500">⛔ {q.label}</button>
                              ))}
                              <button onClick={() => { setAskFor(u.username); setAskReason(""); setAskMin(2880); }} className="rounded-lg border border-amber-500/50 bg-amber-600/20 px-2 py-1 text-xs font-bold text-amber-300 hover:bg-amber-600/40">🙏 Be om mer</button>
                              <button onClick={async () => { const n = prompt("🔇 Mute (min, 0=forever)?", "60"); if (n === null) return; const r = await muteChat(s, u.id, u.username, parseInt(n)); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-purple-600 px-2 py-1 text-xs font-bold text-white">🔇 Mute</button>
                              <button onClick={async () => { const r = await togglePin(s, u.id, u.username); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white">📌 Pin</button>
                              <button onClick={async () => { const t = prompt("📝 Hemlig anteckning:", u.secretNote || ""); if (t === null) return; const r = await setSecretNote(s, u.id, u.username, t); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-yellow-600 px-2 py-1 text-xs font-bold text-white">📝 Note</button>
                            </div>
                          ))}
                      </div>
                      {u.secretNote && <p className="mt-1 rounded bg-yellow-500/10 px-2 py-1 text-xs italic text-yellow-400">📝 {u.secretNote}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === "chats" && chats && (
              <div>
                <h2 className="text-xl font-extrabold text-white">🕵️ CHAT SPY — alla meddelanden</h2>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-red-500/30 bg-slate-950/60 p-4">
                    <h3 className="mb-2 text-sm font-bold text-red-300">💬 Global / Klass ({chats.global.length})</h3>
                    <div className="max-h-72 space-y-1 overflow-y-auto pr-1 text-xs">
                      {chats.global.map((m: any) => (<p key={m.id} className="rounded bg-slate-900/60 px-2 py-1"><b className="text-red-300">[{m.role}]</b> <b className="text-white">{m.from}</b>: {m.text} <span className="text-slate-600">· {new Date(m.at).toLocaleTimeString("sv-SE")}</span></p>))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-red-500/30 bg-slate-950/60 p-4">
                    <h3 className="mb-2 text-sm font-bold text-red-300">📨 Inbox ({chats.inbox.length})</h3>
                    <div className="max-h-72 space-y-1 overflow-y-auto pr-1 text-xs">
                      {chats.inbox.map((m: any) => (<p key={m.id} className="rounded bg-slate-900/60 px-2 py-1"><b className="text-white">{m.from}</b> → <b>{m.about}</b>: {m.text} <span className="text-slate-600">· {new Date(m.at).toLocaleTimeString("sv-SE")}</span></p>))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-red-500/30 bg-slate-950/60 p-4">
                    <h3 className="mb-2 text-sm font-bold text-red-300">👥 Stab-kanaler ({chats.staff.length})</h3>
                    <div className="max-h-72 space-y-1 overflow-y-auto pr-1 text-xs">
                      {chats.staff.map((m: any) => (<p key={m.id} className="rounded bg-slate-900/60 px-2 py-1"><span className="text-red-400">[{m.channel}]</span> <b className="text-white">{m.from}</b>: {m.text} <span className="text-slate-600">· {new Date(m.at).toLocaleTimeString("sv-SE")}</span></p>))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-red-500/30 bg-slate-950/60 p-4">
                    <h3 className="mb-2 text-sm font-bold text-red-300">🤝 Chatt-förfrågningar ({chats.requests.length})</h3>
                    <div className="max-h-72 space-y-1 overflow-y-auto pr-1 text-xs">
                      {chats.requests.map((r: any) => (<p key={r.id} className="rounded bg-slate-900/60 px-2 py-1"><b className="text-white">{r.from}</b> → <b>{r.to}</b> [{r.status}] <span className="text-slate-600">· {new Date(r.at).toLocaleTimeString("sv-SE")}</span></p>))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {section === "broadcast" && (
              <div>
                <h2 className="text-xl font-extrabold text-white">📢 Global sändning</h2>
                <p className="mt-1 text-xs text-slate-500">ALLA ser detta som gul banderoll. Ägaren ser i loggen. 👁️</p>
                <textarea value={bc} onChange={(e) => setBc(e.target.value)} rows={3} placeholder="Skriv ett meddelande till HELA sajten..." className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-white placeholder:text-slate-500" />
                <div className="mt-2 flex gap-2">
                  <button onClick={async () => { const r = await adminSetBroadcast(s, bc); setInfo(r.info || "📢 Sänt!"); setBc(""); refresh(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500">📢 Sänd</button>
                  <button onClick={async () => { setBc(""); await adminSetBroadcast(s, ""); setInfo("🧹 Rensat!"); refresh(); }} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white">🧹 Rensa</button>
                </div>
              </div>
            )}

            {section === "chat" && (
              <div>
                <h2 className="text-xl font-extrabold text-white">💬 Stabs-chat</h2>
                <div className="mt-4"><StaffChat s={s} accent="bg-red-600" /></div>
              </div>
            )}

            {section === "log" && (
              <div>
                <h2 className="text-xl font-extrabold text-white">📜 Logg</h2>
                <div className="mt-4 max-h-[30rem] space-y-1 overflow-y-auto pr-1 text-xs text-slate-400">
                  {data.log.map((l: any, i: number) => (<p key={i} className="rounded bg-slate-900/60 px-3 py-2"><b className="text-slate-300">{l.username}</b> {l.action} <span className="text-slate-600">· {new Date(l.createdAt).toLocaleTimeString("sv-SE")}</span></p>))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {askFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-slate-900 p-6">
            <h3 className="text-xl font-extrabold text-amber-300">🙏 Be ägaren om längre ban</h3>
            <p className="mt-1 text-sm text-slate-400">För <b className="text-white">{askFor}</b> — ägaren godkänner eller avslår.</p>
            <label className="mt-4 block text-xs text-slate-400">Hur länge (minuter)?</label>
            <input type="number" value={askMin} onChange={(e) => setAskMin(parseInt(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
            <p className="mt-1 text-xs text-slate-500">Tips: 2880 = 2 dagar · 10080 = 1 vecka · 0 = för alltid</p>
            <label className="mt-3 block text-xs text-slate-400">Varför? (ägaren läser detta)</label>
            <textarea value={askReason} onChange={(e) => setAskReason(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" placeholder="T.ex. upprepat fusk..." />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setAskFor(null)} className="flex-1 rounded-lg border border-slate-700 py-2 font-bold text-slate-300">Avbryt</button>
              <button onClick={async () => { const r = await adminRequestBan(s, askFor, askMin, askReason); setInfo(r.info || ""); setAskFor(null); refresh(); }} className="flex-1 rounded-lg bg-amber-600 py-2 font-bold text-white hover:bg-amber-500">📨 Skicka begäran</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}