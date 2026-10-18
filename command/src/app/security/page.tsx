"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSecurityData,
  secWarn,
  secBan,
  secUnban,
  requestRename,
  requestLive,
  muteChat,
  unmuteChat,
  toggleGhost,
  togglePin,
  setSecretNote,
  spyOnChats,
} from "../actions";
import StaffChat from "../../components/staff-chat";
import LiveViewer from "../../components/live-viewer";
import PromptModal from "../../components/prompt-modal";
import { HelpButton, HelpPanel } from "../../components/help-guide";
import {
  Detective,
  Users,
  Chat as ChatIcon,
  Scroll,
  Ban,
  Check,
  Video,
  Pencil,
  Warning,
  Mute,
  Sound,
  Ghost,
  Pin,
  Note,
  Search,
  Inbox,
  Handshake,
  Dot,
  Clock,
  Shield,
  Help,
} from "../../components/icons";
import { CountUp } from "../../components/motion";

type S = { role: string; code: string };
type NavId = "users" | "chats" | "chat" | "log" | "help";

export default function SecurityPage() {
  const router = useRouter();
  const [s, setS] = useState<S | null>(null);
  const [data, setData] = useState<any>(null);
  const [info, setInfo] = useState("");
  const [liveFor, setLiveFor] = useState<any>(null);
  const [section, setSection] = useState<NavId>("users");
  const [chats, setChats] = useState<any>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [mute, setMute] = useState<{ user: any; minutes: string } | null>(null);
  const [note, setNote] = useState<{ user: any; text: string } | null>(null);

  useEffect(() => {
    let sess: S | null = null;
    try {
      sess = JSON.parse(localStorage.getItem("cmd_session") || "null");
    } catch {
      sess = null;
    }
    if (!sess || sess.role !== "SECURITY") {
      router.replace("/");
      return;
    }
    setS(sess);
    let alive = true;
    async function pull() {
      try {
        const d = await getSecurityData(sess!);
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
      const d = await getSecurityData(s);
      if (d) setData(d);
    } catch {
      /* keep the last good snapshot */
    }
  }

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
        <Detective className="h-5 w-5 animate-pulse text-sky-400" />
        Laddar ISVAKT...
      </div>
    );
  }

  const users = data.users.filter((u: any) => u.username.toLowerCase().includes(q.toLowerCase()));

  const nav: { id: NavId; Icon: typeof Users; label: string }[] = [
    { id: "users", Icon: Users, label: "Användare" },
    { id: "chats", Icon: Detective, label: "Chatspaning" },
    { id: "chat", Icon: ChatIcon, label: "Stabs-chatt" },
    { id: "log", Icon: Scroll, label: "Logg" },
    { id: "help", Icon: Help, label: "Hjälp" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6">
      <div className="mx-auto max-w-7xl pt-10">
        {liveFor && <LiveViewer username={liveFor.username} peerId={liveFor.pid} onClose={() => setLiveFor(null)} />}

        <div className="mb-6 animate-cmd-fade-up rounded-3xl border border-sky-500/40 bg-sky-500/5 p-6">
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-sky-300">
            <Detective className="h-7 w-7" />
            SÄKERHET — ISVAKT
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
            <Warning className="h-4 w-4 text-amber-400" /> Övervaka · varna · kyla ner (5 min / 1 tim) · namnbyte · tysta ·
            osynlig. Allt loggas.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
            <span className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-slate-300">
              <Users className="h-4 w-4" /> <CountUp value={data.users.length} /> användare
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-amber-400">
              <Warning className="h-4 w-4" />{" "}
              <CountUp value={data.users.reduce((a: number, u: any) => a + (u.warnings || 0), 0)} /> varningar
            </span>
          </div>
        </div>

        {info && (
          <div className="mb-4 flex animate-cmd-slide-right items-center justify-between rounded-xl border border-sky-500/40 bg-slate-900 px-4 py-2 text-sm font-bold text-sky-300">
            <span data-no-translate>{info}</span>
            <button type="button" onClick={() => setInfo("")} className="text-slate-500 hover:text-white">
              stäng
            </button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
          <div className="space-y-2">
            {nav.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSection(n.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-bold transition-all duration-200 hover:translate-x-0.5 ${
                  section === n.id
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-900/40"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <n.Icon className="h-4 w-4" />
                {n.label}
              </button>
            ))}
          </div>

          <div key={section} className="animate-cmd-fade rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            {section === "users" && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                    <Users className="h-5 w-5 text-sky-400" /> Användare ({users.length})
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
                  {users.map((u: any, idx: number) => {
                    const online = Boolean(u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < 120000);
                    return (
                      <div
                        key={u.id}
                        style={{ animationDelay: `${Math.min(idx * 30, 420)}ms` }}
                        className="animate-cmd-row rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition-colors hover:border-sky-500/30"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="flex flex-wrap items-center gap-1.5 font-bold text-white">
                            <Dot online={online} className="h-2.5 w-2.5" />
                            <span data-no-translate>{u.username}</span>
                            <span className="ml-1 text-xs font-normal text-slate-500">
                              {u.role} · Lv {u.level} · {u.warnings}/3 varningar
                            </span>
                            {u.livePath && (
                              <span className="rounded bg-emerald-500/10 px-1.5 text-xs font-normal text-emerald-400">
                                {u.livePath}
                              </span>
                            )}
                            {u.bannedUntil && (
                              <span className="flex items-center gap-1 rounded-full bg-sky-600/20 px-2 py-0.5 text-xs font-bold text-sky-300">
                                <Ban className="h-3 w-3" /> BANNAD
                              </span>
                            )}
                          </p>
                          {(u.role === "STUDENT" || u.role === "TEACHER") &&
                            (u.bannedUntil ? (
                              <button
                                type="button"
                                onClick={() => run(secUnban(s, u.username))}
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
                                  className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-500"
                                >
                                  <Video className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => run(requestRename(s, u.id, u.username))}
                                  title="Begär namnbyte"
                                  className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-bold text-white hover:bg-indigo-500"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => run(secWarn(s, u.id, u.username))}
                                  title="Varna"
                                  className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-bold text-white hover:bg-amber-500"
                                >
                                  <Warning className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => run(secBan(s, u.username, 5))}
                                  className="flex items-center gap-1 rounded-lg bg-sky-600 px-2 py-1 text-xs font-bold text-white hover:bg-sky-500"
                                >
                                  <Ban className="h-3 w-3" /> 5min
                                </button>
                                <button
                                  type="button"
                                  onClick={() => run(secBan(s, u.username, 60))}
                                  className="flex items-center gap-1 rounded-lg bg-sky-600 px-2 py-1 text-xs font-bold text-white hover:bg-sky-500"
                                >
                                  <Ban className="h-3 w-3" /> 1h
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
                                  onClick={() => run(unmuteChat(s, u.id, u.username))}
                                  title="Öppna chatten igen"
                                  className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                                >
                                  <Sound className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => run(toggleGhost(s, u.id, u.username))}
                                  title="Osynlig"
                                  className="rounded-lg bg-slate-600 px-2 py-1 text-xs font-bold text-white hover:bg-slate-500"
                                >
                                  <Ghost className="h-3 w-3" />
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
                          <p className="mt-1 text-xs italic text-yellow-400" data-no-translate>
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
                  <Detective className="h-5 w-5 text-sky-400" /> CHATSPANING
                </h2>
                <p className="mt-1 text-xs text-slate-500">Global, inkorg, stab, förfrågningar. Allt loggas.</p>
                {!chats && <p className="mt-4 text-sm text-slate-500">Kunde inte läsa in chattar.</p>}
                {chats && (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {[
                      { key: "global", title: "Global / Klass", Icon: ChatIcon },
                      { key: "inbox", title: "Inkorg", Icon: Inbox },
                      { key: "staff", title: "Stab-kanaler", Icon: Users },
                      { key: "requests", title: "Chatt-förfrågningar", Icon: Handshake },
                    ].map((panel) => (
                      <div key={panel.key} className="rounded-2xl border border-sky-500/30 bg-slate-950/60 p-4">
                        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-sky-300">
                          <panel.Icon className="h-4 w-4" /> {panel.title} ({chats[panel.key].length})
                        </h3>
                        <div className="max-h-64 space-y-1 overflow-y-auto pr-1 text-xs">
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

            {section === "chat" && (
              <div>
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                  <ChatIcon className="h-5 w-5 text-sky-400" /> Stabs-chatt
                </h2>
                <div className="mt-4">
                  <StaffChat s={s} accent="bg-sky-600" />
                </div>
              </div>
            )}

            {section === "help" && <HelpPanel kind="SECURITY" />}

            {section === "log" && (
              <div>
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                  <Scroll className="h-5 w-5 text-sky-400" /> Aktivitetslogg
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
          <div className="fixed bottom-4 right-4 z-[110] flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-extrabold text-white shadow-lg">
            <Clock className="h-4 w-4 animate-pulse" /> Jobbar...
          </div>
        )}
      </div>

      <HelpButton kind="SECURITY" />

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
          tone="sky"
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
          tone="sky"
        />
      )}
    </div>
  );
}
