"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSupabase } from "@/components/providers";
import TutorialWidget from "@/components/tutorial";
import WornKeen from "@/components/keens/worn-keen";
import { getNavUser } from "@/app/system/actions";
import { ROLE_THEME } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { isGameScreen } from "@/lib/game-screen";
import { NAV_GROUPS, NAV_ITEMS, PRIMARY_HREFS, navItemsIn, type NavGroupId } from "@/lib/nav";
import { levelFor, levelProgress, levelTitle } from "@/lib/levels";
import MenuPanel, { MenuLink, MenuSection } from "@/components/nav/menu-panel";
import CommandPalette from "@/components/nav/command-palette";
import MobileDrawer from "@/components/nav/mobile-drawer";
import {
  Zap,
  LogOut,
  Menu as MenuIcon,
  Coins,
  Flame,
  Trophy,
  Settings as SettingsIcon,
  Sparkles,
  HelpCircle,
  User,
  LayoutGrid,
} from "lucide-react";

/**
 * The header.
 *
 * The rule this bar is built on: **it never changes height.** A header that
 * wraps "Logga ut" onto a second line while you are aiming at it is the bug this
 * file exists to kill, so every part of it is `nowrap` and the middle is a rail
 * that scrolls sideways (with no visible scrollbar) instead of pushing the
 * player cluster off the edge.
 *
 * Layout, left to right:
 *   1. the brand,
 *   2. the rail — the six destinations people use daily, then one *Allt* menu
 *      holding every other page in the app, grouped, with a line saying what
 *      each one is for. `lib/nav` is the single list; adding a page is adding a
 *      line there and it appears in the rail menu, ⌘K and the phone drawer,
 *   3. the player — coins, the level ring, ⌘K, the guide, the account menu and a
 *      sign-out button that is always there.
 *
 * The hairline along the bottom is the level bar: the same number the wallet
 * panel and the server agree on, as a progress line across the whole app.
 */
