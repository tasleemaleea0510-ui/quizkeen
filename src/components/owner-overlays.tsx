"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { clearPasswordNote, getOverlayState, getBanStatus, acceptRename } from "@/app/system/actions";
import { Wrench, ShieldAlert, Megaphone, Mail, Bell, Key, Edit3, X } from "lucide-react";

export function MaintenanceScreen() {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
        <Wrench className="h-10 w-10 animate-spin" style={{ animationDuration: "6s" }} />
      </div>
      <h1 className="mt-4 text-4xl font-extrabold text-white sm:text-5xl">
        Quiz<span className="text-indigo-400">Keen</span> är under underhåll
      </h1>
      <p className="mt-3 text-slate-400 text-sm">Systemet uppdateras för tillfället — vi är snart tillbaka!</p>
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
      <div className="w-full max-w-md rounded-3xl border border-red-500/40 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mt-2 text-2xl font-extrabold text-red-400">Kontot är avstängt</h1>
        <p className="mt-2 text-sm text-slate-300">{message || "Ditt konto har blivit tillfälligt avstängt."}</p>
        <p className="mt-6 text-xs text-slate-500 uppercase font-semibold tracking-wider">Återaktiveras om</p>
        <p className="text-4xl font-extrabold font-mono text-white mt-1">{left}</p>
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
      const s = await getBanStatus().catch(() => null);
      const nowBanned = s?.banned;
      if (nowBanned && !liveBanned) {
        setLiveBanned(true);
        setLiveUntil(s?.until ?? null);
        setLiveMsg(s?.message ?? null);
      }
      if (serverBanned && !nowBanned) { window.location.reload(); return; }
    }, 5000);
    return () => clearInterval(iv);
  }, [serverBanned, liveBanned]);

  if (!liveBanned || serverBanned) return null;
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950">
      <BanScreen until={liveUntil!} message={liveMsg} />
    </div>
  );
}

// One tick of the ticker: the notice, its trailing gap, and the separator dot
// that marks where one repeat ends and the next begins. Measured and rendered
// with the exact same markup so the widths we do arithmetic on are the real
// widths on screen.
function TickerUnit({ text }: { text: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="px-8">{text}</span>
      <span aria-hidden="true" className="text-amber-400/50">
        •
      </span>
    </span>
  );
}

// px per second. A news ticker reads at a steady speed no matter how long the
// headline is; the old per-character duration made a four-letter notice crawl
// across the bar in half a minute, which is what made it feel broken.
const TICKER_SPEED = 110;

export function Overlays({ broadcast, passwordNote }: { broadcast: string | null; passwordNote: string | null }) {
  const [bc, setBc] = useState(broadcast);
  const [note, setNote] = useState(passwordNote);
  const [showNote, setShowNote] = useState(!!passwordNote);
  const [renameReq, setRenameReq] = useState(false);
  const [nn, setNn] = useState("");
  const [rnErr, setRnErr] = useState("");
  const [mounted, setMounted] = useState(false);
  const tickerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [unitWidth, setUnitWidth] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  // Measure one tick of the ticker and the bar it runs through, so we can work
  // out how many repeats it takes to fill the bar. This has to depend on
  // `mounted`: the ticker lives in a portal that only exists after the first
  // render, so on the mount pass these refs are still empty and the effect has
  // to run again once they are attached — otherwise the ticker silently keeps
  // its fallback single repeat at a slow crawl.
  useEffect(() => {
    if (!mounted) return;
    const box = tickerRef.current;
    const measure = measureRef.current;
    if (!box || !measure) return;
    const compute = () => {
      setUnitWidth(measure.offsetWidth);
      setBarWidth(box.clientWidth);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(box);
    ro.observe(measure);
    return () => ro.disconnect();
  }, [bc, mounted]);

  // A breaking-news ticker never shows the headline just once, and it never sits
  // still: it repeats the notice until it covers the bar, then crawls forever. One
  // "group" is however many repeats it takes to fill the bar; the track holds that
  // group twice, so sliding the track by half its width lands on a pixel-identical
  // group and the loop is seamless.
  const reps = unitWidth > 0 && barWidth > 0 ? Math.max(1, Math.ceil(barWidth / unitWidth)) : 1;
  const tickerSeconds = unitWidth > 0 ? (unitWidth * reps) / TICKER_SPEED : 22;

  useEffect(() => {
    setMounted(true);
    const iv = setInterval(async () => {
      const s = await getOverlayState().catch(() => null);
      if (!s) return;
      const { passwordNote: n, broadcast: b, renameRequested: rr } = s;
      if (n) { setNote(n); setShowNote(true); }
      setBc(b);
      setRenameReq(!!rr);
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      {bc && (
        <div className="fixed left-0 right-0 top-16 z-30 flex items-stretch overflow-hidden border-b border-amber-500/40 bg-gradient-to-r from-amber-600/20 via-amber-400/10 to-amber-600/20 backdrop-blur">
          <span className="flex shrink-0 items-center gap-1.5 border-r border-amber-500/30 bg-amber-500/25 px-3 text-[11px] font-extrabold uppercase tracking-wider text-amber-200">
            <Megaphone className="h-4 w-4" />
            Live
          </span>
          {/* Breaking-news ticker: the message repeats to fill the bar and
              scrolls right-to-left at a constant speed, pausing only while
              hovered so a long notice can be read. */}
          <div ref={tickerRef} className="relative flex-1 overflow-hidden py-2 text-sm font-semibold text-amber-300">
            <span
              ref={measureRef}
              aria-hidden="true"
              className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
            >
              <TickerUnit text={bc} />
            </span>
            <div
              className="flex w-max animate-marquee hover:[animation-play-state:paused]"
              style={{ animationDuration: `${tickerSeconds}s` }}
            >
              {[0, 1].map((copy) =>
                Array.from({ length: reps }, (_, i) => (
                  <span key={`${copy}-${i}`} aria-hidden={copy > 0 || i > 0 ? true : undefined}>
                    <TickerUnit text={bc} />
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {showNote && note && !renameReq && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-indigo-500/40 bg-slate-900 p-8 text-center shadow-2xl">
            <button
              onClick={async () => { setShowNote(false); setNote(null); await clearPasswordNote().catch(() => {}); }}
              className="absolute right-4 top-4 rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Stäng"
            ><X className="h-4 w-4" /></button>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              {note?.includes("chatta") ? <Bell className="h-7 w-7" /> : <Mail className="h-7 w-7" />}
            </div>
            <h2 className="mt-2 text-xl font-bold text-white">Systemmeddelande</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">{note}</p>
          </div>
        </div>
      )}
      {renameReq && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-red-500/50 bg-slate-900 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
              <Edit3 className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-red-400">Dags att byta användarnamn</h2>
            <p className="mt-2 text-xs text-slate-300">Personalen har bett dig välja ett nytt användarnamn. Kontot är spärrat tills ett nytt namn valts.</p>
            <input 
              value={nn} 
              onChange={(e) => setNn(e.target.value)} 
              placeholder="Ditt nya användarnamn..."
              className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400" 
            />
            {rnErr && <p className="mt-2 text-xs font-semibold text-red-400">{rnErr}</p>}
            <button
              onClick={async () => {
                const r = await acceptRename(nn).catch(() => ({ ok: false as const, info: "Nätverksfel — försök igen." }));
                if (r.ok) { setRenameReq(false); setNn(""); } else setRnErr(r.info || "Kunde inte spara användarnamnet.");
              }}
              className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Spara nytt namn
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}