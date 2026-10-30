import Link from "next/link";
import PageHeader from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  Gamepad2,
  Zap,
  Sparkles,
  Brain,
  School,
  Shield,
  Command,
  BookOpen,
  Trophy,
  ArrowRight,
  Wand2,
} from "lucide-react";

/**
 * Hjälpen, samlad.
 *
 * The app has a first-run tour (the `?` in the header) for the basics; this page
 * is the place you land when you want the whole map: how XP works, why a card
 * comes back on Thursday, what a teacher can do that a student cannot, and the
 * one keyboard shortcut worth learning.
 */
const SECTIONS = [
  {
    icon: BookOpen,
    title: "Spelmanual",
    accent: "text-amber-300",
    body: "Alla fyra lägen, kistornas odds, försvarens priser och Mint-trappan. Manualen läser samma regler som spelet, så siffrorna stämmer alltid.",
    links: [{ href: "/manual", label: "Öppna manualen" }],
  },
  {
    icon: Gamepad2,
    title: "Spela",
    accent: "text-indigo-300",
    body: "Gå med i ett spel med PIN-koden läraren visar. Varje fråga ger poäng; rätt svar ger också XP och mynt. Lobbyn har minispel medan ni väntar — de kostar ingenting och ger inga poäng.",
    links: [
      { href: "/play", label: "Gå med i spel" },
      { href: "/dashboard/quizzes", label: "Mina quizar" },
    ],
  },
  {
    icon: Zap,
    title: "XP, nivåer och titlar",
    accent: "text-emerald-300",
    body: "100 XP per nivå. XP kommer från att svara rätt i spel, lämna in läxor, repetera gloskort och hämta dagens uppdrag — aldrig från att klicka på något. Nivån räknas alltid ut från XP, så siffrorna kan inte hamna i otakt.",
    links: [
      { href: "/progress", label: "Se dina framsteg" },
      { href: "/leaderboard", label: "Ledartavlan" },
    ],
  },
  {
    icon: Brain,
    title: "Plugga smart (repetition)",
    accent: "text-sky-300",
    body: "Gloskort använder spaced repetition: ett kort du kan flyttas upp en ruta och kommer tillbaka om 1, 3, 7 eller 16 dagar; ett du missar börjar om och dyker upp igen under samma pass. Schemat sparas i din webbläsare, per set.",
    links: [
      { href: "/flashcards", label: "Gloskort" },
      { href: "/study", label: "Study" },
    ],
  },
  {
    icon: Sparkles,
    title: "Keens",
    accent: "text-violet-300",
    body: "48 samlarkort med olika sällsynthet. Du får ett gratis paket per dag, kan köpa fler med mynt och handla på marknaden. Två Keens går inte att få ur paket — de delas bara ut av ägaren.",
    links: [
      { href: "/keens", label: "Samlingen" },
      { href: "/keens/packs", label: "Paket" },
      { href: "/keens/market", label: "Marknad" },
    ],
  },
  {
    icon: School,
    title: "Klassrum",
    accent: "text-amber-300",
    body: "Lärare skapar ett klassrum och delar join-koden. Elever går med, ser läxor och lämnar in dem; poängen hamnar i analysen. En lärare kan också ge en liten XP-knuff en gång per dag.",
    links: [
      { href: "/classroom", label: "Klassrum" },
      { href: "/classroom/analytics", label: "Analys (lärare)" },
    ],
  },
  {
    icon: Shield,
    title: "Personal",
    accent: "text-rose-300",
    body: "Ägare, admin och säkerhet har fler verktyg: varningar, tystnader, mynt och en hemlig anteckning per konto. Varningar leder till ban vid tre. Personal når bara elever och lärare — aldrig varandra, och aldrig ägaren.",
    links: [{ href: "/system/staff", label: "Personalpanelen" }],
  },
];

export default function HelpPage() {
  return (
    <div data-accent="sky" className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        accent="sky"
        eyebrow="Hjälp & guide"
        icon={HelpCircle}
        title={
          <>
            Allt du kan, <span className="text-shine">på en sida</span>
          </>
        }
        lead="Kort version: spela med PIN, samla XP, repetera gloskort och hämta dagens uppdrag. Lång version finns här under."
        chips={
          <>
            <Badge tone="sky" icon={Command}>
              ⌘K söker hela appen
            </Badge>
            <Badge tone="emerald" icon={Zap}>
              XP räknas av servern
            </Badge>
            <Badge tone="violet" icon={Wand2}>
              Repetition i webbläsaren
            </Badge>
          </>
        }
        actions={
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white hover:border-white/20"
          >
            Till översikten <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="stagger-list mt-6 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <section key={section.title} className="surface p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
              <section.icon className={`h-5 w-5 ${section.accent}`} />
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{section.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:border-white/25 hover:text-white"
                >
                  {link.label} <ArrowRight className="h-3 w-3" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="surface mt-6 p-5">
        <h2 className="section-title flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-300" /> Vanliga frågor
        </h2>
        <dl className="mt-4 space-y-4 text-sm">
          {[
            {
              q: "Varför står min nivå still?",
              a: "Nivån räknas ut från XP och skrivs i samma stund som XP:t. Om den ser fel ut är det ett fel vi vill veta om — öppna Framsteg; siffran där kommer direkt från databasen.",
            },
            {
              q: "Försvann mina gloskort?",
              a: "Repetitionsschemat ligger i webbläsaren. Byter du enhet eller rensar du lagringen börjar korten om från ruta 1 — korten och XP:t finns kvar, det är bara ordningen som nollställs.",
            },
            {
              q: "Kan jag få XP två gånger för samma sak?",
              a: "Nej. Ett uppdrag kan hämtas en gång per dag, ett studiepass betalar som mest åtta gånger per dag, och en match betalar bara den lärare eller elev som äger quizen.",
            },
            {
              q: "Varför ser jag inte Personalpanelen?",
              a: "Den finns bara för ägare, admin och säkerhet. Rollen sätts av ägaren i Command-konsolen.",
            },
            {
              q: "Hur byter jag namn eller färg?",
              a: "Inställningar. Namnbyten kan också begäras av personal om något olämpligt står där.",
            },
          ].map((item) => (
            <div key={item.q} className="surface-flat p-4">
              <dt className="flex items-center gap-2 font-bold text-white">
                <Trophy className="h-3.5 w-3.5 text-amber-300" />
                {item.q}
              </dt>
              <dd className="mt-1.5 text-slate-400">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-8 text-center text-xs text-slate-600">
        QuizKeen — Lär. Spela. Tävla. · Byggt av Abdullah Shafi
      </p>
    </div>
  );
}
