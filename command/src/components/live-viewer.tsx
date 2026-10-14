"use client";

import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import { Cross } from "./icons";

export default function LiveViewer({
  username,
  peerId,
  onClose,
}: {
  username: string;
  peerId: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState(`Väntar på att ${username} godkänner & delar...`);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let peer: Peer | null = null;
    try {
      peer = new Peer(peerId);
    } catch {
      setStatus("Kunde inte starta LIVE-anslutningen.");
      setFailed(true);
      return;
    }

    peer.on("call", (call) => {
      call.answer();
      call.on("stream", (stream) => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        const played = video.play();
        if (played && typeof played.catch === "function") played.catch(() => {});
        setStatus("LIVE");
      });
    });
    peer.on("error", () => {
      setStatus("LIVE-anslutningen bröts.");
      setFailed(true);
    });

    return () => {
      try {
        peer?.destroy();
      } catch {
        /* already gone */
      }
    };
  }, [peerId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-extrabold text-red-400">
            LIVE — {username}
            {status === "LIVE" && (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                LIVE
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-700"
          >
            <Cross className="h-3.5 w-3.5" />
            Stäng
          </button>
        </div>
        <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl border border-red-500/40 bg-slate-950" />
        {status !== "LIVE" && <p className={`mt-2 text-sm ${failed ? "text-amber-400" : "text-slate-400"}`}>{status}</p>}
      </div>
    </div>
  );
}
