"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { translateText, useLang } from "@/lib/i18n";
import {
  CHEST_FALLBACK_REWARD,
  CHEST_STEAL_CAP,
  MODE_RULES,
  POWER_GAIN_CAP,
  PROTECTION_MS,
  RAID_EXPOSURE_FEE,
  classicStreakBonus,
  heistStreakBonus,
  type Defense,
  type HeistMode,
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
  const chestTotal = vaultChests.reduce((sum, chest) => sum + chest.weight, 0);
  const doorPct = vault.defenses.find((d) => d.id === "door")?.value ?? 25;

  /** What a chest actually does, with its numbers, rather than its flavour text. */
  function chestEffect(chest: (typeof vaultChests)[number]): string {
    if (chest.kind === "gold") return `+${chest.value} ${L("mynt", "coins")}`;
    if (chest.kind === "steal") {
      return `${chest.value} % ${L("av en rivals oskyddade valv, högst", "of a rival's unprotected vault, max")} ${CHEST_STEAL_CAP}`;
    }
    if (chest.kind === "swap") return L("Byt saldo med en slumpad rival", "Swap balances with a random rival");
    if (chest.kind === "shield") return L("Ett gratis lasergrid", "A free laser grid");
    return `+${chest.value} ${L("på nästa rätta svar", "on the next correct answer")}`;
  }

  function defenseRows(defenses: Defense[], currency: string): ReactNode[][] {
    return defenses.map((d) => [tr(d.name), `${d.cost} ${currency}`, tr(d.blurb)]);
  }

  const mintRows = [
    ["Vault Raiders", vault.mint, L("mynt", "coins")],
    ["Crypto Clash", crypto.mint, "crypto"],
    ["Pirate Heist", pirate.mint, L("guld", "gold")],
  ] as const;

  const anchors = [
    { id: "klassisk", label: L("Klassisk quiz", "Classic quiz") },
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
            <Badge tone="sky" icon={Gift}>
              {L("1 kista per fråga", "1 chest per question")}
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
                "Rätt svar ger poäng, matchvaluta, energi och ett steg på streakstegen.",
                "A correct answer pays points, match currency, energy and one step on the streak ladder."
              ),
            },
            {
              n: "3",
              title: L("Spendera mellan frågorna", "Spend between questions"),
              body: L(
                "Kista, hack, rån eller försvar. Allt öppnas efter att frågan är avgjord.",
                "Chest, hack, raid or defense. Everything opens after the question is settled."
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
              "Fyll valvet med mynt. Kistor kan byta hela ställningen, och försvar gör ditt valv dyrt att råna.",
              "Fill the vault with coins. Chests can turn the whole standings around, and defenses make your vault expensive to raid."
            ),
          },
          {
            id: "crypto",
            name: crypto.name,
            icon: Zap,
            tone: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
            body: L(
              "Hacka rivaler, men lämna spår. Vid 70 blir du avslöjad och dina hack kostar ett verktyg mer.",
              "Hack rivals, but leave a trace. At 70 you are exposed and your hacks cost one extra tool."
            ),
          },
          {
            id: "pirate",
            name: pirate.name,
            icon: Swords,
            tone: "border-rose-400/30 bg-rose-500/10 text-rose-300",
            body: L(
              "Ingen energi — varje rån betalas i guld och kan misslyckas. Välj risk efter hur tjock rivalens plånbok är.",
              "No energy — every raid is paid in gold and can fail. Choose your risk based on how fat the rival's purse is."
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
            {L("Rätt svar ger +100 mynt, +1 raid-energi och ett steg på streakstegen. Varje ny fråga fyller också på 1 energi, så ingen blir utelåst. Ett rån tar 15 % av rivalens oskyddade valv och högst", "A correct answer pays +100 coins, +1 raid energy and one step on the streak ladder. Each new question also adds 1 energy so nobody is locked out. A raid takes 15% of the rival's unprotected vault, up to")}{" "}
            <b className="text-slate-200">{vault.raidCap}</b>.
          </p>

          <h3 className="flex items-center gap-2 pt-1 font-display text-base font-extrabold text-white">
            <Gift className="h-4 w-4 text-amber-300" />
            {L("Kistorna", "The chests")}
          </h3>
          <p className="text-xs leading-relaxed text-slate-500">
            {L(
              "En kista per fråga. Tre kistor, ett tryck, och hela rummet ser vad du fick. Oddsen nedan är vikterna i regelfilen.",
              "One chest per question. Three chests, one tap, and the whole room sees what you got. The odds below are the weights in the rules file."
            )}
          </p>
          <RuleTable
            head={[L("Kista", "Chest"), L("Chans", "Chance"), L("Effekt", "Effect")]}
            rows={vaultChests.map((chest) => [
              tr(chest.name),
              `${Math.round((chest.weight / chestTotal) * 100)} %`,
              chestEffect(chest),
            ])}
          />
          <p className="text-xs text-slate-500">
            {L(
              `Om en stöld eller ett byte saknar ett giltigt mål betalar valvet ${CHEST_FALLBACK_REWARD} mynt i tröstpris i stället för en tom kista.`,
              `If a steal or swap has no valid target, the vault pays ${CHEST_FALLBACK_REWARD} coins as a consolation prize instead of an empty chest.`
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
              `2 energi dras först. Stölden är 15 % av det som inte är skyddat, högst ${vault.raidCap}. Ett lasergrid stoppar den helt, en ståldörr tar bort ${doorPct} % och ett skendvalv stoppar den, namnger tjuven och kostar tjuven ${RAID_EXPOSURE_FEE} mynt. Offret är skyddat i ${PROTECTION_MS / 1000} sekunder efteråt, även om rånet misslyckades.`,
              `2 energy is spent first. The theft is 15% of what is unprotected, up to ${vault.raidCap}. A laser grid stops it completely, a steel door removes ${doorPct}%, and a decoy vault stops it, names the thief and costs them ${RAID_EXPOSURE_FEE} coins. The victim is protected for ${PROTECTION_MS / 1000} seconds afterwards, even if the raid failed.`
            )}
          </div>
          <ul className="space-y-1.5 pt-1">
            <Tip>{L("Öppna kistan varje fråga — den är gratis och varje utfall är värt något.", "Open the chest every question — it is free and every outcome is worth something.")}</Tip>
            <Tip>{L("Håll 2 energi när frågan närmar sig slutet, så du kan råna direkt efteråt.", "Keep 2 energy as the question nears its end so you can raid right after it.")}</Tip>
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
            <Stat label={L("Avslöjad", "Exposed")} value={`${crypto.trace?.exposed ?? 70} ${L("spår", "trace")}`} />
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            {L(
              "Ett lyckat hack tar 12 % av rivalens saldo, högst 600, och kostar 2 verktyg. Ett rätt svar ger +120 crypto och ett verktyg; varje ny fråga ger också ett verktyg och sänker spåret med 10.",
              "A successful hack takes 12% of the rival's balance, up to 600, and costs 2 tools. A correct answer pays +120 crypto and one tool; each new question also gives one tool and lowers trace by 10."
            )}
          </p>

          <h3 className="flex items-center gap-2 pt-1 font-display text-base font-extrabold text-white">
            <Target className="h-4 w-4 text-rose-300" />
            {L("Spåret", "The trace")}
          </h3>
          <RuleTable
            head={[L("Händelse", "Event"), L("Spår", "Trace")]}
            rows={[
              [L("Lyckat hack", "Successful hack"), `+${crypto.trace?.success ?? 15}`],
              [L("Stoppat eller missat hack", "Blocked or missed hack"), `+${crypto.trace?.fail ?? 25}`],
              [L("Avslöjad", "Exposed"), L(`vid ${crypto.trace?.exposed ?? 70}: hack kostar 1 extra verktyg`, `at ${crypto.trace?.exposed ?? 70}: hacks cost 1 extra tool`)],
              [L("Svalnar", "Cools down"), L("−10 vid varje ny fråga", "−10 at each new question")],
              [L("Spårstädare", "Trace cleaner"), L(`−30 för ${crypto.defenses.find((d) => d.id === "cleaner")?.cost ?? 250} crypto`, `−30 for ${crypto.defenses.find((d) => d.id === "cleaner")?.cost ?? 250} crypto`)],
            ]}
          />
          <p className="text-xs leading-relaxed text-slate-500">
            {L(
              "Ett spår på 70 eller mer syns i flödet och gör varje hack dyrare. Det försvinner av sig självt när matchen går vidare, så ett misstag är ett tillfälligt handikapp — inte hela matchen.",
              "A trace of 70 or more is announced in the feed and makes every hack dearer. It fades on its own as the match moves on, so a mistake is a temporary handicap — not the whole match."
            )}
          </p>

          <h3 className="flex items-center gap-2 pt-1 font-display text-base font-extrabold text-white">
            <Zap className="h-4 w-4 text-sky-300" />
            {L("Sidohacket", "The side hack")}
          </h3>
          <div className="surface-flat p-3 text-xs leading-relaxed text-slate-400">
            {L(
              "Mellan två frågor får varje spelare en kort utmaning som roterar mellan fem sorter: rensa signalen, läs ritningen, följ signalen, knäck åtkomstkoden och starta om reläet. Ett rätt svar ger +180 crypto och +20 per steg i hackkedjan (högst 300 totalt), ett verktyg och −10 spår. Ett fel ger +10 spår. En chans per fråga.",
              "Between two questions each player gets a short challenge that rotates through five kinds: purge the signal, read the blueprint, trace the signal, crack the access code and reboot the relay. A success pays +180 crypto and +20 per step in the hack chain (300 total at most), one tool and −10 trace. A miss adds +10 trace. One attempt per question."
            )}
          </div>

          <h3 className="flex items-center gap-2 pt-1 font-display text-base font-extrabold text-white">
            <Sparkles className="h-4 w-4 text-violet-300" />
            {L("Power-up", "Power-up")}
          </h3>
          <RuleTable
            head={[L("Power-up", "Power-up"), L("Effekt", "Effect")]}
            rows={(crypto.powers ?? []).map((power) => [
              tr(power.name),
              L(
                `Dubblar din crypto, men högst +${POWER_GAIN_CAP}. En gång per match.`,
                `Doubles your crypto, but by no more than +${POWER_GAIN_CAP}. Once per match.`
              ),
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
            <Tip>{L("Hacka den som har mest — 12 % av en stor plånbok slår 12 % av en liten.", "Hack the richest player — 12% of a big purse beats 12% of a small one.")}</Tip>
            <Tip>{L("Ligg under 70 i spår innan du hackar igen; spårstädaren är billigare än ett extra verktyg.", "Stay below 70 trace before hacking again; the cleaner is cheaper than an extra tool.")}</Tip>
            <Tip>{L("Spara Dubbla till ett läge där taket på +900 faktiskt används.", "Save Double for a position where the +900 cap is actually used.")}</Tip>
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
            <Stat label={L("Energi", "Energy")} value={L("ingen", "none")} />
            <Stat label={L("Rån", "Raid")} value={L("betalas i guld", "paid in gold")} />
            <Stat label={L("Skydd", "Protection")} value={`${PROTECTION_MS / 1000} s`} />
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            {L(
              "Pirate Heist har ingen energi. Varje rån kostar guld, kan misslyckas och betalar ingen återbäring om det går fel. Ett rätt svar ger +100 guld och ett steg på streakstegen.",
              "Pirate Heist has no energy. Every raid costs gold, can fail and pays no refund when it does. A correct answer pays +100 gold and one step on the streak ladder."
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
              "Ett misslyckat rån kostar fortfarande avgiften. Ett lyckat rån mot en ny rival ger ett Mint-steg; att råna samma rival igen stjäl fortfarande guld men ger ingen ny bonus.",
              "A failed raid still costs its fee. A successful raid against a new rival adds a Mint step; raiding the same rival again still steals gold but adds no new bonus."
            )}
          </p>
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
            <Tip>{L("Smygrån mot en tunn plånbok, full attack mot ledaren.", "Sneak against a thin purse, all-out against the leader.")}</Tip>
            <Tip>{L("Ett lastutrymme skyddar 500 guld permanent — det gör dig till ett dåligt mål.", "A cargo hold protects 500 gold permanently — it makes you a bad target.")}</Tip>
            <Tip>{L("Räkna med att ett misslyckat full attack kostar 300 guld. Ha råd med missen.", "Assume a failed all-out attack costs 300 gold. Be able to afford the miss.")}</Tip>
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
                term: L("Energi / verktyg", "Energy / tools"),
                body: L("Det som betalar ett rån eller hack. Fylls på av rätt svar och av varje ny fråga.", "What pays for a raid or hack. Topped up by correct answers and by each new question."),
              },
              {
                term: L("Spår", "Trace"),
                body: L("Crypto Clash' hetta. Vid 70 blir du avslöjad och hacken kostar ett verktyg mer.", "Crypto Clash's heat. At 70 you are exposed and hacks cost one extra tool."),
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
                  `Du behöver ${vault.raidCost} energi. Rivalen kan också vara skyddad i ${PROTECTION_MS / 1000} sekunder efter ett tidigare rån, och i Pirate Heist måste du ha råd med avgiften.`,
                  `You need ${vault.raidCost} energy. The rival may also be protected for ${PROTECTION_MS / 1000} seconds after an earlier raid, and in Pirate Heist you must be able to afford the fee.`
                ),
              },
              {
                q: L("Varför stal jag mindre än 15 %?", "Why did I steal less than 15%?"),
                a: L(
                  "Ett försvar kan ta bort en del eller allt. Ett lastutrymme håller 500 guld utanför räckhåll, och taket stoppar stora rån.",
                  "A defense can remove part or all of it. A cargo hold keeps 500 gold out of reach, and the cap stops large raids."
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
                  "En per fråga. Om du hoppar över en kista sparas den inte till nästa fråga — du får helt enkelt en ny då.",
                  "One per question. If you skip a chest it is not banked for later — you simply get a new one next question."
                ),
              },
              {
                q: L("Varför kostar mitt hack plötsligt tre verktyg?", "Why does my hack suddenly cost three tools?"),
                a: L(
                  `Du har ${crypto.trace?.exposed ?? 70} spår eller mer och är avslöjad. Spårstädaren tar bort 30, och spåret svalnar med 10 varje ny fråga.`,
                  `You have ${crypto.trace?.exposed ?? 70} trace or more and are exposed. The trace cleaner removes 30, and trace cools by 10 each new question.`
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
