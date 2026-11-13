"use client";
import * as React from "react";
import Link from "next/link";
import { Pause, Play, RotateCcw, Sparkles, Trophy, Wand2 } from "lucide-react";
import {
  KEEN_BY_ID,
  PACK_BY_ID,
  RARITY_META,
  keensInPack,
  packInSeason,
  rarityOdds,
  rollKeen,
  seasonEndsAt,
  type Keen,
} from "@/lib/keens";
import { cn } from "@/lib/utils";
import PackOpener, { type OpenedPull } from "@/components/keens/pack-opener";
import PackArt from "@/components/keens/pack-art";
import KeenAvatar from "@/components/keens/keen-avatar";
import SeasonCountdown from "@/components/keens/season-countdown";

/**
 * The sandbox.
 *
 * Every mechanic in QuizKeen that is worth feeling before you spend something:
 * a pack opening, the four rarities landing, and the two pacing systems side by
 * side — Kahoot's shared clock and Blooket's own-tempo race.
 *
 * It is a display, on purpose. Nothing here is posted anywhere: the rolls come
 * from `rollKeen` in the browser, the coins are a number in this component, the
 * racers are four fake players, and the countdown is the same date maths the
 * shop uses, read-only. There is no server action, no fetch and no session, so
 * a visitor cannot earn a Keen, spend a coin or touch another player's game by
 * poking at it — the only thing that changes is what is on screen.
 *
 * That is also what makes it safe to hand to a friend who wants to see how the
 * game feels without making an account.
 */

const PACK = PACK_BY_ID.halloween;
const DEMO_COINS = 5000;
const DEMO_PULLS = 3;

type Pull = OpenedPull;

/** Roll `count` Keens out of the pack, exactly as a real opening would. */
function rollPulls(count: number): Pull[] {
  return Array.from({ length: count }, () => {
    const keen = rollKeen("halloween");
    return { keenId: keen.id, rarity: keen.rarity, isNew: true, refund: 0, owned: 1 };
  });
}

