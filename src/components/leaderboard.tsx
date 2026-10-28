"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Trophy, RefreshCw, ArrowUp, ArrowDown, Minus, Wifi } from "lucide-react";
import { ROLE_THEME } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { Board, BoardRow, BoardScope } from "@/lib/leaderboard";

/**
 * The leaderboard.
 *
 * Three things a top list has to get right, and the old one got none of them:
 *
 * 1. **Right numbers.** `level` and `progress` arrive already derived from XP by
 *    the server, so a staff reset shows up as level 1 immediately instead of
 *    leaving a veteran's level next to zero XP.
 * 2. **Fresh.** It re-reads the board every 15 s and whenever the tab is focused
 *    again, and each row that *moved* shows an arrow — a rank change nobody can
 *    see is indistinguishable from a board that never updates.
 * 3. **You.** The caller's own row is pinned under the list when they are not in
 *    the visible top, so a student in 40th place can still see themselves move.
 */
const SCOPE_LABEL: Record<BoardScope, string> = {
  alla: "Alla",
  elever: "Elever & lärare",
  klass: "Min klass",
};

function medal(days: number) {
  if (days === 1) return "from-amber-300 to-amber-500 text-slate-950";
  if (days === 2) return "from-slate-200 to-slate-400 text-slate-950";
  if (days === 3) return "from-orange-300 to-orange-600 text-slate-950";
  return "";
}

