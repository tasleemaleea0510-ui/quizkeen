"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSupabase } from "@/components/providers";
import TutorialWidget from "@/components/tutorial";
import { getNavUser } from "@/app/system/actions";
import { cn } from "@/lib/utils";
import { isGameScreen } from "@/lib/game-screen";
import { NAV_GROUPS, NAV_ITEMS, PRIMARY_HREFS, navItemsIn } from "@/lib/nav";
import { levelFor, levelProgress } from "@/lib/levels";
import MenuPanel, { MenuLink, MenuSection } from "@/components/nav/menu-panel";
import CommandPalette from "@/components/nav/command-palette";
import MobileDrawer from "@/components/nav/mobile-drawer";
import PlayerMenu from "@/components/nav/player-menu";
import { Zap, Menu as MenuIcon, LayoutGrid } from "lucide-react";

/**
 * The header.
 *
 * It is three calm zones, not a toolbar with everything in it:
 *
 *   1. **Brand** — the mark and the promise, with room to breathe.
 *   2. **Rail** — the six places people actually go, ordered by intent, each
 *      one labelled from `xl` up. Six is the number that lets a tab print its
 *      name; with nine it could only ever be icons, which is what made the bar
 *      read as clutter. Everything else lives in `Mer`, in ⌘K and in the phone
 *      drawer, so adding a page never squeezes this row.
 *   3. **Player** — one pill for the whole person: the avatar wears the level
 *      ring, the name carries the role, the coins ride on the right and the
 *      panel behind it holds the numbers, the shortcuts and the way out.
 *
 * The rules that keep it from ever breaking: nothing here wraps, the height is
 * fixed at one value, and the one thing that must always be reachable (signing
 * out) is inside the menu *and* in the drawer. The hairline along the bottom is
 * the level bar — the same `levelProgress` every other surface reads.
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
  const restActive = rest.some((group) => group.items.some((item) => isActive(item.href)));

  return (
    <header data-accent={me?.role === "OWNER" ? "amber" : "indigo"} className="sticky top-0 z-40">
      {/* The lit edge over the whole bar — one line, in the page's own accent. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-line)] to-transparent"
      />

      <div className="relative border-b border-white/[0.06] bg-[#05060f]/85 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#05060f]/70">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-5">
          {/* ── Brand ───────────────────────────────────────────────────── */}
          <Link href="/" className="group flex shrink-0 items-center gap-2.5 pr-1">
            <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[14px] bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-600 shadow-[0_12px_30px_-14px_rgba(99,102,241,0.95)] ring-1 ring-inset ring-white/25 transition-transform duration-300 group-hover:-translate-y-0.5">
              <span aria-hidden className="brand-sheen absolute inset-0" />
              <Zap className="relative h-[18px] w-[18px] text-white drop-shadow" strokeWidth={2.6} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[17px] font-extrabold tracking-tight text-white sm:text-[19px]">
                Quiz<span className="text-gradient">Keen</span>
              </span>
              <span className="mt-1 hidden text-[8.5px] font-bold uppercase tracking-[0.24em] text-slate-500 2xl:block">
                Lär · Spela · Tävla
              </span>
            </span>
          </Link>

          {/* ── Rail ────────────────────────────────────────────────────── */}
          {/* `overflow-x-auto` is the safety valve: if a very long username makes
              the player pill grow, the tabs scroll a little instead of being
              clipped — the bar still never wraps and never changes height. */}
          <nav
            aria-label="Huvudmeny"
            className="no-scrollbar hidden min-w-0 items-center gap-1 overflow-x-auto lg:flex"
          >
            {session && (
              <>
                {primary.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      data-active={active ? "true" : "false"}
                      title={item.hint ? `${item.label} — ${item.hint}` : item.label}
                      className="rail-pill"
                    >
                      <item.icon
                        className={cn("h-[18px] w-[18px] shrink-0", active ? "text-[var(--accent-bright)]" : "text-slate-400")}
                        strokeWidth={2.1}
                      />
                      {/* A name for every tab, from `xl` up. Below that the rail
                          is icons with tooltips, which is what keeps six tabs on
                          one line on a small laptop. */}
                      <span className="hidden xl:inline">{item.short ?? item.label}</span>
                    </Link>
                  );
                })}

                {/* One menu with the whole map in it, instead of four small ones. */}
                <MenuPanel
                  label="Mer"
                  align="right"
                  active={restActive}
                  panelClassName="w-[min(94vw,52rem)] p-3"
                  triggerClassName="rail-pill"
                  trigger={
                    <>
                      <LayoutGrid className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} />
                      <span className="hidden xl:inline">Mer</span>
                    </>
                  }
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

          {/* ── Player ──────────────────────────────────────────────────── */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {session ? (
              <>
                <CommandPalette role={me?.role ?? null} signedIn onSignOut={signOut} />

                <span className="hidden xl:inline-flex">
                  <TutorialWidget />
                </span>

                {me && <PlayerMenu me={me} level={level} progress={progress} onSignOut={signOut} />}

                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Öppna menyn"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:border-white/25 hover:text-white lg:hidden"
                >
                  <MenuIcon className="h-[18px] w-[18px]" />
                </button>
              </>
            ) : (
              <>
                <CommandPalette role={null} signedIn={false} onSignOut={signOut} />
                <Link
                  href="/login"
                  className="hidden h-10 items-center whitespace-nowrap rounded-full px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white sm:inline-flex"
                >
                  Logga in
                </Link>
                <Link
                  href="/register"
                  className="btn-shine inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 text-sm font-semibold text-white shadow-glow-sm ring-1 ring-inset ring-white/20 transition-transform hover:-translate-y-0.5"
                >
                  Skapa konto
                </Link>
              </>
            )}
          </div>
        </div>

        {/* The level bar, as a hairline under the whole app. */}
        {session && me && (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.06]">
            <span
              className="relative block h-full bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 transition-[width] duration-700"
              style={{ width: `${Math.max(2, Math.round(progress.ratio * 100))}%` }}
            >
              <span className="absolute -right-px top-1/2 h-[6px] w-[6px] -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.55)]" />
            </span>
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