export default function SandboxDemo() {
  const [opening, setOpening] = React.useState<Pull[] | null>(null);

  const inSeason = packInSeason(PACK);
  const endsAt = seasonEndsAt(PACK);

  return (
    <div className="space-y-8">
      {/* ── what this is ──────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-amber-400/25 bg-amber-500/10 p-5">
        <p className="flex items-center gap-2 text-sm font-extrabold text-amber-200">
          <Wand2 className="h-4 w-4" /> Det här är en sandlåda
        </p>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-300">
          Allt på sidan går att klicka på, och ingenting av det räknas. Demon rullar Keens i din egen
          webbläsare, mynten är påhittade och spelarna i racet är fyra låtsaskompisar. Du får inga
          mynt, ingen XP och ingen Keen i samlingen — och du kan inte komma åt någon annans spel.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-300">
          {["Inget konto behövs", "Inget sparas", "Inga mynt spenderas", "Inga riktiga spel"].map((t) => (
            <li key={t} className="rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1">
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* ── the pack ──────────────────────────────────────────────────────── */}
      <section>
        <SectionHead
          icon={<Sparkles className="h-4 w-4" />}
          title="Öppna Halloween-paketet"
          blurb="Samma reveal som i marknaden: vindan, smällen och en effekt som växer med rariteten. Här dras Keens lokalt, så du kan öppna hur många gånger du vill."
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[20rem_1fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <div className="flex justify-center">
              {PACK ? (
                <PackArt pack={PACK} variant="hero" className="h-44 w-36 rounded-3xl" />
              ) : (
                <span className="text-5xl">🎃</span>
              )}
            </div>
            <p className="mt-4 text-center font-display text-lg font-extrabold text-white">
              {PACK?.name ?? "Halloween"}
            </p>
            <p className="mt-1 text-center text-xs text-slate-400">
              {PACK?.tagline ?? "Åtta spöklika Keens."}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setOpening(rollPulls(DEMO_PULLS))}
                className="rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-glow-sm transition-all hover:from-indigo-400 hover:to-indigo-500"
              >
                Öppna {DEMO_PULLS} paket (demo)
              </button>
              <button
                type="button"
                onClick={() => setOpening(rollPulls(1))}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500"
              >
                Öppna ett
              </button>
            </div>
            <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Låtsasmynt: {DEMO_COINS.toLocaleString("sv-SE")}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Oddstabellen</p>
            <div className="mt-3 space-y-2">
              {rarityOdds("halloween")
                .filter((o) => o.chance > 0)
                .map(({ rarity, chance }) => {
                  const meta = RARITY_META[rarity];
                  const members = keensInPack("halloween").filter((k) => k.rarity === rarity);
                  return (
                    <div
                      key={rarity}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2"
                    >
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider",
                          meta.chip
                        )}
                      >
                        {meta.label}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {String(chance).replace(".", ",")} %
                      </span>
                      <span className="ml-auto flex items-center gap-1.5">
                        {members.map((k) => (
                          <KeenAvatar key={k.id} keen={k} size={26} />
                        ))}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </section>

      {/* ── the two pacings ───────────────────────────────────────────────── */}
      <section>
        <SectionHead
          icon={<Play className="h-4 w-4" />}
          title="Kahoot eller Blooket?"
          blurb="De två sätten att spela samma quiz. Vänster: en klocka för alla, som en Kahoot-runda. Höger: var och en i sin egen takt, som ett Blooket-race. Båda demonstreras med låtsasspelare."
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <KahootDemo />
          <BlooketDemo />
        </div>
      </section>

      {/* ── the countdown ─────────────────────────────────────────────────── */}
      <section>
        <SectionHead
          icon={<Trophy className="h-4 w-4" />}
          title="Säsongsklockan"
          blurb="Samma nedräkning som står på startsidan och i butiken: paketet finns i november och försvinner när december börjar."
        />
        <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-orange-400/25 bg-orange-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-orange-200">
            🎃 Halloweenpaketet {inSeason ? "— bara i november" : "— utanför säsong just nu"}
          </p>
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                          {inSeason ? (
              <>
                Försvinner om
                <SeasonCountdown endsAt={endsAt} className="text-orange-200" />
              </>
            ) : (
              <span className="text-slate-400">Tillbaka i november nästa år.</span>
            )}
          </p>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Räknaren läser klockan i din webbläsare och kan inte flytta säsongen — den riktiga
          avstängningen görs av servern, så en gammal flik kan inte köpa paketet i december.
        </p>
      </section>

      {/* ── where the real thing is ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-slate-900/50 px-5 py-4">
        <p className="text-sm text-slate-300">
          Vill du göra det på riktigt? Butiken kräver ett konto — demon gör det inte.
        </p>
        <div className="flex gap-2 text-sm font-bold">
          <Link href="/keens/packs" className="rounded-xl border border-slate-700 px-3 py-2 text-slate-200 hover:border-slate-500">
            Riktiga butiken
          </Link>
          <Link href="/manual" className="rounded-xl border border-slate-700 px-3 py-2 text-slate-200 hover:border-slate-500">
            Spelmanualen
          </Link>
        </div>
      </div>

      {opening && (
        <PackOpener
          packId="halloween"
          pulls={opening}
          coins={DEMO_COINS}
          spent={(PACK?.price ?? 0) * opening.length}
          refunded={0}
          onClose={() => setOpening(null)}
          onAgain={(count) => setOpening(rollPulls(count))}
        />
      )}
    </div>
  );
}

function SectionHead({
  icon,
  title,
  blurb,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-300">
        {icon}
        {title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-400">{blurb}</p>
    </div>
  );
}

// ── Kahoot-style: one clock for the room ─────────────────────────────────────

const KAHOOT_Q = [
  { q: "Hur många sidor har en kub?", a: ["6", "4", "8", "12"], correct: 0 },
  { q: "Vad heter Sveriges huvudstad?", a: ["Göteborg", "Stockholm", "Malmö", "Uppsala"], correct: 1 },
  { q: "Vad är 7 × 8?", a: ["54", "56", "64", "48"], correct: 1 },
  { q: "Vilken planet är närmast solen?", a: ["Venus", "Mars", "Merkurius", "Jorden"], correct: 2 },
];

/** Seconds on the shared clock, the same 20 a hosted question gets. */
const QUESTION_SECONDS = 20;

const ANSWER_TINTS = ["bg-rose-500/20 border-rose-400/30", "bg-sky-500/20 border-sky-400/30", "bg-amber-500/20 border-amber-400/30", "bg-emerald-500/20 border-emerald-400/30"];

function KahootDemo() {
  const [round, setRound] = React.useState(0);
  // One decimal place: the tick burns 0.05 every 50 ms, so this is real seconds.
  const [left, setLeft] = React.useState(QUESTION_SECONDS);
  const [pick, setPick] = React.useState<number | null>(null);
  const [running, setRunning] = React.useState(true);

  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((v) => {
        if (v > 0.05) return v - 0.05;
        setRound((r) => (r + 1) % KAHOOT_Q.length);
        setPick(null);
        return QUESTION_SECONDS;
      });
    }, 50);
    return () => clearInterval(t);
  }, [running]);

  const question = KAHOOT_Q[round];
  const pct = Math.max(0, Math.min(100, (left / QUESTION_SECONDS) * 100));

  return (
    <div className="flex flex-col rounded-3xl border border-white/10 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold uppercase tracking-wider text-sky-300">Kahoot · värden styr</p>
        <div className="flex gap-1">
          <IconBtn onClick={() => setRunning((r) => !r)} label={running ? "Pausa" : "Spela"}>
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </IconBtn>
          <IconBtn
            onClick={() => {
              setRound(0);
              setLeft(QUESTION_SECONDS);
              setPick(null);
              setRunning(true);
            }}
            label="Börja om"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </div>

      <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Fråga {round + 1} av {KAHOOT_Q.length} · {Math.ceil(left)} s kvar
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn("h-full rounded-full transition-[width] duration-75", left < 3 ? "bg-rose-400" : "bg-sky-400")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-4 font-display text-base font-extrabold text-white">{question.q}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {question.a.map((answer, i) => {
          const chosen = pick === i;
          const isCorrect = i === question.correct;
          const revealed = pick !== null;
          return (
            <button
              key={answer}
              type="button"
              onClick={() => setPick(i)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-sm font-bold text-white transition-all",
                revealed
                  ? isCorrect
                    ? "border-emerald-400/60 bg-emerald-500/25"
                    : chosen
                      ? "border-rose-400/60 bg-rose-500/25"
                      : "border-white/10 bg-slate-950/40 opacity-60"
                  : cn(ANSWER_TINTS[i], "hover:brightness-125")
              )}
            >
              {answer}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-slate-500">
        Alla svarar på samma fråga och klockan går ut för hela rummet — sen går värden vidare. Tryck på
        ett svar: rätt blir grönt, fel blir rött. Inget skickas någonstans.
      </p>
    </div>
  );
}

// ── Blooket-style: everybody at their own pace ───────────────────────────────

const CHOICES = ["Chubby Pig", "Dragony", "Omeisaurus", "Pixelthorne"];
const BLOOKS = ["chubbypig", "dragony", "omeisaurus", "pixelthorne"];

function BlooketDemo() {
  const racers = React.useMemo(
    () =>
      BLOOKS.map((id, i) => ({
        keen: KEEN_BY_ID[id] as Keen | undefined,
        name: CHOICES[i],
        speed: 0.7 + Math.random() * 0.9,
      })),
    []
  );
  const [progress, setProgress] = React.useState<number[]>(() => racers.map(() => 0));
  const [running, setRunning] = React.useState(true);

  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setProgress((prev) => {
        const next = prev.map((v, i) =>
          Math.min(100, v + racers[i].speed * (0.4 + Math.random() * 1.1))
        );
        return next.every((v) => v >= 100) ? next.map(() => 0) : next;
      });
    }, 140);
    return () => clearInterval(t);
  }, [racers, running]);

  return (
    <div className="flex flex-col rounded-3xl border border-white/10 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
          Blooket · egen takt
        </p>
        <div className="flex gap-1">
          <IconBtn onClick={() => setRunning((r) => !r)} label={running ? "Pausa" : "Spela"}>
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </IconBtn>
          <IconBtn
            onClick={() => {
              setProgress(racers.map(() => 0));
              setRunning(true);
            }}
            label="Börja om"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {racers.map((racer, i) => (
          <div key={racer.name} className="flex items-center gap-3">
            {racer.keen ? (
              <KeenAvatar keen={racer.keen} size={34} />
            ) : (
              <span className="grid h-[34px] w-[34px] place-items-center rounded-xl bg-white/5 text-sm">🐷</span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-xs font-bold text-white">{racer.name}</p>
                <p className="shrink-0 text-[10px] font-bold text-slate-500">
                  fråga {Math.min(10, Math.floor(progress[i] / 10) + 1)} av 10
                </p>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-[width] duration-150"
                  style={{ width: `${progress[i]}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-slate-500">
        Ingen gemensam klocka: varje spelare svarar på sina egna frågor i sin egen takt och hamnar på
        tavlan när de är klara. Raden längst upp är den som ligger först just nu.
      </p>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-slate-950/60 text-slate-300 transition-colors hover:text-white"
    >
      {children}
    </button>
  );
}
