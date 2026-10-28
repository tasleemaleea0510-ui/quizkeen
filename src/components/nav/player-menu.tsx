"use client";

import { ChevronDown, Coins, Flame, HelpCircle, LogOut, Settings as SettingsIcon, Trophy, TrendingUp } from "lucide-react";
import MenuPanel, { MenuLink, MenuSection } from "@/components/nav/menu-panel";
import WornKeen from "@/components/keens/worn-keen";
import { ROLE_THEME } from "@/lib/roles";
import { levelTitle, type LevelProgress } from "@/lib/levels";
import { cn } from "@/lib/utils";

/**
 * The whole player, in one pill.
 *
 * The bar used to carry four separate things for the same person — a coin chip,
 * a level ring, an account menu and a sign-out button — which is where the
 * right-hand side got its 420 pixels and why the tabs had to be icons. They all
 * answer the same question ("how am I doing?"), so they are now one control:
 * the avatar wears the level ring, the name carries the role, the coins sit on
 * the right, and everything else is in the panel it opens.
 *
 * The ring is the same `levelProgress` the wallet panel and the server use, so
 * it cannot drift from the number on the progress page.
 */
const RING_R = 17;
const RING = 2 * Math.PI * RING_R;

export type Player = {
  username: string;
  role: string;
  accentColor: string | null;
  xp: number;
  coins: number;
};

export default function PlayerMenu({
  me,
  level,
  progress,
  onSignOut,
}: {
  me: Player;
  level: number;
  progress: LevelProgress;
  onSignOut: () => void;
}) {
  const theme = ROLE_THEME[me.role] ?? ROLE_THEME.STUDENT;
  const initial = (me.username[0] ?? "?").toUpperCase();
  const nameColor = me.accentColor ? { color: me.accentColor } : undefined;
  // A ring with nothing in it reads as "broken", so level 1 still glows a
  // sliver until the first XP arrives — the same trick the level hairline uses.
  const shown = Math.min(1, Math.max(0.045, progress.ratio));

  return (
    <MenuPanel
      label="Ditt konto"
      align="right"
      active={false}
      triggerClassName="rounded-full"
      panelClassName="max-h-[min(80vh,40rem)] w-[min(92vw,21rem)] overflow-y-auto p-0 no-scrollbar"
      trigger={
        <span className="group flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] py-1 pl-1 pr-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] transition-colors hover:border-white/25 hover:bg-white/[0.08]">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center">
            <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="20" cy="20" r={RING_R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
              <circle
                cx="20"
                cy="20"
                r={RING_R}
                fill="none"
                stroke="var(--accent-bright)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={RING}
                strokeDashoffset={RING * (1 - shown)}
                style={{ filter: "drop-shadow(0 0 4px var(--accent-line))", transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)" }}
              />
            </svg>
            <span className="absolute inset-[4px] grid place-items-center overflow-hidden rounded-full bg-slate-900">
              <span className="text-[13px] font-black text-slate-500" data-no-translate>
                {initial}
              </span>
              <span className="absolute inset-0 grid place-items-center">
                <WornKeen size={28} />
              </span>
            </span>
          </span>

          <span className="hidden min-w-0 max-w-[8.5rem] flex-col justify-center leading-tight sm:flex">
            <span className="truncate text-[13px] font-bold text-white" style={nameColor} data-no-translate>
              {me.username}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[9.5px] font-extrabold uppercase tracking-[0.13em]">
              <span className={cn(theme.color, theme.glow)}>{theme.badge}</span>
              <span aria-hidden className="text-slate-600">
                ·
              </span>
              <span className="text-slate-400">Nv {level}</span>
            </span>
          </span>

          <span className="hidden shrink-0 items-center gap-1 rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-[3px] text-[11px] font-bold text-amber-200 md:flex">
            <Coins className="h-3 w-3" />
            <span className="tabular" data-no-translate>
              {me.coins.toLocaleString("sv-SE")}
            </span>
          </span>

          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform group-hover:text-slate-300" />
        </span>
      }
    >
      {/* Who you are, as a card — the same ring, bigger, with the numbers. */}
      <div className="relative border-b border-white/[0.07] p-4 [background:radial-gradient(140%_120%_at_0%_0%,var(--accent-soft),transparent_62%)]">
        <div className="flex items-center gap-3">
          <span className="relative grid h-12 w-12 shrink-0 place-items-center">
            <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="20" cy="20" r={RING_R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
              <circle
                cx="20"
                cy="20"
                r={RING_R}
                fill="none"
                stroke="var(--accent-bright)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={RING}
                strokeDashoffset={RING * (1 - shown)}
              />
            </svg>
            <span className="absolute inset-[4px] grid place-items-center overflow-hidden rounded-full bg-slate-900">
              <span className="text-sm font-black text-slate-500" data-no-translate>
                {initial}
              </span>
              <span className="absolute inset-0 grid place-items-center">
                <WornKeen size={32} />
              </span>
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-white" style={nameColor} data-no-translate>
              {me.username}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em]">
              <span className={cn(theme.color, theme.glow)}>{theme.badge}</span>
              <span aria-hidden className="text-slate-600">
                ·
              </span>
              <span className="text-slate-400">Nivå {level}</span>
            </p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">{levelTitle(level)}</p>
          </div>
        </div>

        <div className="bar mt-3.5">
          <span className="bar-fill" style={{ width: `${Math.max(2, Math.round(progress.ratio * 100))}%` }} />
        </div>
        <div className="tabular mt-1.5 flex items-center justify-between text-[10.5px] font-semibold text-slate-400" data-no-translate>
          <span>
            {progress.into} / {progress.span} XP
          </span>
          <span>{progress.toNext} till nivå {level + 1}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-2">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">XP totalt</p>
          <p className="tabular mt-0.5 font-display text-lg font-extrabold text-emerald-300" data-no-translate>
            {me.xp.toLocaleString("sv-SE")}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Mynt</p>
          <p className="tabular mt-0.5 font-display text-lg font-extrabold text-amber-300" data-no-translate>
            {me.coins.toLocaleString("sv-SE")}
          </p>
        </div>
      </div>

      <MenuSection title="Genvägar">
        <MenuLink href="/progress" icon={TrendingUp} label="Framsteg" hint="Nivåer, träffsäkerhet och mål" />
        <MenuLink href="/quests" icon={Flame} label="Dagens uppdrag" hint="Tre uppdrag, XP att hämta" />
        <MenuLink href="/leaderboard" icon={Trophy} label="Ledartavlan" hint="Vem leder just nu" />
      </MenuSection>

      <MenuSection title="Konto">
        <MenuLink href="/settings" icon={SettingsIcon} label="Inställningar" hint="Namn, färg och ljud" />
        <MenuLink href="/help" icon={HelpCircle} label="Hjälp & guide" hint="Så funkar allt" />
      </MenuSection>

      <div className="border-t border-white/10 p-1">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-300 transition-colors hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" />
          Logga ut
        </button>
      </div>
    </MenuPanel>
  );
}
