"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StaffChat from "../../components/staff-chat";
import LiveViewer from "../../components/live-viewer";
import {
  getOwnerData, banUser, unbanUser, giveXP, giveCoins, renameUser, setRole,
  resetPassword, getEmail, deleteUser, setBroadcast, setShutdown, changeCodes,
  getOwnerExtra, approveBanRequest, rejectBanRequest,
  resetXP, resetCoins, resetAll, setLevel, sendPersonalNote, clearPersonalNote,
  requestRename,
  requestLive,
} from "../actions";

type User = { id: string; username: string; role: string; level: number; xp: number; coins: number; bannedUntil: string | null; warnings: number; lastSeenAt: string | null; livePath: string | null };

const TABS = [
  { id: "stats", icon: "📊", label: "Översikt" },
  { id: "requests", icon: "🙏", label: "Ban-begäranden" },
  { id: "chat", icon: "💬", label: "Chat" },
  { id: "users", icon: "👥", label: "Användare" },
  { id: "broadcast", icon: "📢", label: "Sändning" },
  { id: "codes", icon: "🔢", label: "Koder" },
  { id: "log", icon: "📜", label: "Logg" },
];

export default function OwnerPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [extra, setExtra] = useState<any>(null);
  const [tab, setTab] = useState("stats");
  const [sel, setSel] = useState<User | null>(null);
  const [liveFor, setLiveFor] = useState<any>(null);
  const [q, setQ] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [xpAmt, setXpAmt] = useState("10");
  const [coinAmt, setCoinAmt] = useState("10");
  const [newName, setNewName] = useState("");
  const [banMin, setBanMin] = useState("5");
  const [banMsg, setBanMsg] = useState("");
  const [notify, setNotify] = useState(true);
  const [customPw, setCustomPw] = useState("");
  const [bc, setBc] = useState("");
  const [codes, setCodes] = useState({ o: "", a: "", sec: "" });
  const [approveMin, setApproveMin] = useState<Record<string, string>>({});
  const [lvl, setLvl] = useState("1");
  const [pNote, setPNote] = useState("");

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem("cmd_session") || "null");
    if (!s || s.role !== "OWNER") { router.push("/"); return; }
    setSession(s);
    load(s);
    const iv = setInterval(() => load(s), 20000);
    return () => clearInterval(iv);
  }, []);

  async function load(s: any) {
    const [d, ex] = await Promise.all([getOwnerData(s), getOwnerExtra(s)]);
    if (!d) { localStorage.removeItem("cmd_session"); router.push("/"); return; }
    setData(d);
    setExtra(ex);
    setBc(d.settings.broadcast ?? "");
    setCodes({ o: d.settings.ownerCode, a: d.settings.adminCode, sec: d.settings.securityCode });
  }

  async function run(p: Promise<any>) {
    setBusy(true);
    const r = await p;
    setBusy(false);
    if (r?.info) setInfo(r.info);
    else if (r?.ok) setInfo("✅ Klart!");
    else if (r && r.ok === false) setInfo("❌ Fungerade inte!");
    await load(session);
  }

  if (!data) return <div className="flex min-h-screen items-center justify-center text-amber-300">Laddar tronen... 👑</div>;

  const filtered = data.users.filter((u: User) => u.username.toLowerCase().includes(q.toLowerCase()));
  const pending = (extra?.requests ?? []).filter((r: any) => r.status === "PENDING");
  const handled = (extra?.requests ?? []).filter((r: any) => r.status !== "PENDING");

  return (
    <div className="flex min-h-screen">
      <style>{`
        .gold-glow{box-shadow:0 0 28px rgba(245,158,11,.22)}
        .gold-title{text-shadow:0 0 14px rgba(252,211,77,.85)}
        .gold-bg{background:radial-gradient(900px 300px at 50% -60px, rgba(245,158,11,.14), transparent)}
      `}</style>

      <aside className="gold-bg w-56 shrink-0 border-r border-amber-500/20 bg-slate-900/60 p-4">
        <p className="text-lg font-extrabold text-white">Quiz<span className="text-amber-300">Keen</span></p>
        <p className="gold-title mt-1 text-xs font-extrabold text-amber-300">👑 ÄGARKONSOL</p>
        <div className="mt-6 space-y-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative w-full rounded-xl px-4 py-2 text-left text-sm font-bold ${tab === t.id ? "bg-amber-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>
              {t.icon} {t.label}
              {t.id === "requests" && pending.length > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-red-600 px-2 text-xs font-extrabold text-white">{pending.length}</span>
              )}
            </button>
          ))}
        </div>
      </aside>

      <main className="gold-bg flex-1 p-8">
        {liveFor && <LiveViewer username={liveFor.username} peerId={liveFor.pid} onClose={() => setLiveFor(null)} />}
        {busy && (
          <div className="gold-glow fixed bottom-4 right-4 z-50 rounded-xl bg-amber-600 px-4 py-2 text-sm font-extrabold text-white">⏳ Jobbar...</div>
        )}
        {info && (
          <div className="gold-glow mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-300">
            {info} <button onClick={() => setInfo("")} className="ml-2 text-slate-400">✕</button>
          </div>
        )}

        {tab === "stats" && (
          <>
            <h1 className="gold-title text-3xl font-extrabold text-amber-300">👑 GULD-TRONEN</h1>
            <p className="mt-1 text-sm text-slate-400">Allt ditt rike, i ett ögonkast. Endast för betrodda. Alla öppningar loggas. 👁️</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              {[
                ["👥 Användare", data.stats.users], ["🍎 Lärare", data.stats.teachers],
                ["🎯 Quizar", data.stats.quizzes], ["🃏 Gloskortlekar", data.stats.decks],
                ["🎮 Spel", data.stats.games], ["✨ Total XP", data.stats.totXP],
                ["🪙 Totala mynt", data.stats.totCoins], ["🙏 Väntande begäranden", pending.length],
              ].map(([label, val]) => (
                <div key={label as string} className="gold-glow rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5">
                  <p className="text-xs font-bold text-slate-400">{label}</p>
                  <p className="mt-1 text-3xl font-extrabold text-amber-300">{val}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "requests" && (
          <>
            <h1 className="gold-title text-2xl font-extrabold text-amber-300">🙏 Ban-begäranden från admins</h1>
            <p className="mt-1 text-sm text-slate-400">En admin vill banna längre än 1 dag? Här godkänner eller avslår du — och väljer EXAKT hur länge. 👑</p>
            <h2 className="mt-6 text-lg font-extrabold text-amber-300">⏳ Väntande ({pending.length})</h2>
            <div className="mt-3 space-y-3">
              {pending.length === 0 && <p className="text-slate-500">Inga väntande begäranden. Alla admins sköter sig! 😎</p>}
              {pending.map((r: any) => (
                <div key={r.id} className="gold-glow rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
                  <p className="font-bold text-white">
                    ⛔ <b>{r.target}</b> <span className="text-sm font-normal text-slate-400">· begärd av {r.admin} · ville ha {r.minutes <= 0 ? "FÖR ALLTID" : r.minutes + " min"}</span>
                  </p>
                  {r.reason && <p className="mt-1 text-sm text-slate-300">💬 "{r.reason}"</p>}
                  <p className="mt-1 text-xs text-slate-500">{new Date(r.createdAt).toLocaleString("sv-SE")}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-400">Godkänn i:</span>
                    {[60, 1440, 2880, 10080].map((m) => (
                      <button key={m} onClick={() => run(approveBanRequest(session, r.id, m))}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-bold text-white hover:bg-emerald-500">
                        ✅ {m === 60 ? "1 tim" : m === 1440 ? "1 dag" : m === 2880 ? "2 dagar" : "1 vecka"}
                      </button>
                    ))}
                    <input value={approveMin[r.id] ?? ""} onChange={(e) => setApproveMin((p) => ({ ...p, [r.id]: e.target.value }))}
                      type="number" placeholder="egna min" className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white" />
                    <button onClick={() => run(approveBanRequest(session, r.id, parseInt(approveMin[r.id] || "0") || 0))}
                      className="rounded-lg bg-emerald-700 px-3 py-1 text-sm font-bold text-white">✅ Egen tid</button>
                    <button onClick={() => run(approveBanRequest(session, r.id, 0))}
                      className="rounded-lg bg-red-700 px-3 py-1 text-sm font-bold text-white">✅ FÖR ALLTID</button>
                    <button onClick={() => run(rejectBanRequest(session, r.id))}
                      className="rounded-lg border border-slate-600 px-3 py-1 text-sm font-bold text-slate-300 hover:bg-slate-800">❌ Avslå</button>
                  </div>
                </div>
              ))}
            </div>
            {handled.length > 0 && (
              <>
                <h2 className="mt-8 text-lg font-extrabold text-slate-400">📜 Hanterade</h2>
                <div className="mt-3 space-y-2">
                  {handled.map((r: any) => (
                    <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-400">
                      <b className="text-white">{r.target}</b> — {r.status === "APPROVED" ? <span className="font-bold text-emerald-400">✅ Godkänd</span> : <span className="font-bold text-red-400">❌ Avslagen</span>}
                      <span className="ml-2 text-xs text-slate-500">· {new Date(r.createdAt).toLocaleString("sv-SE")}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "chat" && (
          <>
            <h1 className="gold-title text-2xl font-extrabold text-amber-300">💬 Stabs-chat</h1>
            <div className="mt-4 max-w-2xl"><StaffChat s={session} accent="bg-amber-600" /></div>
          </>
        )}

        {tab === "users" && (
          <>
            <h1 className="gold-title text-2xl font-extrabold text-amber-300">👥 Användare ({data.users.length})</h1>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Sök användare..."
              className="mt-4 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none" />
            <div className="mt-4 space-y-2">
              {filtered.map((u: User) => (
                <button key={u.id} onClick={() => { setSel(u); setNewName(u.username); }}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${sel?.id === u.id ? "border-amber-500 bg-amber-500/10" : "border-slate-800 bg-slate-900/60 hover:border-slate-600"}`}>
                  <span className="font-bold text-white">{u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < 120000 ? "🟢" : "⚪"} {u.username} {u.bannedUntil && "⛔"} {u.livePath && <span className="ml-2 rounded bg-emerald-500/10 px-1 text-xs text-emerald-400">👀 {u.livePath}</span>}</span>
                  <span className="text-sm text-slate-400">{u.role} · Lv {u.level} · {u.xp} XP · {u.coins} 🪙</span>
                </button>
              ))}
            </div>

            {sel && (
              <div className="gold-glow mt-6 rounded-2xl border border-amber-500/40 bg-slate-900/80 p-6">
                <h2 className="text-xl font-extrabold text-white">🎛️ {sel.username}</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 p-4">
                    <p className="text-sm font-bold text-slate-400">💰 XP & mynt & 🎚️ nivå</p>
                    <div className="mt-2 flex gap-2">
                      <input value={xpAmt} onChange={(e) => setXpAmt(e.target.value)} className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white" />
                      <button onClick={() => run(giveXP(session, sel.id, sel.username, parseInt(xpAmt) || 0))} className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-bold text-white">+XP</button>
                      <button onClick={() => run(giveXP(session, sel.id, sel.username, -(parseInt(xpAmt) || 0)))} className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white">-XP</button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input value={coinAmt} onChange={(e) => setCoinAmt(e.target.value)} className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white" />
                      <button onClick={() => run(giveCoins(session, sel.id, sel.username, parseInt(coinAmt) || 0))} className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-bold text-white">+🪙</button>
                      <button onClick={() => run(giveCoins(session, sel.id, sel.username, -(parseInt(coinAmt) || 0)))} className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white">-🪙</button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input value={lvl} onChange={(e) => setLvl(e.target.value)} type="number" placeholder="nivå" className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white" />
                      <button onClick={() => run(setLevel(session, sel.id, sel.username, parseInt(lvl) || 1))} className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-bold text-white hover:bg-amber-500">🎚️ Sätt nivå (XP följer!)</button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
                      <button onClick={() => run(resetXP(session, sel.id, sel.username))} className="rounded-lg bg-slate-700 px-3 py-1 text-sm font-bold text-white">🔄 Reset XP</button>
                      <button onClick={() => run(resetCoins(session, sel.id, sel.username))} className="rounded-lg bg-slate-700 px-3 py-1 text-sm font-bold text-white">🔄 Reset mynt</button>
                      <button onClick={() => { if (confirm(`TOTAL-RESET ${sel.username}? (XP + mynt + varningar)`)) run(resetAll(session, sel.id, sel.username)); }} className="rounded-lg bg-red-700 px-3 py-1 text-sm font-bold text-white">☢️ Reset ALLT</button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 p-4">
                    <p className="text-sm font-bold text-slate-400">✏️ Byt namn & 🎭 roll</p>
                    <div className="mt-2 flex gap-2">
                      <input value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white" />
                      <button onClick={() => run(renameUser(session, sel.id, sel.username, newName))} className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-bold text-white hover:bg-amber-500">Spara</button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <select id="role-sel" className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white">
                        {["STUDENT", "TEACHER", "ADMIN", "OWNER", "SECURITY"].map((r) => <option key={r}>{r}</option>)}
                      </select>
                      <button onClick={() => run(setRole(session, sel.id, sel.username, (document.getElementById("role-sel") as HTMLSelectElement).value))} className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-bold text-white hover:bg-amber-500">🎭</button>
                    </div>
                    <div className="mt-3 border-t border-slate-800 pt-3">
                      <p className="text-sm font-bold text-slate-400">🎥 LIVE-skärmdelning</p>
                      <button onClick={async () => { const pid = "qk-staff-" + Date.now(); await requestLive(session, sel.id, sel.username, pid); setLiveFor({ username: sel.username, pid }); setInfo(`🎥 Förfrågan skickad till ${sel.username}!`); }}
                        className="mt-2 w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-500">🎥 Be om LIVE-skärm</button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 p-4">
                    <p className="text-sm font-bold text-slate-400">⛔ Banna</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[5, 60, 1440, 0].map((m) => (
                        <button key={m} onClick={() => run(banUser(session, sel.username, m, banMsg))}
                          className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white">
                          {m === 0 ? "FÖR ALLTID" : m === 5 ? "5 min" : m === 60 ? "1 tim" : "24 tim"}
                        </button>
                      ))}
                    </div>
                    <input value={banMin} onChange={(e) => setBanMin(e.target.value)} placeholder="egna minuter" className="mt-2 w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white" />
                    <button onClick={() => run(banUser(session, sel.username, parseInt(banMin) || 5, banMsg))} className="ml-2 rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white">⛔ Banna</button>
                    <input value={banMsg} onChange={(e) => setBanMsg(e.target.value)} placeholder="meddelande (valfritt)" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white" />
                    <button onClick={() => run(unbanUser(session, sel.username))} className="mt-2 rounded-lg bg-emerald-600 px-3 py-1 text-sm font-bold text-white">✅ Unbanna</button>
                  </div>

                  <div className="rounded-xl border border-slate-800 p-4">
                    <p className="text-sm font-bold text-slate-400">🔑 Lösenord & 📧 email</p>
                    <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> 📢 Meddela med popup
                    </label>
                    <input value={customPw} onChange={(e) => setCustomPw(e.target.value)} placeholder="eget lösenord (valfritt, 6+ tecken)" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white" />
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => { run(resetPassword(session, sel.id, sel.username, notify, customPw)); setCustomPw(""); }} className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-bold text-white hover:bg-amber-500">🔑 Återställ</button>
                      <button onClick={() => run(getEmail(session, sel.id))} className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-bold text-white">📧 Visa email</button>
                    </div>
                    <button onClick={() => { if (confirm(`RADERA ${sel.username} FÖR ALLTID?`)) run(deleteUser(session, sel.id, sel.username)); }}
                      className="mt-3 rounded-lg bg-red-700 px-3 py-1 text-sm font-bold text-white">🗑️ RADERA ANVÄNDARE</button>
                    <div className="mt-3 border-t border-slate-800 pt-3">
                      <p className="text-sm font-bold text-slate-400">📨 Personligt meddelande (popup för BARA denna användare)</p>
                      <textarea value={pNote} onChange={(e) => setPNote(e.target.value)} rows={2} placeholder="Skriv något bara denna personen ser..." className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white" />
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => { run(sendPersonalNote(session, sel.id, sel.username, pNote)); setPNote(""); }} className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-bold text-white hover:bg-amber-500">📨 Skicka popup</button>
                        <button onClick={() => run(clearPersonalNote(session, sel.id, sel.username))} className="rounded-lg bg-slate-700 px-3 py-1 text-sm font-bold text-white">🧹 Rensa popup</button>
                        <button onClick={() => run(requestRename(session, sel.id, sel.username))} className="rounded-lg bg-indigo-600 px-3 py-1 text-sm font-bold text-white">✏️ Be om namnbyte (LÅSER sajten)</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "broadcast" && (
          <>
            <h1 className="gold-title text-2xl font-extrabold text-amber-300">📢 Sändning & 🛠️ Nödläge</h1>
            <textarea value={bc} onChange={(e) => setBc(e.target.value)} rows={3} placeholder="Skriv ett meddelande som ALLA användare ser..."
              className="mt-4 w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none" />
            <div className="mt-3 flex gap-2">
              <button onClick={() => run(setBroadcast(session, bc))} className="rounded-xl bg-amber-600 px-5 py-2 font-bold text-white hover:bg-amber-500">📢 Sänd</button>
              <button onClick={() => { setBc(""); run(setBroadcast(session, "")); }} className="rounded-xl bg-slate-700 px-5 py-2 font-bold text-white">🧹 Rensa</button>
            </div>
            <div className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/5 p-6">
              <p className="font-bold text-red-400">🛠️ Nödläge — stäng hela sajten</p>
              <button onClick={() => run(setShutdown(session, !data.settings.shutdown))}
                className={`mt-3 rounded-xl px-5 py-2 font-bold text-white ${data.settings.shutdown ? "bg-emerald-600" : "bg-red-600"}`}>
                {data.settings.shutdown ? "🟢 Öppna sajten" : "⛔ STÄNG sajten"}
              </button>
            </div>
          </>
        )}

        {tab === "codes" && (
          <>
            <h1 className="gold-title text-2xl font-extrabold text-amber-300">🔢 Koder</h1>
            <div className="mt-4 max-w-md space-y-3">
              {[["o", "👑 Ägarkod"], ["a", "🛡️ Admin-kod"], ["sec", "🕵️ Säkerhetskod"]].map(([k, label]) => (
                <div key={k as string}>
                  <p className="text-sm font-bold text-slate-400">{label}</p>
                  <input value={(codes as any)[k as string]} onChange={(e) => setCodes((c) => ({ ...c, [k as string]: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-white focus:border-amber-400 focus:outline-none" />
                </div>
              ))}
              <button onClick={async () => { const r: any = await changeCodes(session, codes.o, codes.a, codes.sec); if (r?.newOwner) localStorage.setItem("cmd_session", JSON.stringify({ role: "OWNER", code: r.newOwner })); run(Promise.resolve(r)); }}
                className="rounded-xl bg-amber-600 px-5 py-2 font-bold text-white hover:bg-amber-500">💾 Spara koder</button>
            </div>
          </>
        )}

        {tab === "log" && (
          <>
            <h1 className="gold-title text-2xl font-extrabold text-amber-300">📜 Logg</h1>
            <div className="mt-4 space-y-1">
              {data.log.map((l: any, i: number) => (
                <p key={i} className="rounded-lg bg-slate-900/60 px-4 py-2 text-sm text-slate-300">
                  <b className={l.username.startsWith("[") ? "text-amber-300" : "text-white"}>{l.username}</b> {l.action}
                  <span className="ml-2 text-xs text-slate-500">{new Date(l.createdAt).toLocaleString("sv-SE")}</span>
                </p>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}