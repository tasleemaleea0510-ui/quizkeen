"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StaffChat from "../../components/staff-chat";
import LiveViewer from "../../components/live-viewer";
import PromptModal, { ConfirmModal } from "../../components/prompt-modal";
import { HelpButton, HelpPanel } from "../../components/help-guide";
import {
  getOwnerData,
  banUser,
  unbanUser,
  giveXP,
  giveCoins,
  renameUser,
  setRole,
  resetPassword,
  getEmail,
  deleteUser,
  setBroadcast,
  stopBroadcast,
  setShutdown,
  changeCodes,
  getOwnerExtra,
  approveBanRequest,
  rejectBanRequest,
  resetXP,
  resetCoins,
  resetAll,
  setLevel,
  sendPersonalNote,
  clearPersonalNote,
  requestRename,
  requestLive,
  muteChat,
  unmuteChat,
  toggleShadow,
  toggleFreezeCoins,
  toggleGhost,
  setSecretNote,
  forceRelogin,
  getTimeMachine,
  peekIP,
  getIpHistory,
  blockIp,
  unblockIp,
  toggleDailyBonus,
  togglePin,
  spyOnChats,
  getOwnerPowers,
  ownerMassGrant,
  ownerMassReset,
  ownerPanic,
  ownerAllClear,
  ownerKickLive,
  ownerPurgeChat,
  ownerPurgeChatFrom,
  ownerKick,
  ownerBanSameIp,
  ownerRoleNote,
  ownerUnbanAll,
  ownerWarnAmnesty,
  ownerPruneLog,
  ownerPruneVisits,
  ownerKeenVault,
  ownerGiveKeen,
  ownerTakeKeen,
} from "../actions";
import { KEEN_CATALOGUE, KEEN_SHELVES, RARITY_LABEL, keenArtSrc } from "../../lib/keen-catalogue";
import { countryName, flagFor } from "../../lib/geo";
import {
  Crown,
  Chart,
  Pray,
  Detective,
  Chat as ChatIcon,
  Users,
  Megaphone,
  Keypad,
  Scroll,
  Pencil,
  Ban,
  Check,
  Cross,
  Gift,
  Coins,
  Video,
  Ghost,
  Hourglass,
  Globe,
  Snowflake,
  Flame,
  Note,
  Mute,
  Sound,
  Pin,
  Refresh,
  Eraser,
  Warning,
  Key,
  Lock,
  Sparkles,
  Sliders,
  Graduation,
  Gamepad,
  Cards,
  Target,
  Mail,
  Dot,
  Clock,
  Shield,
  Search,
  Send,
  Help,
} from "../../components/icons";
import { CountUp } from "../../components/motion";

type User = {
  id: string;
  username: string;
  role: string;
  level: number;
  xp: number;
  coins: number;
  bannedUntil: string | null;
  warnings: number;
  lastSeenAt: string | null;
  livePath: string | null;
  secretNote: string | null;
  ip: string | null;
  ipHidden: boolean;
  ipCity: string | null;
  ipCountryCode: string | null;
};

type TabId = "stats" | "powers" | "requests" | "chatspy" | "chat" | "users" | "broadcast" | "codes" | "log" | "help";

/** How long a sändning may run. `null` = until somebody stops it. */
const DURATIONS: { label: string; minutes: number | null }[] = [
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "20 min", minutes: 20 },
  { label: "Tills vidare", minutes: null },
];

