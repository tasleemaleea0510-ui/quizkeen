"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getModerationData,
  modBan,
  modClearWarnings,
  modGiveCoins,
  modMute,
  modSetColor,
  modToggle,
  modTogglePin,
  modUnban,
  modUnmute,
  modWarn,
  type ModerationData,
  type StaffPlayer,
} from "@/app/system/moderation";
import {
  ADMIN_COIN_DAILY_CAP,
  WARNINGS_BEFORE_BAN,
  banPresets,
  humanRemaining,
  mutePresets,
  type StaffRole,
} from "@/lib/moderation";
import { ROLE_THEME } from "@/lib/roles";
import NameColorPicker from "@/components/name-color-picker";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Ban,
  Check,
  Coins,
  Crown,
  EyeOff,
  Ghost,
  Loader2,
  LogOut,
  MapPin,
  Palette,
  Pin,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Snowflake,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

type Info = { text: string; ok: boolean } | null;

function remaining(iso: string | null): string {
  if (!iso) return "";
  const at = new Date(iso);
  // "För alltid" is stored as 2099; printing "28369 d 9 tim" for it is worse
  // than useless to whoever is reading the row.
  if (at.getUTCFullYear() >= 2090) return "för alltid";
  return humanRemaining(at.getTime() - Date.now());
}

function ago(iso: string | null): string {
  if (!iso) return "aldrig";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 90_000) return "nu";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} min sedan`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} tim sedan`;
  return `${Math.floor(h / 24)} d sedan`;
}

/**
 * The staff button in QuizKeen itself.
 *
 * Rendered only for OWNER/ADMIN/SECURITY (the server checks again — see
 * app/system/moderation.ts). Everything a role may not do is simply absent:
 * security sees three ban lengths, an admin sees a day, the owner sees forever.
 */
