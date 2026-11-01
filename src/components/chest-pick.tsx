"use client";
import { useEffect, useRef, useState } from "react";
import KeenAvatar from "@/components/keens/keen-avatar";
import { KEEN_BY_ID } from "@/lib/keens";
import type { ChestOffer, ChestReveal as Reveal } from "@/lib/game-modes";
import { Coins, Crosshair, Dices, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";

/**
 * The chest, in full screen.
 *
 * Vault Raiders' chest is the one moment in a match where a player acts alone:
 * a question has just ended and three boxes are on screen. They are not three
 * copies — one pays a sure amount, one takes a slice of the leader, one is a
 * coin flip that can cost coins — so the tap is a decision the player can
 * actually make. Doing that inside the heist panel made it look like a button;
 * taking over the screen makes it the event it is.
 *
 * Two halves, because two different things have to happen:
 *  - `ChestPick` is the player's own screen, before the tap.
 *  - `ChestReveal` goes up on *every* screen — the host's projector included —
 *    so the whole room watches the same pull.
 */

/** A single chest, drawn with two boxes and a lid that actually hinges open. */
function ChestArt({ open, size = "md" }: { open: boolean; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-16 w-14" : "h-24 w-20 sm:h-32 sm:w-28";
  return (
    <div className={`relative ${box}`} style={{ perspective: "700px" }} aria-hidden>
      {/* The light the chest throws on the floor. */}
      <div
        className={`absolute -inset-5 rounded-full blur-2xl transition-colors duration-500 ${
          open ? "bg-amber-300/45" : "bg-amber-500/20"
        }`}
      />
      {/* Lid: hinged at its bottom edge so raising it reads as opening. */}
      <div
        className="absolute inset-x-0 top-0 h-[44%] rounded-t-2xl border-2 border-amber-900/70 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-500 transition-transform duration-700 ease-out"
        style={{ transformOrigin: "center bottom", transform: open ? "rotateX(118deg)" : "rotateX(0deg)" }}
      />
      {/* What is inside, revealed by the lid coming up. */}
      <div
        className="absolute inset-x-1.5 top-[34%] h-4 rounded-md bg-amber-100/80 blur-[3px] transition-opacity duration-500"
        style={{ opacity: open ? 1 : 0 }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[60%] rounded-b-2xl border-2 border-amber-900/70 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-800 shadow-[inset_0_2px_0_rgba(255,255,255,0.25)]">
        <div className="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 bg-amber-300/70" />
        <div className="absolute left-1/2 top-1.5 h-3.5 w-4 -translate-x-1/2 rounded-[3px] bg-yellow-100 ring-1 ring-amber-900/70" />
      </div>
    </div>
  );
}

/** Shared shell: the screen goes dark and gold so the room knows where to look. */
function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[85] flex flex-col items-center justify-center overflow-y-auto bg-slate-950/95 px-4 py-8 backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(245,158,11,0.28),transparent_72%)]"
      />
      {children}
    </div>
  );
}

/** One look per bet, so the three boxes never read as the same object. */
const OFFER_TONE: Record<
  ChestOffer["id"],
  { frame: string; glow: string; chip: string; icon: typeof Coins }
> = {
  safe: {
    frame: "border-emerald-400/30 from-emerald-500/15 hover:border-emerald-300/70 hover:from-emerald-400/25",
    glow: "bg-emerald-400/20",
    chip: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
    icon: Coins,
  },
  raid: {
    frame: "border-rose-400/30 from-rose-500/15 hover:border-rose-300/70 hover:from-rose-400/25",
    glow: "bg-rose-400/20",
    chip: "border-rose-400/30 bg-rose-500/15 text-rose-100",
    icon: Crosshair,
  },
  wild: {
    frame: "border-amber-400/40 from-amber-500/20 hover:border-amber-300/80 hover:from-amber-400/30",
    glow: "bg-amber-400/25",
    chip: "border-amber-400/40 bg-amber-500/20 text-amber-100",
    icon: Dices,
  },
};

