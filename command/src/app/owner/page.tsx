"use client";

import { useEffect, useState } from "react";
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
  setSecretNote,
  forceRelogin,
  getTimeMachine,
  peekIP,
  toggleDailyBonus,
  togglePin,
  spyOnChats,
} from "../actions";
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
  Help,
} from "../../components/icons";

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
};

type TabId = "stats" | "requests" | "chatspy" | "chat" | "users" | "broadcast" | "codes" | "log" | "help";

const TABS: { id: TabId; Icon: typeof Crown; label: string }[] = [
  { id: "stats", Icon: Chart, label: "Översikt" },
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
  const [codes, setCodes] = useState({ o: "", a: "", sec: "" });
  const [approveMin, setApproveMin] = useState<Record<string, string>>({});
  const [lvl, setLvl] = useState("1");
  const [pNote, setPNote] = useState("");
  const [chats, setChats] = useState<any>(null);
  const [secret, setSecret] = useState("");
  const [timeMachine, setTimeMachine] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

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

  async function load(s: any) {
    if (!s) return;
    try {
      const [d, ex] = await Promise.all([getOwnerData(s), getOwnerExtra(s)]);
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
      setBc(d.settings?.broadcast ?? "");
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
      <div className="flex min-h-screen items-center justify-center gap-2 bg-slate-950 text-amber-300">
        <Crown className="h-5 w-5 animate-pulse" />
        Laddar tronen...
      </div>
    );
  }

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
              className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors ${
                tab === t.id ? "bg-amber-600 text-white" : "text-slate-400 hover:bg-slate-800"
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
          <div className="gold-glow fixed bottom-4 right-4 z-[110] flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-extrabold text-white">
            <Clock className="h-4 w-4 animate-pulse" /> Jobbar...
          </div>
        )}

        {info && (
          <div className="gold-glow mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-300">
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
              {statCards.map(([label, val, Icon]) => (
                <div key={label} className="gold-glow rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <Icon className="h-4 w-4 text-amber-400" /> {label}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-amber-300">{val}</p>
                </div>
              ))}
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
            <textarea
              value={bc}
              onChange={(e) => setBc(e.target.value)}
              rows={3}
              placeholder="Skriv ett meddelande som ALLA användare ser..."
              className="mt-4 w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => run(setBroadcast(session, bc))}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 font-bold text-white hover:bg-amber-500"
              >
                <Megaphone className="h-4 w-4" /> Sänd
              </button>
              <button
                type="button"
                onClick={() => {
                  setBc("");
                  run(setBroadcast(session, ""));
                }}
                className="flex items-center gap-1.5 rounded-xl bg-slate-700 px-5 py-2 font-bold text-white hover:bg-slate-600"
              >
                <Eraser className="h-4 w-4" /> Rensa
              </button>
            </div>

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
                    onChange={(e) =>
                      setCodes((c) => ({ ...c, [k]: e.target.value.replace(/\D/g, "").slice(0, 8) }))
                    }
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
