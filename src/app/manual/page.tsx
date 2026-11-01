"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { translateText, useLang } from "@/lib/i18n";
import {
  CHEST_FALLBACK_REWARD,
  CHEST_RAID_CAP,
  CHEST_RAID_PCT,
  CHEST_SAFE_REWARD,
  CHEST_WILD_CHANCE,
  CHEST_WILD_LOSS,
  CHEST_WILD_WIN,
  EXPOSED_HACK,
  EXPOSED_TARGET_MULTIPLIER,
  INSIDER_HACK,
  MODE_IDENTITY,
  MODE_RULES,
  PROTECTION_MS,
  RAID_EXPOSURE_FEE,
  TRACE_DECAY,
  classicStreakBonus,
  heistStreakBonus,
  type ChestOffer,
  type Defense,
  type HeistMode,
  type Power,
  type RaidStyle,
} from "@/lib/game-modes";
import {
  ArrowRight,
  BookOpen,
  Coins,
  Crosshair,
  Flame,
  Gift,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";

/**
 * The manual.
 *
 * Every number on this page comes from `game-modes.ts` — the same file the
 * host, the player screen and the chest overlay use. A manual that is written
 * by hand drifts from the game within a week; this one cannot, because the
 * odds, prices and Mint steps are read out of the rules themselves.
 *
 * The page renders in both languages directly instead of going through the DOM
 * translator: an article is too long to swap word by word, and the root node
 * opts out with `data-qk-i18n` so the patcher leaves it alone.
 */

function RuleTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="border-b border-white/10 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={
                    j === 0
                      ? "px-3 py-2.5 align-top font-bold text-slate-200"
                      : "px-3 py-2.5 align-top text-slate-400"
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="block font-display text-lg font-extrabold leading-tight text-white">{value}</span>
      <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
    </div>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-relaxed text-slate-400">
      <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-300" />
      <span>{children}</span>
    </li>
  );
}

