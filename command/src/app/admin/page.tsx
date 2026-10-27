"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminData,
  adminBan,
  adminUnban,
  adminBlockIp,
  adminUnblockIp,
  adminRequestBan,
  adminGiveXP,
  adminGiveCoins,
  adminSelfGift,
  adminSetBroadcast,
  adminStopBroadcast,
  adminGiveAdminKeen,
  adminKeenHoldersList,
  requestLive,
  muteChat,
  togglePin,
  setSecretNote,
  spyOnChats,
  adminRewardWave,
  adminRoleNote,
  adminCoinLedger,
} from "../actions";
import StaffChat from "../../components/staff-chat";
import { SeatBadge, SeatLocked, useConsoleSeat } from "../../components/seat-guard";
import { ADMIN_KEEN_ID, ADMIN_KEENS, keenArtSrc } from "../../lib/keen-catalogue";
import LiveViewer from "../../components/live-viewer";
import PromptModal from "../../components/prompt-modal";
import { HelpButton, HelpPanel } from "../../components/help-guide";
import {
  Shield,
  Users,
  Detective,
  Megaphone,
  Chat as ChatIcon,
  Scroll,
  Ban,
  Check,
  Gift,
  Video,
  Mute,
  Pin,
  Note,
  Pray,
  Inbox,
  Handshake,
  Dot,
  Clock,
  Help,
  Cross,
  Sparkles,
  Send,
  Coins,
} from "../../components/icons";
import { CountUp } from "../../components/motion";
import { ConsoleHero, IpLine, Panel, SectionHead, SearchField, ToolButton, ToolGroup } from "../../components/ui";
import { GIFT_COINS } from "../../lib/gift";

type S = { role: string; code: string };
type NavId = "users" | "chats" | "broadcast" | "chat" | "keen" | "tools" | "log" | "help";



