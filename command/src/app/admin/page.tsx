"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminData,
  adminBan,
  adminUnban,
  adminRequestBan,
  adminGiveXP,
  adminSetBroadcast,
  requestLive,
  muteChat,
  togglePin,
  setSecretNote,
  spyOnChats,
} from "../actions";
import StaffChat from "../../components/staff-chat";
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
  Search,
  Inbox,
  Handshake,
  Eraser,
  Dot,
  Clock,
  Help,
} from "../../components/icons";

type S = { role: string; code: string };
type NavId = "users" | "chats" | "broadcast" | "chat" | "log" | "help";

const QUICK = [
  { label: "5 min", min: 5 },
  { label: "1 tim", min: 60 },
  { label: "1 dag", min: 1440 },
];

export default function AdminPage() {
  const router = useRouter();
  const [s, setS] = useState<S | null>(null);
  const [data, setData] = useState<any>(null);
  const [info, setInfo] = useState("");
  const [liveFor, setLiveFor] = useState<any>(null);
  const [bc, setBc] = useState("");
  const [section, setSection] = useState<NavId>("users");
  const [chats, setChats] = useState<any>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  // styled replacements for window.prompt()
  const [gift, setGift] = useState<{ user: any; amount: string } | null>(null);
  const [mute, setMute] = useState<{ user: any; minutes: string } | null>(null);
  const [note, setNote] = useState<{ user: any; text: string } | null>(null);
  const [askFor, setAskFor] = useState<string | null>(null);
  const [askMin, setAskMin] = useState("2880");
  const [askReason, setAskReason] = useState("");

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
        if (d) setData(d);
        else router.replace("/");
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

  if (!s || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-slate-950 text-slate-400">
        <Shield className="h-5 w-5 animate-pulse text-red-400" />
        Laddar RÖD KONSOL...
      </div>
    );
  }

  const banned = data.users.filter((u: any) => u.bannedUntil).length;
  const users = data.users.filter((u: any) => u.username.toLowerCase().includes(q.toLowerCase()));

  const nav: { id: NavId; Icon: typeof Users; label: string }[] = [
    { id: "users", Icon: Users, label: "Användare" },
    { id: "chats", Icon: Detective, label: "Chatspaning" },
    { id: "broadcast", Icon: Megaphone, label: "Sändning" },
    { id: "chat", Icon: ChatIcon, label: "Stabs-chatt" },
    { id: "log", Icon: Scroll, label: "Logg" },
    { id: "help", Icon: Help, label: "Hjälp" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6">
      <style>{`.red-glow{box-shadow:0 0 24px rgba(220,38,38,.25)}.red-title{text-shadow:0 0 12px rgba(248,113,113,.7)}`}</style>
      <div className="mx-auto max-w-7xl pt-10">
        {liveFor && <LiveViewer username={liveFor.username} peerId={liveFor.pid} onClose={() => setLiveFor(null)} />}

        <div className="red-glow rounded-3xl border border-red-500/40 bg-red-500/5 p-6">
          <h1 className="red-title flex items-center gap-2 text-3xl font-extrabold text-red-400">
            <Shield className="h-7 w-7" />
            ADMIN — RÖD KONSOL
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
            <Gift className="h-4 w-4 text-emerald-400" /> Belöna (max 500, 3/dag)
            <span className="text-slate-600">·</span>
            <Ban className="h-4 w-4 text-red-400" /> Banna (5min/1tim/1dag) · längre?{" "}
            <b className="text-amber-400">Be ägaren om lov!</b>
            <span className="text-slate-600">·</span> Allt loggas.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
            <span className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-slate-300">
              <Users className="h-4 w-4" /> {data.users.length} användare
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-red-400">
              <Ban className="h-4 w-4" /> {banned} bannade
            </span>
          </div>
        </div>

        {info && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-red-500/40 bg-slate-900 px-4 py-2 text-sm font-bold text-red-300">
            <span data-no-translate>{info}</span>
            <button type="button" onClick={() => setInfo("")} className="text-slate-500 hover:text-white">
              stäng
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[230px_1fr]">
          <div className="space-y-2">
            {nav.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSection(n.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                  section === n.id ? "bg-red-600 text-white shadow-lg" : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <n.Icon className="h-4 w-4" />
                {n.label}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            {section === "users" && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                    <Users className="h-5 w-5 text-red-400" /> Användare ({users.length})
                  </h2>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5">
                    <Search className="h-4 w-4 text-slate-500" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Sök användare..."
                      className="w-40 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 max-h-[36rem] space-y-2 overflow-y-auto pr-1">
                  {users.map((u: any) => {
                    const online = Boolean(u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < 120000);
                    return (
                      <div key={u.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="flex flex-wrap items-center gap-1.5 font-bold text-white">
                            <Dot online={online} className="h-2.5 w-2.5" />
                            <span data-no-translate>{u.username}</span>
                            <span className="ml-1 text-xs font-normal text-slate-500">
                              {u.role} · Lv {u.level} · {u.xp} XP
                            </span>
                            {u.livePath && (
                              <span className="rounded bg-emerald-500/10 px-1.5 text-xs font-normal text-emerald-400">
                                {u.livePath}
                              </span>
                            )}
                            {u.bannedUntil && (
                              <span className="flex items-center gap-1 rounded-full bg-red-600/20 px-2 py-0.5 text-xs font-bold text-red-400">
                                <Ban className="h-3 w-3" /> BANNAD
                              </span>
                            )}
                          </p>
                          {(u.role === "STUDENT" || u.role === "TEACHER") &&
                            (u.bannedUntil ? (
                              <button
                                type="button"
                                onClick={() => run(adminUnban(s, u.username), "Klart!")}
                                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                              >
                                <Check className="h-3 w-3" /> Unbanna
                              </button>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
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
                                  title="Be om LIVE-skärm"
                                  className="flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-500"
                                >
                                  <Video className="h-3 w-3" /> Live
                                </button>
                                {[50, 200, 500].map((g) => (
                                  <button
                                    key={g}
                                    type="button"
                                    onClick={() => run(adminGiveXP(s, u.id, u.username, g))}
                                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                                  >
                                    <Gift className="h-3 w-3" /> +{g}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setGift({ user: u, amount: "100" })}
                                  className="rounded-lg border border-emerald-500/40 px-2 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-600/20"
                                >
                                  XP...
                                </button>
                                {QUICK.map((qq) => (
                                  <button
                                    key={qq.min}
                                    type="button"
                                    onClick={() => run(adminBan(s, u.username, qq.min, ""))}
                                    className="flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-500"
                                  >
                                    <Ban className="h-3 w-3" /> {qq.label}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAskFor(u.username);
                                    setAskReason("");
                                    setAskMin("2880");
                                  }}
                                  className="flex items-center gap-1 rounded-lg border border-amber-500/50 bg-amber-600/20 px-2 py-1 text-xs font-bold text-amber-300 hover:bg-amber-600/40"
                                >
                                  <Pray className="h-3 w-3" /> Be om mer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMute({ user: u, minutes: "60" })}
                                  title="Tysta chatten"
                                  className="rounded-lg bg-purple-600 px-2 py-1 text-xs font-bold text-white hover:bg-purple-500"
                                >
                                  <Mute className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => run(togglePin(s, u.id, u.username))}
                                  title="Fäst"
                                  className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white hover:bg-rose-500"
                                >
                                  <Pin className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNote({ user: u, text: u.secretNote || "" })}
                                  title="Hemlig anteckning"
                                  className="rounded-lg bg-yellow-600 px-2 py-1 text-xs font-bold text-white hover:bg-yellow-500"
                                >
                                  <Note className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                        </div>
                        {u.secretNote && (
                          <p className="mt-1 rounded bg-yellow-500/10 px-2 py-1 text-xs italic text-yellow-400" data-no-translate>
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
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                  <Detective className="h-5 w-5 text-red-400" /> CHATSPANING
                </h2>
                {!chats && <p className="mt-4 text-sm text-slate-500">Kunde inte läsa in chattar.</p>}
                {chats && (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {[
                      { key: "global", title: "Global / Klass", Icon: ChatIcon, tone: "red" },
                      { key: "inbox", title: "Inkorg", Icon: Inbox, tone: "red" },
                      { key: "staff", title: "Stab-kanaler", Icon: Users, tone: "red" },
                      { key: "requests", title: "Chatt-förfrågningar", Icon: Handshake, tone: "red" },
                    ].map((panel) => (
                      <div key={panel.key} className="rounded-2xl border border-red-500/30 bg-slate-950/60 p-4">
                        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-red-300">
                          <panel.Icon className="h-4 w-4" /> {panel.title} ({chats[panel.key].length})
                        </h3>
                        <div className="max-h-72 space-y-1 overflow-y-auto pr-1 text-xs">
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
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                  <Megaphone className="h-5 w-5 text-red-400" /> Global sändning
                </h2>
                <p className="mt-1 text-xs text-slate-500">ALLA ser detta som gul banderoll. Ägaren ser i loggen.</p>
                <textarea
                  value={bc}
                  onChange={(e) => setBc(e.target.value)}
                  rows={3}
                  placeholder="Skriv ett meddelande till HELA sajten..."
                  className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-white placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => run(adminSetBroadcast(s, bc), "Sänt!")}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
                  >
                    <Megaphone className="h-4 w-4" /> Sänd
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBc("");
                      run(adminSetBroadcast(s, ""), "Rensat!");
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-600"
                  >
                    <Eraser className="h-4 w-4" /> Rensa
                  </button>
                </div>
              </div>
            )}

            {section === "chat" && (
              <div>
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                  <ChatIcon className="h-5 w-5 text-red-400" /> Stabs-chatt
                </h2>
                <div className="mt-4">
                  <StaffChat s={s} accent="bg-red-600" />
                </div>
              </div>
            )}

            {section === "help" && <HelpPanel kind="ADMIN" />}

            {section === "log" && (
              <div>
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                  <Scroll className="h-5 w-5 text-red-400" /> Logg
                </h2>
                <div className="mt-4 max-h-[30rem] space-y-1 overflow-y-auto pr-1 text-xs text-slate-400">
                  {data.log.map((l: any, i: number) => (
                    <p key={i} className="rounded bg-slate-900/60 px-3 py-2" data-no-translate>
                      <b className="text-slate-300">{l.username}</b> {l.action}
                      <span className="ml-1 text-slate-600">
                        · {l.createdAt ? new Date(l.createdAt).toLocaleString("sv-SE") : ""}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {busy && (
          <div className="fixed bottom-4 right-4 z-[110] flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white shadow-lg">
            <Clock className="h-4 w-4 animate-pulse" /> Jobbar...
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

      {mute && (
        <PromptModal
          title={`Tysta chatten för ${mute.user.username}`}
          label="Minuter (0 = för alltid)"
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
