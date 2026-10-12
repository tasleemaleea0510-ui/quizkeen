"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSecurityData, secWarn, secBan, secUnban, requestRename, requestLive, muteChat, unmuteChat, toggleGhost, togglePin, setSecretNote, spyOnChats } from "../actions";
import StaffChat from "../../components/staff-chat";
import LiveViewer from "../../components/live-viewer";

type S = { role: string; code: string };

export default function SecurityPage() {
  const router = useRouter();
  const [s, setS] = useState<S | null>(null);
  const [data, setData] = useState<any>(null);
  const [info, setInfo] = useState("");
  const [liveFor, setLiveFor] = useState<any>(null);
  const [section, setSection] = useState<"users" | "chats" | "chat" | "log">("users");
  const [chats, setChats] = useState<any>(null);

  useEffect(() => {
    let sess: S | null = null;
    try { sess = JSON.parse(localStorage.getItem("cmd_session") || "null"); } catch {}
    if (!sess || sess.role !== "SECURITY") { router.replace("/"); return; }
    setS(sess);
    getSecurityData(sess).then((d) => (d ? setData(d) : router.replace("/")));
    const iv = setInterval(() => getSecurityData(sess).then((d) => d && setData(d)), 20000);
    return () => clearInterval(iv);
  }, [router]);

  useEffect(() => {
    if (section === "chats" && s) spyOnChats(s).then(setChats);
  }, [section, s]);

  async function refresh() { if (s) setData(await getSecurityData(s)); }

  if (!s || !data) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">🕵️ Laddar ICE WATCH...</div>;

  const nav = [
    { id: "users", icon: "👥", label: "Users" },
    { id: "chats", icon: "🕵️", label: "Chat Spy" },
    { id: "chat", icon: "💬", label: "Staff Chat" },
    { id: "log", icon: "📜", label: "Log" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6">
      <div className="mx-auto max-w-7xl">
        {liveFor && <LiveViewer username={liveFor.username} peerId={liveFor.pid} onClose={() => setLiveFor(null)} />}

        <div className="mb-6 rounded-3xl border border-sky-500/40 bg-sky-500/5 p-6">
          <h1 className="text-3xl font-extrabold text-sky-300">🕵️ SÄKERHET — ICE WATCH</h1>
          <p className="mt-1 text-sm text-slate-400">Monitor, warn, cool down (5 min / 1 hour), rename, mute, ghost. All logged. 👁️</p>
        </div>

        {info && <div className="mb-4 rounded-xl border border-sky-500/40 bg-slate-900 px-4 py-2 text-sm font-bold text-sky-300">{info}</div>}

        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            {nav.map((n) => (
              <button key={n.id} onClick={() => setSection(n.id as any)} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold transition ${section === n.id ? "bg-sky-600 text-white shadow-lg" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}>
                <span className="mr-2">{n.icon}</span>{n.label}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            {section === "users" && (
              <div>
                <h2 className="text-xl font-extrabold text-white">👥 Users ({data.users.length})</h2>
                <div className="mt-4 max-h-[36rem] space-y-2 overflow-y-auto pr-1">
                  {data.users.map((u: any) => (
                    <div key={u.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-white">
                          {u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < 120000 ? "🟢" : "⚪"} {u.username} <span className="ml-1 text-xs text-slate-500">{u.role} · Lv {u.level} · ⚠️ {u.warnings}/3</span>
                          {u.livePath && <span className="ml-2 rounded bg-emerald-500/10 px-1 text-xs text-emerald-400">👀 {u.livePath}</span>}
                          {u.bannedUntil && <span className="ml-2 rounded-full bg-sky-600/20 px-2 py-0.5 text-xs font-bold text-sky-300">⛔ BANNED</span>}
                        </p>
                        {(u.role === "STUDENT" || u.role === "TEACHER") && (
                          u.bannedUntil ? (
                            <button onClick={async () => { const r = await secUnban(s, u.username); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white">✅ Unban</button>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              <button onClick={async () => { const pid = "qk-staff-" + Date.now(); await requestLive(s, u.id, u.username, pid); setLiveFor({ username: u.username, pid }); }} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white">🎥 Live</button>
                              <button onClick={async () => { const r = await requestRename(s, u.id, u.username); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-bold text-white">✏️ Rename</button>
                              <button onClick={async () => { const r = await secWarn(s, u.id, u.username); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-bold text-white">⚠️ Warn</button>
                              <button onClick={async () => { const r = await secBan(s, u.username, 5); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-bold text-white">⛔ 5min</button>
                              <button onClick={async () => { const r = await secBan(s, u.username, 60); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-bold text-white">⛔ 1h</button>
                              <button onClick={async () => { const n = prompt("🔇 Mute (min, 0=forever)?", "60"); if (n === null) return; const r = await muteChat(s, u.id, u.username, parseInt(n)); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-purple-600 px-2 py-1 text-xs font-bold text-white">🔇 Mute</button>
                              <button onClick={async () => { const r = await toggleGhost(s, u.id, u.username); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-slate-600 px-2 py-1 text-xs font-bold text-white">👻 Ghost</button>
                              <button onClick={async () => { const r = await togglePin(s, u.id, u.username); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white">📌 Pin</button>
                              <button onClick={async () => { const t = prompt("📝 Secret note:", u.secretNote || ""); if (t === null) return; const r = await setSecretNote(s, u.id, u.username, t); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-yellow-600 px-2 py-1 text-xs font-bold text-white">📝 Note</button>
                            </div>
                          )
                        )}
                      </div>
                      {u.secretNote && <p className="mt-1 text-xs italic text-yellow-400">📝 {u.secretNote}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === "chats" && chats && (
              <div>
                <h2 className="text-xl font-extrabold text-white">🕵️ CHAT SPY — every message</h2>
                <p className="mt-1 text-xs text-slate-500">Global, inbox, staff, requests. All logged.</p>
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-bold text-sky-300">💬 Global ({chats.global.length})</h3>
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                    {chats.global.map((m: any) => (
                      <p key={m.id}><b className="text-sky-300">[{m.role}]</b> <b className="text-white">{m.from}</b>: {m.text} <span className="text-slate-600">· {new Date(m.at).toLocaleTimeString("sv-SE")}</span></p>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-bold text-amber-300">📨 Inbox ({chats.inbox.length})</h3>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                    {chats.inbox.map((m: any) => (
                      <p key={m.id}><b className="text-white">{m.from}</b> → {m.about}: {m.text} <span className="text-slate-600">· {new Date(m.at).toLocaleTimeString("sv-SE")}</span></p>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-bold text-emerald-300">👥 Staff ({chats.staff.length})</h3>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                    {chats.staff.map((m: any) => (
                      <p key={m.id}><span className="text-emerald-400">[{m.channel}]</span> <b className="text-white">{m.from}</b>: {m.text} <span className="text-slate-600">· {new Date(m.at).toLocaleTimeString("sv-SE")}</span></p>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-bold text-purple-300">🤝 Requests ({chats.requests.length})</h3>
                  <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                    {chats.requests.map((r: any) => (
                      <p key={r.id}><b className="text-white">{r.from}</b> → <b>{r.to}</b> [{r.status}] <span className="text-slate-600">· {new Date(r.at).toLocaleTimeString("sv-SE")}</span></p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section === "chat" && (
              <div>
                <h2 className="text-xl font-extrabold text-white">💬 Staff Chat</h2>
                <div className="mt-4"><StaffChat s={s} accent="bg-sky-600" /></div>
              </div>
            )}

            {section === "log" && (
              <div>
                <h2 className="text-xl font-extrabold text-white">📜 Activity Log</h2>
                <div className="mt-4 max-h-[30rem] space-y-1 overflow-y-auto pr-1 text-xs text-slate-400">
                  {data.log.map((l: any, i: number) => (
                    <p key={i}><b className="text-slate-300">{l.username}</b> {l.action} <span className="text-slate-600">· {new Date(l.createdAt).toLocaleTimeString("sv-SE")}</span></p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}