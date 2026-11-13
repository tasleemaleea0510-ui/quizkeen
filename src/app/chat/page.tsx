"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getChatHub, getChat, sendTo, requestChat, respondChat } from "./actions";
import EmojiPicker from "@/components/emoji-picker";
import PageHeader, { HeaderStat } from "@/components/page-header";
import {
  ArrowDown,
  Ban,
  Bell,
  Check,
  Lock,
  MessageCircle,
  MessageSquare,
  Search,
  Send,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_PHRASES = ["Hej!", "Bra spelat!", "Tack!", "Är du redo?", "Ses i klassrummet!"];

/** The server trims a message at 500 characters; the composer counts the same. */
const MAX_LEN = 500;

type Msg = { id: string; from: string; text: string; createdAt: string; pending?: boolean };
type Convo = { chan: string; label: string; badge: string; group: string };

/** "14:07" in the reader's own locale. */
function clock(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

/** The day divider's label: "I dag", "I går", or a date. */
function dayLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((midnight(today) - midnight(d)) / 86_400_000);
  if (diff === 0) return "I dag";
  if (diff === 1) return "I går";
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default function ChatPage() {
  const [hub, setHub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [chan, setChan] = useState<string | null>(null);
  const [chanLabel, setChanLabel] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [reqName, setReqName] = useState("");
  const [info, setInfo] = useState("");
  const [filter, setFilter] = useState("");
  const [showQuickBar, setShowQuickBar] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [sending, setSending] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /** Drop an emoji in at the caret so text can be built with emoji anywhere. */
  function insertEmoji(emoji: string) {
    const el = inputRef.current;
    if (!el) {
      setText((t) => t + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  useEffect(() => {
    let on = true;
    async function pullHub() {
      try {
        const h = await getChatHub();
        if (!on) return;
        if (h) {
          setHub(h);
          setUnauthenticated(false);
        } else {
          setUnauthenticated(true);
        }
      } catch {
        if (on) setUnauthenticated(true);
      } finally {
        if (on) setLoading(false);
      }
    }

    pullHub();
    // Safety timeout: never hang on a loading screen if the server is slow.
    const timer = setTimeout(() => on && setLoading(false), 1500);
    const iv = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      pullHub();
    }, 10000);

    return () => {
      on = false;
      clearTimeout(timer);
      clearInterval(iv);
    };
  }, []);

  // Switching channel clears the transcript first. Without this the previous
  // room's messages stayed on screen until the new fetch landed — and stayed for
  // ever if the fetch was refused, which looked like a conversation with the
  // wrong person.
  useEffect(() => {
    setMsgs([]);
    setAtBottom(true);
    setShowQuickBar(false);
    if (!chan) return;
    const current = chan;
    let on = true;
    async function pull() {
      try {
        if (typeof document !== "undefined" && document.hidden) return;
        const m = await getChat(current);
        if (!on) return;
        // `null` means "not allowed" — show nothing rather than the last room.
        if (m) setMsgs(m);
        else setMsgs([]);
      } catch {
        /* keep the last good transcript; the next poll retries */
      }
    }
    pull();
    const iv = setInterval(pull, 5000);
    return () => {
      on = false;
      clearInterval(iv);
    };
  }, [chan]);

  // Only follow the conversation when the reader is already at the bottom.
  // Forcing it on every poll yanked people away from what they were reading.
  useEffect(() => {
    if (!atBottom) return;
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [msgs, atBottom]);

  const conversation = useMemo<Convo[]>(() => {
    if (!hub) return [];
    const me = hub.username as string;
    const out: Convo[] = [];
    const seen = new Set<string>();
    const add = (c: Convo) => {
      if (seen.has(c.chan)) return;
      seen.add(c.chan);
      out.push(c);
    };

    hub.classes.forEach((c: any) => {
      add({ chan: `CLASS|${c.id}`, label: c.name, badge: "KLASS", group: "Klassrum" });
      // Two classes can share a teacher; the thread is the same conversation,
      // so it is added once instead of producing a duplicate React key.
      add({ chan: `TS|${c.teacher}|${me}`, label: c.teacher, badge: "LÄRARE", group: "Direkt" });
    });

    const teacherNames: string[] = hub.classes.map((c: any) => c.teacher);
    hub.students.forEach((s: string) => {
      const alreadyTeacher = teacherNames.includes(s);
      add({
        chan: `TS|${me}|${s}`,
        label: s,
        badge: alreadyTeacher ? "LÄRARE" : "ELEV",
        group: "Direkt",
      });
    });

    hub.reqs
      .filter((r: any) => r.status === "ACCEPTED")
      .forEach((r: any) => {
        const other = r.from === me ? r.to : r.from;
        const [a, b] = [me, other].sort();
        add({ chan: `DM|${a}|${b}`, label: other, badge: "DIREKT", group: "Direkt" });
      });

    add({ chan: "STU|OWNER", label: "Ägaren", badge: "PERSONAL", group: "Personal" });
    add({ chan: "STU|ADMIN", label: "Admin", badge: "PERSONAL", group: "Personal" });
    add({ chan: "STU|SECURITY", label: "Säkerhet", badge: "PERSONAL", group: "Personal" });

    return out;
  }, [hub]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return conversation;
    return conversation.filter((c) => c.label.toLowerCase().includes(q) || c.badge.toLowerCase().includes(q));
  }, [conversation, filter]);

  const grouped = useMemo(() => {
    const groups: { group: string; items: Convo[] }[] = [];
    for (const c of visible) {
      const last = groups[groups.length - 1];
      if (last && last.group === c.group) last.items.push(c);
      else groups.push({ group: c.group, items: [c] });
    }
    return groups;
  }, [visible]);

  const send = useCallback(
    async (t?: string) => {
      const body = (t ?? text).trim();
      if (!body || !chan || sending) return;
      if (hub?.muted && !chan.startsWith("STU|")) return;

      // Optimistic: the bubble lands immediately and is replaced by the server
      // copy on the next read. Waiting for a round-trip made the box feel dead.
      const temp: Msg = {
        id: `tmp-${Date.now()}`,
        from: hub.username,
        text: body.slice(0, MAX_LEN),
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMsgs((m) => [...m, temp]);
      setText("");
      setAtBottom(true);
      setSending(true);

      const r = await sendTo(chan, body).catch(() => ({ ok: false as const, info: "" }));
      setSending(false);
      if (r && r.ok === false) {
        setMsgs((m) => m.filter((x) => x.id !== temp.id));
        setInfo(r.info || "Meddelandet kunde inte skickas.");
        return;
      }
      const m = await getChat(chan);
      if (m) setMsgs(m);
    },
    [chan, hub, sending, text]
  );

  if (loading && !hub && !unauthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
        <MessageSquare className="h-6 w-6 animate-pulse text-indigo-400" />
        <span className="text-sm font-medium">Laddar chatten...</span>
      </div>
    );
  }

  if (unauthenticated || !hub) {
    return (
      <div data-accent="sky" className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="surface animate-pop p-8">
          <span
            aria-hidden
            className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-soft)] text-sky-300"
          >
            <MessageSquare className="h-6 w-6" />
          </span>
          <h2 className="mb-2 font-display text-2xl font-extrabold text-white">Logga in för att chatta</h2>
          <p className="mb-6 text-sm leading-relaxed text-slate-400">
            Du behöver vara inloggad på ditt konto för att delta i klass-chattar och skicka meddelanden.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/login" className="w-full">
              <Button className="w-full bg-indigo-600 font-semibold hover:bg-indigo-500">Logga in</Button>
            </Link>
            <Link href="/register" className="w-full">
              <Button variant="outline" className="w-full font-semibold">
                Skapa konto
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const me = hub.username as string;
  const mutedHere = Boolean(hub.muted) && !(chan ?? "").startsWith("STU|");
  const incoming = hub.reqs.filter((r: any) => r.to === me && r.status === "PENDING");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        accent="sky"
        eyebrow="Chatt"
        icon={MessageSquare}
        title={
          <>
            Prata med <span className="text-shine">klassen</span>
          </>
        }
        lead="Klass-chattar, direktmeddelanden och en egen linje till personalen. Håll tonen schysst — allt loggas och kan läsas av en moderator."
        chips={
          <>
            <HeaderStat icon={Users} label="kanaler" value={conversation.length} tone="sky" />
            <HeaderStat icon={Bell} label="förfrågningar" value={incoming.length} tone="amber" />
            <HeaderStat icon={Lock} label="modererat" value="24/7" tone="slate" />
          </>
        }
      />

      {info && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-300">
          <span>{info}</span>
          <button onClick={() => setInfo("")} className="text-indigo-400 hover:text-white" aria-label="Stäng">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          {incoming.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-300">
                <Bell className="h-4 w-4" />
                <span>Chatt-förfrågningar</span>
              </div>
              {incoming.map((r: any) => (
                <div
                  key={r.id}
                  className="mt-2 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-sm"
                >
                  <span className="font-semibold text-white" data-no-translate>
                    {r.from}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={async () => {
                        const x = await respondChat(r.id, true);
                        setInfo(x.info || "");
                        setHub(await getChatHub());
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500"
                      title="Acceptera"
                      aria-label={`Acceptera chatt med ${r.from}`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        const x = await respondChat(r.id, false);
                        setInfo(x.info || "");
                        setHub(await getChatHub());
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white transition-colors hover:bg-red-500"
                      title="Neka"
                      aria-label={`Neka chatt med ${r.from}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <UserPlus className="h-3.5 w-3.5 text-indigo-400" />
              <span>Starta ny chatt</span>
            </div>
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!reqName.trim()) return;
                const x = await requestChat(reqName);
                setInfo(x.info || "");
                setReqName("");
                setHub(await getChatHub());
              }}
            >
              <input
                value={reqName}
                onChange={(e) => setReqName(e.target.value)}
                placeholder="Användarnamn..."
                aria-label="Användarnamn att bjuda in"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center justify-center rounded-xl bg-indigo-600 px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                aria-label="Skicka förfrågan"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dina konversationer</p>
              <span className="font-mono text-[10px] text-slate-500">{conversation.length}</span>
            </div>

            <label className="mb-2 flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrera..."
                aria-label="Filtrera konversationer"
                className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
              {filter && (
                <button onClick={() => setFilter("")} aria-label="Rensa filter" className="text-slate-500 hover:text-white">
                  <X className="h-3 w-3" />
                </button>
              )}
            </label>

            <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
              {grouped.map((g) => (
                <div key={g.group}>
                  <p className="mb-1 px-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                    {g.group}
                  </p>
                  <div className="space-y-1">
                    {g.items.map((c) => (
                      <button
                        key={c.chan}
                        onClick={() => {
                          setChan(c.chan);
                          setChanLabel(c.label);
                          setInfo("");
                        }}
                        aria-current={chan === c.chan ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                          chan === c.chan ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800/70"
                        )}
                      >
                        <span className="truncate pr-2">{c.label}</span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[10px]",
                            chan === c.chan ? "bg-indigo-700 text-indigo-100" : "bg-slate-800 text-slate-400"
                          )}
                        >
                          {c.badge}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {visible.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-slate-500">
                  {filter ? `Ingen kanal matchar "${filter}".` : "Inga konversationer än — bjud in någon ovan."}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
          {chan ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="min-w-0">
                  <span className="block truncate text-base font-bold text-white">{chanLabel}</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {msgs.length} meddelanden · uppdateras automatiskt
                  </span>
                </div>
              </div>

              <div className="relative">
                <div
                  ref={boxRef}
                  onScroll={() => {
                    const el = boxRef.current;
                    if (!el) return;
                    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 48);
                  }}
                  className="mt-3 h-[26rem] space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  {msgs.length === 0 && (
                    <p className="py-10 text-center text-xs text-slate-500">
                      Inga meddelanden ännu i den här chatten.
                    </p>
                  )}

                  {msgs.map((m, i) => {
                    const prev = msgs[i - 1];
                    const mine = m.from === me;
                    // A new day starts a divider; the same sender within five
                    // minutes continues the same bubble stack.
                    const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
                    const sameBlock =
                      prev &&
                      !newDay &&
                      prev.from === m.from &&
                      new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;

                    return (
                      <div key={m.id}>
                        {newDay && (
                          <div className="my-3 flex items-center gap-2" aria-hidden>
                            <span className="h-px flex-1 bg-slate-800" />
                            <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              {dayLabel(m.createdAt)}
                            </span>
                            <span className="h-px flex-1 bg-slate-800" />
                          </div>
                        )}
                        <div className={cn("flex", mine ? "justify-end" : "justify-start", sameBlock && "mt-0.5")}>
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                              mine ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200",
                              m.pending && "opacity-70"
                            )}
                          >
                            {!mine && !sameBlock && (
                              <p className="mb-0.5 text-[10px] font-bold text-slate-400" data-no-translate>
                                {m.from}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words leading-relaxed" data-no-translate>
                              {m.text}
                            </p>
                            <p
                              className={cn(
                                "mt-0.5 text-right text-[9px] tabular-nums",
                                mine ? "text-indigo-200/70" : "text-slate-500"
                              )}
                              data-no-translate
                            >
                              {m.pending ? "skickar…" : clock(m.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!atBottom && msgs.length > 0 && (
                  <button
                    onClick={() => {
                      setAtBottom(true);
                      boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
                    }}
                    className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg hover:bg-indigo-500"
                  >
                    <ArrowDown className="h-3 w-3" /> Senaste
                  </button>
                )}
              </div>

              {mutedHere && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">
                  <Ban className="h-4 w-4 shrink-0" />
                  <span>{hub.muted} Du kan fortfarande läsa allt och skriva till personalen.</span>
                </div>
              )}

              <div className="mt-3 flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={text}
                    maxLength={MAX_LEN}
                    rows={1}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter sends, Shift+Enter makes a new line — the same
                      // contract every chat app has, so nobody has to guess.
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    disabled={mutedHere}
                    placeholder={
                      mutedHere ? "Du är tystad i chatten" : "Skriv ett meddelande… (Enter skickar, Shift+Enter ny rad)"
                    }
                    aria-label="Meddelande"
                    className="max-h-32 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  {text.length > MAX_LEN - 80 && (
                    <p className="mt-1 text-right font-mono text-[10px] text-slate-500">
                      {text.length}/{MAX_LEN}
                    </p>
                  )}
                </div>
                <EmojiPicker onPick={insertEmoji} />
                <button
                  onClick={() => setShowQuickBar((b) => !b)}
                  className={cn(
                    "flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors",
                    showQuickBar
                      ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
                  )}
                  title="Snabbsvar"
                  aria-expanded={showQuickBar}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Svar</span>
                </button>
                <button
                  onClick={() => send()}
                  disabled={mutedHere || !text.trim() || sending}
                  className="flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>Skicka</span>
                </button>
              </div>

              {showQuickBar && (
                <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 p-2">
                  {QUICK_PHRASES.map((phrase) => (
                    <button
                      key={phrase}
                      data-no-translate
                      onClick={() => {
                        setText(phrase);
                        setShowQuickBar(false);
                        inputRef.current?.focus();
                      }}
                      className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-[30rem] flex-col items-center justify-center gap-2 text-slate-500">
              <MessageSquare className="h-8 w-8 stroke-[1.5] text-slate-600" />
              <p className="text-sm">Välj en konversation i listan för att börja chatta</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