export default function StaffPanel({ role }: { role: StaffRole }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ModerationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [info, setInfo] = useState<Info>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Per-target drafts. They live here (not inside the row) so collapsing a row
  // never eats a half-written reason.
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [customMin, setCustomMin] = useState<Record<string, string>>({});
  const [coinAmt, setCoinAmt] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getModerationData();
      if (next) setData(next);
    } catch {
      /* keep the last good list */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const run = useCallback(
    async (key: string, fn: () => Promise<{ ok: boolean; info: string }>) => {
      if (busy) return;
      setBusy(key);
      try {
        const res = await fn();
        setInfo({ text: res.info || (res.ok ? "Klart." : "Det gick inte."), ok: res.ok });
        await refresh();
      } catch {
        setInfo({ text: "Något gick fel. Försök igen.", ok: false });
      } finally {
        setBusy(null);
      }
    },
    [busy, refresh]
  );

  const players = useMemo(() => {
    const list = data?.players ?? [];
    const q = query.trim().toLowerCase();
    return q ? list.filter((p) => p.username.toLowerCase().includes(q)) : list;
  }, [data, query]);

  const me = data?.me;
  const staffRole = (me?.role ?? role) as StaffRole;
  const theme = ROLE_THEME[staffRole] ?? ROLE_THEME.STUDENT;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Öppna moderering"
        title={`Moderering (${theme.label})`}
        className={cn(
          "fixed bottom-16 left-4 z-[65] flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-extrabold shadow-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95",
          staffRole === "OWNER"
            ? "border-amber-400/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
            : staffRole === "ADMIN"
              ? "border-red-400/40 bg-red-500/15 text-red-200 hover:bg-red-500/25"
              : "border-sky-400/40 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25"
        )}
      >
        <Shield className="h-4 w-4" />
        <span className="hidden sm:inline">Moderering</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex justify-end">
          <button
            aria-label="Stäng moderering"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Moderering"
            className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-950/95 shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border",
                    staffRole === "OWNER"
                      ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                      : staffRole === "ADMIN"
                        ? "border-red-400/40 bg-red-500/15 text-red-300"
                        : "border-sky-400/40 bg-sky-500/15 text-sky-300"
                  )}
                >
                  {staffRole === "OWNER" ? <Crown className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                </span>
                <div>
                  <h2 className="text-sm font-extrabold text-white">Moderering</h2>
                  <p className="text-[11px] text-slate-400">
                    Inloggad som {me?.username ?? "…"} · {theme.label}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading}
                  aria-label="Uppdatera listan"
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Stäng"
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="grid grid-cols-3 gap-2 border-b border-white/5 px-4 py-3 text-center">
              <Stat label="Spelare" value={data?.stats.total ?? 0} />
              <Stat label="Online" value={data?.stats.online ?? 0} tone="emerald" />
              <Stat label="Bannade" value={data?.stats.banned ?? 0} tone="red" />
            </div>

            <div className="border-b border-white/5 px-4 py-2.5">
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 focus-within:border-indigo-400/60">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Sök spelare…"
                  className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
              </label>
            </div>

            {info && (
              <div
                className={cn(
                  "mx-4 mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs font-semibold",
                  info.ok
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-red-500/40 bg-red-500/10 text-red-200"
                )}
                role="status"
              >
                {info.ok ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                <span className="flex-1">{info.text}</span>
                <button type="button" onClick={() => setInfo(null)} aria-label="Stäng meddelande">
                  <X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {loading && !data && (
                <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Hämtar spelare…
                </p>
              )}
              {!loading && data && players.length === 0 && (
                <p className="py-10 text-center text-sm text-slate-500">Ingen spelare matchar “{query}”.</p>
              )}
              {players.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  staffRole={staffRole}
                  meId={me?.id ?? ""}
                  open={expanded === p.id}
                  onToggle={() => setExpanded((cur) => (cur === p.id ? null : p.id))}
                  busy={busy}
                  run={run}
                  reason={reasons[p.id] ?? ""}
                  setReason={(v) => setReasons((r) => ({ ...r, [p.id]: v }))}
                  customMinutes={customMin[p.id] ?? ""}
                  setCustomMinutes={(v) => setCustomMin((r) => ({ ...r, [p.id]: v }))}
                  coins={coinAmt[p.id] ?? "100"}
                  setCoins={(v) => setCoinAmt((r) => ({ ...r, [p.id]: v }))}
                  budget={data?.coinsBudget ?? ADMIN_COIN_DAILY_CAP}
                />
              ))}
              {data && players.length > 0 && (
                <p className="pt-1 text-center text-[10px] text-slate-600">
                  Visar {players.length} av {data.stats.total}. Uppdateras när du trycker på en knapp.
                </p>
              )}
            </div>

            <footer className="border-t border-white/10 px-4 py-2 text-[10px] leading-relaxed text-slate-500">
              {staffRole === "OWNER"
                ? "Du kan banna för alltid, ge mynt utan dagstak och använda ägarreglagen."
                : staffRole === "ADMIN"
                  ? `Bannlys i max 1 dygn och ge max ${ADMIN_COIN_DAILY_CAP} mynt per person och dag.`
                  : "Säkerhet: varna, bannlys i max 1 timme och tysta chatten i max 1 timme."}{" "}
              Allt loggas.
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "red" }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-2 py-1.5">
      <p
        className={cn(
          "text-lg font-extrabold tabular-nums",
          tone === "emerald" ? "text-emerald-300" : tone === "red" ? "text-red-300" : "text-white"
        )}
      >
        {value}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

type Run = (key: string, fn: () => Promise<{ ok: boolean; info: string }>) => Promise<void>;