/** "12:04" — time left on a timed broadcast. */
function timeLeftLabel(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

const TABS: { id: TabId; Icon: typeof Crown; label: string }[] = [
  { id: "stats", Icon: Chart, label: "Översikt" },
  { id: "powers", Icon: Sparkles, label: "Superkrafter" },
  { id: "requests", Icon: Pray, label: "Ban-begäranden" },
  { id: "chatspy", Icon: Detective, label: "Chatspaning" },
  { id: "chat", Icon: ChatIcon, label: "Stabs-chatt" },
  { id: "users", Icon: Users, label: "Användare" },
  { id: "broadcast", Icon: Megaphone, label: "Sändning" },
  { id: "codes", Icon: Keypad, label: "Koder" },
  { id: "log", Icon: Scroll, label: "Logg" },
  { id: "help", Icon: Help, label: "Hjälp" },
];

const ROLES = ["STUDENT", "TEACHER", "ADMIN", "OWNER", "SECURITY"];

/** Rarity chips for the Keen vault; the colours match the game's ladder. */
const RARITY_TONE: Record<string, string> = {
  VANLIG: "bg-slate-500/20 text-slate-200",
  OVANLIG: "bg-emerald-500/20 text-emerald-200",
  SALLSYNT: "bg-sky-500/20 text-sky-200",
  EPISK: "bg-violet-500/20 text-violet-200",
  LEGENDARISK: "bg-amber-500/20 text-amber-200",
  HEMLIG: "bg-fuchsia-500/20 text-fuchsia-200",
  KROMA: "bg-rose-500/20 text-rose-200",
  MYSTISK: "bg-indigo-500/20 text-indigo-200",
};

const VAULT_KEENS = KEEN_CATALOGUE;
const VAULT_SHELVES = KEEN_SHELVES;

type Confirm = {
  title: string;
  body: string;
  label: string;
  tone?: "indigo" | "amber" | "sky" | "red";
  action: () => void;
};

export default function OwnerPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [extra, setExtra] = useState<any>(null);
  const [tab, setTab] = useState<TabId>("stats");
  const [sel, setSel] = useState<User | null>(null);
  const [liveFor, setLiveFor] = useState<any>(null);
  const [q, setQ] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [xpAmt, setXpAmt] = useState("10");
  const [coinAmt, setCoinAmt] = useState("10");
  const [newName, setNewName] = useState("");
  const [role, setRoleChoice] = useState("STUDENT");
  const [banMin, setBanMin] = useState("5");
  const [banMsg, setBanMsg] = useState("");
  const [notify, setNotify] = useState(true);
  const [customPw, setCustomPw] = useState("");
  const [bc, setBc] = useState("");
  const [bcMin, setBcMin] = useState<number | null>(10);
  // The console re-reads everything every 20 s. Without these two flags that
  // refresh overwrote whatever was being typed — a long sändning vanished
  // mid-sentence, which is the "it just erases" behaviour.
  const bcDirty = useRef(false);
  const codesDirty = useRef(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [codes, setCodes] = useState({ o: "", a: "", sec: "" });
  const [approveMin, setApproveMin] = useState<Record<string, string>>({});
  const [lvl, setLvl] = useState("1");
  const [pNote, setPNote] = useState("");
  const [chats, setChats] = useState<any>(null);
  const [secret, setSecret] = useState("");
  const [timeMachine, setTimeMachine] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  // Superkrafter: the mass tools and what they last showed.
  const [powers, setPowers] = useState<any>(null);
  const [waveRole, setWaveRole] = useState("STUDENT");
  const [waveXp, setWaveXp] = useState("50");
  const [waveCoins, setWaveCoins] = useState("0");
  const [noteRole, setNoteRole] = useState("STUDENT");
  const [noteText, setNoteText] = useState("");
  const [pruneDays, setPruneDays] = useState("30");
  const [purgeWho, setPurgeWho] = useState("");
  // Keen-valvet: what the selected person owns, and the vault's own filters.
  const [vault, setVault] = useState<{ keenId: string; count: number }[]>([]);
  const [vaultQ, setVaultQ] = useState("");
  const [vaultShelf, setVaultShelf] = useState("all");
  // Every address the selected account has used, and the blocklist's controls.
  const [ipHistory, setIpHistory] = useState<any[] | null>(null);
  const [blockAddr, setBlockAddr] = useState("");
  const [blockWhy, setBlockWhy] = useState("");
  const [blockMin, setBlockMin] = useState(0);

  useEffect(() => {
    let sess: any = null;
    try {
      sess = JSON.parse(localStorage.getItem("cmd_session") || "null");
    } catch {
      sess = null;
    }
    if (!sess || sess.role !== "OWNER") {
      router.replace("/");
      return;
    }
    setSession(sess);
    load(sess);
    const iv = setInterval(() => load(sess), 20000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab !== "chatspy" || !session) return;
    spyOnChats(session).then(setChats).catch(() => setChats(null));
  }, [tab, session]);

  // A one-second clock, used only to count down a timed sändning.
  useEffect(() => {
    const iv = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Which Keens the selected person already owns. Re-read whenever the owner
  // picks another person, so the badges never describe the previous one.
  useEffect(() => {
    if (!session || !sel?.id) {
      setVault([]);
      return;
    }
    let alive = true;
    ownerKeenVault(session, sel.id)
      .then((r) => {
        if (alive) setVault(r?.owned ?? []);
      })
      .catch(() => {
        if (alive) setVault([]);
      });
    return () => {
      alive = false;
    };
  }, [session, sel?.id]);

  // The address trail follows the selected person, like the Keen vault does.
  useEffect(() => {
    if (!session || !sel?.id) {
      setIpHistory(null);
      return;
    }
    let alive = true;
    setIpHistory(null);
    getIpHistory(session, sel.id)
      .then((r) => {
        if (alive) setIpHistory(r ?? []);
      })
      .catch(() => {
        if (alive) setIpHistory([]);
      });
    return () => {
      alive = false;
    };
  }, [session, sel?.id]);

  /** After a block or an unblock, re-read just the address trail. */
  async function refreshIps() {
    if (!session || !sel?.id) return;
    try {
      setIpHistory((await getIpHistory(session, sel.id)) ?? []);
    } catch {
      /* keep the last known list */
    }
  }

  /** After a gift or a take-back, re-read just the vault. */
  async function refreshVault() {
    if (!session || !sel?.id) return;
    try {
      const r = await ownerKeenVault(session, sel.id);
      setVault(r?.owned ?? []);
    } catch {
      /* keep the last known badges */
    }
  }

  async function load(s: any) {
    if (!s) return;
    try {
      const [d, ex, pw] = await Promise.all([
        getOwnerData(s),
        getOwnerExtra(s),
        getOwnerPowers(s).catch(() => null),
      ]);
      if (!d) {
        try {
          localStorage.removeItem("cmd_session");
        } catch {
          /* ignore */
        }
        router.replace("/");
        return;
      }
      setData(d);
      setExtra(ex);
      if (pw) setPowers(pw);
      // Only adopt the stored text while the owner is not editing it.
      if (!bcDirty.current) setBc(d.settings?.broadcast ?? "");
      if (!codesDirty.current)
        setCodes({
          o: d.settings?.ownerCode ?? "",
          a: d.settings?.adminCode ?? "",
          sec: d.settings?.securityCode ?? "",
        });
    } catch {
      setInfo("Kunde inte läsa in data. Försök igen.");
    }
  }

  /** Run an action and never let a failure escape into the console. */
  async function run(p: Promise<any>, fallback = "Klart!") {
    setBusy(true);
    try {
      const r = await p;
      if (r?.info) setInfo(r.info);
      else if (r?.ok === false) setInfo("Fungerade inte!");
      else setInfo(fallback);
    } catch {
      setInfo("Nätverksfel — försök igen.");
    } finally {
      setBusy(false);
      await load(session);
    }
  }

  if (!data) {
    return (
      <div className="flex min-h-screen animate-cmd-fade items-center justify-center gap-3 bg-slate-950 text-amber-300">
        <span className="relative grid h-12 w-12 place-items-center">
          <span className="absolute inset-1 animate-cmd-pulse-ring rounded-full border-2 border-amber-400/70" />
          <Crown className="h-6 w-6 animate-cmd-breathe" />
        </span>
        Laddar tronen...
      </div>
    );
  }

  // What is on screen right now, and how long it has left. A notice whose time
  // has passed counts as gone even if the console has not reloaded yet.
  const liveText: string = data.settings?.broadcast ?? "";
  const liveUntil: string | null = data.settings?.broadcastUntil ?? null;
  const liveMs = liveUntil ? new Date(liveUntil).getTime() - nowTick : null;
  const isLive = !!liveText.trim() && (liveMs === null || liveMs > 0);

  const filtered = data.users.filter((u: User) => u.username.toLowerCase().includes(q.toLowerCase()));
  const pending = (extra?.requests ?? []).filter((r: any) => r.status === "PENDING");
  const handled = (extra?.requests ?? []).filter((r: any) => r.status !== "PENDING");

  function selectUser(u: User) {
    setSel(u);
    setNewName(u.username);
    setRoleChoice(u.role);
    setSecret(u.secretNote || "");
  }

  const statCards: [string, any, typeof Users][] = [
    ["Användare", data.stats.users, Users],
    ["Lärare", data.stats.teachers, Graduation],
    ["Quizar", data.stats.quizzes, Target],
    ["Gloskortlekar", data.stats.decks, Cards],
    ["Spel", data.stats.games, Gamepad],
    ["Total XP", data.stats.totXP, Sparkles],
    ["Totala mynt", data.stats.totCoins, Coins],
    ["Väntande begäranden", pending.length, Pray],
  ];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <style>{`
        .gold-glow{box-shadow:0 0 28px rgba(245,158,11,.22)}
        .gold-title{text-shadow:0 0 14px rgba(252,211,77,.75)}
        .gold-bg{background:radial-gradient(900px 300px at 50% -60px, rgba(245,158,11,.14), transparent)}
      `}</style>

      <aside className="gold-bg w-full shrink-0 border-b border-amber-500/20 bg-slate-900/60 p-4 lg:w-60 lg:border-b-0 lg:border-r">
        <p className="pl-2 text-lg font-extrabold text-white">
          Quiz<span className="text-amber-300">Keen</span>
        </p>
        <p className="gold-title flex items-center gap-1.5 pl-2 text-xs font-extrabold text-amber-300">
          <Crown className="h-4 w-4" /> ÄGARKONSOL
        </p>
        <div className="mt-6 flex flex-wrap gap-1 lg:flex-col lg:gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold transition-all duration-200 hover:translate-x-0.5 ${
                tab === t.id ? "bg-amber-600 text-white shadow-lg shadow-amber-900/40" : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              <t.Icon className="h-4 w-4" />
              {t.label}
              {t.id === "requests" && pending.length > 0 && (
                <span className="ml-1 rounded-full bg-red-600 px-2 text-xs font-extrabold text-white">{pending.length}</span>
              )}
            </button>
          ))}
        </div>
      </aside>

      <main className="gold-bg flex-1 p-4 pt-14 lg:p-8 lg:pt-16">
        {liveFor && <LiveViewer username={liveFor.username} peerId={liveFor.pid} onClose={() => setLiveFor(null)} />}

        {busy && (
          <div className="gold-glow fixed bottom-4 right-4 z-[110] flex animate-cmd-pop items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-extrabold text-white">
            <Clock className="h-4 w-4 animate-pulse" /> Jobbar...
          </div>
        )}

        {info && (
          <div className="gold-glow mb-4 flex animate-cmd-slide-right items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-300">
            <span data-no-translate>{info}</span>
            <button type="button" onClick={() => setInfo("")} className="text-slate-400 hover:text-white">
              <Cross className="h-4 w-4" />
            </button>
          </div>
        )}

        {tab === "stats" && (
          <>
            <h1 className="gold-title flex items-center gap-2 text-3xl font-extrabold text-amber-300">
              <Crown className="h-7 w-7" /> GULD-TRONEN
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Allt ditt rike, i ett ögonkast. Endast för betrodda. Alla öppningar loggas.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map(([label, val, Icon], i) => (
                <div
                  key={label}
                  style={{ animationDelay: `${i * 55}ms` }}
                  className="gold-glow animate-cmd-fade-up rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 transition-colors hover:border-amber-400/50"
                >
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <Icon className="h-4 w-4 text-amber-400" /> {label}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-amber-300">
                    <CountUp value={Number(val) || 0} />
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "powers" && (
          <>
            <h1 className="gold-title flex items-center gap-2 text-2xl font-extrabold text-amber-300">
              <Sparkles className="h-6 w-6" /> SUPERKRAFTER
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Verktyg som slår på hela riket samtidigt — en våg till alla, en nödbroms, en sanering. Varje åtgärd
              loggas med hur många konton den rörde, och <b className="text-amber-300">ägarkontot lämnas alltid utanför</b>.
            </p>

            {/* Rikets puls: the numbers that make a mass tool's effect visible. */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {([
                ["Nya idag", powers?.pulse?.newToday ?? 0, Users, "text-emerald-300"],
                ["Online nu", powers?.pulse?.online ?? 0, Dot, "text-emerald-300"],
                ["Bannade", powers?.pulse?.banned ?? 0, Ban, "text-red-300"],
                ["Tystade", powers?.pulse?.muted ?? 0, Mute, "text-purple-300"],
                ["Skuggade", powers?.pulse?.shadowed ?? 0, Ghost, "text-indigo-300"],
                ["Frysta mynt", powers?.pulse?.frozen ?? 0, Snowflake, "text-cyan-300"],
                ["Mynt ut idag", powers?.pulse?.coinsToday ?? 0, Coins, "text-amber-300"],
                ["Besök idag", powers?.pulse?.visitsToday ?? 0, Globe, "text-sky-300"],
              ] as [string, number, typeof Users, string][]).map(([label, value, Icon, tint]) => (
                <div key={label} className="rounded-2xl border border-white/[0.07] bg-slate-900/60 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <Icon className={`h-3.5 w-3.5 ${tint}`} /> {label}
                  </p>
                  <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-white">
                    <CountUp value={Number(value) || 0} />
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {/* Massvåg */}
              <div className="gold-glow rounded-2xl border border-amber-500/30 bg-slate-900/60 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                  <Gift className="h-4 w-4" /> Massvåg — XP & mynt till en grupp
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Max ±10 000 per person och gång. Negativa tal tar bort. Ägarkontot ingår aldrig.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={waveRole}
                    onChange={(e) => setWaveRole(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                  >
                    {[
                      ["STUDENT", "Elever"],
                      ["TEACHER", "Lärare"],
                      ["ADMIN", "Admins"],
                      ["SECURITY", "Säkerhet"],
                      ["ALL", "Alla"],
                    ].map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={waveXp}
                    onChange={(e) => setWaveXp(e.target.value)}
                    aria-label="XP per person"
                    className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-400">XP</span>
                  <input
                    value={waveCoins}
                    onChange={(e) => setWaveCoins(e.target.value)}
                    aria-label="Mynt per person"
                    className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-400">mynt</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(
                        ownerMassGrant(
                          session,
                          waveRole as any,
                          parseInt(waveXp, 10) || 0,
                          parseInt(waveCoins, 10) || 0
                        )
                      )
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Skicka vågen
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setConfirm({
                        title: "Nollställ XP för gruppen?",
                        body: `XP nollställs för alla i ${waveRole}. Går inte att ångra.`,
                        label: "Nollställ XP",
                        tone: "amber",
                        action: () => run(ownerMassReset(session, waveRole as any, "XP")),
                      })
                    }
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-600"
                  >
                    Nollställ XP
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setConfirm({
                        title: "Nollställ mynt för gruppen?",
                        body: `Mynt nollställs för alla i ${waveRole}. Går inte att ångra.`,
                        label: "Nollställ mynt",
                        tone: "amber",
                        action: () => run(ownerMassReset(session, waveRole as any, "MYNT")),
                      })
                    }
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-600"
                  >
                    Nollställ mynt
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(ownerMassReset(session, waveRole as any, "VARNINGAR"))}
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-600"
                  >
                    Nollställ varningar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setConfirm({
                        title: "TOTAL-RESET för gruppen?",
                        body: `XP, mynt, varningar, tystnad, skugga och osynlighet nollställs för alla i ${waveRole}.`,
                        label: "Reset ALLT",
                        action: () => run(ownerMassReset(session, waveRole as any, "ALLT")),
                      })
                    }
                    className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-600"
                  >
                    <Warning className="h-3.5 w-3.5" /> Reset ALLT
                  </button>
                </div>
              </div>

              {/* Nödbroms */}
              <div className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-red-300">
                  <Ban className="h-4 w-4" /> Nödbroms & amnesti
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Nödbromsen stoppar sändningen, stänger alla LIVE-sessioner och kastar ut alla till inloggningen —
                  utan att banna eller tysta någon.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setConfirm({
                        title: "NÖDBROMS?",
                        body: "Alla utom du kastas ut till inloggningen, sändningen stoppas och alla LIVE-sessioner stängs.",
                        label: "NÖDBROMS",
                        action: () => run(ownerPanic(session)),
                      })
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-500"
                  >
                    <Flame className="h-3.5 w-3.5" /> NÖDBROMS
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(ownerAllClear(session))}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-500"
                  >
                    <Check className="h-3.5 w-3.5" /> Släpp in alla igen
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(ownerKickLive(session))}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-600"
                  >
                    <Video className="h-3.5 w-3.5" /> Stäng alla LIVE
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setConfirm({
                        title: "Amnesti för alla bannar?",
                        body: "Alla bannlysningar tas bort, även de som gäller för alltid.",
                        label: "Amnesti",
                        action: () => run(ownerUnbanAll(session)),
                      })
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-600"
                  >
                    <Check className="h-3.5 w-3.5" /> Unbanna alla
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(ownerWarnAmnesty(session))}
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-600"
                  >
                    Nollställ alla varningar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(ownerKick(session, data.users.map((u: User) => u.id)))}
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-600"
                  >
                    <Refresh className="h-3.5 w-3.5" /> Tvinga alla att logga in
                  </button>
                </div>
              </div>

              {/* Chat-sanering */}
              <div className="rounded-2xl border border-amber-500/30 bg-slate-900/60 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                  <Eraser className="h-4 w-4" /> Chat-sanering
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Raderar meddelanden på riktigt. Ingen ångra-knapp — välj låda med flit.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {([
                    ["global", "Global / Klass"],
                    ["inbox", "Inkorg"],
                    ["staff", "Stabs-kanalen"],
                    ["all", "ALLT"],
                  ] as ["global" | "inbox" | "staff" | "all", string][]).map(([scope, label]) => (
                    <button
                      key={scope}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setConfirm({
                          title: `Rensa ${label}?`,
                          body: "Meddelandena raderas för alltid.",
                          label: "Rensa",
                          action: () => run(ownerPurgeChat(session, scope)),
                        })
                      }
                      className={`rounded-lg px-3 py-1.5 text-sm font-bold text-white ${
                        scope === "all" ? "bg-red-700 hover:bg-red-600" : "bg-slate-700 hover:bg-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
                  <input
                    value={purgeWho}
                    onChange={(e) => setPurgeWho(e.target.value)}
                    placeholder="en persons namn…"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={busy || !purgeWho.trim()}
                    onClick={() =>
                      setConfirm({
                        title: `Rensa allt från ${purgeWho.trim()}?`,
                        body: "Personens meddelanden i gemensamma chattar raderas.",
                        label: "Rensa",
                        action: () => {
                          const who = purgeWho.trim();
                          setPurgeWho("");
                          return run(ownerPurgeChatFrom(session, who));
                        },
                      })
                    }
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-40"
                  >
                    Rensa person
                  </button>
                </div>
              </div>

              {/* Roll-popup */}
              <div className="rounded-2xl border border-amber-500/30 bg-slate-900/60 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                  <Mail className="h-4 w-4" /> Popup till en hel grupp
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Samma popup som ett personligt meddelande, men till alla i gruppen på en gång.
                </p>
                <select
                  value={noteRole}
                  onChange={(e) => setNoteRole(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                >
                  {[
                    ["STUDENT", "Elever"],
                    ["TEACHER", "Lärare"],
                    ["ADMIN", "Admins"],
                    ["SECURITY", "Säkerhet"],
                    ["ALL", "Alla"],
                  ].map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Skriv något gruppen ser nästa gång de är inne…"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={busy || !noteText.trim()}
                  onClick={async () => {
                    const text = noteText;
                    setNoteText("");
                    await run(ownerRoleNote(session, noteRole as any, text));
                  }}
                  className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" /> Skicka popup
                </button>
              </div>

              {/* Logg & historik */}
              <div className="rounded-2xl border border-amber-500/30 bg-slate-900/60 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                  <Scroll className="h-4 w-4" /> Logg & besökshistorik
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Städar gammalt skräp så konsolen förblir snabb. Kvarvarande rader rörs inte.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={pruneDays}
                    onChange={(e) => setPruneDays(e.target.value)}
                    type="number"
                    min={1}
                    max={365}
                    className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-400">dagar</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(ownerPruneLog(session, parseInt(pruneDays, 10) || 30))}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-600"
                  >
                    <Scroll className="h-3.5 w-3.5" /> Städa loggen
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(ownerPruneVisits(session, parseInt(pruneDays, 10) || 30))}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-600"
                  >
                    <Globe className="h-3.5 w-3.5" /> Städa besök
                  </button>
                </div>
              </div>

              {/* Alt-detektor */}
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.04] p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-indigo-300">
                  <Ghost className="h-4 w-4" /> Alt-detektor — samma uppkoppling
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Konton som setts från samma adress. En ledtråd, inte bevis — syskon delar nätverk.
                </p>
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {!powers && <p className="text-sm text-slate-500">Laddar kluster…</p>}
                  {powers && powers.alts.length === 0 && (
                    <p className="text-sm text-slate-500">Inga delade adresser hittade.</p>
                  )}
                  {(powers?.alts ?? []).map((c: any) => (
                    <div key={c.ip} className="rounded-xl border border-white/10 bg-slate-950/50 p-2.5">
                      <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-300">
                        <Globe className="h-3.5 w-3.5 text-indigo-300" />
                        <span data-no-translate className="font-mono">
                          {c.ip}
                        </span>
                        <CopyIp ip={c.ip} />
                        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] text-indigo-200">
                          {c.count} konton{c.online ? ` · ${c.online} online` : ""}
                        </span>
                      </p>
                      {(c.city || c.countryCode) && (
                        <p className="mt-0.5 text-[11px] text-slate-500" data-no-translate>
                          {flagFor(c.countryCode)} {countryName(c.countryCode, c.country)}
                          {c.city ? ` · ${c.city}` : ""}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-400" data-no-translate>
                        {c.users.map((u: any) => u.username).join(" · ")}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(ownerKick(session, c.ids))}
                          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-indigo-500"
                        >
                          <Refresh className="h-3 w-3" /> Kasta ut alla {c.count}
                        </button>
                        {(c.users as any[]).some((u) => u.role === "STUDENT" || u.role === "TEACHER") && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => run(ownerBanSameIp(session, (c.users as any[]).map((u) => u.username), 60))}
                              className="flex items-center gap-1 rounded-lg bg-red-600/90 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-500"
                            >
                              <Ban className="h-3 w-3" /> Banna alla 1 tim
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => run(ownerBanSameIp(session, (c.users as any[]).map((u) => u.username), 1440))}
                              className="flex items-center gap-1 rounded-lg bg-red-700/80 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-600"
                            >
                              <Ban className="h-3 w-3" /> 1 dygn
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setConfirm({
                              title: "Blockera adressen?",
                              body: `${c.ip} stängs för alla. Kontona ovan kastas ut och nya konton på samma nät släpps inte in. Ångra med Avblockera.`,
                              label: "Blockera IP",
                              tone: "red",
                              action: () => run(blockIp(session, c.ip, "Blockerad från alt-detektorn", 0)),
                            })
                          }
                          className="flex items-center gap-1 rounded-lg border border-red-500/40 bg-slate-950/60 px-2 py-1 text-[11px] font-bold text-red-300 hover:bg-red-600/20"
                        >
                          <Ban className="h-3 w-3" /> Blockera IP
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blockerade IP */}
              <div className="rounded-2xl border border-red-500/35 bg-red-500/[0.05] p-4">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-red-300">
                  <Ban className="h-4 w-4" /> Blockerade uppkopplingar
                  <span className="rounded-full bg-red-600/20 px-2 py-0.5 text-[11px] font-bold text-red-200 tabular-nums">
                    {(extra?.blocked ?? []).filter((b: any) => b.active).length} aktiva
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  En IP-spärr gäller nätet, inte kontot: personen kan byta konto och enhet och kommer ändå inte in.
                  Därför slår den också mot delade nät — på en skola kan flera elever ligga bakom samma adress.
                </p>

                <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-slate-950/50 p-2.5">
                  <input
                    value={blockAddr}
                    onChange={(e) => setBlockAddr(e.target.value)}
                    placeholder="83.250.14.77"
                    inputMode="decimal"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-red-400 focus:outline-none"
                  />
                  <input
                    value={blockWhy}
                    onChange={(e) => setBlockWhy(e.target.value)}
                    placeholder="varför (syns för personen)"
                    maxLength={200}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <select
                      value={blockMin}
                      onChange={(e) => setBlockMin(Number(e.target.value))}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-red-400 focus:outline-none"
                    >
                      <option value={0}>Tills vidare</option>
                      <option value={60}>1 tim</option>
                      <option value={1440}>1 dygn</option>
                      <option value={10080}>7 dygn</option>
                    </select>
                    <button
                      type="button"
                      disabled={busy || !blockAddr.trim()}
                      onClick={async () => {
                        await run(blockIp(session, blockAddr, blockWhy, blockMin));
                        setBlockAddr("");
                        setBlockWhy("");
                      }}
                      className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-40"
                    >
                      <Ban className="h-3.5 w-3.5" /> Blockera IP
                    </button>
                  </div>
                </div>

                <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {(extra?.blocked ?? []).length === 0 && (
                    <p className="text-sm text-slate-500">Inga blockerade adresser. Dörren är öppen för alla.</p>
                  )}
                  {(extra?.blocked ?? []).map((b: any) => (
                    <div
                      key={b.id}
                      className={`rounded-lg border px-2.5 py-2 ${
                        b.active ? "border-red-500/30 bg-slate-950/60" : "border-white/[0.06] bg-slate-950/40 opacity-60"
                      }`}
                    >
                      <p className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-mono font-bold text-white" data-no-translate>
                          {b.ip}
                        </span>
                        <CopyIp ip={b.ip} />
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-slate-300">
                          {b.active ? (b.until ? `till ${new Date(b.until).toLocaleString("sv-SE")}` : "för alltid") : "utgången"}
                        </span>
                      </p>
                      {b.reason && (
                        <p className="mt-0.5 text-[11px] italic text-slate-400" data-no-translate>
                          “{b.reason}”
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600" data-no-translate>
                        <span>{b.createdAt ? `blockerad ${new Date(b.createdAt).toLocaleString("sv-SE")}` : ""}</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(unblockIp(session, b.ip))}
                          className="rounded bg-emerald-600 px-2 py-0.5 font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                        >
                          Avblockera
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Senaste besök */}
              <div className="rounded-2xl border border-amber-500/30 bg-slate-900/60 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                  <Globe className="h-4 w-4" /> Spårhunden — senaste besöken
                </p>
                <p className="mt-1 text-xs text-slate-500">De 40 senaste sidbytena, alla användare.</p>
                <div className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1 text-xs">
                  {(powers?.visits ?? []).map((v: any) => (
                    <p key={v.id} className="rounded bg-slate-950/60 px-2 py-1 text-slate-300" data-no-translate>
                      <b className="text-white">{v.username}</b> → {v.path}
                      <span className="ml-1 text-slate-600">
                        · {v.at ? new Date(v.at).toLocaleTimeString("sv-SE") : ""}
                      </span>
                    </p>
                  ))}
                  {powers && powers.visits.length === 0 && <p className="text-slate-600">—</p>}
                </div>
              </div>

              {/* Flaggor */}
              <div className="rounded-2xl border border-amber-500/30 bg-slate-900/60 p-4 lg:col-span-2">
                <p className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                  <Ghost className="h-4 w-4" /> Alla flaggor på ett ställe
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Skuggade, osynliga, frysta, fästa och tystade — med en knapp som tar bort flaggan direkt.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(powers?.flags ?? []).map((f: any) => (
                    <span
                      key={f.id}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/60 px-2.5 py-1.5 text-xs"
                    >
                      <b className="text-white" data-no-translate>
                        {f.username}
                      </b>
                      {f.shadowed && (
                        <button
                          type="button"
                          onClick={() => run(toggleShadow(session, f.id, f.username))}
                          className="rounded bg-indigo-600 px-1.5 py-0.5 font-bold text-white hover:bg-indigo-500"
                        >
                          skugga av
                        </button>
                      )}
                      {f.ghostMode && (
                        <button
                          type="button"
                          onClick={() => run(toggleGhost(session, f.id, f.username))}
                          className="rounded bg-slate-600 px-1.5 py-0.5 font-bold text-white hover:bg-slate-500"
                        >
                          osynlig av
                        </button>
                      )}
                      {f.coinsFrozen && (
                        <button
                          type="button"
                          onClick={() => run(toggleFreezeCoins(session, f.id, f.username))}
                          className="rounded bg-cyan-600 px-1.5 py-0.5 font-bold text-white hover:bg-cyan-500"
                        >
                          tina mynt
                        </button>
                      )}
                      {f.pinned && (
                        <button
                          type="button"
                          onClick={() => run(togglePin(session, f.id, f.username))}
                          className="rounded bg-rose-600 px-1.5 py-0.5 font-bold text-white hover:bg-rose-500"
                        >
                          avfäst
                        </button>
                      )}
                      {f.mutedUntil && (
                        <button
                          type="button"
                          onClick={() => run(unmuteChat(session, f.id, f.username))}
                          className="rounded bg-emerald-600 px-1.5 py-0.5 font-bold text-white hover:bg-emerald-500"
                        >
                          öppna chat
                        </button>
                      )}
                    </span>
                  ))}
                  {powers && powers.flags.length === 0 && (
                    <p className="text-sm text-slate-500">Inga flaggor just nu — allt är rent.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "requests" && (
          <>
            <h1 className="gold-title flex items-center gap-2 text-2xl font-extrabold text-amber-300">
              <Pray className="h-6 w-6" /> Ban-begäranden från admins
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              En admin vill banna längre än 1 dag? Här godkänner eller avslår du — och väljer EXAKT hur länge.
            </p>

            <h2 className="mt-6 flex items-center gap-2 text-lg font-extrabold text-amber-300">
              <Hourglass className="h-5 w-5" /> Väntande ({pending.length})
            </h2>
            <div className="mt-3 space-y-3">
              {pending.length === 0 && <p className="text-slate-500">Inga väntande begäranden. Alla admins sköter sig!</p>}
              {pending.map((r: any) => (
                <div key={r.id} className="gold-glow rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
                  <p className="font-bold text-white">
                    <span className="inline-flex items-center gap-1 text-red-400">
                      <Ban className="h-4 w-4" />
                    </span>{" "}
                    <b data-no-translate>{r.target}</b>{" "}
                    <span className="text-sm font-normal text-slate-400">
                      · begärd av {r.admin} · ville ha {r.minutes <= 0 ? "FÖR ALLTID" : r.minutes + " min"}
                    </span>
                  </p>
                  {r.reason && (
                    <p className="mt-1 text-sm text-slate-300" data-no-translate>
                      "{r.reason}"
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString("sv-SE") : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-400">Godkänn i:</span>
                    {[
                      [60, "1 tim"],
                      [1440, "1 dag"],
                      [2880, "2 dagar"],
                      [10080, "1 vecka"],
                    ].map(([m, label]) => (
                      <button
                        key={m as number}
                        type="button"
                        onClick={() => run(approveBanRequest(session, r.id, m as number))}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-sm font-bold text-white hover:bg-emerald-500"
                      >
                        <Check className="h-3.5 w-3.5" /> {label}
                      </button>
                    ))}
                    <input
                      value={approveMin[r.id] ?? ""}
                      onChange={(e) => setApproveMin((p) => ({ ...p, [r.id]: e.target.value }))}
                      type="number"
                      placeholder="egna min"
                      className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => run(approveBanRequest(session, r.id, parseInt(approveMin[r.id] || "0", 10) || 0))}
                      className="rounded-lg bg-emerald-700 px-3 py-1 text-sm font-bold text-white hover:bg-emerald-600"
                    >
                      Egen tid
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirm({
                          title: "Banna för alltid?",
                          body: `${r.target} blir bannad för alltid.`,
                          label: "FÖR ALLTID",
                          action: () => run(approveBanRequest(session, r.id, 0)),
                        })
                      }
                      className="rounded-lg bg-red-700 px-3 py-1 text-sm font-bold text-white hover:bg-red-600"
                    >
                      FÖR ALLTID
                    </button>
                    <button
                      type="button"
                      onClick={() => run(rejectBanRequest(session, r.id))}
                      className="flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-1 text-sm font-bold text-slate-300 hover:bg-slate-800"
                    >
                      <Cross className="h-3.5 w-3.5" /> Avslå
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {handled.length > 0 && (
              <>
                <h2 className="mt-8 flex items-center gap-2 text-lg font-extrabold text-slate-400">
                  <Scroll className="h-5 w-5" /> Hanterade
                </h2>
                <div className="mt-3 space-y-2">
                  {handled.map((r: any) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-400"
                    >
                      <b className="text-white" data-no-translate>
                        {r.target}
                      </b>{" "}
                      —{" "}
                      {r.status === "APPROVED" ? (
                        <span className="font-bold text-emerald-400">Godkänd</span>
                      ) : (
                        <span className="font-bold text-red-400">Avslagen</span>
                      )}
                      <span className="ml-2 text-xs text-slate-500">
                        · {r.createdAt ? new Date(r.createdAt).toLocaleString("sv-SE") : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "chatspy" && (
          <>
            <h1 className="gold-title flex items-center gap-2 text-2xl font-extrabold text-amber-300">
              <Detective className="h-6 w-6" /> CHATSPANING
            </h1>
            <p className="mt-1 text-sm text-slate-400">Globala chattar, inkorg, stabs-kanaler, DM-förfrågningar. Allt loggas.</p>
            {!chats && <p className="mt-4 text-sm text-slate-500">Kunde inte läsa in chattar.</p>}
            {chats && (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {[
                  { key: "global", title: "Global / Klass", Icon: ChatIcon },
                  { key: "inbox", title: "Inkorg", Icon: Mail },
                  { key: "staff", title: "Stabs-kanaler", Icon: Users },
                  { key: "requests", title: "Chatt-förfrågningar", Icon: Pray },
                ].map((panel) => (
                  <div key={panel.key} className="gold-glow rounded-2xl border border-amber-500/30 bg-slate-900/60 p-4">
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-amber-300">
                      <panel.Icon className="h-4 w-4" /> {panel.title} ({chats[panel.key].length})
                    </h3>
                    <div className="max-h-72 space-y-1 overflow-y-auto pr-1 text-xs">
                      {chats[panel.key].map((m: any) => (
                        <p key={m.id} className="rounded bg-slate-950/40 px-2 py-1" data-no-translate>
                          <b className="text-white">{m.from}</b>
                          {m.about ? ` → ${m.about}` : ""}: {m.text}
                          <span className="ml-1 text-slate-600">
                            · {m.at ? new Date(m.at).toLocaleTimeString("sv-SE") : ""}
                          </span>
                        </p>
                      ))}
                      {chats[panel.key].length === 0 && <p className="text-slate-600">—</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "chat" && (
          <>
            <h1 className="gold-title flex items-center gap-2 text-2xl font-extrabold text-amber-300">
              <ChatIcon className="h-6 w-6" /> Stabs-chatt
            </h1>
            <div className="mt-4 max-w-2xl">
              <StaffChat s={session} accent="bg-amber-600" />
            </div>
          </>
        )}

        {tab === "users" && (
          <>
            <h1 className="gold-title flex items-center gap-2 text-2xl font-extrabold text-amber-300">
              <Users className="h-6 w-6" /> Användare ({data.users.length})
            </h1>
            <div className="mt-4 flex max-w-md items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Sök användare..."
                className="flex-1 bg-transparent text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            <div className="mt-4 space-y-2">
              {filtered.map((u: User) => {
                const online = Boolean(u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < 120000);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectUser(u)}
                    className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition-colors ${
                      sel?.id === u.id ? "border-amber-500 bg-amber-500/10" : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
                    }`}
                  >
                    <span className="flex flex-wrap items-center gap-1.5 font-bold text-white">
                      <Dot online={online} className="h-2.5 w-2.5" />
                      <span data-no-translate>{u.username}</span>
                      {u.bannedUntil && <Ban className="h-3.5 w-3.5 text-red-400" />}
                      {u.livePath && (
                        <span className="rounded bg-emerald-500/10 px-1.5 text-xs font-normal text-emerald-400">
                          {u.livePath}
                        </span>
                      )}
                      <span className="flex items-center gap-1 rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[11px] font-normal text-slate-300">
                        <Globe className="h-3 w-3 text-slate-500" />
                        <span data-no-translate>{u.ip ?? "ingen IP än"}</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-slate-400">
                      {u.role} · Lv {u.level} · {u.xp} XP · {u.coins} <Coins className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 && <p className="text-sm text-slate-500">Ingen användare matchade sökningen.</p>}
            </div>

            {sel && (
              <div className="gold-glow mt-6 rounded-2xl border border-amber-500/40 bg-slate-900/80 p-6">
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                  <Sliders className="h-5 w-5 text-amber-400" />
                  <span data-no-translate>{sel.username}</span>
                </h2>
                {sel.secretNote && (
                  <p className="mt-2 rounded-lg bg-yellow-500/10 px-3 py-2 text-sm italic text-yellow-400" data-no-translate>
                    {sel.secretNote}
                  </p>
                )}

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {/* XP / coins / level */}
                  <div className="rounded-xl border border-slate-800 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                      <Coins className="h-4 w-4 text-amber-400" /> XP & mynt & nivå
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        value={xpAmt}
                        onChange={(e) => setXpAmt(e.target.value)}
                        className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => run(giveXP(session, sel.id, sel.username, parseInt(xpAmt, 10) || 0))}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-bold text-white hover:bg-emerald-500"
                      >
                        +XP
                      </button>
                      <button
                        type="button"
                        onClick={() => run(giveXP(session, sel.id, sel.username, -(parseInt(xpAmt, 10) || 0)))}
                        className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white hover:bg-red-500"
                      >
                        -XP
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        value={coinAmt}
                        onChange={(e) => setCoinAmt(e.target.value)}
                        className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => run(giveCoins(session, sel.id, sel.username, parseInt(coinAmt, 10) || 0))}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-bold text-white hover:bg-emerald-500"
                      >
                        +mynt
                      </button>
                      <button
                        type="button"
                        onClick={() => run(giveCoins(session, sel.id, sel.username, -(parseInt(coinAmt, 10) || 0)))}
                        className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white hover:bg-red-500"
                      >
                        -mynt
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        value={lvl}
                        onChange={(e) => setLvl(e.target.value)}
                        type="number"
                        placeholder="nivå"
                        className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => run(setLevel(session, sel.id, sel.username, parseInt(lvl, 10) || 1))}
                        className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1 text-sm font-bold text-white hover:bg-amber-500"
                      >
                        <Sliders className="h-3.5 w-3.5" /> Sätt nivå
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
                      <button
                        type="button"
                        onClick={() => run(resetXP(session, sel.id, sel.username))}
                        className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1 text-sm font-bold text-white hover:bg-slate-600"
                      >
                        <Refresh className="h-3.5 w-3.5" /> Reset XP
                      </button>
                      <button
                        type="button"
                        onClick={() => run(resetCoins(session, sel.id, sel.username))}
                        className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1 text-sm font-bold text-white hover:bg-slate-600"
                      >
                        <Refresh className="h-3.5 w-3.5" /> Reset mynt
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirm({
                            title: "TOTAL-RESET?",
                            body: `XP, mynt och varningar nollställs för ${sel.username}.`,
                            label: "Nollställ allt",
                            action: () => run(resetAll(session, sel.id, sel.username)),
                          })
                        }
                        className="flex items-center gap-1 rounded-lg bg-red-700 px-3 py-1 text-sm font-bold text-white hover:bg-red-600"
                      >
                        <Warning className="h-3.5 w-3.5" /> Reset ALLT
                      </button>
                    </div>
                  </div>

                  {/* name + role + live */}
                  <div className="rounded-xl border border-slate-800 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                      <Pencil className="h-4 w-4 text-amber-400" /> Byt namn & roll
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => run(renameUser(session, sel.id, sel.username, newName))}
                        className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-bold text-white hover:bg-amber-500"
                      >
                        Spara
                      </button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={role}
                        onChange={(e) => setRoleChoice(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white focus:border-amber-400 focus:outline-none"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => run(setRole(session, sel.id, sel.username, role))}
                        className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-bold text-white hover:bg-amber-500"
                      >
                        Sätt roll
                      </button>
                    </div>
                    <div className="mt-3 border-t border-slate-800 pt-3">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                        <Video className="h-4 w-4 text-red-400" /> LIVE-skärmdelning
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          const pid = "qk-staff-" + Date.now();
                          try {
                            await requestLive(session, sel.id, sel.username, pid);
                          } catch {
                            setInfo("Nätverksfel — försök igen.");
                            return;
                          }
                          setLiveFor({ username: sel.username, pid });
                          setInfo(`LIVE-förfrågan skickad till ${sel.username}!`);
                        }}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-500"
                      >
                        <Video className="h-4 w-4" /> Be om LIVE-skärm
                      </button>
                    </div>
                  </div>

                  {/* ban */}
                  <div className="rounded-xl border border-slate-800 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                      <Ban className="h-4 w-4 text-red-400" /> Banna
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        [5, "5 min"],
                        [60, "1 tim"],
                        [1440, "24 tim"],
                      ].map(([m, label]) => (
                        <button
                          key={m as number}
                          type="button"
                          onClick={() => run(banUser(session, sel.username, m as number, banMsg))}
                          className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white hover:bg-red-500"
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setConfirm({
                            title: "Banna för alltid?",
                            body: `${sel.username} blir bannad för alltid.`,
                            label: "FÖR ALLTID",
                            action: () => run(banUser(session, sel.username, 0, banMsg)),
                          })
                        }
                        className="rounded-lg bg-red-700 px-3 py-1 text-sm font-bold text-white hover:bg-red-600"
                      >
                        FÖR ALLTID
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        value={banMin}
                        onChange={(e) => setBanMin(e.target.value)}
                        placeholder="egna minuter"
                        className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => run(banUser(session, sel.username, parseInt(banMin, 10) || 5, banMsg))}
                        className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white hover:bg-red-500"
                      >
                        Banna
                      </button>
                    </div>
                    <input
                      value={banMsg}
                      onChange={(e) => setBanMsg(e.target.value)}
                      placeholder="meddelande (valfritt)"
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => run(unbanUser(session, sel.username))}
                      className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-sm font-bold text-white hover:bg-emerald-500"
                    >
                      <Check className="h-3.5 w-3.5" /> Unbanna
                    </button>
                  </div>

                  {/* password & email */}
                  <div className="rounded-xl border border-slate-800 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                      <Key className="h-4 w-4 text-amber-400" /> Lösenord & email
                    </p>
                    <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                      Meddela med popup
                    </label>
                    <input
                      value={customPw}
                      onChange={(e) => setCustomPw(e.target.value)}
                      placeholder="eget lösenord (valfritt, 6+ tecken)"
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          run(resetPassword(session, sel.id, sel.username, notify, customPw));
                          setCustomPw("");
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1 text-sm font-bold text-white hover:bg-amber-500"
                      >
                        <Lock className="h-3.5 w-3.5" /> Återställ
                      </button>
                      <button
                        type="button"
                        onClick={() => run(getEmail(session, sel.id, sel.username))}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-sm font-bold text-white hover:bg-blue-500"
                      >
                        <Mail className="h-3.5 w-3.5" /> Visa email
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirm({
                          title: "Radera användare?",
                          body: `${sel.username} raderas för alltid, tillsammans med kontot.`,
                          label: "RADERA",
                          action: () => run(deleteUser(session, sel.id, sel.username)),
                        })
                      }
                      className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1 text-sm font-bold text-white hover:bg-red-600"
                    >
                      <Eraser className="h-3.5 w-3.5" /> RADERA ANVÄNDARE
                    </button>
                  </div>

                  {/* superpowers */}
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                      <Sparkles className="h-4 w-4" /> Superpowers (endast ÄGARE)
                    </p>

                    <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <Ghost className="h-3.5 w-3.5" /> Övervakning & osynlig
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => run(toggleShadow(session, sel.id, sel.username))}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1 text-xs font-bold text-white hover:bg-indigo-500"
                      >
                        <Ghost className="h-3 w-3" /> Skugga (osynlig på topplistan)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimeMachine("30")}
                        className="flex items-center gap-1 rounded-lg bg-teal-600 px-2 py-1 text-xs font-bold text-white hover:bg-teal-500"
                      >
                        <Hourglass className="h-3 w-3" /> Tidsmaskin
                      </button>
                      <button
                        type="button"
                        onClick={() => run(peekIP(session, sel.id, sel.username))}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                      >
                        <Globe className="h-3 w-3" /> IP-peek
                      </button>
                    </div>

                    <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <Coins className="h-3.5 w-3.5" /> Mynt & bonus
                    </p>
                    {/* Honest label: these two write a flag, but QuizKeen has no
                        coin spending and no daily bonus yet, so nothing obeys it.
                        Better a visible note than a button that quietly does nothing. */}
                    <p className="mt-1 flex items-start gap-1.5 rounded-lg bg-slate-800/70 px-2 py-1.5 text-[11px] font-bold text-slate-400">
                      <Warning className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                      Frys mynt och Daglig bonus är <b className="text-amber-300">inte aktiva än</b> — QuizKeen har ingen
                      mynt-utgift och ingen daglig bonus, så flaggan sparas men inget ändras.
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => run(toggleFreezeCoins(session, sel.id, sel.username))}
                        title="Inte aktiv än — ingen mynt-utgift finns i QuizKeen"
                        className="flex items-center gap-1 rounded-lg bg-cyan-600 px-2 py-1 text-xs font-bold text-white hover:bg-cyan-500"
                      >
                        <Snowflake className="h-3 w-3" /> Frys mynt
                      </button>
                      <button
                        type="button"
                        onClick={() => run(toggleDailyBonus(session, sel.id, sel.username))}
                        title="Inte aktiv än — ingen daglig bonus finns i QuizKeen"
                        className="flex items-center gap-1 rounded-lg bg-orange-600 px-2 py-1 text-xs font-bold text-white hover:bg-orange-500"
                      >
                        <Gift className="h-3 w-3" /> Daglig bonus
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirm({
                            title: "Kasta ut användaren?",
                            body: `${sel.username} måste logga in igen.`,
                            label: "Kasta ut",
                            tone: "amber",
                            action: () => run(forceRelogin(session, sel.id, sel.username)),
                          })
                        }
                        className="flex items-center gap-1 rounded-lg bg-fuchsia-600 px-2 py-1 text-xs font-bold text-white hover:bg-fuchsia-500"
                      >
                        <Refresh className="h-3 w-3" /> Tvinga ny inloggning
                      </button>
                    </div>

                    <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <Flame className="h-3.5 w-3.5" /> Hemlig anteckning (bara personal)
                    </p>
                    <div className="mt-1 flex gap-1">
                      <input
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        placeholder="skriv en anteckning..."
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => run(setSecretNote(session, sel.id, sel.username, secret))}
                        className="rounded-lg bg-yellow-600 px-2 py-1 text-xs font-bold text-white hover:bg-yellow-500"
                      >
                        Spara
                      </button>
                    </div>
                  </div>

                  {/* Adresshistorik */}
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 lg:col-span-2">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-emerald-300">
                      <Globe className="h-4 w-4" /> Adresshistorik — varje uppkoppling kontot använt
                      <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-bold text-slate-300 tabular-nums">
                        {ipHistory?.length ?? 0} adresser
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Allt som sparats, inte bara den senaste. <b className="text-slate-300">Blockera uppkopplingen</b> stänger
                      dörren för hela nätet — nya konton därifrån släpps inte in heller.
                    </p>
                    <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                      {ipHistory === null && <p className="text-sm text-slate-500">Laddar adresser…</p>}
                      {ipHistory?.length === 0 && (
                        <p className="text-sm text-slate-500">
                          Ingen adress sparad än — personen måste vara inloggad i QuizKeen en stund.
                        </p>
                      )}
                      {(ipHistory ?? []).map((h: any) => (
                        <div key={h.ip} className="rounded-lg border border-white/[0.06] bg-slate-950/50 px-2.5 py-2">
                          <p className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-mono font-bold text-white" data-no-translate>
                              {h.ip}
                            </span>
                            <CopyIp ip={h.ip} />
                            {h.blocked && (
                              <span className="rounded-full bg-red-600/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                                BLOCKERAD
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500" data-no-translate>
                            {flagFor(h.countryCode)} {countryName(h.countryCode, h.country)}
                            {h.city ? ` · ${h.city}` : ""}
                            {" · "}först {new Date(h.firstAt).toLocaleString("sv-SE")}
                            {" · "}senast {new Date(h.lastAt).toLocaleString("sv-SE")}
                            {h.hits > 1 ? ` · ${h.hits} gånger` : ""}
                          </p>
                          <div className="mt-1.5">
                            {h.blocked ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={async () => {
                                  await run(unblockIp(session, h.ip));
                                  await refreshIps();
                                }}
                                className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                              >
                                <Check className="h-3 w-3" /> Avblockera
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  setConfirm({
                                    title: "Blockera uppkopplingen?",
                                    body: `${h.ip} blockeras tills vidare. Alla konton som sitter på den adressen kastas ut, och nya konton därifrån släpps inte in. Du kan häva det härifrån eller under Superkrafter.`,
                                    label: "Blockera",
                                    tone: "red",
                                    action: async () => {
                                      await run(blockIp(session, h.ip, "Blockerad av ägaren", 0));
                                      await refreshIps();
                                    },
                                  })
                                }
                                className="flex items-center gap-1 rounded bg-red-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-600 disabled:opacity-40"
                              >
                                <Ban className="h-3 w-3" /> Blockera uppkopplingen
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Keen-valvet */}
                  <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.05] p-4 lg:col-span-2">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-violet-300">
                      <Sparkles className="h-4 w-4" /> Keen-valvet (endast ägare)
                      <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-bold text-slate-300 tabular-nums">
                        {VAULT_KEENS.filter((k) => vault.some((v) => v.keenId === k.id)).length} / {VAULT_KEENS.length} ägda
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Alla Keens som finns i spelet. <b className="text-slate-300">Ge</b> lägger en i samlingen direkt (en till
                      blir en dublett), <b className="text-slate-300">Ta bort</b> tar en kopia. Ägar-Keenen kan bara delas ut
                      härifrån; Admin-Keenen finns också i adminpanelen.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        value={vaultQ}
                        onChange={(e) => setVaultQ(e.target.value)}
                        placeholder="Sök Keen…"
                        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
                      />
                      <select
                        value={vaultShelf}
                        onChange={(e) => setVaultShelf(e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
                      >
                        <option value="all">Alla paket</option>
                        {VAULT_SHELVES.map((sh) => (
                          <option key={sh.id} value={sh.id}>
                            {sh.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-3 grid max-h-72 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 2xl:grid-cols-3">
                      {VAULT_KEENS.filter(
                        (k) =>
                          (vaultShelf === "all" || k.pack === vaultShelf) &&
                          (!vaultQ.trim() ||
                            `${k.name} ${k.id}`.toLowerCase().includes(vaultQ.trim().toLowerCase()))
                      ).map((k) => {
                        const owned = vault.find((v) => v.keenId === k.id)?.count ?? 0;
                        return (
                          <div
                            key={k.id}
                            className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-slate-950/50 px-2 py-1.5"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- local, fixed-size art */}
                            <img
                              src={keenArtSrc(k.id)}
                              alt=""
                              width={36}
                              height={36}
                              draggable={false}
                              className="h-9 w-9 shrink-0 rounded-lg object-contain"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-bold text-white" data-no-translate>
                                {k.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    RARITY_TONE[k.rarity] ?? "bg-white/10 text-slate-300"
                                  }`}
                                >
                                  {RARITY_LABEL[k.rarity] ?? k.rarity}
                                </span>
                                {owned > 0 && (
                                  <span className="text-[10px] font-bold text-emerald-300 tabular-nums">har ×{owned}</span>
                                )}
                              </span>
                            </span>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={async () => {
                                await run(ownerGiveKeen(session, sel.id, sel.username, k.id));
                                await refreshVault();
                              }}
                              className="rounded bg-violet-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-violet-500 disabled:opacity-40"
                            >
                              Ge
                            </button>
                            {owned > 0 && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={async () => {
                                  await run(ownerTakeKeen(session, sel.id, sel.username, k.id));
                                  await refreshVault();
                                }}
                                className="rounded bg-slate-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-slate-600 disabled:opacity-40"
                              >
                                Ta bort
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {VAULT_KEENS.filter(
                        (k) =>
                          (vaultShelf === "all" || k.pack === vaultShelf) &&
                          (!vaultQ.trim() ||
                            `${k.name} ${k.id}`.toLowerCase().includes(vaultQ.trim().toLowerCase()))
                      ).length === 0 && (
                        <p className="text-sm text-slate-500">Ingen Keen matchade sökningen.</p>
                      )}
                    </div>
                  </div>

                  {/* staff powers */}
                  <div className="rounded-xl border border-slate-800 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                      <Shield className="h-4 w-4 text-sky-400" /> Stabskrafter (delas med admin/säkerhet)
                    </p>

                    <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <Mute className="h-3.5 w-3.5" /> Tysta chatten
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => run(muteChat(session, sel.id, sel.username, 60))}
                        className="rounded-lg bg-purple-600 px-2 py-1 text-xs font-bold text-white hover:bg-purple-500"
                      >
                        1 tim
                      </button>
                      <button
                        type="button"
                        onClick={() => run(muteChat(session, sel.id, sel.username, 1440))}
                        className="rounded-lg bg-purple-600 px-2 py-1 text-xs font-bold text-white hover:bg-purple-500"
                      >
                        1 dag
                      </button>
                      <button
                        type="button"
                        onClick={() => run(muteChat(session, sel.id, sel.username, 0))}
                        className="rounded-lg bg-purple-700 px-2 py-1 text-xs font-bold text-white hover:bg-purple-600"
                      >
                        FÖR ALLTID
                      </button>
                      <button
                        type="button"
                        onClick={() => run(unmuteChat(session, sel.id, sel.username))}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                      >
                        <Sound className="h-3 w-3" /> Öppna igen
                      </button>
                    </div>

                    <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <Pin className="h-3.5 w-3.5" /> Fäst (högst upp på listan)
                    </p>
                    <div className="mt-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => run(togglePin(session, sel.id, sel.username))}
                        className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white hover:bg-rose-500"
                      >
                        Växla fäst
                      </button>
                    </div>
                  </div>

                  {/* messages */}
                  <div className="rounded-xl border border-slate-800 p-4 lg:col-span-2">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                      <Note className="h-4 w-4 text-amber-400" /> Personligt meddelande (popup för BARA denna användare)
                    </p>
                    <textarea
                      value={pNote}
                      onChange={(e) => setPNote(e.target.value)}
                      rows={2}
                      placeholder="Skriv något bara denna personen ser..."
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          run(sendPersonalNote(session, sel.id, sel.username, pNote));
                          setPNote("");
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1 text-sm font-bold text-white hover:bg-amber-500"
                      >
                        <Mail className="h-3.5 w-3.5" /> Skicka popup
                      </button>
                      <button
                        type="button"
                        onClick={() => run(clearPersonalNote(session, sel.id, sel.username))}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1 text-sm font-bold text-white hover:bg-slate-600"
                      >
                        <Eraser className="h-3.5 w-3.5" /> Rensa popup
                      </button>
                      <button
                        type="button"
                        onClick={() => run(requestRename(session, sel.id, sel.username))}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-sm font-bold text-white hover:bg-indigo-500"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Be om namnbyte (LÅSER sajten)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "broadcast" && (
          <>
            <h1 className="gold-title flex items-center gap-2 text-2xl font-extrabold text-amber-300">
              <Megaphone className="h-6 w-6" /> Sändning & nödläge
            </h1>

            {/* What is on screen right now. Without this the box below looked
                empty even while a notice was live. */}
            <div
              className={`mt-4 max-w-xl rounded-xl border px-4 py-3 text-sm ${
                isLive
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                  : "border-slate-700 bg-slate-900/60 text-slate-400"
              }`}
            >
              {isLive ? (
                <>
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                    LIVE — syns för alla, även de som inte är inloggade
                    {liveMs !== null && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-200">
                        {timeLeftLabel(liveMs)} kvar
                      </span>
                    )}
                  </p>
                  <p className="mt-1 break-words text-amber-100/80">“{liveText}”</p>
                </>
              ) : (
                <p>Ingen sändning just nu — den gula banderollen är tom.</p>
              )}
            </div>

            <textarea
              value={bc}
              onChange={(e) => {
                bcDirty.current = true;
                setBc(e.target.value);
              }}
              rows={3}
              maxLength={300}
              placeholder="Skriv ett meddelande som ALLA ser — även de som inte är inloggade..."
              className="mt-4 w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                <Clock className="h-4 w-4 text-amber-400" /> Längd:
              </span>
              {DURATIONS.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setBcMin(d.minutes)}
                  aria-pressed={bcMin === d.minutes}
                  className={`rounded-xl px-3 py-1.5 text-sm font-bold transition-colors ${
                    bcMin === d.minutes
                      ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-900/40"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!bc.trim() || busy}
                onClick={() => {
                  bcDirty.current = false;
                  run(setBroadcast(session, bc, bcMin));
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Megaphone className="h-4 w-4" /> Sänd
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  bcDirty.current = false;
                  setBc("");
                  run(stopBroadcast(session));
                }}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2 font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Ban className="h-4 w-4" /> Stoppa sändning
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {bcMin === null
                ? "Ligger kvar högst upp tills du trycker på Stoppa sändning."
                : `Försvinner av sig själv efter ${bcMin} min — även om du stänger konsolen.`}
            </p>

            <div className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/5 p-6">
              <p className="flex items-center gap-1.5 font-bold text-red-400">
                <Warning className="h-4 w-4" /> Nödläge — stäng hela sajten
              </p>
              <button
                type="button"
                onClick={() =>
                  data.settings.shutdown
                    ? run(setShutdown(session, false))
                    : setConfirm({
                        title: "STÄNG sajten?",
                        body: "Alla användare möts av underhållsskärmen tills du öppnar igen.",
                        label: "STÄNG",
                        action: () => run(setShutdown(session, true)),
                      })
                }
                className={`mt-3 flex items-center gap-1.5 rounded-xl px-5 py-2 font-bold text-white ${
                  data.settings.shutdown ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
                }`}
              >
                {data.settings.shutdown ? <Check className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                {data.settings.shutdown ? "Öppna sajten" : "STÄNG sajten"}
              </button>
            </div>
          </>
        )}

        {tab === "codes" && (
          <>
            <h1 className="gold-title flex items-center gap-2 text-2xl font-extrabold text-amber-300">
              <Keypad className="h-6 w-6" /> Koder
            </h1>
            <div className="mt-4 max-w-md space-y-3">
              {[
                ["o", "Ägarkod", Crown],
                ["a", "Admin-kod", Shield],
                ["sec", "Säkerhetskod", Detective],
              ].map(([k, label, Icon]: any) => (
                <div key={k}>
                  <p className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                    <Icon className="h-4 w-4 text-amber-400" /> {label}
                  </p>
                  <input
                    value={(codes as any)[k]}
                    maxLength={8}
                    onChange={(e) => {
                      codesDirty.current = true;
                      setCodes((c) => ({ ...c, [k]: e.target.value.replace(/\D/g, "").slice(0, 8) }));
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 tracking-[0.3em] text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              ))}
              <p className="text-xs text-slate-500">Alla koder måste vara exakt 8 siffror.</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const r: any = await changeCodes(session, codes.o, codes.a, codes.sec);
                    if (r?.newOwner) {
                      localStorage.setItem("cmd_session", JSON.stringify({ role: "OWNER", code: r.newOwner }));
                      setSession({ role: "OWNER", code: r.newOwner });
                    }
                  } catch {
                    setInfo("Nätverksfel — försök igen.");
                    return;
                  }
                  // Saved: let the next refresh adopt the stored codes again.
                  codesDirty.current = false;
                  await load(session);
                  setInfo("Koderna är sparade.");
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 font-bold text-white hover:bg-amber-500"
              >
                <Key className="h-4 w-4" /> Spara koder
              </button>
            </div>
          </>
        )}

        {tab === "log" && (
          <>
            <h1 className="gold-title flex items-center gap-2 text-2xl font-extrabold text-amber-300">
              <Scroll className="h-6 w-6" /> Logg
            </h1>
            <div className="mt-4 space-y-1">
              {data.log.map((l: any, i: number) => (
                <p key={i} className="rounded-lg bg-slate-900/60 px-4 py-2 text-sm text-slate-300" data-no-translate>
                  <b className={l.username?.startsWith("[") ? "text-amber-300" : "text-white"}>{l.username}</b> {l.action}
                  <span className="ml-2 text-xs text-slate-500">
                    {l.createdAt ? new Date(l.createdAt).toLocaleString("sv-SE") : ""}
                  </span>
                </p>
              ))}
            </div>
          </>
        )}

        {tab === "help" && <HelpPanel kind="OWNER" />}
      </main>

      <HelpButton kind="OWNER" />

      {timeMachine && sel && (
        <PromptModal
          title={`Tidsmaskin — ${sel.username}`}
          label="Visa senaste X minuterna"
          value={timeMachine}
          onChange={setTimeMachine}
          onCancel={() => setTimeMachine(null)}
          onSubmit={async () => {
            const mins = parseInt(timeMachine, 10) || 30;
            setTimeMachine(null);
            setBusy(true);
            try {
              const r = await getTimeMachine(session, sel.username, mins);
              setInfo(r.info || "");
            } catch {
              setInfo("Nätverksfel — försök igen.");
            } finally {
              setBusy(false);
            }
          }}
          tone="amber"
          submitLabel="Visa"
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.label}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const action = confirm.action;
            setConfirm(null);
            action();
          }}
        />
      )}
    </div>
  );
}

/**
 * Copies an address to the clipboard — the first step of every ban report,
 * support mail and blocklist. A masked address cannot be pasted anywhere.
 */
function CopyIp({ ip }: { ip: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1500);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      title="Kopiera IP-adressen"
      onClick={() => navigator.clipboard?.writeText(ip).then(() => setDone(true), () => {})}
      className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
    >
      {done ? "kopierad ✓" : "kopiera"}
    </button>
  );
}
