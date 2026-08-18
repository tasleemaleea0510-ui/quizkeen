"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminData, adminBan, adminUnban, resolveMessage } from "../actions";

type S = { role: string; code: string };

export default function AdminPage() {
  const router = useRouter();
  const [s, setS] = useState<S | null>(null);
  const [data, setData] = useState<any>(null);
  const [info, setInfo] = useState("");
  const [min, setMin] = useState<Record<string, string>>({});
  const [bmsg, setBmsg] = useState<Record<string, string>>({});

  useEffect(() => {
    let sess: S | null = null;
    try { sess = JSON.parse(localStorage.getItem("cmd_session") || "null"); } catch {}
    if (!sess || sess.role !== "ADMIN") { router.replace("/"); return; }
    setS(sess);
    getAdminData(sess).then((d) => (d ? setData(d) : router.replace("/")));
  }, [router]);

  async function refresh() {
    if (s) setData(await getAdminData(s));
  }

  if (!s || !data) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">🛡️ Laddar RED COMMAND...</div>;

  const banned = data.users.filter((u: any) => u.bannedUntil).length;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <style>{`
        .red-glow { box-shadow: 0 0 24px rgba(220,38,38,0.25); }
        .red-title { text-shadow: 0 0 12px rgba(248,113,113,0.8); }
      `}</style>
      <div className="mx-auto max-w-6xl">
        <div className="red-glow rounded-3xl border border-red-500/40 bg-red-500/5 p-6">
          <h1 className="red-title text-3xl font-extrabold text-red-400">🛡️ ADMIN — RED COMMAND</h1>
          <p className="mt-1 text-sm text-slate-400">Du är en av ägarens väktare. Banna slarvare, läs loggen, rensa inkorgen. ALLT du gör loggas. 👁️</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-slate-300">👥 {data.users.length} användare</span>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-red-400">⛔ {banned} bannade</span>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-slate-300">📬 {data.inbox.length} olösta</span>
          </div>
        </div>

        {info && <div className="mt-4 rounded-xl border border-red-500/40 bg-slate-900 px-4 py-2 text-sm font-bold text-red-300">{info}</div>}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-2">
            <h2 className="text-xl font-extrabold text-white">👥 Användare</h2>
            <div className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
              {data.users.map((u: any) => (
                <div key={u.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-white">
                      {u.username} <span className="ml-1 text-xs text-slate-500">{u.role} · Lv {u.level} · {u.xp} XP</span>
                      {u.bannedUntil && <span className="ml-2 rounded-full bg-red-600/20 px-2 py-0.5 text-xs font-bold text-red-400">⛔ BANNAD</span>}
                    </p>
                    {(u.role === "STUDENT" || u.role === "TEACHER") &&
                      (u.bannedUntil ? (
                        <button
                          onClick={async () => { await adminUnban(s, u.username); setInfo(`✅ ${u.username} är fri igen!`); refresh(); }}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white"
                        >
                          ✅ Unbanna
                        </button>
                      ) : (
                        <button
                          onClick={async () => { await adminBan(s, u.username, parseInt(min[u.id] || "60") || 60, bmsg[u.id] || ""); setInfo(`⛔ ${u.username} bannad!`); refresh(); }}
                          className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white"
                        >
                          ⛔ Banna
                        </button>
                      ))}
                  </div>
                  {(u.role === "STUDENT" || u.role === "TEACHER") && !u.bannedUntil && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        value={min[u.id] ?? "60"}
                        onChange={(e) => setMin((p) => ({ ...p, [u.id]: e.target.value }))}
                        type="number"
                        placeholder="minuter (0 = för alltid)"
                        className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
                      />
                      <input
                        value={bmsg[u.id] ?? ""}
                        onChange={(e) => setBmsg((p) => ({ ...p, [u.id]: e.target.value }))}
                        placeholder="meddelande (valfritt)"
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-xl font-extrabold text-white">📬 Inkorg</h2>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {data.inbox.length === 0 && <p className="text-sm text-slate-500">Inget olöst. Skönt! 😎</p>}
                {data.inbox.map((m: any) => (
                  <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                    <p className="font-bold text-white">{m.from} → {m.about}</p>
                    <p className="mt-1">{m.message}</p>
                    <button onClick={async () => { await resolveMessage(s, m.id); refresh(); }} className="mt-2 rounded-lg bg-red-600/20 px-2 py-1 font-bold text-red-400">
                      ✅ Lös
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-xl font-extrabold text-white">📜 Logg</h2>
              <div className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1 text-xs text-slate-400">
                {data.log.map((l: any, i: number) => (
                  <p key={i}>
                    <b className="text-slate-300">{l.username}</b> {l.action} <span className="text-slate-600">· {new Date(l.createdAt).toLocaleTimeString("sv-SE")}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}