function PlayerRow({
  player: p,
  staffRole,
  meId,
  open,
  onToggle,
  busy,
  run,
  reason,
  setReason,
  customMinutes,
  setCustomMinutes,
  coins,
  setCoins,
  budget,
}: {
  player: StaffPlayer;
  staffRole: StaffRole;
  meId: string;
  open: boolean;
  onToggle: () => void;
  busy: string | null;
  run: Run;
  reason: string;
  setReason: (v: string) => void;
  customMinutes: string;
  setCustomMinutes: (v: string) => void;
  coins: string;
  setCoins: (v: string) => void;
  budget: number;
}) {
  const self = p.id === meId;
  const protectedOwner = p.role === "OWNER";
  const staffTarget = p.role === "ADMIN" || p.role === "SECURITY";
  const canPunish = !self && !protectedOwner && (staffRole === "OWNER" || !staffTarget);
  // Pins and colours are decoration, not discipline: same ladder, plus yourself.
  const canDecorate = self || (!protectedOwner && (staffRole === "OWNER" || !staffTarget));
  const canOwnerSwitch = staffRole === "OWNER" && (self || !protectedOwner);
  const canCoins = staffRole !== "SECURITY" && (self || !protectedOwner);
  const coinsLeft = Math.max(0, budget - p.coinsGivenToday);
  const roleTheme = ROLE_THEME[p.role] ?? ROLE_THEME.STUDENT;
  const key = (action: string) => `${action}:${p.id}`;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-slate-900/50 transition-colors",
        open ? "border-indigo-500/40" : "border-white/[0.07] hover:border-white/20"
      )}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800 text-sm font-extrabold"
          style={{ color: p.accentColor ?? undefined }}
        >
          {p.username.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span
              className={cn("truncate text-sm font-bold", !p.accentColor && roleTheme.color)}
              style={p.accentColor ? { color: p.accentColor } : undefined}
            >
              {p.username}
            </span>
            <span className={cn("rounded bg-white/5 px-1 py-0.5 text-[9px] font-mono uppercase tracking-wider", roleTheme.color)}>
              {roleTheme.badge}
            </span>
            {p.pinned && <Pin className="h-3 w-3 text-amber-300" />}
            {self && <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-300">du</span>}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
            <span className={cn("flex items-center gap-1", p.online ? "text-emerald-400" : "text-slate-500")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", p.online ? "bg-emerald-400" : "bg-slate-600")} />
              {p.online ? "online" : ago(p.lastSeenAt)}
            </span>
            <span>Lv {p.level}</span>
            <span className="text-amber-400/80">{p.coins} mynt</span>
            {p.warnings > 0 && <span className="text-orange-300">{p.warnings}/{WARNINGS_BEFORE_BAN} varn.</span>}
            {p.bannedUntil && <span className="rounded bg-red-500/15 px-1 font-bold text-red-300">BAN {remaining(p.bannedUntil)}</span>}
            {p.mutedUntil && <span className="rounded bg-sky-500/15 px-1 font-bold text-sky-300">TYST {remaining(p.mutedUntil)}</span>}
            {p.coinsFrozen && <Snowflake className="h-3 w-3 text-sky-300" />}
            {p.shadowed && <EyeOff className="h-3 w-3 text-violet-300" />}
            {p.ghostMode && <Ghost className="h-3 w-3 text-slate-300" />}
          </span>
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-white/5 px-3 pb-3 pt-2.5">
          {p.location && (
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <MapPin className="h-3 w-3 text-slate-500" /> {p.location}
            </p>
          )}

          {protectedOwner && !self && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200">
              Ägarens konto är skyddat.
            </p>
          )}

          {canPunish && (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Orsak (valfri)</p>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="t.ex. fusk i quiz"
              maxLength={200}
              className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-indigo-400/60 focus:outline-none"
            />
          </div>
          )}

          {canPunish && (
            <section className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-300/80">
                <Ban className="h-3 w-3" /> Bannlys
              </p>
              <div className="flex flex-wrap gap-1.5">
                {banPresets(staffRole).map((b) => (
                  <ActionChip
                    key={b.label}
                    tone={b.minutes === 0 ? "red" : "slate"}
                    disabled={!!busy}
                    loading={busy === key("ban-" + b.minutes)}
                    onClick={() => run(key("ban-" + b.minutes), () => modBan(p.id, b.minutes, reason))}
                  >
                    {b.label}
                  </ActionChip>
                ))}
              </div>
              {staffRole === "OWNER" && (
                <div className="flex items-center gap-1.5">
                  <input
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                    placeholder="Egen tid (min)"
                    className="w-32 rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-white placeholder:text-slate-600 focus:border-indigo-400/60 focus:outline-none"
                  />
                  <ActionChip
                    tone="slate"
                    disabled={!!busy || !customMinutes}
                    onClick={() =>
                      run(key("ban-custom"), () => modBan(p.id, Number(customMinutes || 0), reason))
                    }
                  >
                    Banna
                  </ActionChip>
                </div>
              )}
            </section>
          )}

          <div className="flex flex-wrap gap-1.5">
            {p.bannedUntil && canPunish && (
              <ActionChip
                tone="emerald"
                icon={Check}
                disabled={!!busy}
                loading={busy === key("unban")}
                onClick={() => run(key("unban"), () => modUnban(p.id))}
              >
                Ta bort ban
              </ActionChip>
            )}
            {canPunish && (
              <ActionChip
                tone="orange"
                icon={AlertTriangle}
                disabled={!!busy}
                loading={busy === key("warn")}
                onClick={() => run(key("warn"), () => modWarn(p.id, reason))}
              >
                Varna {p.warnings > 0 ? `(${p.warnings}/${WARNINGS_BEFORE_BAN})` : ""}
              </ActionChip>
            )}
            {staffRole !== "SECURITY" && p.warnings > 0 && canPunish && (
              <ActionChip
                tone="slate"
                disabled={!!busy}
                loading={busy === key("clearwarn")}
                onClick={() => run(key("clearwarn"), () => modClearWarnings(p.id))}
              >
                Rensa varningar
              </ActionChip>
            )}
            {canDecorate && (
              <ActionChip
                tone={p.pinned ? "amber" : "slate"}
                icon={Pin}
                disabled={!!busy}
                loading={busy === key("pin")}
                onClick={() => run(key("pin"), () => modTogglePin(p.id))}
              >
                {p.pinned ? "Avfäst" : "Fäst"}
              </ActionChip>
            )}
          </div>

          {canPunish && (
            <section className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-300/80">
                <VolumeX className="h-3 w-3" /> Chatten
              </p>
              <div className="flex flex-wrap gap-1.5">
                {mutePresets(staffRole).map((m) => (
                  <ActionChip
                    key={m.label}
                    tone="sky"
                    disabled={!!busy}
                    loading={busy === key("mute-" + m.minutes)}
                    onClick={() => run(key("mute-" + m.minutes), () => modMute(p.id, m.minutes))}
                  >
                    Tyst {m.label}
                  </ActionChip>
                ))}
                {p.mutedUntil && (
                  <ActionChip
                    tone="emerald"
                    icon={Volume2}
                    disabled={!!busy}
                    loading={busy === key("unmute")}
                    onClick={() => run(key("unmute"), () => modUnmute(p.id))}
                  >
                    Öppna
                  </ActionChip>
                )}
              </div>
            </section>
          )}

          {canCoins && (
            <section className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                <Coins className="h-3 w-3" /> Ge mynt
                {staffRole === "ADMIN" && <span className="font-normal normal-case text-slate-500">({coinsLeft} kvar idag)</span>}
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  value={coins}
                  onChange={(e) => setCoins(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="100"
                  className="w-24 rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-white placeholder:text-slate-600 focus:border-amber-400/60 focus:outline-none"
                />
                {[100, 500, 1000].map((v) => (
                  <ActionChip key={v} tone="amber" disabled={!!busy} onClick={() => setCoins(String(v))}>
                    {v}
                  </ActionChip>
                ))}
                <ActionChip
                  tone="amber"
                  icon={Coins}
                  disabled={!!busy || !coins}
                  loading={busy === key("coins")}
                  onClick={() => run(key("coins"), () => modGiveCoins(p.id, Number(coins || 0)))}
                >
                  Ge
                </ActionChip>
              </div>
            </section>
          )}

          {canDecorate && (
            <section className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-300/80">
                <Palette className="h-3 w-3" /> Namnfärg
              </p>
              <NameColorPicker
                value={p.accentColor}
                compact
                disabled={!!busy}
                onPick={(color) => run(key("color"), () => modSetColor(p.id, color))}
              />
            </section>
          )}

          {canOwnerSwitch && (
            <section className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                <Crown className="h-3 w-3" /> Ägarreglage
              </p>
              <div className="flex flex-wrap gap-1.5">
                <ActionChip
                  tone={p.coinsFrozen ? "emerald" : "slate"}
                  icon={Snowflake}
                  disabled={!!busy}
                  loading={busy === key("freeze")}
                  onClick={() => run(key("freeze"), () => modToggle(p.id, "freeze"))}
                >
                  {p.coinsFrozen ? "Lås upp mynt" : "Frys mynt"}
                </ActionChip>
                <ActionChip
                  tone={p.shadowed ? "emerald" : "slate"}
                  icon={EyeOff}
                  disabled={!!busy}
                  loading={busy === key("shadow")}
                  onClick={() => run(key("shadow"), () => modToggle(p.id, "shadow"))}
                >
                  {p.shadowed ? "Visa igen" : "Skugga"}
                </ActionChip>
                <ActionChip
                  tone={p.ghostMode ? "emerald" : "slate"}
                  icon={Ghost}
                  disabled={!!busy}
                  loading={busy === key("ghost")}
                  onClick={() => run(key("ghost"), () => modToggle(p.id, "ghost"))}
                >
                  {p.ghostMode ? "Sluta spöka" : "Spöke"}
                </ActionChip>
                <ActionChip
                  tone="red"
                  icon={LogOut}
                  disabled={!!busy}
                  loading={busy === key("relogin")}
                  onClick={() => run(key("relogin"), () => modToggle(p.id, "relogin"))}
                >
                  Tvinga ut
                </ActionChip>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ActionChip({
  children,
  onClick,
  disabled,
  tone = "slate",
  icon: Icon,
  loading,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "slate" | "red" | "emerald" | "amber" | "sky" | "orange";
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  const tones: Record<string, string> = {
    slate: "border-white/10 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10",
    red: "border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25",
    emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20",
    sky: "border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20",
    orange: "border-orange-500/40 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        tones[tone]
      )}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </button>
  );
}