/** The player's own screen: three different bets, one tap, no timer. */
export function ChestPick({
  name,
  keenId,
  offers,
  question,
  pending,
  onPick,
  onSkip,
}: {
  name: string;
  keenId?: string | null;
  /** The three boxes, with what each one is worth, printed before the tap. */
  offers: ChestOffer[];
  /** The question just answered, for the header line. */
  question: number;
  pending: boolean;
  onPick: (chest: number) => void;
  onSkip: () => void;
}) {
  const keen = keenId ? KEEN_BY_ID[keenId] : undefined;

  return (
    <Backdrop>
      <div className="relative w-full max-w-4xl text-center">
        <div className="flex items-center justify-center gap-3">
          {keen ? (
            <KeenAvatar keen={keen} size={44} />
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-800 text-sm font-extrabold text-slate-400">
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="text-left">
            <p className="text-sm font-extrabold text-white">{name}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200/80">
              Fråga {question} · en kista
            </p>
          </div>
        </div>

        <h2 className="page-title mt-4">Välj din kista</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
          Tre kistor, tre olika vad. Den säkra betalar, rånkistan tar från ledaren och den vågade kan kosta dig.
          Hela rummet ser vad du fick.
        </p>

        <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-4">
          {offers.map((offer, i) => {
            const tone = OFFER_TONE[offer.id];
            const Icon = tone.icon;
            return (
              <button
                key={offer.id}
                type="button"
                disabled={pending}
                onClick={() => onPick(i)}
                className={`group relative flex flex-col items-center gap-2 overflow-hidden rounded-[22px] border bg-gradient-to-b to-slate-950/50 px-1.5 py-4 text-center transition-all hover:-translate-y-1.5 disabled:opacity-50 sm:gap-3 sm:px-3 sm:py-6 ${tone.frame}`}
              >
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -top-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full blur-3xl ${tone.glow}`}
                />
                <span className="relative animate-keen-bob" style={{ animationDelay: `${i * 0.35}s` }}>
                  <ChestArt open={false} />
                </span>
                <span className="relative flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-white sm:text-xs">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{offer.name}</span>
                </span>
                <span
                  className={`relative rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider sm:text-[10px] ${tone.chip}`}
                  data-no-translate
                >
                  {offer.odds}
                </span>
                <span className="relative line-clamp-3 text-[9px] font-semibold leading-snug text-white/60 sm:text-[10px]">
                  {offer.blurb}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-7">
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold text-slate-300 transition-colors hover:border-white/25 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Behåll saldot — jag hoppar över
          </button>
          <p className="mt-2 text-[11px] text-slate-500">Du får en ny kista efter nästa fråga.</p>
        </div>
      </div>
    </Backdrop>
  );
}

const KIND_ACCENT: Record<Reveal["kind"], string> = {
  gold: "text-amber-300",
  steal: "text-rose-300",
  bust: "text-rose-400",
};

/**
 * What the whole room sees, host screen included.
 *
 * The line is written by the rules, not here, so the projector, the puller's
 * phone and the feed all say the same thing about the same chest.
 */
export function ChestReveal({ reveal, onClose }: { reveal: Reveal; onClose: () => void }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [open, setOpen] = useState(false);

  // The lid lifts a beat after the screen appears, and the overlay clears itself
  // so a host who is reading the next question does not have to click twice.
  useEffect(() => {
    const lift = setTimeout(() => setOpen(true), 200);
    const away = setTimeout(() => closeRef.current(), 9000);
    return () => {
      clearTimeout(lift);
      clearTimeout(away);
    };
  }, [reveal]);

  const keen = reveal.keen ? KEEN_BY_ID[reveal.keen] : undefined;
  const good = reveal.delta > 0;
  const bad = reveal.delta < 0;

  return (
    <Backdrop>
      <div className="relative flex w-full max-w-2xl flex-col items-center text-center">
        <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-100">
          Kista {reveal.chest + 1} öppnad
        </span>

        <div className="mt-6">
          <ChestArt open={open} />
        </div>

        <div className="mt-6 flex items-center gap-3">
          {keen ? (
            <KeenAvatar keen={keen} size={40} />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-800 text-sm font-extrabold text-slate-400">
              {reveal.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <p className="text-lg font-extrabold text-white">{reveal.name}</p>
        </div>

        <h2 className={`mt-3 animate-stamp font-display text-3xl font-extrabold tracking-tight sm:text-4xl ${KIND_ACCENT[reveal.kind]}`}>
          {reveal.title}
        </h2>

        {reveal.delta !== 0 && (
          <p
            className={`mt-3 flex animate-pop items-center gap-1.5 font-mono text-4xl font-extrabold sm:text-5xl ${
              good ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {good ? <TrendingUp className="h-7 w-7" /> : <TrendingDown className="h-7 w-7" />}
            <span data-no-translate>
              {good ? "+" : "−"}
              {Math.abs(reveal.delta).toLocaleString("sv-SE")}
            </span>
          </p>
        )}

        <p className="mx-auto mt-4 max-w-lg text-sm font-semibold text-slate-300">{reveal.text}</p>
        <p className="mt-1 text-xs text-slate-500">{reveal.blurb}</p>

        {reveal.rival && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-300/80" />
            Tog från {reveal.rival}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-2.5 text-sm font-extrabold text-amber-950 shadow-[0_12px_30px_-14px_rgba(245,158,11,0.9)] ring-1 ring-inset ring-white/30 transition hover:from-amber-300 hover:to-amber-500"
        >
          <Coins className="h-4 w-4" />
          Fortsätt
        </button>
      </div>
    </Backdrop>
  );
}
