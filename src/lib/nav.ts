import {
  LayoutDashboard,
  Trophy,
  Flame,
  TrendingUp,
  Layers,
  BookOpen,
  School,
  BarChart3,
  Gamepad2,
  ListChecks,
  PlusCircle,
  Sparkles,
  Package,
  Store,
  Settings,
  MessagesSquare,
  HelpCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Every destination in the app, in one list.
 *
 * The header shows a few of these as buttons, the "Mer" menu and the mobile
 * drawer show the groups, and ⌘K searches the whole thing. Adding a page is
 * adding a line here — which is the point: the old header was a literal array
 * inside `navbar.tsx`, so "too many buttons" was a layout problem every time.
 *
 * `roles` is a hint, never a permission: the pages themselves still check the
 * session. It only keeps a pupil from being shown a door that will not open.
 */
export type NavRole = "STUDENT" | "TEACHER" | "ADMIN" | "OWNER" | "SECURITY";

export type NavEntry = {
  href: string;
  label: string;
  /** Short line shown in ⌘K and the drawer. */
  hint?: string;
  /**
   * The two-or-three-word version the header rail prints.
   *
   * The rail has to hold nine buttons without ever wrapping, so a page whose
   * full name is long ("Dagens uppdrag", "Gå med i spel") gets a short one here.
   * The menu, the drawer and ⌘K still print the long `label`.
   */
  short?: string;
  icon: LucideIcon;
  group: NavGroupId;
  /** Only shown to these roles; omitted means everyone. */
  roles?: NavRole[];
  /** Extra words ⌘K should match, e.g. "topplista rank" for the leaderboard. */
  keywords?: string;
};

export type NavGroupId = "oversikt" | "lar" | "spela" | "samla" | "mer";

export const NAV_GROUPS: { id: NavGroupId; label: string; blurb: string }[] = [
  { id: "oversikt", label: "Översikt", blurb: "Var du står och vad som händer" },
  { id: "lar", label: "Lär", blurb: "Kort, quizar och läxor" },
  { id: "spela", label: "Spela", blurb: "Live-spel, host och egna quizar" },
  { id: "samla", label: "Samla", blurb: "Keens, paket och marknaden" },
  { id: "mer", label: "Mer", blurb: "Inställningar, hjälp och chatt" },
];

export const NAV_ITEMS: NavEntry[] = [
  // ── Översikt ───────────────────────────────────────────────────────────
  { href: "/dashboard", label: "Översikt", short: "Översikt", hint: "Din startsida", icon: LayoutDashboard, group: "oversikt", keywords: "hem dashboard start" },
  { href: "/leaderboard", label: "Ledartavla", short: "Topplista", hint: "Topplistan, live", icon: Trophy, group: "oversikt", keywords: "topplista rank topp highscore" },
  { href: "/progress", label: "Framsteg", short: "Framsteg", hint: "Nivåer, träffsäkerhet och mål", icon: TrendingUp, group: "oversikt", keywords: "statistik progress xp utveckling" },
  { href: "/quests", label: "Dagens uppdrag", short: "Uppdrag", hint: "Tre uppdrag, XP att hämta", icon: Flame, group: "oversikt", keywords: "quest uppdrag daglig streak" },

  // ── Lär ────────────────────────────────────────────────────────────────
  { href: "/flashcards", label: "Gloskort", short: "Gloskort", hint: "Repetera med smarta intervall", icon: Layers, group: "lar", keywords: "kort flashcards repetera srs" },
  { href: "/study", label: "Study", short: "Plugga", hint: "Plugga i lugn och ro", icon: BookOpen, group: "lar", keywords: "plugga öva practice" },
  { href: "/classroom", label: "Klassrum", short: "Klassrum", hint: "Dina klasser och läxor", icon: School, group: "lar", keywords: "klass lärare klassrum" },
  {
    href: "/classroom/analytics",
    label: "Analys",
    hint: "Hur klassen ligger till",
    icon: BarChart3,
    group: "lar",
    roles: ["TEACHER", "ADMIN", "OWNER"],
    keywords: "analytics statistik klass",
  },

  // ── Spela ──────────────────────────────────────────────────────────────
  { href: "/play", label: "Gå med i spel", short: "Spela", hint: "Ange en PIN-kod", icon: Gamepad2, group: "spela", keywords: "pin lobby join spel" },
  { href: "/dashboard/quizzes", label: "Mina quizar", hint: "Allt du har byggt", icon: ListChecks, group: "spela", keywords: "quiz lista egna" },
  { href: "/dashboard/quizzes/new", label: "Ny quiz", hint: "Bygg en på några minuter", icon: PlusCircle, group: "spela", keywords: "skapa ny quiz bygg" },

  // ── Samla ──────────────────────────────────────────────────────────────
  { href: "/keens", label: "Keens", short: "Keens", hint: "Dina samlarkort", icon: Sparkles, group: "samla", keywords: "samla karaktärer collection" },
  { href: "/keens/packs", label: "Paket", hint: "Öppna dagens gratispaket", icon: Package, group: "samla", keywords: "pack öppna gratis" },
  { href: "/keens/market", label: "Marknad", hint: "Köp, sälj och dagens fynd", icon: Store, group: "samla", keywords: "köp sälj handel deal" },

  // ── Mer ────────────────────────────────────────────────────────────────
  { href: "/chat", label: "Chatt", short: "Chatt", hint: "Prata med klasskompisar", icon: MessagesSquare, group: "mer", keywords: "meddela prata vänner" },
  { href: "/settings", label: "Inställningar", hint: "Namn, färg och ljud", icon: Settings, group: "mer", keywords: "profil konto ändra" },
  { href: "/help", label: "Hjälp & guide", hint: "Så funkar allt", icon: HelpCircle, group: "mer", keywords: "guide hur gör jag support" },
  {
    href: "/system/staff",
    label: "Personalpanel",
    hint: "Moderering inne i appen",
    icon: Users,
    group: "mer",
    roles: ["ADMIN", "OWNER", "SECURITY"],
    keywords: "staff moderation personal",
  },
];

/** The entries one role may be shown, with the hint filter applied. */
export function navItemsFor(role: string | null | undefined): NavEntry[] {
  const r = (role ?? "STUDENT") as NavRole;
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(r));
}

export function navItemsIn(group: NavGroupId, role: string | null | undefined): NavEntry[] {
  return navItemsFor(role).filter((item) => item.group === group);
}

/**
 * The six that get a button of their own, in order.
 *
 * It used to be nine, and nine icon-only buttons in a row is what made the bar
 * read as a toolbar rather than a menu: nothing could be labelled, because
 * there was no room. Six is the number that lets every tab print its name from
 * `xl` up, so the rail is legible at a glance — and the rest is still one click
 * away in `Mer`, in ⌘K and in the phone drawer.
 *
 * Order is by *intent*, not by route: where you are, who is ahead of you, what
 * you are learning, what you collect.
 */
export const PRIMARY_HREFS = [
  "/dashboard",
  "/leaderboard",
  "/flashcards",
  "/study",
  "/classroom",
  "/keens",
] as const;
