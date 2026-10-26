import Link from "next/link";
import {
  ArrowRight,
  Crown,
  Gamepad2,
  Layers,
  Play,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import KeenAvatar from "@/components/keens/keen-avatar";
import Reveal from "@/components/motion/reveal";
import Tilt from "@/components/motion/tilt";
import { ANSWER_TINTS } from "@/lib/answer-tints";
import { KEEN_BY_ID } from "@/lib/keens";

/**
 * The front page.
 *
 * Bright paper instead of the dark app shell, because this is the one page a
 * class sees before it has an account — and it should look like the game, not
 * like a product page. Every block is a sticker: soft cream, candy colours, a
 * thick white card and a hard little shadow underneath.
 *
 * The hero is the actual product rather than a drawing of it: a question with
 * the same four answer tints the projector and the phones use, a PIN chip, and
 * two Keens leaning out of the corners.
 */

const keenById = (id: string) => KEEN_BY_ID[id];

/** The three stealing modes, in the same order the host picks them. */
const MODES = [
  {
    name: "Vault Raiders",
    kicker: "Raid & försvara",
    text: "Answer right to fill your vault, then raid a classmate's — or buy a laser grid before someone raids yours.",
    mint: "100 Mint",
    keenId: "chubbypig",
    card: "from-amber-200 via-amber-100 to-orange-100",
    edge: "border-amber-300/70",
    chip: "bg-amber-400/90 text-amber-950",
  },
  {
    name: "Crypto Clash",
    kicker: "Hack & spåra",
    text: "Mine Crypto with correct answers, hack other wallets, and keep your trace low so nobody can identify you.",
    mint: "120 Mint",
    keenId: "invader",
    card: "from-sky-200 via-sky-100 to-cyan-100",
    edge: "border-sky-300/70",
    chip: "bg-sky-400/90 text-sky-950",
  },
  {
    name: "Pirate Heist",
    kicker: "Välj din risk",
    text: "Stealth, quick raid or full attack — each one costs more gold and can win you a bigger share of the treasure.",
    mint: "110 Mint",
    keenId: "dragony",
    card: "from-rose-200 via-rose-100 to-pink-100",
    edge: "border-rose-300/70",
    chip: "bg-rose-400/90 text-rose-950",
  },
];

const FEATURES = [
  {
    icon: Users,
    title: "Hela klassen live",
    text: "Sex siffror, en PIN, inga nedladdningar. Alla är med på tio sekunder — på mobil, platta eller projektor.",
    ring: "bg-violet-100 text-violet-700",
  },
  {
    icon: Gamepad2,
    title: "Lobby minigames",
    text: "Ingen tråkig väntan. Medan värden startar spelar lobbyn ett minispel ihop.",
    ring: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: Zap,
    title: "XP & mynt på allt",
    text: "Varje rätt svar ger XP och mynt. Nivåer, topplista och ett litet ljud i hjärtat när du slår din kompis.",
    ring: "bg-amber-100 text-amber-700",
  },
  {
    icon: Layers,
    title: "Gloskort & strider",
    text: "Bygg en kortlek av quizet och utmana någon i realtidsstrid — samma frågor, men nu med svärd.",
    ring: "bg-sky-100 text-sky-700",
  },
];

const STEPS = [
  { title: "Bygg quizet", text: "Dina egna frågor, eller ett gloskort som redan finns." },
  { title: "Dela PIN-koden", text: "Klassen skriver in den och dyker upp i lobbyn." },
  { title: "Kör matchen", text: "Frågor, minispel och en mode-final med Mint." },
];

export default function Home() {
  const heroKeen = keenById("chubbypig");
  const peekKeen = keenById("crewmate");
  const collection = ["invader", "crewmate", "chubbypig", "creeper", "pixelthorne"].map(keenById);

  return (
    <div className="relative overflow-hidden bg-[#FFF9F1] text-slate-900">
      {/* Candy fields behind the paper. Wide, soft, and never over the text. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -left-40 -top-52 h-[34rem] w-[34rem] rounded-full bg-rose-200/50 blur-[90px]" />
        <span className="absolute -right-48 -top-40 h-[36rem] w-[36rem] rounded-full bg-sky-200/60 blur-[100px]" />
        <span className="absolute -bottom-56 left-1/3 h-[32rem] w-[32rem] rounded-full bg-amber-200/50 blur-[95px]" />
        <span className="absolute inset-0 bg-[radial-gradient(#0f172a14_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(120%_70%_at_50%_0%,#000_10%,transparent_75%)]" />
      </div>

      <div className="relative">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:pb-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-600 shadow-[0_3px_0_rgba(15,23,42,0.06)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live quiz · för hela klassen
            </span>

            <h1 className="mt-5 font-display text-[2.7rem] font-extrabold leading-[1.02] tracking-tight text-slate-900 sm:text-6xl lg:text-[4.1rem]">
              Frågesport som
              <br />
              känns som{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span
                  aria-hidden
                  className="absolute inset-x-[-6%] bottom-[8%] h-[42%] -rotate-1 rounded-[999px] bg-amber-300"
                />
                <span className="relative">ett spel.</span>
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-slate-600">
              QuizKeen förvandlar klassrummet till en arena: starta en quiz med PIN, samla XP och mynt, bygg din
              Keen-samling — och slåss om förstaplatsen i <strong className="font-bold text-slate-900">Vault Raiders</strong>,{" "}
              <strong className="font-bold text-slate-900">Crypto Clash</strong> och{" "}
              <strong className="font-bold text-slate-900">Pirate Heist</strong>.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="group inline-flex h-14 items-center gap-2 rounded-2xl bg-slate-900 px-7 text-base font-extrabold text-white shadow-[0_7px_0_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_9px_0_rgba(15,23,42,0.22)]"
              >
                Skapa konto — gratis
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/play"
                className="inline-flex h-14 items-center gap-2 rounded-2xl border-2 border-slate-900/10 bg-white px-6 text-base font-extrabold text-slate-800 shadow-[0_5px_0_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-slate-900/20"
              >
                <Play className="h-5 w-5 text-violet-600" />
                Gå med i ett spel
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold text-slate-500">
              <span className="flex items-center gap-2">
                <span className="flex -space-x-2">
                  {collection.slice(0, 4).map((k) => (
                    <span
                      key={k.id}
                      className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-slate-50"
                    >
                      <KeenAvatar keen={k} size={24} />
                    </span>
                  ))}
                </span>
                10 Keens att samla
              </span>
              <span className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" />
                Mint varje match
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-violet-500" />
                Upp till 12 spelare
              </span>
            </div>
          </div>

          {/* The game, as it actually looks on the projector. */}
          <Reveal className="relative mx-auto w-full max-w-[30rem] lg:max-w-none">
            {/* A second card peeking out under the game. The wrapper owns the
                extra bottom-right space, so the offset card never hangs outside
                its parent's box. */}
            <div className="relative pb-5 pr-5">
              <div
                aria-hidden
                className="absolute inset-5 rotate-2 rounded-[30px] border-2 border-slate-900/10 bg-white/70"
              />
              <Tilt max={5} className="relative z-10 rounded-[30px]">
                <div className="rounded-[30px] border-2 border-slate-900/10 bg-white p-5 shadow-[0_26px_50px_-24px_rgba(15,23,42,0.4)] sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-violet-700">
                      Fråga 4 / 10
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold tracking-[0.18em] text-slate-400">
                        482 913
                      </span>
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white">PIN</span>
                    </span>
                  </div>

                  <p className="mt-4 font-display text-xl font-extrabold leading-snug text-slate-900 sm:text-2xl">
                    Vilket grundämne har den kemiska symbolen <span className="text-violet-600">Au</span>?
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {["Guld", "Silver", "Koppar", "Tenn"].map((option, i) => (
                      <div
                        key={option}
                        className={`flex items-center gap-2 rounded-2xl bg-gradient-to-br p-3 text-sm font-extrabold text-white ${ANSWER_TINTS[i]} ${
                          i === 0 ? "ring-4 ring-emerald-300/70" : ""
                        }`}
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/25 text-[11px] font-black">
                          {["A", "B", "C", "D"][i]}
                        </span>
                        {option}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3.5 py-2.5">
                    <span className="flex items-center gap-2 text-xs font-extrabold text-emerald-700">
                      <Zap className="h-4 w-4" />
                      Rätt svar · +100 XP
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[9px] font-black text-white">
                        LVL
                      </span>
                      12 spelare med
                    </span>
                  </div>
                </div>
              </Tilt>
            </div>

            {/* Two Keens leaning out of the card, because the characters are the brand. */}
            <span className="absolute -bottom-7 -left-5 hidden rotate-[-8deg] rounded-full border-4 border-white bg-rose-100 p-1.5 shadow-lg sm:block">
              <KeenAvatar keen={heroKeen} size={62} className="animate-keen-bob" />
            </span>
            <span className="absolute -right-4 -top-6 rotate-[9deg] rounded-full border-4 border-white bg-sky-100 p-1.5 shadow-lg">
              <KeenAvatar keen={peekKeen} size={48} />
            </span>
          </Reveal>
        </section>

        {/* ── Ticker ────────────────────────────────────────────────────── */}
        <div className="overflow-hidden py-2">
          <div className="-ml-[2%] w-[104%] -rotate-[1.4deg] border-y-2 border-slate-900/10 bg-slate-900 py-3">
            <div className="flex w-max animate-marquee items-center gap-8 pr-8 text-sm font-extrabold uppercase tracking-[0.2em] text-white/90">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex items-center gap-8" aria-hidden={copy === 1}>
                  {[
                    "Live quiz",
                    "Lobby minigames",
                    "Vault Raiders",
                    "Crypto Clash",
                    "Pirate Heist",
                    "XP & mynt",
                    "Keens",
                    "Mint",
                  ].map((word) => (
                    <span key={word} className="flex items-center gap-8">
                      {word}
                      <Sparkles className="h-4 w-4 text-amber-300" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Modes ─────────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white">
              <Swords className="h-3.5 w-3.5 text-amber-300" />
              Nya game modes
            </span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Tre sätt att bli rik på en quiz
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Varje mode har sin egen ekonomi, sina försvar och sin egen Mint-pott. Rätt svar bygger din hög — sen
              gäller det att behålla den.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.map((mode, i) => {
              const mascot = keenById(mode.keenId);
              return (
                <Reveal key={mode.name} delay={i * 80}>
                  <Tilt className="h-full" max={6}>
                    <div
                      className={`flex h-full flex-col rounded-[28px] border-2 bg-gradient-to-br p-5 shadow-[0_10px_0_-2px_rgba(15,23,42,0.08)] ${mode.card} ${mode.edge}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${mode.chip}`}
                          >
                            {mode.kicker}
                          </span>
                          <h3 className="mt-2.5 font-display text-2xl font-extrabold leading-none text-slate-900">
                            {mode.name}
                          </h3>
                        </div>
                        <span className="-mt-1 grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2 border-white bg-white/80 shadow-sm">
                          <KeenAvatar keen={mascot} size={52} />
                        </span>
                      </div>

                      <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-slate-700">{mode.text}</p>

                      <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          Förstaplats
                        </span>
                        <span className="flex items-center gap-1 text-sm font-extrabold text-slate-900">
                          <Crown className="h-4 w-4 text-amber-500" />
                          {mode.mint}
                        </span>
                      </div>
                    </div>
                  </Tilt>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
          <Reveal>
            <div className="grid gap-4 rounded-[32px] border-2 border-slate-900/10 bg-white p-6 shadow-[0_12px_0_-4px_rgba(15,23,42,0.07)] sm:grid-cols-3 sm:p-8">
              {STEPS.map((step, i) => (
                <div key={step.title} className="flex gap-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 font-display text-lg font-black text-white shadow-[0_4px_0_rgba(79,70,229,0.35)]">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-display text-base font-extrabold text-slate-900">{step.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Reveal key={feature.title} delay={i * 70}>
                  <div className="flex h-full gap-4 rounded-[26px] border-2 border-slate-900/10 bg-white p-5 shadow-[0_8px_0_-3px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-violet-300">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${feature.ring}`}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="font-display text-lg font-extrabold text-slate-900">{feature.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{feature.text}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ── Keens ─────────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-[32px] border-2 border-violet-200 bg-gradient-to-br from-violet-100 via-white to-sky-100 p-6 sm:p-10">
              <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                <div className="max-w-lg">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-violet-700 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5" />
                    Keens
                  </span>
                  <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    Samla sällsynta figurer
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-slate-600">
                    Svara rätt, tjäna mynt, öppna paket. Några Keens finns bara i en handfull exemplar — och två
                    delas bara ut av en admin eller ägaren själv.
                  </p>
                  <Link
                    href="/keens"
                    className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-violet-600 px-6 text-sm font-extrabold text-white shadow-[0_6px_0_rgba(109,40,217,0.35)] transition hover:-translate-y-0.5"
                  >
                    Till samlingen
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="grid w-full max-w-md grid-cols-5 gap-2">
                  {collection.map((k, i) => (
                    <div
                      key={k.id}
                      className={`grid place-items-center rounded-2xl border-2 border-white bg-white/80 p-1.5 shadow-md ${
                        i % 2 === 0 ? "-rotate-3" : "rotate-3"
                      }`}
                      style={{ animationDelay: `${i * 0.4}s` }}
                    >
                      <KeenAvatar keen={k} size={52} className="animate-float" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Last word ─────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-[32px] bg-slate-900 px-6 py-12 text-center sm:px-12">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <span className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-600/40 blur-[80px]" />
                <span className="absolute -bottom-28 -right-16 h-72 w-72 rounded-full bg-sky-500/30 blur-[80px]" />
              </div>
              <div className="relative">
                <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                  Nästa lektion behöver inte vara en genomgång.
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-300">
                  Skapa ett konto, bygg tio frågor och låt klassen slåss om förstaplatsen. Det tar en rast.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/register"
                    className="inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-7 text-base font-extrabold text-slate-900 shadow-[0_6px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5"
                  >
                    Börja spela
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-14 items-center gap-2 rounded-2xl border-2 border-white/15 px-6 text-base font-extrabold text-white transition hover:border-white/30 hover:bg-white/5"
                  >
                    Logga in
                  </Link>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <Trophy className="h-4 w-4 text-amber-300" />
                  Lär. Spela. Tävla.
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
