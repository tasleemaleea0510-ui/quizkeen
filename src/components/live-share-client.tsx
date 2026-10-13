"use client";
import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import { getLiveState, declineLive } from "@/app/system/actions";
import { Monitor } from "lucide-react";

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
          <div className="w-full max-w-md rounded-3xl border border-red-500/50 bg-slate-900 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
              <Monitor className="h-7 w-7" />
            </div>
            <h2 className="mt-3 text-2xl font-bold text-white">Förfrågan om skärmdelning</h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              En lärare eller administratör har begärt att se din skärm. Du väljer själv vad som visas och kan avbryta när som helst.
            </p>
            <div className="mt-6 flex gap-2.5">
              <button 
                onClick={async () => { await declineLive(); setLive(null); }} 
                className="flex-1 rounded-xl bg-slate-800 border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Avböj
              </button>
              <button 
                onClick={accept} 
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Dela skärm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}