/** How long a sändning may run. `null` = until somebody stops it. */
const BROADCAST_DURATIONS: { label: string; minutes: number | null }[] = [
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

/** "1:58:12" — time left on the admin's two-hour gift. */
function giftLeft(iso: string): string {
  const total = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = m.toString().padStart(2, "0");
  return h ? `${h}:${mm}:${sec.toString().padStart(2, "0")}` : `${m}:${sec.toString().padStart(2, "0")}`;
}

const QUICK = [
  { label: "5 min", min: 5 },
  { label: "1 tim", min: 60 },
  { label: "1 dag", min: 1440 },
];

export default function AdminPage() {
  const router = useRouter();
  // Whose seat this is, according to the server and not to `localStorage`.
  const { state: seatState } = useConsoleSeat("ADMIN");
  const [s, setS] = useState<S | null>(null);
  const [data, setData] = useState<any>(null);
  const [info, setInfo] = useState("");
  const [liveFor, setLiveFor] = useState<any>(null);
  const [bc, setBc] = useState("");
  const [bcMin, setBcMin] = useState<number | null>(10);
  // The section re-reads everything every 20 s; this keeps that refresh from
  // wiping a half-written sändning.
  const bcDirty = useRef(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [section, setSection] = useState<NavId>("users");
  const [chats, setChats] = useState<any>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  // Admin-Keens: which one the panel is handing out, who to give it to, whose
  // name to search for, and who already has the selected one.
  const [kq, setKq] = useState("");
  const [adminKeenId, setAdminKeenId] = useState(ADMIN_KEEN_ID);
  const [keenFor, setKeenFor] = useState<any>(null);
  const [holders, setHolders] = useState<string[]>([]);
  const adminKeen = ADMIN_KEENS.find((k) => k.id === adminKeenId) ?? ADMIN_KEENS[0];

  // styled replacements for window.prompt()
  const [gift, setGift] = useState<{ user: any; amount: string } | null>(null);
  const [mute, setMute] = useState<{ user: any; minutes: string } | null>(null);
  const [coinGift, setCoinGift] = useState<{ user: any; amount: string } | null>(null);
  // IP-spärr: the address comes from the row, so the dialog only asks how long
  // and why. Kept apart from the ban modal because its warning is different —
  // this one covers the network, not just the account.
  const [ipBan, setIpBan] = useState<{ user: any; minutes: string; reason: string } | null>(null);
  const [note, setNote] = useState<{ user: any; text: string } | null>(null);
  const [askFor, setAskFor] = useState<string | null>(null);
  const [askMin, setAskMin] = useState("2880");
  const [askReason, setAskReason] = useState("");
  // Verktyg: the small extras an admin has — one wave a day, a group popup and
  // a read-only view of today's coin ledger.
  const [noteRole, setNoteRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [noteText, setNoteText] = useState("");
  const [ledger, setLedger] = useState<any>(null);

  useEffect(() => {
    let sess: S | null = null;
    try {
      sess = JSON.parse(localStorage.getItem("cmd_session") || "null");
    } catch {
      sess = null;
    }
    if (!sess || sess.role !== "ADMIN") {
      router.replace("/");
      return;
    }
    setS(sess);
    let alive = true;
    async function pull() {
      try {
        const d = await getAdminData(sess!);
        if (!alive) return;
        if (d) {
          setData(d);
          if (!bcDirty.current) setBc(d.settings?.broadcast ?? "");
        } else router.replace("/");
      } catch {
        if (alive) setInfo("Kunde inte läsa in data. Försök igen.");
      }
    }
    pull();
    const iv = setInterval(pull, 20000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [router]);

  useEffect(() => {
    if (section !== "chats" || !s) return;
    spyOnChats(s).then(setChats).catch(() => setChats(null));
  }, [section, s]);

  useEffect(() => {
    if (section !== "tools" || !s) return;
    adminCoinLedger(s).then(setLedger).catch(() => setLedger(null));
  }, [section, s]);

  // One-second clock for the countdown on a timed sändning.
  useEffect(() => {
    const iv = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Loaded when the section is opened, and again after every grant, so the
  // badges never claim someone is missing a Keen they were just given.
  const loadHolders = async (sess: S | null, keenId: string = adminKeenId) => {
    if (!sess) return;
    try {
      const r = await adminKeenHoldersList(sess, keenId);
      if (r?.ok) setHolders(r.holders ?? []);
    } catch {
      /* leave the last known badges in place */
    }
  };

  useEffect(() => {
    if (section !== "keen" || !s) return;
    let alive = true;
    // Clear first: the badges belong to one Keen, and a stale list would say
    // someone already has the card you just switched to.
    setHolders([]);
    adminKeenHoldersList(s, adminKeenId)
      .then((r) => {
        if (alive && r?.ok) setHolders(r.holders ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [section, s, adminKeenId]);

  async function refresh() {
    if (!s) return;
    try {
      const d = await getAdminData(s);
      if (d) setData(d);
    } catch {
      /* keep the last good snapshot */
    }
  }

  /** Run a staff action without ever letting a network hiccup crash the page. */
  async function run(p: Promise<any>, fallback = "") {
    setBusy(true);
    try {
      const r = await p;
      if (r?.info) setInfo(r.info);
      else if (fallback) setInfo(fallback);
    } catch {
      setInfo("Nätverksfel — försök igen.");
    } finally {
      setBusy(false);
      await refresh();
    }
  }

  if (seatState === "denied") return <SeatLocked need="ADMIN" />;

  if (!s || !data) {
    return (
      <div className="flex min-h-screen animate-cmd-fade items-center justify-center gap-3 bg-slate-950 text-slate-400">
        <span className="relative grid h-12 w-12 place-items-center">
          <span className="absolute inset-1 animate-cmd-pulse-ring rounded-full border-2 border-red-500/70" />
          <Shield className="h-6 w-6 animate-cmd-breathe text-red-400" />
        </span>
        Laddar RÖD KONSOL...
      </div>
    );
  }

  // What is live right now. A notice whose time has passed counts as gone,
  // even if this console has not re-read the settings yet.
  const liveText: string = data.settings?.broadcast ?? "";
  const liveUntil: string | null = data.settings?.broadcastUntil ?? null;
  const liveMs = liveUntil ? new Date(liveUntil).getTime() - nowTick : null;
  const isLive = !!liveText.trim() && (liveMs === null || liveMs > 0);

  const banned = data.users.filter((u: any) => u.bannedUntil).length;
  const online = data.users.filter(
    (u: any) => u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < 120000
  ).length;
  const users = data.users.filter((u: any) => u.username.toLowerCase().includes(q.toLowerCase()));

  const nav: { id: NavId; Icon: typeof Users; label: string }[] = [
    { id: "users", Icon: Users, label: "Användare" },
    { id: "chats", Icon: Detective, label: "Chatspaning" },
    { id: "broadcast", Icon: Megaphone, label: "Sändning" },
    { id: "chat", Icon: ChatIcon, label: "Stabs-chatt" },
    { id: "keen", Icon: Gift, label: "Admin-Keen" },
    { id: "tools", Icon: Sparkles, label: "Verktyg" },
    { id: "log", Icon: Scroll, label: "Logg" },
    { id: "help", Icon: Help, label: "Hjälp" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6">
      <style>{`.red-glow{box-shadow:0 0 24px rgba(220,38,38,.25)}.red-title{text-shadow:0 0 12px rgba(248,113,113,.7)}`}</style>
      <div className="mx-auto max-w-7xl pt-10">
        <div className="mb-2 flex justify-end">
          <SeatBadge />
        </div>
        {liveFor && <LiveViewer username={liveFor.username} peerId={liveFor.pid} onClose={() => setLiveFor(null)} />}

        <ConsoleHero
          tone="red"
          Icon={Shield}
          eyebrow="Röd konsol · endast personal"
          title="ADMIN"
          lead={
            <>
              Belöna med XP, banna i upp till ett dygn och följ vad som händer just nu. Längre
              bannlysningar går via ägaren. <b className="text-slate-200">Allt loggas.</b>
            </>
          }
          chips={[
            { Icon: Users, label: "användare", value: <CountUp value={data.users.length} /> },
            { Icon: Dot, label: "online nu", value: <CountUp value={online} />, tone: "emerald" },
            { Icon: Ban, label: "bannade", value: <CountUp value={banned} />, tone: "red" },
            { Icon: Gift, label: "max XP per gåva", value: 500, tone: "amber" },
          ]}
        />

        {info && (
          <div className="mt-4 flex animate-cmd-slide-right items-center justify-between gap-4 rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
            <span data-no-translate>{info}</span>
            <ToolButton label="Stäng" Icon={Cross} tone="red" onClick={() => setInfo("")} />
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[248px_1fr]">
          <nav className="mb-2 flex gap-2 overflow-x-auto pb-1 lg:mb-0 lg:sticky lg:top-6 lg:flex-col lg:overflow-visible lg:pb-0">
            {nav.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSection(n.id)}
                className={`group flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-bold transition-all duration-200 lg:w-full ${
                  section === n.id
                    ? "bg-red-600 text-white shadow-lg shadow-red-950/50"
                    : "border border-white/[0.06] bg-slate-900/60 text-slate-300 hover:translate-x-0.5 hover:border-red-500/30 hover:text-white"
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                    section === n.id ? "bg-white/15" : "bg-white/[0.04] text-slate-400 group-hover:text-red-300"
                  }`}
                >
                  <n.Icon className="h-4 w-4" />
                </span>
                {n.label}
              </button>
            ))}

            <div className="hidden rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 lg:mt-2 lg:block">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-red-300">Osäker på en knapp?</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Varje grupp är märkt med vad den gör. Hjälp-fliken förklarar allt — och vad som loggas.
              </p>
            </div>
          </nav>

          <Panel key={section} className="animate-cmd-fade">
            {section === "users" && (
              <div>
                <SectionHead
                  Icon={Users}
                  tone="red"
                  title={`Användare (${users.length})`}
                  note="Välj grupp utifrån vad du vill göra: belöna, banna eller bevaka. Gröna knappar ger, röda tar bort."
                  right={<SearchField value={q} onChange={setQ} />}
                />

                <div className="mt-4 max-h-[36rem] space-y-2 overflow-y-auto pr-1">
                  {users.map((u: any, idx: number) => {
                    const online = Boolean(u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < 120000);
                    return (
                      <div
                        key={u.id}
                        style={{ animationDelay: `${Math.min(idx * 30, 420)}ms` }}
                        className="animate-cmd-row rounded-2xl border border-white/[0.07] bg-slate-950/50 p-4 transition-colors hover:border-red-500/30"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              aria-hidden
                              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-[13px] font-extrabold uppercase text-slate-200"
                            >
                              {String(u.username).slice(0, 2)}
                            </span>
                            <div className="min-w-0">
                              <p className="flex flex-wrap items-center gap-2 font-bold text-white">
                                <Dot online={online} className="h-2.5 w-2.5" />
                                <span data-no-translate>{u.username}</span>
                                {u.livePath && (
                                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                                    live · <span data-no-translate>{u.livePath}</span>
                                  </span>
                                )}
                                {u.bannedUntil && (
                                  <span className="flex items-center gap-1 rounded-full bg-red-600/20 px-2 py-0.5 text-[11px] font-bold text-red-300">
                                    <Ban className="h-3 w-3" /> BANNAD
                                  </span>
                                )}
                                {u.ipBlocked && (
                                  <span
                                    className="flex items-center gap-1 rounded-full bg-rose-600/20 px-2 py-0.5 text-[11px] font-bold text-rose-300"
                                    title="Uppkopplingen är blockerad — ett nytt konto hjälper inte"
                                  >
                                    <Ban className="h-3 w-3" /> IP-SPÄRR
                                  </span>
                                )}
                              </p>
                              <p className="mt-1 text-xs text-slate-500" data-no-translate>
                                {u.role} · Lv {u.level} · {u.xp} XP
                              </p>
                              <IpLine user={u} />
                            </div>
                          </div>
                          {u.bannedUntil && (
                            <ToolButton
                              label="Unbanna"
                              Icon={Check}
                              tone="emerald"
                              variant="solid"
                              onClick={() => run(adminUnban(s, u.username), "Klart!")}
                            />
                          )}
                        </div>

                        {(u.role === "STUDENT" || u.role === "TEACHER") && !u.bannedUntil && (
                          <div className="mt-3 grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                            <ToolGroup title="Belöna" Icon={Gift} tone="emerald">
                              {[50, 200, 500].map((g) => (
                                <ToolButton
                                  key={g}
                                  label={`+${g} XP`}
                                  Icon={Gift}
                                  tone="emerald"
                                  onClick={() => run(adminGiveXP(s, u.id, u.username, g))}
                                />
                              ))}
                              <ToolButton
                                label="Egen summa"
                                Icon={Gift}
                                tone="emerald"
                                onClick={() => setGift({ user: u, amount: "100" })}
                              />
                              {/* Coins are capped at 1000 per person per day,
                                  enforced from the CoinGrant ledger. */}
                              <ToolButton
                                label="+1000 mynt"
                                Icon={Gift}
                                tone="amber"
                                title="Ge 1000 mynt (dagstak per person)"
                                onClick={() => run(adminGiveCoins(s, u.id, u.username, 1000))}
                              />
                              <ToolButton
                                label="Egen myntsumma"
                                Icon={Gift}
                                tone="amber"
                                onClick={() => setCoinGift({ user: u, amount: "500" })}
                              />
                            </ToolGroup>

                            <ToolGroup title="Banna" Icon={Ban} tone="red">
                              {QUICK.map((qq) => (
                                <ToolButton
                                  key={qq.min}
                                  label={qq.label}
                                  Icon={Ban}
                                  tone="red"
                                  title={`Banna i ${qq.label}`}
                                  onClick={() => run(adminBan(s, u.username, qq.min, ""))}
                                />
                              ))}
                              <ToolButton
                                label="Begär längre"
                                Icon={Pray}
                                tone="amber"
                                onClick={() => {
                                  setAskFor(u.username);
                                  setAskReason("");
                                  setAskMin("2880");
                                }}
                              />
                            </ToolGroup>

                            <ToolGroup title="IP-spärr" Icon={Ban} tone="rose">
                              {u.ipBlocked ? (
                                <ToolButton
                                  label="Släpp IP"
                                  Icon={Check}
                                  tone="emerald"
                                  variant="solid"
                                  title={
                                    u.ipBlockedUntil
                                      ? `Adressen är blockerad till ${new Date(u.ipBlockedUntil).toLocaleString("sv-SE")}`
                                      : "Adressen är blockerad tills vidare"
                                  }
                                  disabled={busy || !u.ip}
                                  onClick={() => run(adminUnblockIp(s, u.ip))}
                                />
                              ) : (
                                <ToolButton
                                  label="IP-banna"
                                  Icon={Ban}
                                  tone="rose"
                                  title={
                                    u.ip
                                      ? `Blockera uppkopplingen ${u.ip} — gäller hela nätet`
                                      : "Ingen adress sparad för den här personen"
                                  }
                                  disabled={busy || !u.ip}
                                  onClick={() => setIpBan({ user: u, minutes: "60", reason: "" })}
                                />
                              )}
                            </ToolGroup>

                            <ToolGroup title="Bevaka & verktyg" Icon={Video} tone="sky">
                              <ToolButton
                                label="Live"
                                Icon={Video}
                                tone="rose"
                                title="Be om att få se personens skärm"
                                onClick={async () => {
                                  const pid = "qk-staff-" + Date.now();
                                  try {
                                    await requestLive(s, u.id, u.username, pid);
                                  } catch {
                                    setInfo("Nätverksfel — försök igen.");
                                    return;
                                  }
                                  setLiveFor({ username: u.username, pid });
                                }}
                              />
                              <ToolButton
                                label="Tysta"
                                Icon={Mute}
                                tone="violet"
                                title="Tysta chatten i 60 minuter"
                                onClick={() => setMute({ user: u, minutes: "60" })}
                              />
                              <ToolButton
                                label="Fäst"
                                Icon={Pin}
                                tone="rose"
                                onClick={() => run(togglePin(s, u.id, u.username))}
                              />
                              <ToolButton
                                label="Anteckning"
                                Icon={Note}
                                tone="amber"
                                title="Hemlig anteckning som bara personal ser"
                                onClick={() => setNote({ user: u, text: u.secretNote || "" })}
                              />
                            </ToolGroup>
                          </div>
                        )}

                        {u.role === "ADMIN" && (
                          <div className="mt-3 grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                            <ToolGroup title="Din gåva" Icon={Coins} tone="amber">
                              <ToolButton
                                label={
                                  u.giftReadyAt && new Date(u.giftReadyAt).getTime() > nowTick
                                    ? `Gåva om ${giftLeft(u.giftReadyAt)}`
                                    : `Ta gåvan · ${GIFT_COINS} mynt`
                                }
                                Icon={Gift}
                                tone="amber"
                                variant={u.giftReadyAt && new Date(u.giftReadyAt).getTime() > nowTick ? "soft" : "solid"}
                                title={`Fast ${GIFT_COINS} mynt, högst en gång varannan timme`}
                                disabled={
                                  busy || Boolean(u.giftReadyAt && new Date(u.giftReadyAt).getTime() > nowTick)
                                }
                                onClick={() => run(adminSelfGift(s, u.id))}
                              />
                            </ToolGroup>
                            <div className="rounded-2xl border border-white/[0.07] bg-slate-950/40 p-3 md:col-span-1 2xl:col-span-2">
                              <p className="text-xs leading-relaxed text-slate-500">
                                Fast <b className="text-amber-200">{GIFT_COINS} mynt</b>, högst en gång varannan
                                timme. Samma gåva som i QuizKeen, med samma klocka — trycker du där startar
                                nedräkningen här. Konsolen loggar in med en gemensam kod och vet inte vilket
                                konto som är ditt, så tryck på din egen rad.
                              </p>
                            </div>
                          </div>
                        )}

                        {(u.role === "OWNER" || u.role === "SECURITY") && (
                          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <Shield className="h-3.5 w-3.5 text-amber-400" /> Skyddad roll — inga åtgärder härifrån.
                          </p>
                        )}
                        {u.secretNote && (
                          <p className="mt-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs italic text-amber-200" data-no-translate>
                            {u.secretNote}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {users.length === 0 && <p className="text-sm text-slate-500">Inga användare matchade sökningen.</p>}
                </div>
              </div>
            )}

            {section === "chats" && (
              <div>
                <SectionHead
                  Icon={Detective}
                  tone="red"
                  title="Chatspaning"
                  note="Globala kanaler, inkorgar, staben och förfrågningar — samlade på ett ställe."
                  right={
                    <ToolButton
                      label="Uppdatera"
                      Icon={Clock}
                      tone="red"
                      onClick={() => spyOnChats(s).then(setChats).catch(() => setChats(null))}
                    />
                  }
                />
                {!chats && <p className="mt-4 text-sm text-slate-500">Kunde inte läsa in chattar.</p>}
                {chats && (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {[
                      { key: "global", title: "Global / Klass", Icon: ChatIcon, tone: "red" },
                      { key: "inbox", title: "Inkorg", Icon: Inbox, tone: "red" },
                      { key: "staff", title: "Stab-kanaler", Icon: Users, tone: "red" },
                      { key: "requests", title: "Chatt-förfrågningar", Icon: Handshake, tone: "red" },
                    ].map((panel) => (
                      <div
                        key={panel.key}
                        className="rounded-2xl border border-white/[0.07] bg-slate-950/50 p-4 transition-colors hover:border-red-500/25"
                      >
                        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-red-300">
                          <panel.Icon className="h-4 w-4" /> {panel.title}
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-400">
                            {chats[panel.key].length}
                          </span>
                        </h3>
                        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1 text-xs">
                          {chats[panel.key].map((m: any) => (
                            <p key={m.id} className="rounded bg-slate-900/60 px-2 py-1" data-no-translate>
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
              </div>
            )}

            {section === "broadcast" && (
              <div>
                <SectionHead
                  Icon={Megaphone}
                  tone="red"
                  title="Global sändning"
                  note="Den gula banderollen syns för ALLA som besöker sajten, även de som inte har loggat in. Ägaren ser i loggen vem som skickade."
                />

                <div
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                    isLive
                      ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                      : "border-white/10 bg-slate-950/40 text-slate-400"
                  }`}
                >
                  {isLive ? (
                    <>
                      <p className="flex flex-wrap items-center gap-2 font-bold">
                        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                        LIVE
                        {liveMs !== null && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold tabular-nums">
                            {timeLeftLabel(liveMs)} kvar
                          </span>
                        )}
                      </p>
                      <p className="mt-1 break-words text-amber-100/80">“{liveText}”</p>
                    </>
                  ) : (
                    <p>Ingen sändning just nu.</p>
                  )}
                </div>

                <textarea
                  value={bc}
                  onChange={(e) => {
                    bcDirty.current = true;
                    setBc(e.target.value);
                  }}
                  rows={4}
                  maxLength={300}
                  placeholder="Skriv ett meddelande till HELA sajten…"
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-red-400/70 focus:outline-none"
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                    <Clock className="h-4 w-4 text-red-400" /> Längd:
                  </span>
                  {BROADCAST_DURATIONS.map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setBcMin(d.minutes)}
                      aria-pressed={bcMin === d.minutes}
                      className={`rounded-xl px-3 py-1.5 text-sm font-bold transition-colors ${
                        bcMin === d.minutes
                          ? "bg-red-600 text-white shadow-lg shadow-red-900/40"
                          : "bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <ToolButton
                    label="Sänd till alla"
                    Icon={Megaphone}
                    tone="red"
                    variant="solid"
                    onClick={() => {
                      bcDirty.current = false;
                      run(adminSetBroadcast(s, bc, bcMin), "Sänt!");
                    }}
                  />
                  <ToolButton
                    label="Stoppa sändning"
                    Icon={Ban}
                    tone="slate"
                    onClick={() => {
                      bcDirty.current = false;
                      setBc("");
                      run(adminStopBroadcast(s), "Stoppad!");
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {bcMin === null
                    ? "Ligger kvar tills någon trycker på Stoppa sändning."
                    : `Försvinner av sig själv efter ${bcMin} min.`}
                </p>
              </div>
            )}

            {section === "chat" && (
              <div>
                <SectionHead
                  Icon={ChatIcon}
                  tone="red"
                  title="Stabs-chatt"
                  note="Bara personal. Eleven ser aldrig den här kanalen."
                />
                <div className="mt-4">
                  <StaffChat s={s} accent="bg-red-600" />
                </div>
              </div>
            )}

            {section === "keen" && (
              <div>
                <SectionHead
                  Icon={Gift}
                  tone="violet"
                  title="Admin-Keens"
                  note="Keens som inte finns i något paket. Välj vilken du delar ut — den hamnar i samlingen direkt."
                />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {ADMIN_KEENS.map((k) => {
                    const active = k.id === adminKeen.id;
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setAdminKeenId(k.id)}
                        aria-pressed={active}
                        className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                          active
                            ? "border-violet-400/70 bg-violet-500/15"
                            : "border-white/[0.07] bg-slate-950/50 hover:border-violet-500/40"
                        }`}
                      >
                        {/* The picture the receiver will actually see, not a placeholder. */}
                        {/* eslint-disable-next-line @next/next/no-img-element -- local, fixed-size art */}
                        <img
                          src={keenArtSrc(k.id)}
                          alt={k.name}
                          width={64}
                          height={64}
                          draggable={false}
                          className="h-16 w-16 shrink-0 object-contain drop-shadow-[0_6px_18px_rgba(168,85,247,0.35)]"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-white">{k.name}</span>
                          <span className="block text-xs text-purple-300">Mystisk · trofé</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {active ? "Vald — delas ut nedan" : "Tryck för att välja"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 max-w-md text-sm text-slate-400">
                  <b className="text-purple-300">{adminKeen.name}</b> är en Mystisk Keen som inte finns i något paket —
                  bara personal kan dela ut den, härifrån eller i ägarens valv. Välj personen, och den hamnar i samlingen
                  direkt.
                </p>

                {keenFor ? (
                  <div className="mt-4 rounded-2xl border border-purple-500/40 bg-purple-500/10 p-4">
                    <p className="text-sm font-bold text-white">
                      Ge <span className="text-purple-300">{adminKeen.name}</span> till{" "}
                      <span className="text-purple-300">{keenFor.username}</span>?
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Den läggs i personens samling direkt och går inte att ta tillbaka härifrån. Allt loggas.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ToolButton
                        label="Ja, ge den"
                        Icon={Gift}
                        tone="violet"
                        variant="solid"
                        disabled={busy}
                        onClick={async () => {
                          const target = keenFor;
                          setKeenFor(null);
                          await run(adminGiveAdminKeen(s, target.id, target.username, adminKeen.id));
                          await loadHolders(s, adminKeen.id);
                        }}
                      />
                      <ToolButton label="Avbryt" Icon={Cross} tone="slate" onClick={() => setKeenFor(null)} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4">
                      <SearchField value={kq} onChange={setKq} />
                    </div>

                    <div className="mt-4 max-h-[36rem] space-y-2 overflow-y-auto pr-1">
                      {data.users
                        .filter((u: any) => u.username.toLowerCase().includes(kq.toLowerCase()))
                        .map((u: any) => {
                          const has = holders.includes(u.id);
                          return (
                            <div
                              key={u.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-slate-950/50 p-3.5 transition-colors hover:border-violet-500/30"
                            >
                              <p className="flex flex-wrap items-center gap-1.5 font-bold text-white">
                                <span data-no-translate>{u.username}</span>
                                <span className="text-xs font-normal text-slate-500">
                                  {u.role} · {u.coins} mynt
                                </span>
                                {has && (
                                  <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-300">
                                    har den
                                  </span>
                                )}
                              </p>
                              <ToolButton
                                label={has ? "Har den" : "Ge den"}
                                Icon={Gift}
                                tone="violet"
                                disabled={has || busy}
                                onClick={() => setKeenFor(u)}
                              />
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </div>
            )}

            {section === "tools" && (
              <div>
                <SectionHead
                  Icon={Sparkles}
                  tone="red"
                  title="Verktyg"
                  note="Tre mindre saker som gör vardagen lättare. De stora — nollställningar, saneringar och nödbroms — är ägarens."
                />

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-4">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-red-300">
                      <Gift className="h-4 w-4" /> Belöningsvåg — en gång per dag
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Ger <b className="text-slate-300">+25 XP</b> till alla elever som inte är bannade. En våg per dag,
                      oavsett vem som trycker först — resten av dagen är knappen stängd.
                    </p>
                    <ToolButton
                      label="Skicka dagens våg"
                      Icon={Gift}
                      tone="emerald"
                      variant="solid"
                      disabled={busy}
                      className="mt-3"
                      onClick={() => run(adminRewardWave(s))}
                    />
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-slate-950/50 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-slate-200">
                      <Send className="h-4 w-4 text-sky-300" /> Popup till en grupp
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Elever eller lärare. Personal får sina meddelanden från ägaren.
                    </p>
                    <select
                      value={noteRole}
                      onChange={(e) => setNoteRole(e.target.value === "TEACHER" ? "TEACHER" : "STUDENT")}
                      className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-red-400/70 focus:outline-none"
                    >
                      <option value="STUDENT">Elever</option>
                      <option value="TEACHER">Lärare</option>
                    </select>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={2}
                      maxLength={300}
                      placeholder="Skriv något gruppen ser nästa gång de är inne…"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-red-400/70 focus:outline-none"
                    />
                    <ToolButton
                      label="Skicka popup"
                      Icon={Send}
                      tone="sky"
                      disabled={busy || !noteText.trim()}
                      className="mt-2"
                      onClick={async () => {
                        const text = noteText;
                        setNoteText("");
                        await run(adminRoleNote(s, noteRole, text));
                      }}
                    />
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-slate-950/50 p-4 lg:col-span-2">
                    <SectionHead
                      Icon={Coins}
                      tone="amber"
                      title="Myntliggaren idag"
                      note="Varje utdelning från både konsolen och appen, med vem som gav. Läsläge — inget kan ändras härifrån."
                      right={
                        <ToolButton
                          label="Uppdatera"
                          Icon={Clock}
                          tone="red"
                          onClick={() => adminCoinLedger(s).then(setLedger).catch(() => setLedger(null))}
                        />
                      }
                    />
                    {!ledger && <p className="mt-3 text-sm text-slate-500">Kunde inte läsa liggaren.</p>}
                    {ledger && (
                      <>
                        <p className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-400">
                          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-200">
                            {ledger.total} mynt ut idag
                          </span>
                          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-slate-300">
                            {ledger.count} utdelningar
                          </span>
                          {ledger.byStaff.map((s2: any) => (
                            <span key={s2.name} className="rounded-full bg-white/[0.06] px-3 py-1 text-slate-300">
                              <span data-no-translate>{s2.name}</span>: {s2.sum}
                            </span>
                          ))}
                        </p>
                        <div className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1 text-xs">
                          {ledger.rows.map((r: any) => (
                            <p key={r.id} className="rounded-lg bg-slate-900/70 px-3 py-1.5 text-slate-300" data-no-translate>
                              <b className="text-white">{r.target}</b> fick {r.amount} · av {r.staff}
                              <span className="ml-1 text-slate-600">
                                · {r.at ? new Date(r.at).toLocaleTimeString("sv-SE") : ""}
                              </span>
                            </p>
                          ))}
                          {ledger.rows.length === 0 && <p className="text-slate-600">Inga mynt utdelade idag.</p>}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {section === "help" && <HelpPanel kind="ADMIN" />}

            {section === "log" && (
              <div>
                <SectionHead
                  Icon={Scroll}
                  tone="red"
                  title="Logg"
                  note="Varje åtgärd i konsolen, med vem och när. Ägaren ser samma lista."
                  right={<ToolButton label="Uppdatera" Icon={Clock} tone="red" onClick={refresh} />}
                />
                <div className="mt-4 max-h-[30rem] space-y-1.5 overflow-y-auto pr-1 text-xs text-slate-400">
                  {data.log.map((l: any, i: number) => (
                    <p key={i} className="rounded-xl bg-slate-950/60 px-3.5 py-2.5" data-no-translate>
                      <b className="text-slate-300">{l.username}</b> {l.action}
                      <span className="ml-1 text-slate-600">
                        · {l.createdAt ? new Date(l.createdAt).toLocaleString("sv-SE") : ""}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>

        {busy && (
          <div className="fixed bottom-5 right-5 z-[110] flex animate-cmd-pop items-center gap-2 rounded-2xl border border-red-400/40 bg-red-600 px-5 py-3 text-sm font-extrabold text-white shadow-2xl shadow-red-950/60">
            <Clock className="h-4 w-4 animate-spin" /> Jobbar…
          </div>
        )}
      </div>

      <HelpButton kind="ADMIN" />

      {gift && (
        <PromptModal
          title={`Ge XP till ${gift.user.username}`}
          label="Antal XP (max 500, en gång per dag)"
          value={gift.amount}
          onChange={(v) => setGift({ ...gift, amount: v })}
          onCancel={() => setGift(null)}
          onSubmit={async () => {
            const amt = parseInt(gift.amount, 10) || 0;
            setGift(null);
            await run(adminGiveXP(s, gift.user.id, gift.user.username, amt));
          }}
          tone="red"
          submitLabel="Ge XP"
        />
      )}

      {coinGift && (
        <PromptModal
          title={`Ge mynt till ${coinGift.user.username}`}
          label="Antal mynt (max 1000 per person och dag)"
          value={coinGift.amount}
          onChange={(v) => setCoinGift({ ...coinGift, amount: v })}
          onCancel={() => setCoinGift(null)}
          onSubmit={async () => {
            const amt = parseInt(coinGift.amount, 10) || 0;
            setCoinGift(null);
            await run(adminGiveCoins(s, coinGift.user.id, coinGift.user.username, amt));
          }}
          tone="amber"
          submitLabel="Ge mynt"
        />
      )}

      {mute && (
        <PromptModal
          title={`Tysta chatten för ${mute.user.username}`}
          label="Minuter (max 1440 — bara ägaren tystar för alltid)"
          value={mute.minutes}
          onChange={(v) => setMute({ ...mute, minutes: v })}
          onCancel={() => setMute(null)}
          onSubmit={async () => {
            const mins = parseInt(mute.minutes, 10);
            setMute(null);
            await run(muteChat(s, mute.user.id, mute.user.username, Number.isFinite(mins) ? mins : 60));
          }}
          tone="red"
          submitLabel="Tysta"
        />
      )}

      {note && (
        <PromptModal
          title={`Hemlig anteckning om ${note.user.username}`}
          label="Bara personal ser detta"
          value={note.text}
          onChange={(v) => setNote({ ...note, text: v })}
          onCancel={() => setNote(null)}
          onSubmit={async () => {
            const text = note.text;
            setNote(null);
            await run(setSecretNote(s, note.user.id, note.user.username, text));
          }}
          multiline
          tone="red"
        />
      )}

      {ipBan && (
        <div className="fixed inset-0 z-[130] flex animate-cmd-fade items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-cmd-pop rounded-3xl border border-rose-500/40 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-white">IP-spärr för {ipBan.user.username}</h3>
            <p className="mt-1 text-sm text-slate-400">
              Stänger{" "}
              <b className="font-mono text-white" data-no-translate>
                {ipBan.user.ip}
              </b>{" "}
              — hela uppkopplingen, inte bara kontot. Alla som sitter på nätet kastas ut direkt.
            </p>
            <p className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
              På ett skol- eller familjenät delar flera samma adress. Räcker en vanlig ban? Använd den först.
            </p>
            <label className="mt-4 block text-xs font-bold text-slate-400">
              Hur länge? (max 1 dygn — ägaren kan mer)
            </label>
            <select
              value={ipBan.minutes}
              onChange={(e) => setIpBan({ ...ipBan, minutes: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-rose-400 focus:outline-none"
            >
              <option value="60">1 tim</option>
              <option value="1440">1 dygn</option>
            </select>
            <label className="mt-3 block text-xs font-bold text-slate-400">Varför? (syns för personen)</label>
            <input
              value={ipBan.reason}
              onChange={(e) => setIpBan({ ...ipBan, reason: e.target.value })}
              maxLength={200}
              placeholder="T.ex. hot i chatten"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500 focus:border-rose-400 focus:outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setIpBan(null)}
                className="flex-1 rounded-lg border border-slate-700 py-2 font-bold text-slate-300 hover:bg-slate-800"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={async () => {
                  const mins = parseInt(ipBan.minutes, 10) || 60;
                  const who = ipBan.user.username;
                  const why = ipBan.reason;
                  setIpBan(null);
                  await run(adminBlockIp(s, who, mins, why));
                }}
                className="flex-1 rounded-lg bg-rose-600 py-2 font-bold text-white hover:bg-rose-500"
              >
                Blockera IP
              </button>
            </div>
          </div>
        </div>
      )}

      {askFor && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-amber-300">Be ägaren om längre ban</h3>
            <p className="mt-1 text-sm text-slate-400">
              För <b className="text-white">{askFor}</b> — ägaren godkänner eller avslår.
            </p>
            <label className="mt-4 block text-xs font-bold text-slate-400">Hur länge (minuter)?</label>
            <input
              type="number"
              value={askMin}
              onChange={(e) => setAskMin(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">Tips: 2880 = 2 dagar · 10080 = 1 vecka · 0 = för alltid</p>
            <label className="mt-3 block text-xs font-bold text-slate-400">Varför? (ägaren läser detta)</label>
            <textarea
              value={askReason}
              onChange={(e) => setAskReason(e.target.value)}
              rows={3}
              placeholder="T.ex. upprepat fusk..."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setAskFor(null)}
                className="flex-1 rounded-lg border border-slate-700 py-2 font-bold text-slate-300 hover:bg-slate-800"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={async () => {
                  const mins = parseInt(askMin, 10) || 0;
                  const target = askFor;
                  setAskFor(null);
                  await run(adminRequestBan(s, target, mins, askReason));
                }}
                className="flex-1 rounded-lg bg-amber-600 py-2 font-bold text-white hover:bg-amber-500"
              >
                Skicka begäran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