export default function Navbar() {
  const { supabase, session } = useSupabase();
  const pathname = usePathname();
  const [me, setMe] = useState<{
    username: string;
    role: string;
    accentColor: string | null;
    xp: number;
    coins: number;
  } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      setMe(null);
      return;
    }
    let cancelled = false;
    getNavUser()
      .then((user) => {
        if (!cancelled) setMe(user);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // A running game is played on a projector and on phones, so the site's own
  // chrome steps aside — the game draws its own bar with the Keen, the score and
  // the fullscreen switch, and a second sticky bar above it would eat the screen.
  // The deck host keeps the navbar because that page has no bar of its own.
  if (isGameScreen(pathname)) return null;

  const theme = ROLE_THEME[me?.role ?? "STUDENT"];
  const xp = me?.xp ?? 0;
  const level = levelFor(xp);
  const progress = levelProgress(xp);

  const primary = PRIMARY_HREFS.map((href) => NAV_ITEMS.find((item) => item.href === href)).filter(
    (item): item is (typeof NAV_ITEMS)[number] => Boolean(item)
  );

  // Everything the rail does not show as a button, grouped the way a person
  // thinks about it — not the way the routes happen to be nested.
  const rest = NAV_GROUPS.map((group) => ({
    ...group,
    items: navItemsIn(group.id, me?.role).filter(
      (item) => !(PRIMARY_HREFS as readonly string[]).includes(item.href)
    ),
  })).filter((group) => group.items.length);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const tabClass = (active: boolean) =>
    cn(
      "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-[13px] font-semibold transition-colors",
      active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
    );

  return (
    <header
      data-accent={me?.role === "OWNER" ? "amber" : "indigo"}
      className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/55"
    >
      <div className="relative mx-auto flex h-16 max-w-[1600px] items-center gap-2 overflow-hidden px-3 sm:px-4">
        {/* ── Brand ─────────────────────────────────────────────────────── */}
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 pr-1 transition-opacity hover:opacity-90"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow-sm">
            <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-xl border border-indigo-300/60" />
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <span className="hidden font-display text-xl font-extrabold tracking-tight text-white sm:inline">
            Quiz<span className="text-gradient">Keen</span>
          </span>
        </Link>

        {/* ── The rail ──────────────────────────────────────────────────── */}
        <nav
          aria-label="Huvudmeny"
          className="no-scrollbar hidden min-w-0 flex-1 items-center gap-0 overflow-x-auto lg:flex"
        >
          {session && (
            <>
              {primary.map((item) => {
                const active = isActive(item.href);
                const railLabel = item.short ?? item.label;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative inline-flex shrink-0"
                    title={item.hint ? `${item.label} — ${item.hint}` : item.label}
                    aria-label={item.label}
                  >
                    <span className={tabClass(active)}>
                      <item.icon className={cn("h-4 w-4", active ? "text-indigo-300" : "text-slate-400")} />
                      {/* Labels from 2xl up. Below that the rail is icons with
                          tooltips, which is what keeps nine buttons on one line
                          on a laptop — the rail scrolls if a role has more. */}
                      <span className="hidden 2xl:inline">{railLabel}</span>
                    </span>
                    <span aria-hidden className="nav-underline" data-active={active} />
                  </Link>
                );
              })}

              {/* One menu with the whole map in it, instead of four small ones:
                  a single trigger leaves room for the six tabs above, and the
                  panel is wide enough to show the groups side by side. */}
              <MenuPanel
                label="Allt"
                icon={LayoutGrid}
                active={rest.some((g) => g.items.some((item) => isActive(item.href)))}
                panelClassName="w-[min(94vw,52rem)] p-3"
              >
                <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((group) => (
                    <MenuSection key={group.id} title={group.label}>
                      {group.items.map((item) => (
                        <MenuLink
                          key={item.href}
                          href={item.href}
                          icon={item.icon}
                          label={item.label}
                          hint={item.hint}
                          active={isActive(item.href)}
                        />
                      ))}
                    </MenuSection>
                  ))}
                </div>
                <p className="mt-1 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
                  Tips: tryck{" "}
                  <kbd className="rounded border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-200">
                    ⌘K
                  </kbd>{" "}
                  och skriv namnet på vilken sida som helst.
                </p>
              </MenuPanel>
            </>
          )}
        </nav>

        {/* ── The player ────────────────────────────────────────────────── */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {session ? (
            <>
              {me && (
                <Link
                  href="/keens/packs"
                  title="Dagens gratispaket"
                  className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-2.5 text-sm font-bold text-indigo-100 transition-colors hover:border-indigo-300/50 md:inline-flex"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="tabular" data-no-translate>
                    {me.coins.toLocaleString("sv-SE")}
                  </span>
                  <Coins className="h-3.5 w-3.5 text-amber-300" />
                </Link>
              )}

              {me && (
                <MenuPanel
                  align="right"
                  label={`Nivå ${level}`}
                  icon={Zap}
                  className="hidden xl:block"
                  active={false}
                >
                  <div className="p-2">
                    <div className="flex items-center gap-3">
                      <span className="relative grid h-14 w-14 shrink-0 place-items-center">
                        <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden>
                          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                          <circle
                            cx="22"
                            cy="22"
                            r="18"
                            fill="none"
                            stroke="var(--accent-bright)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 18}
                            strokeDashoffset={2 * Math.PI * 18 * (1 - progress.ratio)}
                          />
                        </svg>
                        <span className="font-display text-sm font-extrabold text-white tabular" data-no-translate>
                          {level}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-white">{levelTitle(level)}</span>
                        <span className="block text-xs text-slate-400 tabular" data-no-translate>
                          {progress.into}/{progress.span} XP · {progress.toNext} till nivå {level + 1}
                        </span>
                      </span>
                    </div>
                    <div className="bar mt-3">
                      <span className="bar-fill" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 border-t border-white/10 pt-1">
                    <Link
                      href="/progress"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/[0.07] hover:text-white"
                    >
                      <Trophy className="h-4 w-4 text-indigo-300" /> Framsteg
                    </Link>
                    <Link
                      href="/quests"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/[0.07] hover:text-white"
                    >
                      <Flame className="h-4 w-4 text-amber-300" /> Uppdrag
                    </Link>
                  </div>
                </MenuPanel>
              )}

              <CommandPalette role={me?.role ?? null} signedIn onSignOut={signOut} />

              <span className="hidden 2xl:inline-flex">
                <TutorialWidget />
              </span>

              {me && (
                <MenuPanel
                  align="right"
                  label="Konto"
                  icon={User}
                  active={isActive("/settings")}
                  className="hidden lg:block"
                >
                  <div className="p-2">
                    <span
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm font-bold",
                        theme.color
                      )}
                    >
                      <WornKeen size={30} className="-ml-1" />
                      <span className="min-w-0">
                        <span
                          className="block truncate"
                          style={me.accentColor ? { color: me.accentColor } : undefined}
                          data-no-translate
                        >
                          {me.username}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <span className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                            {theme.badge}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">{levelTitle(level)}</span>
                        </span>
                      </span>
                    </span>
                  </div>
                  <MenuSection title="Konto">
                    <MenuLink href="/settings" icon={SettingsIcon} label="Inställningar" hint="Namn, färg, ljud" />
                    <MenuLink href="/help" icon={HelpCircle} label="Hjälp & guide" hint="Så funkar allt" />
                    <MenuLink href="/leaderboard" icon={Trophy} label="Ledartavlan" hint="Vem leder just nu" />
                  </MenuSection>
                  <div className="border-t border-white/10 p-1">
                    <button
                      type="button"
                      onClick={signOut}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-300 transition-colors hover:bg-rose-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Logga ut
                    </button>
                  </div>
                </MenuPanel>
              )}

              {/* Always present, never widens into two lines. */}
              <button
                type="button"
                onClick={signOut}
                title="Logga ut"
                aria-label="Logga ut"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:border-rose-400/40 hover:text-rose-300 lg:hidden"
              >
                <LogOut className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Öppna menyn"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 lg:hidden"
              >
                <MenuIcon className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <CommandPalette role={null} signedIn={false} onSignOut={signOut} />
              <Link href="/login" className={cn(tabClass(false), "hidden sm:inline-flex")}>
                Logga in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 text-sm font-semibold text-white shadow-glow-sm ring-1 ring-inset ring-white/15"
              >
                Skapa konto
              </Link>
            </>
          )}
        </div>

        {/* The level bar, as a hairline under the whole app. */}
        {session && me && (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.06]">
            <span
              className="block h-full bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 transition-[width] duration-700"
              style={{ width: `${Math.max(2, Math.round(progress.ratio * 100))}%` }}
            />
          </span>
        )}
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        me={me}
        xp={xp}
        coins={me?.coins ?? 0}
        onSignOut={signOut}
      />
    </header>
  );
}
