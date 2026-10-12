"use client";
import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import { getLiveState, declineLive } from "@/app/system/actions";

export default function LiveShareClient() {
  const [live, setLive] = useState<any>(null);
  const busy = useRef(false);

  useEffect(() => {
    let on = true;
    async function pull() {
      const s = await getLiveState();
      if (on && s) setLive(s.live);
    }
    pull();
    const iv = setInterval(pull, 5000);
    return () => { on = false; clearInterval(iv); };
  }, []);

  async function accept() {
    if (busy.current) return;
    busy.current = true;
    const pid = live.staffPeerId;
    await declineLive();
    setLive(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const peer = new Peer();
      peer.on("open", () => { peer.call(pid, stream); });
      stream.getVideoTracks()[0].onended = () => peer.destroy();
    } catch { busy.current = false; }
  }

  return (
    <>
      {live?.requested && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-red-500/50 bg-slate-900 p-8 text-center">
            <p className="text-6xl">🎥</p>
            <h2 className="mt-3 text-2xl font-extrabold text-red-400">Personalen vill se din skärm LIVE</h2>
            <p className="mt-2 text-sm text-slate-300">Du väljer själv vad som delas och kan avsluta när som helst.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={async () => { await declineLive(); setLive(null); }} className="flex-1 rounded-xl bg-slate-700 py-3 font-bold text-white">❌ Nej</button>
              <button onClick={accept} className="flex-1 rounded-xl bg-red-600 py-3 font-extrabold text-white">✅ Dela</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}