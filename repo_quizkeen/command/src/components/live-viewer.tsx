"use client";
import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";

export default function LiveViewer({ username, peerId, onClose }: { username: string; peerId: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Väntar på att " + username + " godkänner & delar...");

  useEffect(() => {
    const peer = new Peer(peerId);
    peer.on("call", (call) => {
      call.answer();
      call.on("stream", (stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStatus("LIVE");
        }
      });
    });
    peer.on("error", () => {});
    return () => peer.destroy();
  }, [peerId]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-extrabold text-red-400">🎥 LIVE — {username} {status === "LIVE" && <span className="ml-2 animate-pulse text-red-500">● LIVE</span>}</p>
          <button onClick={onClose} className="rounded-lg bg-slate-800 px-3 py-1 font-bold text-white">✕ Stäng</button>
        </div>
        <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl border border-red-500/40 bg-slate-950" />
        {status !== "LIVE" && <p className="mt-2 text-sm text-slate-400">{status}</p>}
      </div>
    </div>
  );
}