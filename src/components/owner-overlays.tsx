"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { clearPasswordNote, getPasswordNote, getBanStatus } from "@/app/system/actions";

export function MaintenanceScreen() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl">🛠️</p>
      <h1 className="mt-4 text-3xl font-extrabold text-white">QuizKeen är under underhåll</h1>
      <p className="mt-2 text-slate-400">Vi bygger något fantastiskt — snart tillbaka!</p>
    </div>
  );
}

export function BanScreen({ until, message }: { until: string; message: string | null }) {
  const [left, setLeft] = useState("0:00");
  useEffect(() => {
    const end = new Date(until).getTime();
    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) {
        setLeft("0:00");
        return;
      }
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
      if (serverBanned && !nowBanned) router.refresh();
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
  const [note, setNote] = useState(passwordNote);
  const [showNote, setShowNote] = useState(!!passwordNote);

  useEffect(() => {
    const iv = setInterval(async () => {
      const n = await getPasswordNote();
      if (n) {
        setNote(n);
        setShowNote(true);
      }
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  return createPortal(
    <>
      {broadcast && (
        <div className="fixed left-0 right-0 top-16 z-30 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm font-bold text-amber-300 backdrop-blur">
          📢 {broadcast}
        </div>
      )}
      {showNote && note && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-indigo-500/40 bg-slate-900 p-8 text-center shadow-2xl shadow-indigo-500/20">
            <button
              onClick={async () => {
                setShowNote(false);
                setNote(null);
                await clearPasswordNote();
              }}
              className="absolute right-4 top-4 rounded-xl bg-slate-800 px-3 py-1 text-lg font-bold text-slate-300 hover:bg-red-600/30 hover:text-white"
            >
              ✕
            </button>
            <p className="text-5xl">🔑</p>
            <h2 className="mt-3 text-xl font-extrabold text-white">Lösenordet har återställts!</h2>
            <p className="mt-3 whitespace-pre-wrap text-slate-300">{note}</p>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}