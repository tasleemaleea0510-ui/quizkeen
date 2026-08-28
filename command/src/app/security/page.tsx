"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requestLive, secWarn, secBan, secUnban, requestRename } from "../actions";
import { getSecurityData, secWarn, secBan, secUnban, requestRename, requestLive } from "../actions";
import LiveViewer from "../../components/live-viewer";
import StaffChat from "../../components/staff-chat";

type S = { role: string; code: string };

export default function SecurityPage() {
  const router = useRouter();
  const [s, setS] = useState<S | null>(null);
  const [data, setData] = useState<any>(null);
  const [info, setInfo] = useState("");
  const [liveFor, setLiveFor] = useState<any>(null);

  useEffect(() => {
    let sess: S | null = null;
    try { sess = JSON.parse(localStorage.getItem("cmd_session") || "null"); } catch {}
    if (!sess || sess.role !== "SECURITY") { router.replace("/"); return; }
    setS(sess);
    getSecurityData(sess).then((d) => (d ? setData(d) : router.replace("/")));
    const iv = setInterval(() => getSecurityData(sess).then((d) => d && setData(d)), 20000);
    return () => clearInterval(iv);
  }, [router]);

  async function refresh() { if (s) setData(await getSecurityData(s)); }

  if (!s || !data) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">🕵️ Laddar ICE WATCH...</div>;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <style>{`.ice-glow{box-shadow:0 0 24px rgba(14,165,233,.25)}.ice-title{text-shadow:0 0 12px rgba(125,211,252,.8)}`}</style>
      <div className="mx-auto max-w-6xl">
        <div className="ice-glow rounded-3xl border border-sky-500/40 bg-sky-500/5 p-6">
          <h1 className="ice-title text-3xl font-extrabold text-sky-300">🕵️ SÄKERHET — ICE WATCH</h1>
          <p className="mt-1 text-sm text-slate-400">Övervaka, varna, kyla ner (5 min / 1 tim) och begär namnbyte. Allt loggas. 👁️</p>
        </div>
        {liveFor && <LiveViewer username={liveFor.username} peerId={liveFor.pid} onClose={() => setLiveFor(null)} />}
        {info && <div className="mt-4 rounded-xl border border-sky-500/40 bg-slate-900 px-4 py-2 text-sm font-bold text-sky-300">{info}</div>}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-2">
            <h2 className="text-xl font-extrabold text-white">👥 Övervakning</h2>
            <div className="mt-4 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
              {data.users.map((u: any) => (
                <div key={u.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-white">
                      {u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < 120000 ? "🟢" : "⚪"} {u.username} <span className="ml-1 text-xs text-slate-500">{u.role} · Lv {u.level} · ⚠️ {u.warnings}/3</span> {u.livePath && <span className="ml-2 rounded bg-emerald-500/10 px-1 text-xs text-emerald-400">👀 {u.livePath}</span>}
                      {u.bannedUntil && <span className="ml-2 rounded-full bg-sky-600/20 px-2 py-0.5 text-xs font-bold text-sky-300">⛔ BANNAD</span>}
                    </p>
                    {(u.role === "STUDENT" || u.role === "TEACHER") && (
                      u.bannedUntil ? (
                        <button onClick={async () => { const r = await secUnban(s, u.username); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white">✅ Unbanna</button>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          <button onClick={async () => { const r = await requestRename(s, u.id, u.username); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-bold text-white">✏️ Namnbyte</button>
                          <button onClick={async () => { const pid = "qk-staff-" + Date.now(); await requestLive(s, u.id, u.username, pid); setLiveFor({ username: u.username, pid }); }} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white">🎥 Live</button>
                          <button onClick={async () => { const r = await secBan(s, u.username, 5); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-bold text-white">⛔ 5 min</button>
                          <button onClick={async () => { const r = await secBan(s, u.username, 60); setInfo(r.info || ""); refresh(); }} className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-bold text-white">⛔ 1 tim</button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-xl font-extrabold text-white">💬 Chat</h2>
              <div className="mt-3"><StaffChat s={s} accent="bg-sky-600" /></div>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-xl font-extrabold text-white">📜 Logg</h2>
              <div className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1 text-xs text-slate-400">
                {data.log.map((l: any, i: number) => (
                  <p key={i}><b className="text-slate-300">{l.username}</b> {l.action} <span className="text-slate-600">· {new Date(l.createdAt).toLocaleTimeString("sv-SE")}</span></p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}