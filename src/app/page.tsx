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
import Spotlight from "@/components/motion/spotlight";
import { ANSWER_TINTS } from "@/lib/answer-tints";
import { KEEN_BY_ID, TOTAL_KEENS } from "@/lib/keens";
import { readBoard } from "@/lib/leaderboard";
import { levelFor } from "@/lib/levels";
import { Brain, Flame, TrendingUp, Trophy as TrophyIcon } from "lucide-react";

// The front page reads the live board, so it must not be baked at build time.
export const dynamic = "force-dynamic";

/**
 * The front page.
 *
 * Same night sky as the rest of the app — deep navy, indigo glow, glass cards —
 * but laid out like an arcade cabinet rather than a product pitch. The hero is
 * the actual game: a question, the PIN, the four answer tints the projector and
 * the phones share, and two Keens leaning out of the card.
 */

const keenById = (id: string) => KEEN_BY_ID[id];

/** The three stealing modes, in the same order the host picks them. */
const MODES = [
  {
    name: "Vault Raiders",
    kicker: "Raid & försvara",
    text: "Svara rätt och fyll ditt valv, öppna en kista varje runda — jackpot, stöld eller byte med ledaren — och köp ett lasergitter innan någon raid:ar dig.",
    mint: "100 Mint",
    keenId: "chubbypig",
    card: "from-amber-500/25 via-amber-500/[0.06] to-transparent",
    edge: "border-amber-400/30 hover:border-amber-300/60",
    glow: "shadow-[0_24px_60px_-30px_rgba(245,158,11,0.55)]",
    chip: "bg-amber-400/15 text-amber-200 ring-1 ring-inset ring-amber-400/30",
    halo: "bg-amber-400/20",
  },
  {
    name: "Crypto Clash",
    kicker: "Hack & spåra",
    text: "Mina Crypto med rätta svar, dubbla plånboken en gång per match, hacka andras wallets och håll din trace låg.",
    mint: "120 Mint",
    keenId: "invader",
    card: "from-sky-500/25 via-sky-500/[0.06] to-transparent",
    edge: "border-sky-400/30 hover:border-sky-300/60",
    glow: "shadow-[0_24px_60px_-30px_rgba(56,189,248,0.55)]",
    chip: "bg-sky-400/15 text-sky-200 ring-1 ring-inset ring-sky-400/30",
    halo: "bg-sky-400/20",
  },
  {
    name: "Pirate Heist",
    kicker: "Välj din risk",
    text: "Stealth, quick raid eller full attack — varje stil kostar mer guld och kan ge dig en större del av skatten.",
    mint: "110 Mint",
    keenId: "dragony",
    card: "from-rose-500/25 via-rose-500/[0.06] to-transparent",
    edge: "border-rose-400/30 hover:border-rose-300/60",
    glow: "shadow-[0_24px_60px_-30px_rgba(244,63,94,0.5)]",
    chip: "bg-rose-400/15 text-rose-200 ring-1 ring-inset ring-rose-400/30",
    halo: "bg-rose-400/20",
  },
];

const FEATURES = [
  {
    icon: Users,
    title: "Hela klassen live",
    text: "Sex siffror, en PIN, inga nedladdningar. Alla är med på tio sekunder — på mobil, platta eller projektor.",
    ring: "border-violet-400/30 bg-violet-500/15 text-violet-300",
  },
  {
    icon: Gamepad2,
    title: "Lobby minigames",
    text: "Ingen tråkig väntan. Medan värden startar spelar lobbyn ett minispel ihop.",
    ring: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
  },
  {
    icon: Zap,
    title: "XP & mynt på allt",
    text: "Varje rätt svar ger XP och mynt. Nivåer, topplista och ett litet ljud i hjärtat när du slår din kompis.",
    ring: "border-amber-400/30 bg-amber-500/15 text-amber-300",
  },
  {
    icon: Layers,
    title: "Gloskort & strider",
    text: "Bygg en kortlek av quizet och utmana någon i realtidsstrid — samma frågor, men nu med svärd.",
    ring: "border-sky-400/30 bg-sky-500/15 text-sky-300",
  },
];

const STEPS = [
  { title: "Bygg quizet", text: "Dina egna frågor, eller ett gloskort som redan finns." },
  { title: "Dela PIN-koden", text: "Klassen skriver in den och dyker upp i lobbyn." },
  { title: "Kör matchen", text: "Frågor, minispel och en mode-final med Mint." },
];