function ModeSection({
  id,
  icon: Icon,
  tone,
  title,
  kicker,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="surface scroll-mt-24 p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">{kicker}</p>
          <h2 className="font-display text-2xl font-extrabold text-white">{title}</h2>
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

const DEFENSE_NOTE: Record<HeistMode, string> = {
  vault: "Försvar köps i butiken under matchen och gäller direkt.",
  crypto: "Ett försvar gäller direkt och förbrukas när det används.",
  pirate: "Försvar betalas i piratguld och gäller direkt.",
};

export default function ManualPage() {
  const lang = useLang();
  const L = (sv: string, en: string) => (lang === "sv" ? sv : en);
  const tr = (text: string) => translateText(text, lang);

  const vault = MODE_RULES.vault;
  const crypto = MODE_RULES.crypto;
  const pirate = MODE_RULES.pirate;
  const vaultChests = vault.chests ?? [];
  const pirateStyles = pirate.styles ?? [];
  const doorPct = vault.defenses.find((d) => d.id === "door")?.value ?? 40;
  const cryptoExposed = crypto.trace?.exposed ?? 65;

  /** The expected gold a raid pays against a purse, after its ante. */
  const styleAverage = (style: RaidStyle, purse: number) =>
    Math.round(style.chance * Math.min(style.cap, Math.floor((purse * style.pct) / 100)) - style.cost);

  /** What a chest actually does, with its numbers, rather than its flavour text. */
  function chestEffect(offer: ChestOffer): string {
    if (offer.id === "safe") return `+${CHEST_SAFE_REWARD} ${L("mynt, garanterat", "coins, guaranteed")}`;
    if (offer.id === "raid") {
      return `${CHEST_RAID_PCT} % ${L(
        "av den rikaste rivalens oskyddade valv",
        "of the richest rival's unprotected vault"
      )}, ${L("högst", "max")} ${CHEST_RAID_CAP}`;
    }
    return L(
      `${Math.round(CHEST_WILD_CHANCE * 100)} % chans till +${CHEST_WILD_WIN}, annars −${CHEST_WILD_LOSS}`,
      `${Math.round(CHEST_WILD_CHANCE * 100)}% chance of +${CHEST_WILD_WIN}, otherwise −${CHEST_WILD_LOSS}`
    );
  }

  /** The odds label on a chest, said in the reader's language. */
  function chestOdds(offer: ChestOffer): string {
    if (offer.id === "safe") return L(`Alltid +${CHEST_SAFE_REWARD}`, `Always +${CHEST_SAFE_REWARD}`);
    if (offer.id === "raid") return L("Mot ledaren", "Against the leader");
    return L(`${Math.round(CHEST_WILD_CHANCE * 100)} / ${Math.round((1 - CHEST_WILD_CHANCE) * 100)}`, "50 / 50");
  }

  function defenseRows(defenses: Defense[], currency: string): ReactNode[][] {
    return defenses.map((d) => [tr(d.name), `${d.cost} ${currency}`, tr(d.blurb)]);
  }

  /** What a power-up does, said once per effect rather than once per button. */
  function powerEffect(power: Power): string {
    return power.effect === "untrace"
      ? L(
          "Nollställer ditt spår direkt. En gång per match.",
          "Wipes your trace to zero instantly. Once per match."
        )
      : L(
          `Nästa hack kostar ${INSIDER_HACK.tools} verktyg och tar ${INSIDER_HACK.pct} % (max ${INSIDER_HACK.cap}), även om du är avslöjad. En gång per match.`,
          `Your next hack costs ${INSIDER_HACK.tools} tool and takes ${INSIDER_HACK.pct}% (max ${INSIDER_HACK.cap}), even while exposed. Once per match.`
        );
  }

  const mintRows = [
    ["Vault Raiders", vault.mint, L("mynt", "coins")],
    ["Crypto Clash", crypto.mint, "crypto"],
    ["Pirate Heist", pirate.mint, L("guld", "gold")],
  ] as const;

  const anchors = [
    { id: "klassisk", label: L("Klassisk quiz", "Classic quiz") },
    { id: "vilket", label: L("Vilket läge?", "Which mode?") },
    { id: "vault", label: "Vault Raiders" },
    { id: "crypto", label: "Crypto Clash" },
    { id: "pirate", label: "Pirate Heist" },
    { id: "mint", label: "Mint" },
    { id: "ordlista", label: L("Ordlista", "Glossary") },
    { id: "fragor", label: L("Frågor", "FAQ") },
  ];

  return (
    <div data-qk-i18n className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        accent="amber"
        eyebrow={L("Spelmanual · 4 lägen", "Game manual · 4 modes")}
        icon={ScrollText}
        title={
          <>
            {L("Alla regler,", "Every rule,")}{" "}
            <span className="text-shine">{L("utan gissningar", "no guessing")}</span>
          </>
        }
        lead={L(
          "Fyra sätt att spela, exakta kistodds, alla försvar och hela Mint-trappan. Sidan läser samma regelfil som spelet, så siffrorna kan inte glida isär.",
          "Four ways to play, exact chest odds, every defense and the whole Mint ladder. This page reads the same rules file as the game, so the numbers cannot drift."
        )}
        chips={
          <>
            <Badge tone="amber" icon={ScrollText}>
              {L("Uppdaterad från koden", "Generated from the rules")}
            </Badge>
            <Badge tone="emerald" icon={Shield}>
              {PROTECTION_MS / 1000} s {L("skydd", "protection")}
            </Badge>
            <Badge tone="sky" icon={Swords}>
              {L("En åtgärd per rån", "One action per raid")}
            </Badge>
          </>
        }
        actions={
          <>
            <Link
              href="/play"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-2.5 text-sm font-extrabold text-amber-950 shadow-md ring-1 ring-inset ring-white/20 transition-transform hover:-translate-y-0.5"
            >
              {L("Gå med i spel", "Join a game")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:border-white/25"
            >
              {L("Hjälp & guide", "Help & guide")}
            </Link>
          </>
        }
      />

      <nav className="mt-5 flex flex-wrap gap-2" aria-label={L("Innehåll", "Contents")}>
        {anchors.map((anchor) => (
          <a
            key={anchor.id}
            href={`#${anchor.id}`}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:border-amber-400/40 hover:text-amber-100"
          >
            {anchor.label}
          </a>
        ))}
      </nav>

      {/* ── The loop ──────────────────────────────────────────────────────── */}
      <section className="surface mt-6 p-5 sm:p-6">
        <h2 className="section-title flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-amber-300" />
          {L("Så spelas en match", "How a match is played")}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              n: "1",
              title: L("Värden väljer läge", "The host picks a mode"),
              body: L(
                "Klassisk quiz eller en av tre ekonomier. Alla spelare börjar på samma saldo.",
                "Classic quiz or one of three economies. Every player starts on the same balance."
              ),
            },
            {
              n: "2",
              title: L("Svara rätt", "Answer correctly"),
              body: L(
                "Rätt svar ger poäng, matchvaluta, en åtgärd (energi, verktyg eller besättning) och ett steg på streakstegen.",
                "A correct answer pays points, match currency, one action point (energy, tools or crew) and one step on the streak ladder."
              ),
            },
            {
              n: "3",
              title: L("Spendera mellan frågorna", "Spend between questions"),
              body: L(
                "Rån, hack och köp får du göra medan frågan rullar. Kistan och sidohacket öppnas när frågan är avgjord.",
                "Raids, hacks and purchases are allowed while the question runs. The chest and the side hack open once it is settled."
              ),
            },
            {
              n: "4",
              title: L("Mint vid slutet", "Mint at the end"),
              body: L(
                "Placering plus en bonus per ny rival du rånat. Matchvalutan stannar i matchen.",
                "Placement plus a bonus for each new rival you raided. Match currency stays in the match."
              ),
            },
          ].map((step) => (
            <div key={step.n} className="surface-flat p-4">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-500/15 font-display text-xs font-extrabold text-amber-200">
                {step.n}
              </span>
              <p className="mt-2 font-display text-sm font-extrabold text-white">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mode cards ────────────────────────────────────────────────────── */}
      <div className="stagger-list mt-4 grid gap-3 sm:grid-cols-2">
        {[
          {
            id: "classic",
            name: L("Klassisk quiz", "Classic quiz"),
            icon: Flame,
            tone: "border-indigo-400/30 bg-indigo-500/10 text-indigo-300",
            body: L(
              "Alla får samma frågor. 100 poäng per rätt svar, upp till 50 för fart och 75 i streakbonus. Ingen ekonomi — snabbast och mest rätt vinner.",
              "Everyone gets the same questions. 100 points per correct answer, up to 50 for speed and 75 in streak bonus. No economy — fastest and most correct wins."
            ),
          },
          {
            id: "vault",
            name: vault.name,
            icon: Coins,
            tone: "border-amber-400/30 bg-amber-500/10 text-amber-300",
            body: L(
              "Fyll valvet med mynt. Varje fråga väljer du mellan tre kistor med olika risk; försvaren gör ditt valv dyrt att råna.",
              "Fill the vault with coins. Each question you choose between three chests with different risk; defenses make your vault expensive to raid."
            ),
          },
          {
            id: "crypto",
            name: crypto.name,
            icon: Zap,
            tone: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
            body: L(
              `Hacka rivaler, men lämna spår. Vid ${cryptoExposed} blir du avslöjad: hacket tar ${EXPOSED_HACK.pct} % i stället för ${crypto.raidPct} %, men alla ser ditt saldo och tar ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)} % mer av dig.`,
              `Hack rivals, but leave a trace. At ${cryptoExposed} you are exposed: the hack takes ${EXPOSED_HACK.pct}% instead of ${crypto.raidPct}%, but everyone sees your balance and takes ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)}% more from you.`
            ),
          },
          {
            id: "pirate",
            name: pirate.name,
            icon: Swords,
            tone: "border-rose-400/30 bg-rose-500/10 text-rose-300",
            body: L(
              "Varje rån kostar besättning och en liten guldavgift, och kan misslyckas. Du väljer tärning: ju djärvare, desto större förväntat byte.",
              "Every raid costs crew and a small gold ante, and can fail. You pick the dice: bolder pays more on average."
            ),
          },
        ].map((card) => (
          <a
            key={card.id}
            href={`#${card.id}`}
            className="surface card-hover flex items-start gap-3 p-4"
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${card.tone}`}>
              <card.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-base font-extrabold text-white">{card.name}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{card.body}</span>
            </span>
          </a>
        ))}
      </div>

      {/* ── Which mode ────────────────────────────────────────────────────── */}
      <section id="vilket" className="surface mt-4 scroll-mt-24 p-5 sm:p-6">
        <h2 className="section-title flex items-center gap-2">
          <Swords className="h-5 w-5 text-amber-300" />
          {L("Vilket läge ska du välja?", "Which mode should you pick?")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {L(
            "Alla tre ekonomierna följer samma rytm: svara rätt, tjäna valuta, betala en åtgärd för att råna. Det som skiljer dem är vad rånet kostar dig och vad som kan gå fel. Tabellen är hela skillnaden.",
            "All three economies follow the same rhythm: answer correctly, earn currency, pay one action to raid. What separates them is what the raid costs you and what can go wrong. The table is the whole difference."
          )}
        </p>
        <RuleTable
          head={[
            L("Läge", "Mode"),
            L("Start", "Start"),
            L("Per rätt svar", "Per correct answer"),
            L("Ett rån kostar", "A raid costs"),
            L("Det unika", "The twist"),
            L("Ett misstag kostar", "A mistake costs"),
          ]}
          rows={[
            [
              L("Klassisk quiz", "Classic quiz"),
              "0",
              L("100 p + fart", "100 p + speed"),
              L("inget — ingen ekonomi", "nothing — no economy"),
              L("Streakbonus i poäng", "Streak bonus in points"),
              L("bara poäng", "points only"),
            ],
            ...(["vault", "crypto", "pirate"] as const).map((id) => {
              const rules = MODE_RULES[id];
              const identity = MODE_IDENTITY[id];
              return [
                <span key={id} className="font-bold text-white">
                  {rules.name}
                </span>,
                rules.startBalance.toLocaleString("sv-SE"),
                identity.earns[lang],
                identity.spends[lang],
                identity.twist[lang],
                identity.risk[lang],
              ];
            }),
          ]}
        />
        <ul className="space-y-1.5 pt-3">
          <Tip>{L("Vill du ha mest dramatik i klassrummet: Vault Raiders — en kista kan avgöra ett jämnt lopp, men aldrig bära matchen själv.", "Want the most classroom drama: Vault Raiders — a chest can settle a close game, but never carry the match on its own.")}</Tip>
          <Tip>{L("Vill du att eleverna ska läsa varandra: Crypto Clash — spåret och de avrundade saldona straffar den som gapar efter mest.", "Want students to read each other: Crypto Clash — trace and the rounded balances punish whoever grabs for the most.")}</Tip>
          <Tip>{L("Vill du ha comeback och gissningar: Pirate Heist — dyrare rån tar mer, men kan misslyckas helt.", "Want comebacks and gambles: Pirate Heist — dearer raids take more, but can fail outright.")}</Tip>
          <Tip>{L("Vill du bara ha quizet: Klassisk quiz — snabbast och mest rätt vinner, utan ekonomi.", "Just want the quiz: Classic quiz — fastest and most correct wins, no economy.")}</Tip>
        </ul>
      </section>

      <div className="mt-4 space-y-4">
        {/* ── Classic ─────────────────────────────────────────────────────── */}
        <ModeSection
          id="klassisk"
          icon={Flame}
          tone="border-indigo-400/30 bg-indigo-500/10 text-indigo-300"
          title={L("Klassisk quiz", "Classic quiz")}
          kicker={L("Poäng, fart och streak", "Points, speed and streaks")}
        >
          <p className="text-sm leading-relaxed text-slate-400">
            {L(
              "Ingen matchvaluta och inga kistor. Här är poängen allt, och de räknas ut av värden när frågan stängs.",
              "No match currency and no chests. Points are everything here, and the host calculates them when the question closes."
            )}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label={L("Rätt svar", "Correct answer")} value="100 p" />
            <Stat label={L("Fartbonus", "Speed bonus")} value={L("upp till +50", "up to +50")} />
            <Stat label={L("Streak", "Streak")} value={L("max +75", "max +75")} />
            <Stat label={L("XP", "XP")} value={L("dina poäng", "your points")} />
          </div>
          <RuleTable
            head={[L("Moment", "Moment"), L("Vad det ger", "What it pays")]}
            rows={[
              [L("Rätt svar", "Correct answer"), "100"],
              [L("Snabbhet", "Speed"), L("Fartbonus: 1 poäng per 0,4 s, högst +50", "Speed bonus: 1 point per 0.4 s, max +50")],
              [L("Streak", "Streak"), L("+15 per rätt i rad efter den första, högst +75", "+15 per correct answer in a row after the first, max +75")],
              [L("Mint", "Mint"), L("50 / 30 / 20 mynt, övriga 10", "50 / 30 / 20 coins, others 10")],
            ]}
          />
          <RuleTable
            head={[L("Rätt i rad", "Correct in a row"), L("Streakbonus", "Streak bonus")]}
            rows={[2, 3, 4, 5, 6].map((streak) => [
              L(`${streak} svar`, `${streak} answers`),
              `+${classicStreakBonus(streak)} p`,
            ])}
          />
          <p className="text-xs text-slate-500">
            {L(
              "Streakbonusen börjar på andra rätt i rad och slutar växa vid sex. Ett fel eller en utebliven fråga nollställer den.",
              "The streak bonus starts on the second correct answer in a row and stops growing at six. A wrong or missing answer resets it."
            )}
          </p>
        </ModeSection>

        {/* ── Vault Raiders ───────────────────────────────────────────────── */}
        <ModeSection
          id="vault"
          icon={Coins}
          tone="border-amber-400/30 bg-amber-500/10 text-amber-300"
          title={vault.name}
          kicker={tr(vault.tagline)}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label={L("Start", "Start")} value={vault.startBalance.toLocaleString("sv-SE")} />
            <Stat label={L("Rätt svar", "Correct answer")} value={`+${vault.correctBalance}`} />
            <Stat label={L("Streak", "Streak")} value={`+${heistStreakBonus(2)}–${heistStreakBonus(9)}`} />
            <Stat label={L("Energi", "Energy")} value={`${vault.startEnergy} / ${vault.maxEnergy}`} />
            <Stat label={L("Rån", "Raid")} value={`${vault.raidCost} ${L("energi", "energy")}`} />
            <Stat label={L("Skydd", "Protection")} value={`${PROTECTION_MS / 1000} s`} />
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            {L(
              `Rätt svar ger +${vault.correctBalance} mynt, +1 raid-energi och ett steg på streakstegen. Varje ny fråga fyller också på 1 energi, så ingen blir utelåst. Ett rån kostar ${vault.raidCost} energi och tar ${vault.raidPct} % av rivalens oskyddade valv, högst ${vault.raidCap}.`,
              `A correct answer pays +${vault.correctBalance} coins, +1 raid energy and one step on the streak ladder. Each new question also adds 1 energy so nobody is locked out. A raid costs ${vault.raidCost} energy and takes ${vault.raidPct}% of the rival's unprotected vault, up to ${vault.raidCap}.`
            )}
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            {L(
              `Energin kapas vid ${vault.maxEnergy}, så du kan spara högst två rån. Svara rätt och råna en gång per fråga är den jämna takten; hoppar du över ett rån har du två nästa gång.`,
              `Energy caps at ${vault.maxEnergy}, so you can bank at most two raids. Answer correctly and raid once per question is the steady rhythm; skip a raid and you have two next time.`
            )}
          </p>

          <h3 className="flex items-center gap-2 pt-1 font-display text-base font-extrabold text-white">
            <Gift className="h-4 w-4 text-amber-300" />
            {L("Kistorna", "The chests")}
          </h3>
          <p className="text-xs leading-relaxed text-slate-500">
            {L(
              "En kista per fråga, och de tre är olika vad — inte samma lotteri tre gånger. Den säkra betalar alltid, rånkistan tar från ledaren och den vågade kan kosta dig. Hela rummet ser vad du fick.",
              "One chest per question, and the three are different bets — not the same lottery three times. The safe one always pays, the raid one takes from the leader, and the wild one can cost you. The whole room sees the pull."
            )}
          </p>
          <RuleTable
            head={[L("Kista", "Chest"), L("Vad", "What"), L("Effekt", "Effect")]}
            rows={vaultChests.map((offer) => [tr(offer.name), chestOdds(offer), chestEffect(offer)])}
          />
          <p className="text-xs text-slate-500">
            {L(
              `Rånkistan tar från den som har mest oskyddat kvar — finns inget att ta betalar valvet ${CHEST_FALLBACK_REWARD} i stället. Den vågade kistan är den enda som kan minska ditt saldo.`,
              `The raid chest takes from whoever has the most unprotected coins left — if there is nothing to take, the vault pays ${CHEST_FALLBACK_REWARD} instead. The wild chest is the only one that can reduce your balance.`
            )}
          </p>

          <h3 className="flex items-center gap-2 pt-1 font-display text-base font-extrabold text-white">
            <Shield className="h-4 w-4 text-emerald-300" />
            {L("Försvar", "Defenses")}
          </h3>
          <p className="text-xs text-slate-500">{L(DEFENSE_NOTE.vault, "Defenses are bought in the shop during the match and apply immediately.")}</p>
          <RuleTable
            head={[L("Försvar", "Defense"), L("Pris", "Price"), L("Effekt", "Effect")]}
            rows={defenseRows(vault.defenses, L("mynt", "coins"))}
          />
          <div className="surface-flat p-3 text-xs leading-relaxed text-slate-400">
            <b className="text-slate-200">{L("Så räknas ett rån:", "How a raid resolves:")}</b>{" "}
            {L(
              `2 energi dras först. Stölden är ${vault.raidPct} % av det som inte är skyddat, högst ${vault.raidCap}. Ett lasergrid stoppar den helt, en ståldörr tar bort ${doorPct} % och ett skendvalv stoppar den, namnger tjuven och kostar tjuven ${RAID_EXPOSURE_FEE} mynt. Offret är skyddat i ${PROTECTION_MS / 1000} sekunder efteråt, även om rånet stoppades.`,
              `2 energy is spent first. The theft is ${vault.raidPct}% of what is unprotected, up to ${vault.raidCap}. A laser grid stops it completely, a steel door removes ${doorPct}%, and a decoy vault stops it, names the thief and costs them ${RAID_EXPOSURE_FEE} coins. The victim is protected for ${PROTECTION_MS / 1000} seconds afterwards, even if the raid was blocked.`
            )}
          </div>
          <ul className="space-y-1.5 pt-1">
            <Tip>{L(
            `Kistan är krydda, inte motorn: den säkra ger ${CHEST_SAFE_REWARD} och den vågade högst ${CHEST_WILD_WIN}, medan svaren bygger valvet — kistan avgör ett jämnt lopp, den räddar inte ett förlorat.`,
            `The chest is spice, not the engine: the safe one pays ${CHEST_SAFE_REWARD} and the wild one at most ${CHEST_WILD_WIN}, while answers build the vault — a chest settles a close game, it does not rescue a lost one.`
          )}</Tip>
            <Tip>{L("Ta rånkistan när ledaren har ett tjockt, oskyddat valv — annars är den säkra kistan oftast bättre.", "Take the raid chest when the leader has a fat, unprotected vault — otherwise the safe chest is usually better.")}</Tip>
            <Tip>{L("Håll 2 energi när frågan närmar sig slutet, så du kan råna direkt efteråt.", "Keep 2 energy as the question nears its end so you can raid right after it.")}</Tip>
            <Tip>{L("Försvar är försäkring, inte skatt: en ståldörr som sparar 40 % lönar sig när ditt valv är tjockt, inte när det är tomt.", "Defense is insurance, not tax: a door that saves 40% pays off when your vault is fat, not when it is empty.")}</Tip>
            <Tip>{L("Ett skendvalv betalar sig själv: det stoppar två rån och kostar tjuven pengar.", "A decoy vault pays for itself: it stops two raids and costs the thief money.")}</Tip>
          </ul>
        </ModeSection>

        {/* ── Crypto Clash ────────────────────────────────────────────────── */}
        <ModeSection
          id="crypto"
          icon={Zap}
          tone="border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
          title={crypto.name}
          kicker={tr(crypto.tagline)}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label={L("Start", "Start")} value={crypto.startBalance.toLocaleString("sv-SE")} />
            <Stat label={L("Rätt svar", "Correct answer")} value={`+${crypto.correctBalance}`} />
            <Stat label={L("Verktyg", "Tools")} value={`${crypto.startEnergy} / ${crypto.maxEnergy}`} />
            <Stat label={L("Hack", "Hack")} value={`${crypto.raidCost} ${L("verktyg", "tools")}`} />
            <Stat label={L("Stöld", "Theft")} value={`${crypto.raidPct} % / ${crypto.raidCap}`} />
            <Stat label={L("Avslöjad", "Exposed")} value={`${cryptoExposed} ${L("spår", "trace")}`} />
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            {L(
              `Ett tyst hack tar ${crypto.raidPct} % av rivalens saldo, högst ${crypto.raidCap}, och kostar ${crypto.raidCost} verktyg. Mot en avslöjad rival tar samma hack ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)} % mer. Ett rätt svar ger +${crypto.correctBalance} crypto och ett verktyg; varje ny fråga ger också ett verktyg och svalkar spåret med ${TRACE_DECAY}.`,
              `A quiet hack takes ${crypto.raidPct}% of the rival's balance, up to ${crypto.raidCap}, and costs ${crypto.raidCost} tools. Against an exposed rival the same hack takes ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)}% more. A correct answer pays +${crypto.correctBalance} crypto and one tool; each new question also gives one tool and cools trace by ${TRACE_DECAY}.`
            )}
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            {L(
              `Verktygen kapas vid ${crypto.maxEnergy}. Du kan alltså hacka en gång per fråga om du svarar rätt, och spara till ett högljutt hack om du hoppar över en.`,
              `Tools cap at ${crypto.maxEnergy}. You can therefore hack once per question while answering correctly, and bank for a loud hack by skipping one.`
            )}
          </p>

          <h3 className="flex items-center gap-2 pt-1 font-display text-base font-extrabold text-white">
            <Target className="h-4 w-4 text-rose-300" />
            {L("Spåret", "The trace")}
          </h3>
          <RuleTable
            head={[L("Händelse", "Event"), L("Spår", "Trace")]}
            rows={[
              [L("Lyckat hack", "Successful hack"), `+${crypto.trace?.success ?? 22}`],
              [L("Stoppat eller missat hack", "Blocked or missed hack"), `+${crypto.trace?.fail ?? 32}`],
              [
                L("Avslöjad: ditt hack", "Exposed: your hack"),
                L(
                  `vid ${cryptoExposed} kostar hacket ${crypto.raidCost + EXPOSED_HACK.tools} verktyg och tar ${EXPOSED_HACK.pct} % (max ${EXPOSED_HACK.cap})`,
                  `at ${cryptoExposed} the hack costs ${crypto.raidCost + EXPOSED_HACK.tools} tools and takes ${EXPOSED_HACK.pct}% (max ${EXPOSED_HACK.cap})`
                ),
              ],
              [
                L("Avslöjad: deras hack", "Exposed: their hack"),
                L(
                  `alla ser ditt exakta saldo och varje hack mot dig tar ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)} % mer — tills spåret svalnar under ${cryptoExposed}`,
                  `everyone sees your exact balance and every hack against you takes ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)}% more — until trace cools below ${cryptoExposed}`
                ),
              ],
              [L("Svalnar", "Cools down"), L(`−${TRACE_DECAY} vid varje ny fråga`, `−${TRACE_DECAY} at each new question`)],
              [
                L("Spårstädare", "Trace cleaner"),
                L(
                  `−30 för ${crypto.defenses.find((d) => d.id === "cleaner")?.cost ?? 180} crypto`,
                  `−30 for ${crypto.defenses.find((d) => d.id === "cleaner")?.cost ?? 180} crypto`
                ),
              ],
            ]}
          />
          <div className="surface-flat p-3 text-xs leading-relaxed text-slate-400">
            <b className="text-slate-200">{L("Ett fönster, inte en belöning:", "A window, not a reward:")}</b>{" "}
            {L(
              `vid ${cryptoExposed} spår hackar du hårdare — ${EXPOSED_HACK.pct} % i stället för ${crypto.raidPct} %, med taket ${EXPOSED_HACK.cap}, för ett extra verktyg. Men alla ser ditt saldo, och varje hack mot dig tar ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)} % mer. Varje högljutt hack lägger dessutom på ${EXPOSED_HACK.trace} spår, så fönstret stängs av sig självt. Spårfritt eller Spårstädaren är vägen tillbaka till tysta hack.`,
              `at ${cryptoExposed} trace you hack harder — ${EXPOSED_HACK.pct}% instead of ${crypto.raidPct}%, capped at ${EXPOSED_HACK.cap}, for one extra tool. But everyone sees your balance, and every hack against you takes ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)}% more. Each loud hack also adds ${EXPOSED_HACK.trace} trace, so the window closes itself. Spårfritt or the trace cleaner is the way back to quiet hacks.`
            )}
          </div>

          <h3 className="flex items-center gap-2 pt-1 font-display text-base font-extrabold text-white">
            <Zap className="h-4 w-4 text-sky-300" />
            {L("Sidohacket", "The side hack")}
          </h3>
          <div className="surface-flat p-3 text-xs leading-relaxed text-slate-400">
            {L(
              "Mellan två frågor får varje spelare en kort utmaning som roterar mellan fem sorter: rensa signalen, läs ritningen, följ signalen, knäck åtkomstkoden och starta om reläet. Ett rätt svar ger +100 crypto och +20 per steg i hackkedjan (högst +160 totalt), ett verktyg och −10 spår. Ett fel ger +10 spår. En chans per fråga. Sidohacket är en bonus — det ska aldrig slå ut quizet som inkomstkälla.",
              "Between two questions each player gets a short challenge that rotates through five kinds: purge the signal, read the blueprint, trace the signal, crack the access code and reboot the relay. A success pays +100 crypto and +20 per step in the hack chain (+160 at most), one tool and −10 trace. A miss adds +10 trace. One attempt per question. The side hack is a bonus — it should never eclipse the quiz as an income source."
            )}
          </div>

          <h3 className="flex items-center gap-2 pt-1 font-display text-base font-extrabold text-white">
            <Sparkles className="h-4 w-4 text-violet-300" />
            {L("Power-up", "Power-up")}
          </h3>
          <RuleTable
            head={[L("Power-up", "Power-up"), L("Pris", "Price"), L("Effekt", "Effect")]}
            rows={(crypto.powers ?? []).map((power) => [
              tr(power.name),
              power.cost > 0 ? `${power.cost} crypto` : L("gratis", "free"),
              powerEffect(power),
            ])}
          />

          <h3 className="flex items-center gap-2 pt-1 font-display text-base font-extrabold text-white">
            <Shield className="h-4 w-4 text-emerald-300" />
            {L("Försvar", "Defenses")}
          </h3>
          <p className="text-xs text-slate-500">{L(DEFENSE_NOTE.crypto, "A defense applies immediately and is spent when it is used.")}</p>
          <RuleTable
            head={[L("Försvar", "Defense"), L("Pris", "Price"), L("Effekt", "Effect")]}
            rows={defenseRows(crypto.defenses, "crypto")}
          />
          <ul className="space-y-1.5 pt-1">
            <Tip>{L(`Hacka den som har mest — ${crypto.raidPct} % av en stor plånbok slår ${crypto.raidPct} % av en liten.`, `Hack the richest player — ${crypto.raidPct}% of a big purse beats ${crypto.raidPct}% of a small one.`)}</Tip>
            <Tip>{L(`Ligg under ${cryptoExposed} i spår innan du hackar igen; spårstädaren tar 30 och svalkan tar ${TRACE_DECAY} per fråga.`, `Stay below ${cryptoExposed} trace before hacking again; the cleaner removes 30 and the cool-down removes ${TRACE_DECAY} per question.`)}</Tip>
            <Tip>{L("Spårfritt är vägen tillbaka till tysta hack; Insider är ett stort hack utan att vänta på rätt spår.", "Spårfritt is the way back to quiet hacks; Insider is one big hack without waiting for the right trace.")}</Tip>
            <Tip>{L("Rivalernas saldon visas avrundade — du hackar delvis i blindo. Avslöjade rivaler visas exakt.", "Rival balances are rounded — you hack partly blind. Exposed rivals are shown exactly.")}</Tip>
            <Tip>{L(`En avslöjad rival är det bästa målet: hack mot hen tar ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)} % mer. Låt någon annan bli avslöjad först.`, `An exposed rival is the best target: hacks against them take ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)}% more. Let someone else get exposed first.`)}</Tip>
          </ul>
        </ModeSection>

        {/* ── Pirate Heist ────────────────────────────────────────────────── */}
        <ModeSection
          id="pirate"
          icon={Swords}
          tone="border-rose-400/30 bg-rose-500/10 text-rose-300"
          title={pirate.name}
          kicker={tr(pirate.tagline)}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label={L("Start", "Start")} value={pirate.startBalance.toLocaleString("sv-SE")} />
            <Stat label={L("Rätt svar", "Correct answer")} value={`+${pirate.correctBalance}`} />
            <Stat label={L("Streak", "Streak")} value={`+${heistStreakBonus(2)}–${heistStreakBonus(9)}`} />
            <Stat label={L("Besättning", "Crew")} value={`${pirate.startEnergy} / ${pirate.maxEnergy}`} />
            <Stat label={L("Rån", "Raid")} value={`${pirate.raidCost} + ${L("guld", "gold")}`} />
            <Stat label={L("Skydd", "Protection")} value={`${PROTECTION_MS / 1000} s`} />
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            {L(
              `Varje rån kostar ${pirate.raidCost} besättning och en liten guldavgift, och kan misslyckas. Avgiften är ett antelag, inte priset på bytet — du bettingar på tärningen. Ett rätt svar ger +${pirate.correctBalance} guld och ett steg på streakstegen.`,
              `Every raid costs ${pirate.raidCost} crew and a small gold ante, and can fail. The fee is an ante, not the price of the loot — you are betting on the dice. A correct answer pays +${pirate.correctBalance} gold and one step on the streak ladder.`
            )}
          </p>
          <RuleTable
            head={[L("Rån", "Raid"), L("Pris", "Price"), L("Chans", "Chance"), L("Stöld", "Theft"), L("Tak", "Cap")]}
            rows={(pirate.styles ?? []).map((style) => [
              tr(style.name),
              `${style.cost} ${L("guld", "gold")}`,
              `${Math.round(style.chance * 100)} %`,
              `${style.pct} %`,
              style.cap,
            ])}
          />
          <p className="text-xs leading-relaxed text-slate-500">
            {L(
              "Ett misslyckat rån kostar både besättning och avgift. Ett lyckat rån mot en ny rival ger ett Mint-steg; att råna samma rival igen stjäl fortfarande guld men ger ingen ny bonus.",
              "A failed raid keeps both the crew and the fee. A successful raid against a new rival adds a Mint step; raiding the same rival again still steals gold but adds no new bonus."
            )}
          </p>
          <div className="surface-flat p-3 text-xs leading-relaxed text-slate-400">
            <b className="text-slate-200">{L("Varför djärvare rån är bättre i snitt:", "Why bolder raids pay more on average:")}</b>{" "}
            {L(
              `Chansen sjunker, men andelen och taket stiger mer. Räknat på ett saldo på 1 000 guld ger ${pirateStyles
                .map((s) => `${s.name} i snitt ${styleAverage(s, 1000) >= 0 ? "+" : ""}${styleAverage(s, 1000)}`)
                .join(", ")}. På 3 000 guld: ${pirateStyles
                .map((s) => `${s.name} ${styleAverage(s, 3000) >= 0 ? "+" : ""}${styleAverage(s, 3000)}`)
                .join(", ")}. Full attack missar 55 % av gångerna — det är priset för det högsta snittet.`,
              `The chance drops, but the share and cap rise further. Against a purse of 1,000 gold: ${pirateStyles
                .map((s) => `${s.name} averages ${styleAverage(s, 1000) >= 0 ? "+" : ""}${styleAverage(s, 1000)}`)
                .join(", ")}. At 3,000 gold: ${pirateStyles
                .map((s) => `${s.name} ${styleAverage(s, 3000) >= 0 ? "+" : ""}${styleAverage(s, 3000)}`)
                .join(", ")}. Full attack misses 55% of the time — that is the price of the highest average.`
            )}
          </div>
          <h3 className="flex items-center gap-2 pt-1 font-display text-base font-extrabold text-white">
            <Shield className="h-4 w-4 text-emerald-300" />
            {L("Försvar", "Defenses")}
          </h3>
          <p className="text-xs text-slate-500">{L(DEFENSE_NOTE.pirate, "Defenses are paid in pirate gold and apply immediately.")}</p>
          <RuleTable
            head={[L("Försvar", "Defense"), L("Pris", "Price"), L("Effekt", "Effect")]}
            rows={defenseRows(pirate.defenses, L("guld", "gold"))}
          />
          <ul className="space-y-1.5 pt-1">
            <Tip>{L("Full attack har högst förväntat byte men missar 55 % — använd den mot den rikaste, inte mot en tunn plånbok.", "All-out has the highest expected haul but misses 55% — use it against the richest, not a thin purse.")}</Tip>
            <Tip>{L("Ett lastutrymme skyddar 500 guld permanent — det gör dig till ett dåligt mål.", "A cargo hold protects 500 gold permanently — it makes you a bad target.")}</Tip>
            <Tip>{L("Ett misslyckat full attack kostar 90 guld och 2 besättning. Ha råd med missen.", "A failed all-out raid costs 90 gold and 2 crew. Be able to afford the miss.")}</Tip>
          </ul>
        </ModeSection>

        {/* ── Mint ────────────────────────────────────────────────────────── */}
        <ModeSection
          id="mint"
          icon={Trophy}
          tone="border-amber-400/30 bg-amber-500/10 text-amber-300"
          title="Mint"
          kicker={L("Det som följer med hem", "What you take home")}
        >
          <p className="text-sm leading-relaxed text-slate-400">
            {L(
              "Matchvalutan är bara till för matchen. När den tar slut betalas Mint ut efter placering, plus en bonus för varje ny rival du lyckats råna. Bonusen har ett tak, så en spelare kan inte farma samma offer hela kvällen.",
              "Match currency exists only inside the match. When it ends, Mint is paid by placement plus a bonus for every new rival you successfully raided. The bonus is capped so one player cannot farm the same victim all evening."
            )}
          </p>
          <div className="surface-flat p-3 text-xs leading-relaxed text-slate-400">
            {L(
              "Placeringen är matchställningen — alltså saldot i valvmynt, crypto eller piratguld. Quizpoängen är en egen tavla och blir XP. Båda syns i slutresultatet.",
              "Placement means the match standings — the vault-coin, crypto or pirate-gold balance. Quiz points are a separate table and become XP. Both appear in the final result."
            )}
          </div>
          <RuleTable
            head={[
              L("Läge", "Mode"),
              L("Plats 1", "1st"),
              L("Plats 2", "2nd"),
              L("Plats 3", "3rd"),
              L("Övriga", "Others"),
              L("Per ny rival", "Per new rival"),
              L("Tak", "Cap"),
            ]}
            rows={mintRows.map(([name, mint]) => [
              name,
              mint.first,
              mint.second,
              mint.third,
              mint.rest,
              `+${mint.perRaid}`,
              `+${mint.bonusCap}`,
            ])}
          />
          <p className="text-xs text-slate-500">
            {L(
              "Klassisk quiz betalar 50 / 30 / 20 mynt till prispallen och 10 till övriga. XP:t är alltid quizpoängen.",
              "Classic quiz pays 50 / 30 / 20 coins to the podium and 10 to everyone else. XP is always the quiz points."
            )}
          </p>
          <div className="surface-flat p-3 text-xs leading-relaxed text-slate-400">
            {L(
              "Mint betalas till det konto du är inloggad med. Spelar du utan konto får värden fortfarande en ställning, men det finns ingen plånbok att sätta Mint i.",
              "Mint is paid to the account you are signed in with. If you play without an account the host still gets a standings table, but there is no wallet to put Mint into."
            )}
          </div>
        </ModeSection>

        {/* ── Glossary ────────────────────────────────────────────────────── */}
        <ModeSection
          id="ordlista"
          icon={BookOpen}
          tone="border-sky-400/30 bg-sky-500/10 text-sky-300"
          title={L("Ordlista", "Glossary")}
          kicker={L("Orden som går igen", "The words that keep coming back")}
        >
          <dl className="grid gap-2.5 sm:grid-cols-2">
            {[
              {
                term: L("Mint", "Mint"),
                body: L("Den permanenta valutan som betalas ut när matchen är slut.", "The permanent currency paid out when the match ends."),
              },
              {
                term: L("XP", "XP"),
                body: L("Erfarenhet från quizpoäng, läxor och plugg. Nivån räknas alltid ut från XP.", "Experience from quiz points, homework and studying. Your level is always calculated from XP."),
              },
              {
                term: L("Streak", "Streak"),
                body: L("Rätt svar i följd. Varje nytt steg ger mer, upp till taket.", "Correct answers in a row. Each new step pays more, up to the cap."),
              },
              {
                term: L("Åtgärd: energi / verktyg / besättning", "Action: energy / tools / crew"),
                body: L(
                  "Det som betalar ett rån eller hack. Varje läge har sin egen: raid-energi, verktyg eller besättning. Fylls på av rätt svar och av varje ny fråga.",
                  "What pays for a raid or hack. Each mode has its own: raid energy, tools or crew. Topped up by correct answers and by each new question."
                ),
              },
              {
                term: L("Spår", "Trace"),
                body: L(
                  `Crypto Clash' hetta. Vid ${cryptoExposed} blir du avslöjad: hacket tar ${EXPOSED_HACK.pct} % i stället för ${crypto.raidPct} %, men alla ser dig och tar mer av dig.`,
                  `Crypto Clash's heat. At ${cryptoExposed} you are exposed: the hack takes ${EXPOSED_HACK.pct}% instead of ${crypto.raidPct}%, but everyone sees you and takes more from you.`
                ),
              },
              {
                term: L("Avslöjad", "Exposed"),
                body: L(
                  `Läget över spårgränsen. Ditt hack blir större och dyrare, ditt exakta saldo syns för alla, och alla hack mot dig tar ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)} % mer. Varje högljutt hack lägger också på extra spår.`,
                  `The state above the trace line. Your hack grows and costs more, your exact balance is visible, and every hack against you takes ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)}% more. Each loud hack adds extra trace too.`
                ),
              },
              {
                term: L("Insider", "Insider"),
                body: L(
                  `En engångspower i Crypto Clash: nästa hack kostar ${INSIDER_HACK.tools} verktyg och tar ${INSIDER_HACK.pct} % (max ${INSIDER_HACK.cap}), oavsett spår.`,
                  `A one-shot Crypto power: your next hack costs ${INSIDER_HACK.tools} tool and takes ${INSIDER_HACK.pct}% (max ${INSIDER_HACK.cap}), whatever your trace.`
                ),
              },
              {
                term: L("Skydd", "Protection"),
                body: L(`Efter ett rån kan offret inte rånas igen på ${PROTECTION_MS / 1000} sekunder.`, `After a raid the victim cannot be raided again for ${PROTECTION_MS / 1000} seconds.`),
              },
              {
                term: L("Tak", "Cap"),
                body: L("Det mesta ett enda rån eller en kista kan ta, oavsett hur stor plånboken är.", "The most a single raid or chest can take, however big the purse is."),
              },
              {
                term: L("Runda", "Round"),
                body: L("En fråga. Ny runda = ny kista, påfylld energi och ett svalare spår.", "One question. A new round = a new chest, topped-up energy and a cooler trace."),
              },
            ].map((item) => (
              <div key={item.term} className="surface-flat p-3">
                <dt className="text-sm font-extrabold text-white">{item.term}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-slate-400">{item.body}</dd>
              </div>
            ))}
          </dl>
        </ModeSection>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <ModeSection
          id="fragor"
          icon={Crosshair}
          tone="border-violet-400/30 bg-violet-500/10 text-violet-300"
          title={L("Vanliga frågor", "Frequently asked questions")}
          kicker={L("Det folk frågar mitt i matchen", "What people ask mid-match")}
        >
          <dl className="space-y-2.5">
            {[
              {
                q: L("Varför kan jag inte råna någon?", "Why can't I raid anyone?"),
                a: L(
                  `Du behöver ${vault.raidCost} av lägrets åtgärd (raid-energi, verktyg eller besättning). Rivalen kan också vara skyddad i ${PROTECTION_MS / 1000} sekunder efter ett tidigare rån. I Pirate Heist måste du ha råd med guldavgiften, och i Crypto Clash kostar ett hack 3 verktyg när du är avslöjad.`,
                  `You need ${vault.raidCost} of the mode's action point (raid energy, tools or crew). The rival may also be protected for ${PROTECTION_MS / 1000} seconds after an earlier raid. In Pirate Heist you must afford the gold ante, and in Crypto Clash a hack costs 3 tools while you are exposed.`
                ),
              },
              {
                q: L("Varför stal jag mindre än väntat?", "Why did I steal less than expected?"),
                a: L(
                  `Ett försvar kan ta bort en del eller allt. Ett lastutrymme håller 500 guld utanför räckhåll, och taket stoppar stora rån. I Pirate beror andelen på tärningen du valde — ${pirateStyles.map((s) => `${s.name} ${s.pct} %`).join(", ")}.`,
                  `A defense can remove part or all of it. A cargo hold keeps 500 gold out of reach, and the cap stops large raids. In Pirate the share depends on the dice you picked — ${pirateStyles.map((s) => `${s.name} ${s.pct}%`).join(", ")}.`
                ),
              },
              {
                q: L("Varför tar hacket mer när jag är avslöjad?", "Why does my hack take more while exposed?"),
                a: L(
                  `Det är fördelen med att vara avslöjad, och den är betald. Över ${cryptoExposed} spår kostar hacket ${crypto.raidCost + EXPOSED_HACK.tools} verktyg men tar ${EXPOSED_HACK.pct} % (max ${EXPOSED_HACK.cap}) i stället för ${crypto.raidPct} % (max ${crypto.raidCap}). Samtidigt ser alla ditt saldo och tar ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)} % mer av dig. Varje högljutt hack lägger på ${EXPOSED_HACK.trace} extra spår, så du kan inte stanna där.`,
                  `It is the upside of being exposed, and it is paid for. Above ${cryptoExposed} trace the hack costs ${crypto.raidCost + EXPOSED_HACK.tools} tools but takes ${EXPOSED_HACK.pct}% (max ${EXPOSED_HACK.cap}) instead of ${crypto.raidPct}% (max ${crypto.raidCap}). At the same time everyone sees your balance and takes ${Math.round((EXPOSED_TARGET_MULTIPLIER - 1) * 100)}% more from you. Each loud hack adds ${EXPOSED_HACK.trace} extra trace, so you cannot camp there.`
                ),
              },
              {
                q: L("Varför förlorade jag mynt på en kista?", "Why did a chest cost me coins?"),
                a: L(
                  `Bara den vågade kistan kan göra det: ${Math.round(CHEST_WILD_CHANCE * 100)} % chans till +${CHEST_WILD_WIN}, annars −${CHEST_WILD_LOSS}. Den säkra kistan betalar alltid +${CHEST_SAFE_REWARD}, och rånkistan tar från ledaren utan att kosta dig något.`,
                  `Only the wild chest can do that: a ${Math.round(CHEST_WILD_CHANCE * 100)}% chance of +${CHEST_WILD_WIN}, otherwise −${CHEST_WILD_LOSS}. The safe chest always pays +${CHEST_SAFE_REWARD}, and the raid chest takes from the leader without costing you anything.`
                ),
              },
              {
                q: L("Hur kan full attack vara bättre när den missar mer?", "How can all-out be better when it misses more?"),
                a: L(
                  "Därför att avgiften är liten och andelen är stor. Missar du betalar du bara antelaget; träffar du tar du en tredjedel av en stor plånbok. I snitt vinner den på allt över några hundra guld, men den svider när den missar.",
                  "Because the ante is small and the share is large. A miss costs only the ante; a hit takes a third of a big purse. On average it wins against anything above a few hundred gold, but it stings when it misses."
                ),
              },
              {
                q: L("Får jag behålla mynten efter matchen?", "Do I keep the coins after the match?"),
                a: L(
                  "Nej. Valvmynt, crypto och piratguld finns bara i matchen. Det du får är Mint, och eventuell XP från quizpoängen.",
                  "No. Vault coins, crypto and pirate gold exist only in the match. What you keep is Mint, plus any XP from the quiz points."
                ),
              },
              {
                q: L("Kan jag öppna fler kistor?", "Can I open more chests?"),
                a: L(
                  "En per fråga, och du väljer bland tre olika vad: säker, mot ledaren eller 50/50. Hoppar du över en sparas den inte — nästa fråga ger en ny.",
                  "One per question, and you choose between three different bets: safe, against the leader, or 50/50. If you skip one it is not banked — the next question gives a new one."
                ),
              },
              {
                q: L("Varför kostar mitt hack plötsligt tre verktyg?", "Why does my hack suddenly cost three tools?"),
                a: L(
                  `Du har ${cryptoExposed} spår eller mer och är avslöjad. Spårstädaren tar bort 30, spåret svalnar med ${TRACE_DECAY} varje ny fråga, och Spårfritt nollställer det helt.`,
                  `You have ${cryptoExposed} trace or more and are exposed. The trace cleaner removes 30, trace cools by ${TRACE_DECAY} each new question, and Spårfritt wipes it entirely.`
                ),
              },
              {
                q: L("Kan jag gå med mitt i matchen?", "Can I join mid-match?"),
                a: L(
                  "Du kan svara på frågorna, men matchens spelare låses när värden trycker start. Den som kommer sent får ingen plånbok och kan inte rånas.",
                  "You can answer the questions, but the match roster locks when the host presses start. A late joiner gets no purse and cannot be raided."
                ),
              },
            ].map((item) => (
              <div key={item.q} className="surface-flat p-4">
                <dt className="text-sm font-bold text-white">{item.q}</dt>
                <dd className="mt-1.5 text-xs leading-relaxed text-slate-400">{item.a}</dd>
              </div>
            ))}
          </dl>
        </ModeSection>
      </div>

      <div className="surface mt-6 flex flex-col items-center justify-between gap-3 p-5 sm:flex-row">
        <div>
          <p className="font-display text-lg font-extrabold text-white">
            {L("Redo att spela?", "Ready to play?")}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {L(
              "Värden väljer läge — du behöver bara PIN-koden.",
              "The host picks the mode — all you need is the PIN."
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/play"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-2.5 text-sm font-extrabold text-amber-950 ring-1 ring-inset ring-white/20 transition-transform hover:-translate-y-0.5"
          >
            {L("Gå med i spel", "Join a game")} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/quizzes"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:border-white/25"
          >
            {L("Skapa en quiz", "Create a quiz")}
          </Link>
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-600">
        <Timer className="h-3 w-3" />
        {L(
          "Sidan läser regelfilen direkt — ändras ett pris i spelet ändras det här.",
          "This page reads the rules file directly — change a price in the game and it changes here."
        )}
      </p>
    </div>
  );
}
