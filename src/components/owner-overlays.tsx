"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { clearPasswordNote, getPasswordNote, getBanStatus, getBroadcast, getRenameRequest, acceptRename } from "@/app/system/actions";

export function MaintenanceScreen() {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div className="pointer-events-none absolute inset-0">
        {[...Array(14)].map((_, i) => (
          <span key={i} className="absolute animate-pulse text-2xl" style={{ left: `${(i * 71) % 100}%`, top: `${(i * 37) % 100}%`, animationDelay: `${i * 0.25}s` }}>✨</span>
        ))}
      </div>
      <p className="animate-spin text-7xl" style={{ animationDuration: "4s" }}>⚙️</p>
      <h1 className="mt-6 text-4xl font-extrabold text-white sm:text-5xl">
        Quiz<span className="animate-pulse text-indigo-400">Keen</span> är under underhåll
      </h1>
      <p className="mt-3 text-slate-400">Ägaren bygger något fantastiskt — snart tillbaka! 👑</p>
    </div>
  );
}

export function BanScreen({ until, message }: { until: string; message: string | null }) {
  const [left, setLeft] = useState("0:00");
  useEffect(() => {
    const end = new Date(until).getTime();
    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) { setLeft("0:00"); return; }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [until]);
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-red-500/40 bg-slate-900 p-8 text-center shadow-2xl shadow-red-500/20">
        <p className="text-6xl">⛔</p>
        <h1 className="mt-4 text-3xl font-extrabold text-red-400">DU ÄR BANNAD</h1>
        <p className="mt-3 text-slate-300">{message || "Du har blivit bannad."}</p>
        <p className="mt-6 text-sm text-slate-500">Fri igen om</p>
        <p className="text-5xl font-extrabold tabular-nums text-white">{left}</p>
      </div>
    </div>
  );
}

export function LiveBan({ serverBanned, until, message }: { serverBanned: boolean; until: string | null; message: string | null }) {
  const router = useRouter();
  const [liveBanned, setLiveBanned] = useState(serverBanned);
  const [liveUntil, setLiveUntil] = useState(until);
  const [liveMsg, setLiveMsg] = useState(message);

  useEffect(() => {
    const iv = setInterval(async () => {
      const s = await getBanStatus();
      const nowBanned = !!s?.banned;
      setLiveBanned(nowBanned);
      setLiveUntil(s?.until ?? null);
      setLiveMsg(s?.message ?? null);
      if (serverBanned && !nowBanned) { window.location.reload(); return; }
    }, 5000);
    return () => clearInterval(iv);
  }, [serverBanned]);

  if (!liveBanned || serverBanned) return null;
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950">
      <BanScreen until={liveUntil!} message={liveMsg} />
    </div>
  );
}

export function Overlays({ broadcast, passwordNote }: { broadcast: string | null; passwordNote: string | null }) {
  const [bc, setBc] = useState(broadcast);
  const [note, setNote] = useState(passwordNote);
  const [showNote, setShowNote] = useState(!!passwordNote);
  const [renameReq, setRenameReq] = useState(false);
  const [nn, setNn] = useState("");
  const [rnErr, setRnErr] = useState("");

  useEffect(() => {
    const iv = setInterval(async () => {
      const [n, b, rr] = await Promise.all([getPasswordNote(), getBroadcast(), getRenameRequest()]);
      if (n) { setNote(n); setShowNote(true); }
      setBc(b);
      setRenameReq(!!rr);
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  return createPortal(
    <>
      {bc && (
        <div className="fixed left-0 right-0 top-16 z-30 overflow-hidden border-b border-amber-500/40 bg-gradient-to-r from-amber-600/20 via-amber-400/10 to-amber-600/20 backdrop-blur">
          <style>{`
            .qk-marquee { width: max-content; animation: qk-scroll 16s linear infinite; }
            @keyframes qk-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          `}</style>
          <div className="qk-marquee flex whitespace-nowrap py-2 text-sm font-extrabold text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.7)]">
            {[...Array(24)].map((_, i) => (
              <span key={i} className="px-8">📢 {bc}</span>
            ))}
          </div>
        </div>
      )}
      {showNote && note && !renameReq && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-indigo-500/40 bg-slate-900 p-8 text-center shadow-2xl shadow-indigo-500/20">
            <button
              onClick={async () => { setShowNote(false); setNote(null); await clearPasswordNote(); }}
              className="absolute right-4 top-4 rounded-xl bg-slate-800 px-3 py-1 text-lg font-bold text-slate-300 hover:bg-red-600/30 hover:text-white"
            >✕</button>
            <p className="text-5xl">{note?.startsWith("📨") ? "📨" : note?.startsWith("🔔") ? "🔔" : "🔑"}</p>
            <h2 className="mt-4 text-2xl font-extrabold text-white">
              {note?.startsWith("📨") ? "📨 MEDDELANDE FRÅN ÄGAREN!" : note?.startsWith("🔔") ? "🔔 CHATT-FÖRFRÅGAN!" : "🔑 Lösenordet har återställts!"}
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-slate-300">{note}</p>
          </div>
        </div>
      )}
      {renameReq && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-red-500/50 bg-slate-900 p-8 text-center shadow-2xl shadow-red-500/30">
            <p className="text-6xl">✏️</p>
            <h2 className="mt-4 text-2xl font-extrabold text-red-400">Dags att byta namn!</h2>
            <p className="mt-2 text-sm text-slate-300">Personalen har bett dig byta användarnamn. Sajten är <b className="text-red-400">låst</b> tills du valt ett nytt, schysst namn.</p>
            <input value={nn} onChange={(e) => setNn(e.target.value)} placeholder="Ditt nya användarnamn..."
              className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500" />
            {rnErr && <p className="mt-2 text-sm font-bold text-red-400">{rnErr}</p>}
            <button
              onClick={async () => {
                const r = await acceptRename(nn);
                if (r.ok) { setRenameReq(false); setNn(""); } else setRnErr(r.info || "❌ Fungerade inte!");
              }}
              className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-extrabold text-white hover:bg-indigo-500"
            >✅ Spara nytt namn</button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}