export default async function Home() {
  const heroKeen = keenById("chubbypig");
  const peekKeen = keenById("crewmate");
  const collection = ["invader", "crewmate", "chubbypig", "creeper", "pixelthorne"].map(keenById);

  // The board is printed on the front page, so a visitor sees a school that is
  // actually in use rather than a promise that it could be. It is one small
  // query, and the page is dynamic anyway.
  const board = await readBoard({ scope: "elever", limit: 5 }).catch(() => null);

  return (
    <div className="relative overflow-hidden text-white">
      {/* The same drifting colour the rest of the app sits on, plus a dot grid
          that fades before it reaches the text. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -left-40 -top-52 h-[34rem] w-[34rem] rounded-full bg-indigo-600/25 blur-[110px]" />
        <span className="absolute -right-48 -top-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/25 blur-[120px]" />
        <span className="absolute -bottom-56 left-1/3 h-[32rem] w-[32rem] rounded-full bg-sky-500/15 blur-[110px]" />
        <span className="absolute inset-0 bg-[radial-gradient(#94a3b81f_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(120%_70%_at_50%_0%,#000_10%,transparent_75%)]" />
      </div>

      <div className="relative">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:pb-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-300 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live quiz · för hela klassen
            </span>

            <h1 className="mt-5 font-display text-[2.7rem] font-extrabold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-[4rem]">
              Frågesport som
              <br />
              känns som{" "}
              <span className="text-gradient animate-gradient-pan bg-[length:200%_auto]">ett spel.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-slate-400">
              QuizKeen förvandlar klassrummet till en arena: starta en quiz med PIN, samla XP och mynt, bygg din
              Keen-samling — och slåss om förstaplatsen i{" "}
              <strong className="font-bold text-slate-200">Vault Raiders</strong>,{" "}
              <strong className="font-bold text-slate-200">Crypto Clash</strong> och{" "}
              <strong className="font-bold text-slate-200">Pirate Heist</strong>. Och när provet närmar sig finns{" "}
              <strong className="font-bold text-slate-200">Study</strong> — solo, i ditt eget tempo.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="group inline-flex h-14 items-center gap-2 rounded-2xl bg-gradient-to-b from-indigo-500 to-violet-600 px-7 text-base font-extrabold text-white shadow-[0_10px_30px_-12px_rgba(99,102,241,0.9)] ring-1 ring-inset ring-white/15 transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-12px_rgba(99,102,241,1)]"
              >
                Skapa konto — gratis
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/play"
                className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-6 text-base font-extrabold text-slate-200 backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-300/50 hover:bg-white/[0.08]"
              >
                <Play className="h-5 w-5 text-indigo-300" />
                Gå med i ett spel
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold text-slate-400">
              <span className="flex items-center gap-2">
                <span className="flex -space-x-2">
                  {collection.slice(0, 4).map((k) => (
                    <span
                      key={k.id}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-slate-900"
                    >
                      <KeenAvatar keen={k} size={24} />
                    </span>
                  ))}
                </span>
                {TOTAL_KEENS} Keens att samla
              </span>
              <span className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-300" />
                Mint varje match
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-violet-300" />
                Upp till 12 spelare
              </span>
            </div>
          </div>

          {/* The game, as it actually looks on the projector. */}
          <Reveal className="relative mx-auto w-full max-w-[30rem] lg:max-w-none">
            <div className="relative pb-5 pr-5">
              <div
                aria-hidden
                className="absolute inset-5 rotate-2 rounded-[30px] border border-white/10 bg-white/[0.05]"
              />
              <Tilt max={5} className="relative z-10 rounded-[30px]">
                <div className="rounded-[30px] border border-white/12 bg-slate-900/70 p-5 shadow-[0_34px_70px_-30px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-indigo-200 ring-1 ring-inset ring-indigo-400/30">
                      Fråga 4 / 10
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold tracking-[0.18em] text-slate-500" data-no-translate>
                        482 913
                      </span>
                      <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-[11px] font-bold text-indigo-200 ring-1 ring-inset ring-indigo-400/30">
                        PIN
                      </span>
                    </span>
                  </div>

                  <p className="mt-4 font-display text-xl font-extrabold leading-snug text-white sm:text-2xl">
                    Vilket grundämne har den kemiska symbolen <span className="text-indigo-300">Au</span>?
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {["Guld", "Silver", "Koppar", "Tenn"].map((option, i) => (
                      <div
                        key={option}
                        className={`flex items-center gap-2 rounded-2xl bg-gradient-to-br p-3 text-sm font-extrabold text-white ${ANSWER_TINTS[i]} ${
                          i === 0 ? "ring-2 ring-emerald-300/80" : "ring-1 ring-inset ring-white/15"
                        }`}
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-black/25 text-[11px] font-black">
                          {["A", "B", "C", "D"][i]}
                        </span>
                        {option}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-2.5">
                    <span className="flex items-center gap-2 text-xs font-extrabold text-emerald-300">
                      <Zap className="h-4 w-4" />
                      Rätt svar · +100 XP
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[9px] font-black text-white">
                        LVL
                      </span>
                      12 spelare med
                    </span>
                  </div>
                </div>
              </Tilt>
            </div>

            {/* Two Keens leaning out of the card, because the characters are the brand. */}
            <span className="absolute -bottom-7 -left-5 hidden rotate-[-8deg] rounded-full border border-white/15 bg-slate-900 p-1.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)] sm:block">
              <KeenAvatar keen={heroKeen} size={62} className="animate-keen-bob" />
            </span>
            <span className="absolute -right-4 -top-6 rotate-[9deg] rounded-full border border-white/15 bg-slate-900 p-1.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]">
              <KeenAvatar keen={peekKeen} size={48} />
            </span>
          </Reveal>
        </section>

        {/* ── Ticker ────────────────────────────────────────────────────── */}
        <div className="overflow-hidden py-2">
          <div className="-ml-[2%] w-[104%] -rotate-[1.4deg] border-y border-white/10 bg-white/[0.04] py-3 backdrop-blur">
            <div className="flex w-max animate-marquee items-center gap-8 pr-8 text-sm font-extrabold uppercase tracking-[0.2em] text-slate-300">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex items-center gap-8" aria-hidden={copy === 1}>
                  {[
                    "Live quiz",
                    "Lobby minigames",
                    "Vault Raiders",
                    "Crypto Clash",
                    "Pirate Heist",
                    "Study",
                    "XP & mynt",
                    "Keens",
                    "Mint",
                  ].map((word) => (
                    <span key={word} className="flex items-center gap-8">
                      {word}
                      <Sparkles className="h-4 w-4 text-indigo-300" />
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
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-indigo-200">
              <Swords className="h-3.5 w-3.5" />
              Nya game modes
            </span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Tre sätt att bli rik på en quiz
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-400">
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
                      className={`flex h-full flex-col rounded-[26px] border bg-gradient-to-br p-5 backdrop-blur-xl transition-colors ${mode.card} ${mode.edge} ${mode.glow}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${mode.chip}`}
                          >
                            {mode.kicker}
                          </span>
                          <h3 className="mt-2.5 font-display text-2xl font-extrabold leading-none text-white">
                            {mode.name}
                          </h3>
                        </div>
                        <span
                          className={`-mt-1 grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/15 ${mode.halo}`}
                        >
                          <KeenAvatar keen={mascot} size={52} />
                        </span>
                      </div>

                      <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-slate-300">{mode.text}</p>

                      <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          Förstaplats
                        </span>
                        <span className="flex items-center gap-1 text-sm font-extrabold text-white">
                          <Crown className="h-4 w-4 text-amber-300" />
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
            <div className="grid gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:grid-cols-3 sm:p-8">
              {STEPS.map((step, i) => (
                <div key={step.title} className="flex gap-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 font-display text-lg font-black text-white shadow-[0_6px_18px_-6px_rgba(99,102,241,0.9)] ring-1 ring-inset ring-white/20">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-display text-base font-extrabold text-white">{step.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{step.text}</p>
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
                  <div className="flex h-full gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-white/[0.06]">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${feature.ring}`}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="font-display text-lg font-extrabold text-white">{feature.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">{feature.text}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ── Lära på riktigt ───────────────────────────────────────────── */}
        <section data-accent="emerald" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">
                <Brain className="h-3.5 w-3.5" /> Lär på riktigt
              </span>
              <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Spelet är roligt. <span className="text-shine">Glömskan är fienden.</span>
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-400">
                QuizKeen är byggt för att du ska komma ihåg på provet också: repetition i rätt intervall, uppdrag som får
                dig tillbaka varje dag, och siffror som visar om det går åt rätt håll.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {[
                {
                  icon: Brain,
                  title: "Repetition som minns",
                  text: "Ett gloskort du kan kommer tillbaka om 1, 3, 7 eller 16 dagar. Ett du missar dyker upp igen i samma pass — istället för att försvinna.",
                  tone: "border-sky-400/30 bg-sky-500/15 text-sky-300",
                },
                {
                  icon: Flame,
                  title: "Dagens uppdrag",
                  text: "Tre små mål om dagen, samma för hela skolan. Klara dem och XP:n trillar in — det är den vanan som gör skillnad.",
                  tone: "border-amber-400/30 bg-amber-500/15 text-amber-300",
                },
                {
                  icon: TrendingUp,
                  title: "Framsteg du ser",
                  text: "Träffsäkerhet per klass, svit i dagar och nästa nivå — siffror som kommer från dina egna matcher och läxor, inte från ett klick.",
                  tone: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
                },
              ].map((card, i) => (
                <Reveal key={card.title} delay={i * 70}>
                  <Spotlight className="surface card-hover h-full p-5">
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl border ${card.tone}`}>
                      <card.icon className="h-6 w-6" />
                    </span>
                    <p className="mt-4 font-display text-lg font-extrabold text-white">{card.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-400">{card.text}</p>
                  </Spotlight>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── Ledartavlan, live ───────────────────────────────────────────── */}
        {board && board.rows.length > 0 && (
          <section data-accent="amber" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
            <Reveal>
              <div className="surface p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="eyebrow">
                      <TrophyIcon className="h-3.5 w-3.5" /> Live just nu
                    </span>
                    <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                      Toppen av skolan
                    </h2>
                    <p className="mt-1 text-sm text-slate-400" data-no-translate>
                      {board.stats.players} spelare · {board.stats.xp.toLocaleString("sv-SE")} XP utdelat
                    </p>
                  </div>
                  <Link
                    href="/leaderboard"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white hover:border-white/25"
                  >
                    Hela tavlan <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <ol className="stagger-list mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {board.rows.map((row) => (
                    <li key={row.username} className="surface-flat flex items-center gap-3 p-3">
                      <span
                        className={`medal h-10 w-10 shrink-0 overflow-hidden bg-gradient-to-br text-sm ${
                          row.rank === 1
                            ? "from-amber-300 to-amber-500 text-slate-950"
                            : row.rank === 2
                              ? "from-slate-200 to-slate-400 text-slate-950"
                              : row.rank === 3
                                ? "from-orange-300 to-orange-600 text-slate-950"
                                : "from-white/10 to-white/5 text-slate-300"
                        }`}
                      >
                        <span className="relative z-10">{row.rank}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-white">{row.username}</span>
                        <span className="block text-xs text-slate-400 tabular" data-no-translate>
                          Lv {levelFor(row.xp)} · {row.xp.toLocaleString("sv-SE")} XP
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </section>
        )}

        {/* ── Keens ─────────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-[28px] border border-violet-400/25 bg-gradient-to-br from-violet-600/20 via-indigo-600/10 to-sky-500/10 p-6 backdrop-blur-xl sm:p-10">
              <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                <div className="max-w-lg">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-violet-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    Keens
                  </span>
                  <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    Samla sällsynta figurer
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-slate-300">
                    Svara rätt, tjäna mynt, öppna paket. Några Keens finns bara i en handfull exemplar — och två
                    delas bara ut av en admin eller ägaren själv.
                  </p>
                  <Link
                    href="/keens"
                    className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-b from-indigo-500 to-violet-600 px-6 text-sm font-extrabold text-white shadow-[0_10px_26px_-12px_rgba(99,102,241,0.9)] ring-1 ring-inset ring-white/15 transition hover:-translate-y-0.5"
                  >
                    Till samlingen
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="grid w-full max-w-md grid-cols-5 gap-2">
                  {collection.map((k, i) => (
                    <div
                      key={k.id}
                      className={`grid place-items-center rounded-2xl border border-white/10 bg-slate-950/50 p-1.5 ${
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
            <div className="relative overflow-hidden rounded-[28px] border border-indigo-400/25 bg-gradient-to-br from-indigo-600/30 via-slate-900/60 to-violet-700/25 px-6 py-12 text-center backdrop-blur-xl sm:px-12">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <span className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/40 blur-[80px]" />
                <span className="absolute -bottom-28 -right-16 h-72 w-72 rounded-full bg-violet-500/30 blur-[80px]" />
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
                    className="inline-flex h-14 items-center gap-2 rounded-2xl bg-gradient-to-b from-indigo-500 to-violet-600 px-7 text-base font-extrabold text-white shadow-[0_12px_30px_-12px_rgba(99,102,241,0.95)] ring-1 ring-inset ring-white/20 transition hover:-translate-y-0.5"
                  >
                    Börja spela
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/15 px-6 text-base font-extrabold text-white transition hover:border-white/30 hover:bg-white/5"
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