export default function Leaderboard({
  initial,
  scope = "alla",
  limit = 5,
  showScopeTabs = false,
  compact = false,
  title = "Topplista",
}: {
  initial: Board;
  scope?: BoardScope;
  limit?: number;
  showScopeTabs?: boolean;
  compact?: boolean;
  title?: string;
}) {
  const [board, setBoard] = useState<Board>(initial);
  const [active, setActive] = useState<BoardScope>(scope);
  const [busy, setBusy] = useState(false);
  const [moved, setMoved] = useState<Record<string, number>>({});
  const previousRanks = useRef<Record<string, number>>(
    Object.fromEntries(initial.rows.map((r) => [r.username, r.rank]))
  );

  async function load(next: BoardScope, manual = false) {
    if (manual) setBusy(true);
    try {
      const res = await fetch(`/api/leaderboard?scope=${next}&limit=${limit}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Board;

      // Who climbed, who fell — computed against the rows we are showing. Only
      // ranks that actually changed are recorded, so a still board draws nothing.
      const deltas: Record<string, number> = {};
      const before = previousRanks.current;
      for (const row of data.rows) {
        const was = before[row.username];
        if (was !== undefined && was !== row.rank) deltas[row.username] = was - row.rank;
      }
      previousRanks.current = Object.fromEntries(data.rows.map((r) => [r.username, r.rank]));
      setMoved(deltas);
      setBoard(data);
      if (Object.keys(deltas).length) setTimeout(() => setMoved({}), 4000);
    } catch {
      /* keep the last good board — a hiccup must not blank the page */
    } finally {
      if (manual) setBusy(false);
    }
  }

  useEffect(() => {
    const iv = setInterval(() => load(active), 15000);
    const onFocus = () => load(active);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [active, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (active === scope) return;
    load(active);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = board.rows;

  return (
    <section className="surface overflow-hidden" aria-label={title}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-4 sm:px-5">
        <h2 className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <span className="section-title">{title}</span>
          <span className="flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
            <Wifi className="h-2.5 w-2.5" /> live
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {showScopeTabs && (
            <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
              {(Object.keys(SCOPE_LABEL) as BoardScope[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-bold transition-colors",
                    active === key ? "bg-indigo-500/25 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  {SCOPE_LABEL[key]}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => load(active, true)}
            aria-label="Uppdatera"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
          </button>
        </div>
      </header>

      {board.noClass ? (
        <p className="p-6 text-sm text-slate-400">
          Du är inte med i något klassrum än —{" "}
          <Link href="/classroom" className="font-bold text-indigo-300 underline-offset-2 hover:underline">
            gå med i en klass
          </Link>{" "}
          för att se klassens topplista.
        </p>
      ) : (
        <>
          {/* ── Podium ─────────────────────────────────────────────────── */}
          {!compact && rows.length >= 3 && (
            <div className="grid grid-cols-3 items-end gap-2 px-4 pt-6 sm:px-5">
              {[rows[1], rows[0], rows[2]].map((row, i) => {
                const place = i === 1 ? 1 : i === 0 ? 2 : 3;
                return (
                  <div key={row.username} className="flex flex-col items-center text-center">
                    <span
                      className={cn(
                        "medal overflow-hidden rounded-2xl bg-gradient-to-br shadow-lg",
                        medal(place),
                        place === 1 ? "h-16 w-16 text-2xl" : "h-12 w-12 text-lg"
                      )}
                    >
                      <span className="relative z-10">{place}</span>
                    </span>
                    <span
                      className="mt-2 max-w-full truncate text-sm font-bold text-white"
                      style={row.me ? { color: "#a5b4fc" } : undefined}
                      data-no-translate
                    >
                      {row.username}
                      {row.me && <span className="ml-1 text-[10px] font-extrabold text-indigo-300">DU</span>}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 tabular" data-no-translate>
                      {row.xp.toLocaleString("sv-SE")} XP
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Rows ───────────────────────────────────────────────────── */}
          <ol className="stagger-list space-y-2 p-4 sm:p-5">
            {rows.map((row) => (
              <Row key={row.username} row={row} delta={moved[row.username]} />
            ))}
            {rows.length === 0 && (
              <li className="rounded-xl border border-white/5 bg-slate-900/40 p-4 text-sm text-slate-400">
                Ingen har samlat XP här än — bli den första!
              </li>
            )}
          </ol>
        </>
      )}

      {/* ── Your own row, when you are not in the visible list ─────────── */}
      {board.meRow && !rows.some((r) => r.me) && (
        <div className="border-t border-white/5 p-4 sm:px-5">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Din placering</p>
          <Row row={board.meRow} delta={0} />
        </div>
      )}

      {!compact && (
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-4 py-3 text-xs text-slate-500 sm:px-5">
          <span data-no-translate>
            {board.stats.players} spelare · {board.stats.xp.toLocaleString("sv-SE")} XP ·{" "}
            {board.stats.coins.toLocaleString("sv-SE")} mynt totalt
          </span>
          <Link href="/leaderboard" className="font-bold text-indigo-300 hover:underline">
            Hela topplistan →
          </Link>
        </footer>
      )}
    </section>
  );
}

function Row({ row, delta = 0 }: { row: BoardRow; delta?: number }) {
  const theme = ROLE_THEME[row.role] ?? ROLE_THEME.STUDENT;
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
        row.me
          ? "border-indigo-400/40 bg-indigo-500/10"
          : "border-white/5 bg-slate-900/50 hover:border-white/15"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-xs font-bold",
            row.rank === 1
              ? "bg-amber-400/20 text-amber-300"
              : row.rank === 2
                ? "bg-slate-300/15 text-slate-200"
                : row.rank === 3
                  ? "bg-orange-400/20 text-orange-300"
                  : "bg-white/5 text-slate-500"
          )}
        >
          {row.rank}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            {/* A name is data, not copy: the DOM translator rewrites whole
                words, and "Abdullah OWNER" was arriving on screen as "Abdullah
                ÄGARE". Every name on this board is pinned from it. */}
            <span className={cn("truncate font-semibold", theme.color)} data-no-translate>
              {row.username}
            </span>
            {row.me && (
              <span className="shrink-0 rounded bg-indigo-500/25 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-indigo-200">
                du
              </span>
            )}
            {row.role !== "STUDENT" && (
              <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                {theme.badge}
              </span>
            )}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="bar h-1.5 w-24 sm:w-32">
              <span className="bar-fill" style={{ width: `${Math.round(row.progress * 100)}%` }} />
            </span>
            <span className="text-[11px] text-slate-500 tabular" data-no-translate>
              {row.xpToNext} XP kvar
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {delta !== 0 && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
              delta > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
            )}
          >
            {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta)}
          </span>
        )}
        {delta === 0 && <Minus className="hidden h-3 w-3 text-slate-700 sm:block" />}
        <span className="text-right">
          <span className="block font-display text-sm font-extrabold text-white tabular" data-no-translate>
            {row.xp.toLocaleString("sv-SE")}
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Lv {row.level}
          </span>
        </span>
      </div>
    </li>
  );
}
