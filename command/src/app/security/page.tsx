"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSecurityData,
  secWarn,
  secClearWarnings,
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
import { SeatBadge, SeatLocked, useConsoleSeat } from "../../components/seat-guard";
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
  Inbox,
  Handshake,
  Dot,
  Clock,
  Shield,
  Help,
  Cross,
} from "../../components/icons";
import { CountUp } from "../../components/motion";
import { ConsoleHero, IpLine, Panel, SectionHead, SearchField, ToolButton, ToolGroup } from "../../components/ui";

type S = { role: string; code: string };
type NavId = "users" | "chats" | "chat" | "log" | "help";

export default function SecurityPage() {
  const router = useRouter();
  // The role on screen comes from the server, never from the browser alone.
  const { state: seatState } = useConsoleSeat("SECURITY");
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

  if (seatState === "denied") return <SeatLocked need="SECURITY" />;

  if (!s || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-slate-950 text-slate-400">
        <Detective className="h-5 w-5 animate-pulse text-sky-400" />
        Laddar ISVAKT...
      </div>
    );
  }

  const users = data.users.filter((u: any) => u.username.toLowerCase().includes(q.toLowerCase()));
  const online = data.users.filter(
    (u: any) => u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < 120000
  ).length;
  const warnings = data.users.reduce((a: number, u: any) => a + (u.warnings || 0), 0);

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
        <div className="mb-2 flex justify-end">
          <SeatBadge />
        </div>
        {liveFor && <LiveViewer username={liveFor.username} peerId={liveFor.pid} onClose={() => setLiveFor(null)} />}

        <ConsoleHero
          tone="sky"
          Icon={Detective}
          eyebrow="Isvakt · endast personal"
          title="SÄKERHET"
          lead={
            <>
              Håll ordning utan att frysa hela sajten: varna, kyl ner i fem minuter eller en timme, be om
              namnbyte och titta med när det behövs. <b className="text-slate-200">Allt loggas.</b>
            </>
          }
          chips={[
            { Icon: Users, label: "användare", value: <CountUp value={data.users.length} /> },
            { Icon: Dot, label: "online nu", value: <CountUp value={online} />, tone: "emerald" },
            { Icon: Warning, label: "varningar totalt", value: <CountUp value={warnings} />, tone: "amber" },
          ]}
        />

        {info && (
          <div className="mb-4 mt-4 flex animate-cmd-slide-right items-center justify-between gap-4 rounded-2xl border border-sky-500/35 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-200">
            <span data-no-translate>{info}</span>
            <ToolButton label="Stäng" Icon={Cross} tone="sky" onClick={() => setInfo("")} />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[248px_1fr]">
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-6 lg:flex-col lg:overflow-visible lg:pb-0">
            {nav.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSection(n.id)}
                className={`group flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-bold transition-all duration-200 lg:w-full ${
                  section === n.id
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-950/50"
                    : "border border-white/[0.06] bg-slate-900/60 text-slate-300 hover:translate-x-0.5 hover:border-sky-500/30 hover:text-white"
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                    section === n.id ? "bg-white/15" : "bg-white/[0.04] text-slate-400 group-hover:text-sky-300"
                  }`}
                >
                  <n.Icon className="h-4 w-4" />
                </span>
                {n.label}
              </button>
            ))}

            <div className="hidden rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 lg:mt-2 lg:block">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-300">Isvaktens regel</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Varna först, kyl ner sedan. Längre straff än en timme går alltid via admin eller ägare.
              </p>
            </div>
          </nav>

          <Panel key={section} className="animate-cmd-fade">
            {section === "users" && (
              <div>
                <SectionHead
                  Icon={Users}
                  tone="sky"
                  title={`Användare (${users.length})`}
                  note="Milda verktyg först, kyla ner längst ner. Varje knapp säger vad den gör innan du trycker."
                  right={<SearchField value={q} onChange={setQ} />}
                />

                <div className="mt-4 max-h-[36rem] space-y-2 overflow-y-auto pr-1">
                  {users.map((u: any, idx: number) => {
                    const online = Boolean(u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < 120000);
                    return (
                      <div
                        key={u.id}
                        style={{ animationDelay: `${Math.min(idx * 30, 420)}ms` }}
                        className="animate-cmd-row rounded-2xl border border-white/[0.07] bg-slate-950/50 p-4 transition-colors hover:border-sky-500/30"
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
                                  <span className="flex items-center gap-1 rounded-full bg-sky-600/20 px-2 py-0.5 text-[11px] font-bold text-sky-300">
                                    <Ban className="h-3 w-3" /> BANNAD
                                  </span>
                                )}
                              </p>
                              <p className="mt-1 flex items-center gap-2 text-xs text-slate-500" data-no-translate>
                                <span>{u.role} · Lv {u.level}</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    u.warnings > 0 ? "bg-amber-500/15 text-amber-300" : "bg-white/[0.05] text-slate-500"
                                  }`}
                                >
                                  {u.warnings}/3 varningar
                                </span>
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
                              onClick={() => run(secUnban(s, u.username))}
                            />
                          )}
                        </div>

                        {(u.role === "STUDENT" || u.role === "TEACHER") && !u.bannedUntil && (
                          <div className="mt-3 grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                            <ToolGroup title="Vårda" Icon={Warning} tone="amber">
                              <ToolButton
                                label="Varna"
                                Icon={Warning}
                                tone="amber"
                                title="Ge en varning — tre varningar är gränsen"
                                onClick={() => run(secWarn(s, u.id, u.username))}
                              />
                              <ToolButton
                                label="Begär namnbyte"
                                Icon={Pencil}
                                tone="indigo"
                                onClick={() => run(requestRename(s, u.id, u.username))}
                              />
                              <ToolButton
                                label="Amnesti"
                                Icon={Check}
                                tone="emerald"
                                title="Nollställ personens varningar (0/3)"
                                disabled={busy || !u.warnings}
                                onClick={() => run(secClearWarnings(s, u.id, u.username))}
                              />
                            </ToolGroup>

                            <ToolGroup title="Kyla ner" Icon={Ban} tone="sky">
                              <ToolButton
                                label="5 minuter"
                                Icon={Ban}
                                tone="sky"
                                onClick={() => run(secBan(s, u.username, 5))}
                              />
                              <ToolButton
                                label="1 timme"
                                Icon={Ban}
                                tone="sky"
                                onClick={() => run(secBan(s, u.username, 60))}
                              />
                            </ToolGroup>

                            <ToolGroup title="Bevaka & verktyg" Icon={Video} tone="violet">
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
                                label="Öppna"
                                Icon={Sound}
                                tone="emerald"
                                title="Öppna chatten igen"
                                onClick={() => run(unmuteChat(s, u.id, u.username))}
                              />
                              <ToolButton
                                label="Osynlig"
                                Icon={Ghost}
                                tone="slate"
                                title="Växla osynlig närvaro"
                                onClick={() => run(toggleGhost(s, u.id, u.username))}
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

                        {u.role !== "STUDENT" && u.role !== "TEACHER" && (
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
                  tone="sky"
                  title="Chatspaning"
                  note="Globala kanaler, inkorgar, staben och förfrågningar — samlade på ett ställe."
                  right={
                    <ToolButton
                      label="Uppdatera"
                      Icon={Clock}
                      tone="sky"
                      onClick={() => spyOnChats(s).then(setChats).catch(() => setChats(null))}
                    />
                  }
                />
                {!chats && <p className="mt-4 text-sm text-slate-500">Kunde inte läsa in chattar.</p>}
                {chats && (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {[
                      { key: "global", title: "Global / Klass", Icon: ChatIcon },
                      { key: "inbox", title: "Inkorg", Icon: Inbox },
                      { key: "staff", title: "Stab-kanaler", Icon: Users },
                      { key: "requests", title: "Chatt-förfrågningar", Icon: Handshake },
                    ].map((panel) => (
                      <div
                        key={panel.key}
                        className="rounded-2xl border border-white/[0.07] bg-slate-950/50 p-4 transition-colors hover:border-sky-500/25"
                      >
                        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-sky-300">
                          <panel.Icon className="h-4 w-4" /> {panel.title}
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-400">
                            {chats[panel.key].length}
                          </span>
                        </h3>
                        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1 text-xs">
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
                <SectionHead
                  Icon={ChatIcon}
                  tone="sky"
                  title="Stabs-chatt"
                  note="Bara personal. Eleven ser aldrig den här kanalen."
                />
                <div className="mt-4">
                  <StaffChat s={s} accent="bg-sky-600" />
                </div>
              </div>
            )}

            {section === "help" && <HelpPanel kind="SECURITY" />}

            {section === "log" && (
              <div>
                <SectionHead
                  Icon={Scroll}
                  tone="sky"
                  title="Aktivitetslogg"
                  note="Varje åtgärd i isvakten, med vem och när."
                  right={<ToolButton label="Uppdatera" Icon={Clock} tone="sky" onClick={refresh} />}
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
          <div className="fixed bottom-5 right-5 z-[110] flex animate-cmd-pop items-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-600 px-5 py-3 text-sm font-extrabold text-white shadow-2xl shadow-sky-950/60">
            <Clock className="h-4 w-4 animate-spin" /> Jobbar…
          </div>
        )}
      </div>

      <HelpButton kind="SECURITY" />

      {mute && (
        <PromptModal
          title={`Tysta chatten för ${mute.user.username}`}
          label="Minuter (max 60)"
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
