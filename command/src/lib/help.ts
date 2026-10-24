import type { Lang } from "./i18n";

/**
 * The written guide for the three command consoles.
 *
 * The other staff members don't know what most of the buttons do, so every
 * button, limit and danger lives here in plain language. Two things shape the
 * format:
 *
 *  - `"svenska||english"` — ONE line per string holds both languages, so a
 *    sentence and its translation can never drift apart. `pick()` splits them.
 *  - Nothing here is translated by the DOM patcher (`lib/i18n.ts`). The guide
 *    renders the language you actually picked and is marked `data-no-translate`
 *    so the word-by-word engine can't turn a Swedish sentence into half English.
 *
 * Content rules: only describe what the actions really do (see `app/actions.ts`
 * for the limits), keep the Swedish, and warn where something is irreversible.
 */

export type ConsoleKind = "OWNER" | "ADMIN" | "SECURITY";

/** `"svenska||english"` → the right half for `lang`. Missing `||` = Swedish only. */
export function pick(text: string, lang: Lang): string {
  const sep = text.indexOf("||");
  if (sep < 0) return text.trim();
  return (lang === "en" ? text.slice(sep + 2) : text.slice(0, sep)).trim();
}

export type HelpItem = {
  /** The button or field, written exactly as it looks. */
  name: string;
  /** What it does. */
  what: string;
  /** How/when to use it. */
  how?: string;
  /** Limit or something that can't be undone. */
  warn?: string;
};

export type HelpGroup = { title: string; items: HelpItem[] };

export type HelpSection = {
  id: string;
  title: string;
  lead: string;
  steps?: string[];
  groups: HelpGroup[];
};

export type HelpRow = { what: string; owner: string; admin: string; security: string };

export type HelpDoc = {
  title: string;
  lead: string;
  rules: string[];
  sections: HelpSection[];
};

const YES = "Ja||Yes";
const NO = "Nej||No";

/** "Vem får göra vad" — the fastest way to answer an argument between staff. */
export const MATRIX: HelpRow[] = [
  {
    what: "Låsa upp konsolen||Unlock the console",
    owner: "Ägarkoden||The owner code",
    admin: "Admin-koden||The admin code",
    security: "Säkerhetskoden||The security code",
  },
  {
    what: "Banna||Ban",
    owner: "Hur länge som helst||Any length",
    admin: "Max 1 dag||Max 1 day",
    security: "Max 1 timme||Max 1 hour",
  },
  {
    what: "Längre ban än så||A longer ban",
    owner: "Gör det själv||Just do it",
    admin: "Skicka begäran → ägaren godkänner||Send a request → the owner approves",
    security: "Be en admin eller ägaren||Ask an admin or the owner",
  },
  {
    what: "Ge XP||Give XP",
    owner: "Hur mycket som helst, hur ofta som helst||Any amount, any time",
    admin: "Max 500 per person och dag||Max 500 per person per day",
    security: NO,
  },
  {
    what: "Mynt, nivå, reset||Coins, level, reset",
    owner: YES,
    admin: NO,
    security: NO,
  },
  {
    what: "Massverktyg (våg, amnesti, sanering)||Mass tools (wave, amnesty, purge)",
    owner: "Allt, till hela grupper||Everything, to whole groups",
    admin: "Bara belöningsvågen, en gång per dag||Only the reward wave, once a day",
    security: NO,
  },
  {
    what: "Nollställa varningar||Clear warnings",
    owner: "Alla på en gång||Everyone at once",
    admin: NO,
    security: "En person i taget||One person at a time",
  },
  {
    what: "Varna (3 = 24 tim ban)||Warn (3 = 24 h ban)",
    owner: "Nej, men kan nollställa varningar||No, but can clear warnings",
    admin: NO,
    security: "Ja, och kan ta tillbaka en varning||Yes, and can take one back",
  },
  {
    what: "Tysta chatten||Mute the chat",
    owner: "Ja, även för alltid||Yes, forever included",
    admin: "Ja, även för alltid||Yes, forever included",
    security: "Ja, även för alltid||Yes, forever included",
  },
  {
    what: "Se skärmen live||See the screen live",
    owner: YES,
    admin: YES,
    security: YES,
  },
  {
    what: "Begära namnbyte||Request a rename",
    owner: YES,
    admin: NO,
    security: YES,
  },
  {
    what: "Tysta meddelanden (osynlig)||Hide messages (ghost)",
    owner: NO,
    admin: NO,
    security: YES,
  },
  {
    what: "Fäst & hemlig anteckning||Pin & secret note",
    owner: YES,
    admin: YES,
    security: YES,
  },
  {
    what: "Unbanna||Unban",
    owner: YES,
    admin: YES,
    security: YES,
  },
  {
    what: "Sändning (gul banderoll)||Broadcast (yellow banner)",
    owner: YES,
    admin: YES,
    security: NO,
  },
  {
    what: "Dela ut Keens||Hand out Keens",
    owner: "Alla ur katalogen, även dubletter||Any from the catalogue, duplicates included",
    admin: "Bara Admin-Keenen, en per person||Only the Admin Keen, one per person",
    security: NO,
  },
  {
    what: "Radera konto||Delete an account",
    owner: YES,
    admin: NO,
    security: NO,
  },
  {
    what: "Lösenord, email, roll, koder, stänga sajten||Password, email, role, codes, shut the site",
    owner: YES,
    admin: NO,
    security: NO,
  },
];

const TIME_TIP =
  "Tider: 5 min = 5 · 1 tim = 60 · 1 dag = 1440 · 2 dagar = 2880 · 1 vecka = 10080 · 0 = för alltid.||" +
  "Times: 5 min = 5 · 1 hour = 60 · 1 day = 1440 · 2 days = 2880 · 1 week = 10080 · 0 = forever.";

const LOG_TIP =
  "Allt personal gör hamnar i Logg med [OWNER], [ADMIN] eller [SECURITY] framför sin rad. Inget går att göra i smyg.||" +
  "Everything staff do lands in the Log with [OWNER], [ADMIN] or [SECURITY] in front of the row. Nothing here is off the record.";

const SESSION_TIP =
  "Sessionen sparas i den här webbläsaren, så du slipper koden varje gång. På en delad dator: tryck Glöm på startsidan när du är klar.||" +
  "Your session is remembered in this browser so you don't retype the code. On a shared computer, press Forget on the start page when you're done.";

const HELP_BUTTON_TIP =
  "Längst ner till vänster finns en rund ? -knapp. Den öppnar den här guiden var du än är, utan att du tappar det du gjorde.||" +
  "There's a round ? button in the bottom-left corner. It opens this guide wherever you are, without losing your place.";

// ─── OWNER ───────────────────────────────────────────────────────────────

const OWNER: HelpDoc = {
  title: "ÄGARKONSOLEN — guide||THE OWNER CONSOLE — guide",
  lead:
    "Här står varje knapp, vad den gör och var gränsen går. Läs en gång så kan du allt sedan — och kan förklara det för dina admins.||" +
    "Every button, what it does and where the limit is. Read it once and you'll know the whole console — and can explain it to your admins.",
  rules: [
    "Du är högsta nivån. Det som är låst för admin och säkerhet kan du göra själv.||You are the top level. What's locked for admins and security, you can do yourself.",
    LOG_TIP,
    TIME_TIP,
    SESSION_TIP,
    "Siffrorna laddas om var 20:e sekund. Vänta en sekund innan du trycker igen.||The numbers reload every 20 seconds. Give it a moment before pressing again.",
    "Skriv ner ägarkoden. Tappar du den finns ingen återställning — då måste den ändras i databasen.||Write the owner code down. There's no reset link — losing it means changing it in the database.",
    HELP_BUTTON_TIP,
  ],
  sections: [
    {
      id: "start",
      title: "Kom igång||Getting started",
      lead: "Fem steg och du är hemma.||Five steps and you're at home.",
      steps: [
        "Lås upp med ägarkoden på startsidan.||Unlock with the owner code on the start page.",
        "Menyn till vänster byter flik: Översikt · Superkrafter · Ban-begäranden · Chatspaning · Stabs-chatt · Användare · Sändning · Koder · Logg.||The menu on the left switches tabs: Overview · Superpowers · Ban requests · Chat Spy · Staff chat · Users · Broadcast · Codes · Log.",
        "Ska du göra något med en person? Fliken Användare → sök → klicka på personen, så öppnas kontrollpanelen med alla knappar.||Want to act on someone? Users tab → search → click the person and the control panel with every button opens.",
        "Den gula raden högst upp säger vad som hände senast, t.ex. \"+100 XP till Kalle\". Krysset stänger den.||The yellow bar at the top says what just happened, e.g. \"+100 XP to Kalle\". The X closes it.",
        "Laddar något för länge? Den gula \"Jobbar...\"-brickan nere till höger betyder att en åtgärd körs.||Loading forever? The yellow \"Working...\" chip in the bottom-right means an action is still running.",
      ],
      groups: [],
    },
    {
      id: "stats",
      title: "Översikt — GULD-TRONEN||Overview — THE GOLD THRONE",
      lead: "Åtta siffror över hela QuizKeen. Bara läsning — inget här ändrar något.||Eight numbers about the whole of QuizKeen. Read-only — nothing here changes anything.",
      groups: [
        {
          title: "Sifferkorten||The number cards",
          items: [
            { name: "Användare||Users", what: "Hur många konton som finns.||How many accounts exist." },
            { name: "Lärare||Teachers", what: "Hur många som har rollen TEACHER.||How many have the TEACHER role." },
            {
              name: "Quizar · Gloskortlekar · Spel||Quizzes · Flashcard decks · Games",
              what: "Antal skapade quizar, skapade gloskortlekar och spelade spelomgångar i hela appen.||Created quizzes, created flashcard decks and played game rounds across the whole app.",
            },
            {
              name: "Total XP · Totala mynt||Total XP · Total coins",
              what: "All XP och alla mynt som alla användare har tillsammans.||All XP and all coins that every user has together.",
            },
            {
              name: "Väntande begäranden||Pending requests",
              what: "Ban-förfrågningar från admins som väntar på ditt beslut. Samma siffra som den röda brickan vid Ban-begäranden.||Ban requests from admins waiting for your decision. Same number as the red badge next to Ban requests.",
            },
          ],
        },
      ],
    },
    {
      id: "requests",
      title: "Ban-begäranden||Ban requests",
      lead:
        "En admin får bara banna i ett dygn. Vill de längre skickar de en begäran till dig, och då hamnar den här. Att godkänna är att banna.||" +
        "An admin may only ban for one day. Longer than that they send you a request, and it lands here. Approving means banning.",
      groups: [
        {
          title: "Väntande begäranden||Pending requests",
          items: [
            {
              name: "1 tim · 1 dag · 2 dagar · 1 vecka",
              what: "Godkänner begäran och bannar personen i precis den tiden.||Approves the request and bans the person for exactly that long.",
              how: "Ett tryck — inget mer att fylla i.||One press — nothing else to fill in.",
            },
            {
              name: "egna min + Egen tid",
              what: "Egen längd i minuter, t.ex. 4320 = 3 dagar.||Your own length in minutes, e.g. 4320 = 3 days.",
              how: "Skriv antalet i rutan och tryck Egen tid.||Type the number in the box and press Custom time.",
            },
            {
              name: "FÖR ALLTID",
              what: "Bannar till år 2099, alltså i praktiken för alltid.||Bans until the year 2099, in practice forever.",
              how: "Du får en extra ruta som frågar en gång till.||You get an extra dialog that asks once more.",
              warn: "Bara den som unbannar släpper in personen igen.||Only an unban lets the person back in.",
            },
            {
              name: "Avslå",
              what: "Stänger begäran utan att banna. Personen märker ingenting.||Closes the request without banning. The person notices nothing.",
              how: "Begäran flyttas till Hanterade och står som Avslagen.||The request moves to Handled and shows as Rejected.",
            },
          ],
        },
        {
          title: "Efteråt||Afterwards",
          items: [
            {
              name: "Hanterade||Handled",
              what: "Historik över godkända och avslagna begäranden med tid.||History of approved and rejected requests with timestamps.",
              warn: "En begäran kan bara hanteras en gång. Ångrar du dig använder du Unbanna under Användare.||A request can only be handled once. If you change your mind, use Unban under Users.",
            },
          ],
        },
      ],
    },
    {
      id: "users",
      title: "Användare — kontrollpanelen||Users — the control panel",
      lead:
        "Hjärtat i konsolen. Sök upp en person, klicka på raden och du får alla knappar om den personen. Panelen är uppdelad i rutor — här är de i tur och ordning.||" +
        "The heart of the console. Find a person, click the row and you get every button for that person. The panel is split into boxes — here they are in order.",
      groups: [
        {
          title: "XP & mynt & nivå||XP & coins & level",
          items: [
            {
              name: "+XP / -XP",
              what: "Lägger till eller drar bort XP. Siffran i rutan till vänster bestämmer hur mycket.||Adds or removes XP. The number in the box to the left decides how much.",
              how: "Skriv 250 och tryck +XP för att ge 250. Skriv 100 och tryck -XP för att dra bort 100.||Type 250 and press +XP to give 250. Type 100 and press -XP to take 100 away.",
            },
            {
              name: "+mynt / -mynt",
              what: "Samma sak för mynt, valutan i QuizKeen.||The same for coins, the currency in QuizKeen.",
              how: "Mynt köps och används i själva appen — här kan du rätta till fel eller belöna.||Coins are earned and spent in the app itself — here you fix mistakes or hand out a reward.",
            },
            {
              name: "Sätt nivå",
              what: "Sätter nivån direkt (1–999).||Sets the level directly (1–999).",
              warn: "Nivån räknas ut ur XP: nivå 5 sätter XP till 400 och skriver över det gamla.||The level is derived from XP: level 5 sets XP to 400 and overwrites the old value.",
            },
            {
              name: "Reset XP · Reset mynt",
              what: "Nollställer bara den ena saken.||Resets just that one thing.",
            },
            {
              name: "Reset ALLT",
              what: "Nollställer XP, mynt och varningar på en gång.||Resets XP, coins and warnings at once.",
              warn: "Frågar först. Går inte att ångra.||Asks first. Cannot be undone.",
            },
          ],
        },
        {
          title: "Byt namn & roll||Change name & role",
          items: [
            {
              name: "Namnrutan + Spara",
              what: "Byter användarnamn.||Changes the username.",
              warn: "Minst 3 tecken, annars sparas inget. Namnet syns direkt i chattar och topplistor.||At least 3 characters or nothing is saved. The name shows up at once in chats and leaderboards.",
            },
            {
              name: "Rolllistan + Sätt roll",
              what: "Ger personen en roll: STUDENT, TEACHER, ADMIN, OWNER eller SECURITY.||Gives the person a role: STUDENT, TEACHER, ADMIN, OWNER or SECURITY.",
              warn: "ADMIN och uppåt kommer åt konsolerna om de får koden — ge bara till folk du litar på.||ADMIN and above can reach the consoles if they get the code — only give it to people you trust.",
            },
          ],
        },
        {
          title: "LIVE-skärmdelning||LIVE screen sharing",
          items: [
            {
              name: "Be om LIVE-skärm",
              what: "Skickar en förfrågan om att se personens skärm.||Sends a request to see that person's screen.",
              how: "När personen godkänner öppnas en videoruta överst i konsolen. Stäng den med Stäng eller Escape.||When they accept, a video panel opens at the top of the console. Close it with Close or Escape.",
            },
          ],
        },
        {
          title: "Banna||Ban",
          items: [
            {
              name: "5 min · 1 tim · 24 tim",
              what: "Bannar i den tiden direkt.||Bans for that long, immediately.",
              how: "Skriv eventuellt först i meddelanderutan vad personen ska få veta.||Optionally write in the message box first what the person should be told.",
            },
            {
              name: "FÖR ALLTID",
              what: "Bannar i praktiken för alltid (till 2099).||Bans in practice forever (until 2099).",
              warn: "Frågar om igen. Personen kommer inte in förrän någon unbannar.||Asks again. The person is locked out until someone unbans.",
            },
            {
              name: "egna minuter + Banna",
              what: "Egen tid i minuter. 0 = för alltid.||Your own length in minutes. 0 = forever.",
            },
            {
              name: "meddelande (valfritt)",
              what: "Texten den bannade ser när de försöker komma in.||The text the banned person sees when they try to get in.",
              how: "Skriv den FÖRE du trycker på en ban-knapp — den skickas med åtgärden.||Write it BEFORE pressing a ban button — it is sent together with the action.",
            },
            {
              name: "Unbanna",
              what: "Släpper in personen igen och tar bort meddelandet.||Lets the person back in and clears the message.",
            },
          ],
        },
        {
          title: "Lösenord & email||Password & email",
          items: [
            {
              name: "Meddela med popup",
              what: "Om den är ikryssad sparas det nya lösenordet så att personen ser det i en popup.||If ticked, the new password is saved so the person sees it in a popup.",
              how: "Praktiskt när någon glömt sitt lösenord och du inte kan nå dem på annat sätt. Lämna den av om du byter lösenord av säkerhetsskäl.||Handy when someone forgot their password and you can't reach them otherwise. Leave it off if you're changing the password for security reasons.",
            },
            {
              name: "eget lösenord (valfritt, 6+ tecken)",
              what: "Skriv ett eget lösenord om du vill. Tom ruta = ett slumpat lösenord på 8 tecken.||Type your own password if you like. Empty box = a random 8-character password.",
            },
            {
              name: "Återställ",
              what: "Byter lösenordet direkt.||Changes the password right away.",
              how: "Det nya lösenordet visas i den gula raden högst upp — kopiera det innan du stänger raden.||The new password appears in the yellow bar at the top — copy it before you close that bar.",
            },
            {
              name: "Visa email",
              what: "Visar vilken e-post adress kontot är registrerat med.||Shows which email address the account is registered with.",
            },
            {
              name: "RADERA ANVÄNDARE",
              what: "Raderar kontot för alltid — inloggningen, profilen, XP, mynt, allt.||Deletes the account forever — the login, the profile, XP, coins, everything.",
              warn: "Frågar först och går INTE att ångra. Läs namnet en gång extra.||Asks first and CANNOT be undone. Read the name one extra time.",
            },
          ],
        },
        {
          title: "Superpowers (endast ägare)||Superpowers (owner only)",
          items: [
            {
              name: "Skugga (osynlig på topplistan)||Shadow (hidden from the leaderboard)",
              what: "Personen spelar precis som vanligt men syns inte i topplistan.||The person plays as usual but doesn't show on the leaderboard.",
              how: "Växlar av och på — samma knapp båda vägarna.||Toggles on and off — the same button both ways.",
            },
            {
              name: "Tidsmaskin",
              what: "Visar vilka sidor personen besökt de senaste X minuterna (upp till 20 besök).||Shows which pages the person visited in the last X minutes (up to 20 visits).",
              how: "Skriv t.ex. 30 och tryck Visa. Svaret kommer i den gula raden.||Type e.g. 30 and press Show. The answer arrives in the yellow bar.",
            },
            {
              name: "IP-peek",
              what: "Visar hela IP-adressen, landet, staden och när den sågs.||Shows the full IP address, the country, the city and when it was seen.",
              warn: "Ägarens egen uppkoppling visas som “dold” för admin och säkerhet — bara ägaren ser den.||The owner's own connection reads as “dold” to admins and security; only the owner sees it.",
            },
            {
              name: "Adresshistorik||Address history",
              what: "Varje adress kontot någonsin setts från — först sedd, senast sedd och hur många gånger. Inte bara den senaste.||Every address the account has ever been seen from — first seen, last seen and how many times. Not just the latest.",
              how: "Öppna personen under Användare. Listan fylls på av appens hjärtslag var 15:e sekund.||Open the person under Users. The list is filled by the app's heartbeat every 15 seconds.",
              warn: "En adress som bytts ut ligger kvar — det är hela poängen. Blockera den därifrån om personen hoppar mellan nät.||An address that is no longer used stays in the list — that is the point. Block it from there if the person hops between networks.",
            },
            {
              name: "Blockera uppkopplingen||Block the connection",
              what: "Spärrar hela nätet, inte kontot: nya konton och andra enheter på samma adress släpps inte in.||Locks the network, not the account: new accounts and other devices on the same address are refused.",
              how: "Tryck på knappen vid en adress i historiken, eller skriv adressen under Superkrafter → Blockerade uppkopplingar. Avblockera häver den.||Press the button next to an address in the history, or type the address under Superpowers → Blocked connections. Unblock lifts it.",
              warn: "På en skola delar många elever adress — en spärr kan träffa flera. Tidsbegränsa när du kan.||At a school many students share an address — one block can hit several. Time-limit it when you can.",
            },
            {
              name: "Frys mynt",
              what: "Låser myntplånboken: personen kan inte spendera mynt.||Freezes the wallet: the person cannot spend coins.",
              how: "Växlar. Bra om ett konto verkar köpa saker på fel sätt.||Toggles. Useful if an account seems to be buying things the wrong way.",
              warn: "Inte aktiv än. QuizKeen har ingen mynt-utgift — knappen sparar flaggan, men inget ändras för personen.||Not active yet. QuizKeen has no coin spending — the button saves the flag but nothing changes for the person.",
            },
            {
              name: "Daglig bonus",
              what: "Slår av eller på den dagliga belöningen för personen.||Turns the daily reward off or on for that person.",
              how: "Växlar. Bra om bonusen missbrukas.||Toggles. Useful if the bonus is being abused.",
              warn: "Inte aktiv än. Det finns ingen daglig bonus i QuizKeen än, så flaggan sparas utan effekt.||Not active yet. There is no daily bonus in QuizKeen yet, so the flag is saved with no effect.",
            },
            {
              name: "Tvinga ny inloggning",
              what: "Kastar ut personen till inloggningen nästa gång de rör sig på sajten.||Throws the person back to the login the next time they move on the site.",
              how: "Frågar först. Användbart om ett konto verkar kapat.||Asks first. Useful if an account looks hijacked.",
            },
            {
              name: "Hemlig anteckning (bara personal)",
              what: "En anteckning som bara personal ser, under personens namn i ägar-, admin- och säkerhetskonsolen.||A note only staff see, under the person's name in the owner, admin and security consoles.",
              how: "Skriv och tryck Spara. Töm rutan och spara för att radera den.||Write and press Save. Empty the box and save to delete it.",
            },
          ],
        },
        {
          title: "Keen-valvet (endast ägare)||The Keen vault (owner only)",
          items: [
            {
              name: "Sök Keen… + paketväljaren||Search Keen… + the pack picker",
              what: "Hela samlarkatalogen. \"har ×N\" under namnet visar hur många kopior personen äger.||The whole collectible catalogue. \"har ×N\" under the name shows how many copies the person owns.",
              how: "Sök på namn eller id, eller filtrera på paket. Siffran i rubriken är hur många av katalogen personen har.||Search by name or id, or filter by pack. The number in the heading is how much of the catalogue the person has.",
            },
            {
              name: "Ge",
              what: "Lägger en kopia av Keenen i personens samling direkt, och en rad i deras \"Senaste öppningar\".||Puts one copy of that Keen in the person's collection right away, plus a row in their \"Latest pulls\".",
              how: "Trycker du igen blir det en dublett — samlingen räknar kopior, precis som ett riktigt paket.||Press again and it becomes a duplicate — the collection counts copies, exactly like a real pack.",
              warn: "Keenen syns först när personen laddar om samlingen. Loggen skriver vem som gav och när.||The Keen shows once the person reloads the collection. The log records who gave it and when.",
            },
            {
              name: "Ta bort",
              what: "Tar bort en kopia. Har personen flera minskar antalet, annars försvinner Keenen ur samlingen.||Removes one copy. If they have several the count drops, otherwise the Keen leaves the collection.",
              warn: "Knappen syns bara på Keens personen faktiskt har. Öppningshistoriken rörs inte — den ska fortfarande visa att Keenen kom och försvann.||The button only appears on Keens the person actually owns. The pull history is untouched — it should still show that the Keen arrived and left.",
            },
            {
              name: "Admin-Keens",
              what: "Doodle Kraken och Omeisaurus finns också i valvet. De är troféer: en per person, precis som korten under Admin-Keens — trycker du igen säger den att personen redan har den.||Doodle Kraken and Omeisaurus are in the vault too. They are trophies: one per person, exactly like the cards under Admin-Keens — a second press says they already have it.",
            },
            {
              name: "Ägar-Keens (drakarna)",
              what: "DragonY, DragonY (Forest) och DragonY (Moonlight) är ägarens egna Mystiska Keens. De finns inte i något paket och bara ägaren kan ge bort dem — därför ligger de bara i det här valvet, aldrig i adminpanelen.||DragonY, DragonY (Forest) and DragonY (Moonlight) are the owner's own Mystical Keens. They are in no pack and only the owner can give them away — so they live in this vault only, never in the admin panel.",
              warn: "En trofé: en per person. Trycker du Ge igen säger den att personen redan har den.||A trophy: one per person. Press Ge again and it says the person already has it.",
            },
          ],
        },
        {
          title: "Stabskrafter (delas med admin & säkerhet)||Staff powers (shared with admin & security)",
          items: [
            {
              name: "Tysta chatten — 1 tim / 1 dag / FÖR ALLTID",
              what: "Personen kan läsa allt men inte skicka meddelanden: klasschattar och direktsamtal är stängda, och skrivrutan säger att de är tystade.||The person can read everything but cannot send: class chats and direct messages are closed, and the composer tells them they're muted.",
              how: "Deras linje till personalen är alltid öppen, så de kan fortfarande be om hjälp eller överklaga.||Their line to staff always stays open, so they can still ask for help or appeal.",
              warn: "FÖR ALLTID är verkligen för alltid — bara du, en admin eller säkerhet kan öppna den igen.||FOREVER really means forever — only you, an admin or security can open it again.",
            },
            {
              name: "Öppna igen",
              what: "Tar bort tystnaden direkt.||Removes the mute immediately.",
            },
            {
              name: "Fäst / Växla fäst (högst upp på listan)||Pin / Toggle pin (top of the list)",
              what: "Fäster personen högst upp i listor så du hittar dem snabbt.||Pins the person to the top of lists so you find them fast.",
              how: "En knapp som växlar av och på.||One button that toggles off and on.",
            },
          ],
        },
        {
          title: "Personligt meddelande||Personal message",
          items: [
            {
              name: "Skicka popup",
              what: "Skickar ett meddelande som BARA den här personen ser, som en popup.||Sends a message ONLY this person sees, as a popup.",
              how: "Skriv texten i rutan och tryck Skicka popup.||Write the text in the box and press Send popup.",
            },
            {
              name: "Rensa popup",
              what: "Tar bort meddelandet så det inte visas igen.||Removes the message so it isn't shown again.",
            },
            {
              name: "Be om namnbyte (LÅSER sajten)||Request a rename (LOCKS the site)",
              what: "Tvingar personen att välja ett nytt namn innan de kan fortsätta.||Forces the person to pick a new name before they can continue.",
              warn: "Personen möts av en låst skärm ända tills de bytt namn. Använd bara vid namn som bryter mot reglerna.||The person faces a locked screen until they rename. Only for names that break the rules.",
            },
          ],
        },
      ],
    },
    {
      id: "broadcast",
      title: "Sändning & nödläge||Broadcast & emergency",
      lead: "Ett meddelande till alla — eller en knapp som stänger hela sajten.||One message to everyone — or a button that closes the whole site.",
      groups: [
        {
          title: "Global sändning||Global broadcast",
          items: [
            {
              name: "Sänd",
              what: "Visar texten i en gul banderoll för alla som är inne.||Shows the text in a yellow banner for everyone who's online.",
              how: "Skriv i rutan och tryck Sänd. Det hamnar i loggen.||Write in the box and press Send. It lands in the log.",
            },
            {
              name: "Rensa",
              what: "Tar bort banderollen.||Removes the banner.",
            },
          ],
        },
        {
          title: "Nödläge||Emergency",
          items: [
            {
              name: "STÄNG sajten / Öppna sajten",
              what: "Stänger av hela QuizKeen och visar en underhållsskärm tills du öppnar igen.||Shuts down all of QuizKeen behind a maintenance screen until you open it again.",
              warn: "Frågar först. Alla som är inne kastas ut — använd bara om något verkligen är fel.||Asks first. Everyone inside gets thrown out — only if something is really wrong.",
            },
          ],
        },
      ],
    },
    {
      id: "powers",
      title: "Superkrafter — massverktyg||Superpowers — mass tools",
      lead:
        "Fliken Superkrafter rör många konton samtidigt. Därför är den bara din — och därför säger varje svar hur många konton det gällde. Ägarkontot är alltid undantaget.||" +
        "The Superpowers tab touches many accounts at once. That's why it's yours alone — and why every answer says how many accounts it reached. The owner account is always excluded.",
      groups: [
        {
          title: "Rikets puls||The realm's pulse",
          items: [
            {
              name: "De åtta korten||The eight cards",
              what: "Nya idag, online nu, bannade, tystade, skuggade, frysta mynt, mynt ut idag och besök idag.||New today, online now, banned, muted, shadowed, frozen coins, coins handed out today and visits today.",
              how: "De är din kvittens: efter en massvåg ska \"mynt ut idag\" ha rört sig.||They're your receipt: after a wave, \"coins today\" should have moved.",
            },
          ],
        },
        {
          title: "Massvåg||Mass wave",
          items: [
            {
              name: "Skicka vågen",
              what: "Ger (eller tar) XP och mynt till alla i den valda gruppen.||Gives (or takes) XP and coins to everyone in the chosen group.",
              how: "Välj Elever, Lärare, Admins, Säkerhet eller Alla. Skriv t.ex. 50 XP och 100 mynt. Max ±10 000 per person och gång.||Pick students, teachers, admins, security or everyone. Type e.g. 50 XP and 100 coins. Max ±10,000 per person per press.",
              warn: "Negativa tal tar bort. Loggen skriver ut exakt vad som delades ut och till hur många.||Negative numbers take away. The log prints exactly what was handed out and to how many.",
            },
            {
              name: "Nollställ XP · mynt · varningar · Reset ALLT||Reset XP · coins · warnings · Reset EVERYTHING",
              what: "Sätter räknarna till noll för hela gruppen. Reset ALLT tar även bort tystnad, skugga och osynlighet.||Sets the counters to zero for the whole group. Reset EVERYTHING also clears mute, shadow and ghost.",
              warn: "Frågar först och går inte att ångra. Ägarkontot nollställs aldrig.||Asks first and cannot be undone. The owner account is never reset.",
            },
          ],
        },
        {
          title: "Nödbroms & amnesti||Panic & amnesty",
          items: [
            {
              name: "NÖDBROMS",
              what: "Stoppar sändningen, stänger alla LIVE-sessioner och kastar ut alla utom dig till inloggningen.||Stops the broadcast, closes every live session and throws everyone but you out to the login.",
              how: "Frågar först. Bannar och tystar ingen — det är fortfarande ett beslut, inte en reflex.||Asks first. It bans and mutes nobody — that stays a decision, not a reflex.",
            },
            {
              name: "Släpp in alla igen",
              what: "Tar bort alla utkastningar och avslutar alla LIVE-förfrågningar.||Clears every forced logout and ends all live requests.",
            },
            {
              name: "Unbanna alla",
              what: "Tar bort VARJE bannlysning, även de som gällde för alltid.||Removes EVERY ban, including the permanent ones.",
              warn: "Frågar först. Ingen ångra-knapp — bannade konton kommer tillbaka direkt.||Asks first. No undo — banned accounts are back instantly.",
            },
            {
              name: "Nollställ alla varningar",
              what: "Sätter alla varningsräknare till 0/3.||Sets every warning counter to 0/3.",
              how: "Bra efter en städning där många fick varningar för samma sak.||Good after a clean-up where many got warnings for the same thing.",
            },
            {
              name: "Tvinga alla att logga in",
              what: "Kastar ut alla utom dig, utan att röra sändningen.||Throws everyone but you out without touching the broadcast.",
            },
          ],
        },
        {
          title: "Chat-sanering||Chat clean-up",
          items: [
            {
              name: "Global / Klass · Inkorg · Stabs-kanalen · ALLT",
              what: "Raderar meddelandena i den valda lådan på riktigt.||Deletes the messages in the chosen box for real.",
              warn: "Frågar först och går inte att ångra. Välj låda med flit — ALLT tömmer alla tre.||Asks first and cannot be undone. Pick the box deliberately — ALL wipes all three.",
            },
            {
              name: "Rensa person",
              what: "Raderar bara en persons meddelanden i de gemensamma chattarna.||Deletes only one person's messages in the shared chats.",
              how: "Skriv namnet exakt och tryck Rensa person. Resten av chatten är kvar.||Type the name exactly and press Purge person. The rest of the chat stays.",
            },
          ],
        },
        {
          title: "Popup till en grupp||Popup to a group",
          items: [
            {
              name: "Skicka popup",
              what: "Samma popup som ett personligt meddelande, men till alla i gruppen.||The same popup as a personal message, but to everyone in the group.",
              how: "Välj grupp, skriv max 300 tecken, tryck Skicka. Personal kan också väljas.||Pick a group, write up to 300 characters, press Send. Staff can be picked too.",
              warn: "Popuppen ligger kvar tills någon rensar den — den försvinner inte av sig själv.||The popup stays until someone clears it — it doesn't expire.",
            },
          ],
        },
        {
          title: "Logg & besökshistorik||Log & visit history",
          items: [
            {
              name: "Städa loggen · Städa besök",
              what: "Raderar loggrader respektive sidbesök som är äldre än antalet dagar du skriver.||Deletes log rows or page visits older than the number of days you type.",
              how: "30 dagar är en bra standard. Nyare rader rörs inte.||30 days is a good default. Newer rows are untouched.",
            },
          ],
        },
        {
          title: "Alt-detektor||Alt detector",
          items: [
            {
              name: "Samma uppkoppling",
              what: "Listar konton som setts från samma adress, med antal och namn.||Lists accounts seen from the same address, with count and names.",
              warn: "En ledtråd, inte bevis — syskon och skolans nät delar adress. Titta, prata, banna sedan om det behövs.||A hint, not proof — siblings and the school network share an address. Look, talk, then ban if needed.",
            },
            {
              name: "Kasta ut alla",
              what: "Kastar ut alla konton i klustret till inloggningen.||Throws every account in the cluster back to the login.",
            },
          ],
        },
        {
          title: "Alla flaggor på ett ställe||Every flag in one place",
          items: [
            {
              name: "skugga av · osynlig av · tina mynt · avfäst · öppna chat",
              what: "Visar alla som har en flagga och tar bort den med ett tryck.||Shows everyone carrying a flag and removes it in one press.",
              how: "Samma sak som knapparna under Användare, men utan att leta upp personen först.||The same as the buttons under Users, without hunting the person down first.",
            },
          ],
        },
      ],
    },
    {
      id: "codes",
      title: "Koder||Codes",
      lead: "De tre nycklarna till de tre konsolerna.||The three keys to the three consoles.",
      groups: [
        {
          title: "Nycklarna||The keys",
          items: [
            {
              name: "Ägarkod · Admin-kod · Säkerhetskod",
              what: "Koden som låser upp respektive konsol.||The code that unlocks its console.",
              how: "Exakt 8 siffror var. Skriv om och tryck Spara koder.||Exactly 8 digits each. Retype and press Save codes.",
              warn: "Byter du ägarkoden stannar du inloggad, men skriv ner den nya på en gång. Admin- och säkerhetskoden måste du ge vidare till dem som ska ha den.||Changing the owner code keeps you signed in, but write the new one down at once. The admin and security codes you must pass on to whoever should have them.",
            },
          ],
        },
      ],
    },
    {
      id: "log",
      title: "Logg||Log",
      lead: "De senaste 200 händelserna, nyast överst. Det här är din kvittens på att inget gjordes i smyg.||The last 200 events, newest first. This is your receipt that nothing happened behind your back.",
      groups: [
        {
          title: "Så läser du den||How to read it",
          items: [
            {
              name: "[OWNER] · [ADMIN] · [SECURITY]||[OWNER] · [ADMIN] · [SECURITY]",
              what: "Rader som börjar med en roll i hakparenteser är gjorda av personal. De visas i gult hos dig.||Rows starting with a role in brackets were done by staff. They show in gold for you.",
              how: "Övriga rader är användarnas egna handlingar: inloggningar, spel, poäng och liknande.||Other rows are the users' own actions: logins, games, scores and so on.",
            },
          ],
        },
      ],
    },
  ],
};

// ─── ADMIN ───────────────────────────────────────────────────────────────

const ADMIN: HelpDoc = {
  title: "ADMIN — RÖD KONSOL: guide||ADMIN — RED COMMAND: guide",
  lead:
    "Din konsol har fem flikar och en knapprad per person. Här står varje knapp i den ordningen du ser den.||" +
    "Your console has five tabs and one row of buttons per person. Every button is explained in the order you see it.",
  rules: [
    "Du bannar i max 1 dag, ger max 500 XP per person och dag, och kan inte radera någon. Behöver du mer: Be om mer.||You ban for max 1 day, give max 500 XP per person per day, and can't delete anyone. Need more? Ask for more.",
    "Tysta chatten är ofta nog. Ett dygn utan att kunna skriva lugnar ner det mesta.||A mute is often enough. A day without typing calms most things down.",
    "Är du osäker på vad som hänt? Titta i Chatspaning först, agera sedan.||Unsure what happened? Look in Chat Spy first, then act.",
    LOG_TIP,
    TIME_TIP,
    SESSION_TIP,
    HELP_BUTTON_TIP,
  ],
  sections: [
    {
      id: "start",
      title: "Kom igång||Getting started",
      lead: "Fem steg.||Five steps.",
      steps: [
        "Lås upp med admin-koden på startsidan.||Unlock with the admin code on the start page.",
        "Flikarna till vänster: Användare · Chatspaning · Sändning · Stabs-chatt · Admin-Keen · Verktyg · Logg.||The tabs on the left: Users · Chat Spy · Broadcast · Staff chat · Admin-Keen · Tools · Log.",
        "Sök upp personen i rutan uppe till höger och titta på knappraden som hör till raden.||Search for the person in the box top right and look at the button row belonging to that row.",
        "Röda knappar är ingrepp (banna), gröna ger XP, lila tystar, rosa fäster, gul är en anteckning.||Red buttons intervene (ban), green give XP, purple mutes, pink pins, gold is a note.",
        "Den röda \"Jobbar...\"-brickan nere till höger betyder att åtgärden körs — vänta tills den försvinner.||The red \"Working...\" chip bottom-right means the action is running — wait for it to go.",
      ],
      groups: [],
    },
    {
      id: "buttons",
      title: "Användare — varje knapp||Users — every button",
      lead:
        "Klicka på en person i listan och knappraden öppnas. Ordningen här är samma som på skärmen.||" +
        "Click a person in the list and the row opens. The order here matches the screen.",
      groups: [
        {
          title: "Knappraden||The button row",
          items: [
            {
              name: "Live (röd, videokamera)||Live (red, camera)",
              what: "Ber om personens skärm live.||Asks for the person's screen live.",
              how: "När personen godkänner och delar öppnas videoskärmen överst i konsolen. Stäng med Stäng eller Escape.||Once they accept and share, the video opens at the top of the console. Close with Close or Escape.",
            },
            {
              name: "+50 · +200 · +500 (gröna)||+50 · +200 · +500 (green)",
              what: "Ger XP direkt i ett tryck.||Gives XP in one press.",
              how: "Bra för att belöna något som hände precis.||Good for rewarding something that just happened.",
            },
            {
              name: "XP... (grön ram)||XP... (green outline)",
              what: "Eget antal XP — en ruta frågar hur mycket.||Your own amount of XP — a dialog asks how much.",
              warn: "Max ±500, och bara EN gåva per person och dag. Trycker du igen samma dag säger den \"Redan belönad idag!\".||Max ±500, and only ONE gift per person per day. Press again the same day and it says \"Already rewarded today!\".",
            },
            {
              name: "5 min · 1 tim · 1 dag (röda)||5 min · 1 hour · 1 day (red)",
              what: "Bannar i den tiden direkt.||Bans for that long, immediately.",
              warn: "1 dag är ditt tak. Vill du längre: Be om mer.||1 day is your ceiling. Longer: Ask for more.",
            },
            {
              name: "Be om mer (gul)||Ask for more (gold)",
              what: "Skickar en förfrågan till ägaren om en längre ban.||Sends the owner a request for a longer ban.",
              how: "Rutan frågar hur många minuter och varför. Tips: 2880 = 2 dagar · 10080 = 1 vecka · 0 = för alltid. Ägaren svarar under Ban-begäranden.||The dialog asks how many minutes and why. Tips: 2880 = 2 days · 10080 = 1 week · 0 = forever. The owner answers under Ban requests.",
            },
            {
              name: "IP-banna (rosa)||IP-ban (rose)",
              what: "Stänger personens uppkoppling i 1 tim eller 1 dygn — hela nätet, inte bara kontot.||Shuts the person's connection for 1 hour or 1 day — the whole network, not just the account.",
              how: "Rutan visar adressen som stängs. Alla som sitter på nätet kastas ut direkt, och ett nytt konto där släpps inte in. Knappen blir Släpp IP när spärren är aktiv.||The dialog shows the address being shut. Everyone on that network is thrown out at once, and a new account there is not let in. The button becomes Release IP while the block is active.",
              warn: "På skol- och familjenät delar många samma adress — då drabbas oskyldiga. Prova en vanlig ban först. Härifrån är taket 1 dygn; bara ägaren kan mer.||On school and family networks many people share one address, so innocent users are hit too. Try a normal ban first. The ceiling here is 1 day; only the owner can go further.",
            },
            {
              name: "Tysta (lila)||Mute (purple)",
              what: "Tystar chatten. En ruta frågar hur många minuter — 0 = för alltid. Personen ser själv en gul ruta i chatten som säger att de är tystade.||Mutes the chat. A dialog asks how many minutes — 0 = forever. The person sees a yellow notice in the chat saying they're muted.",
              how: "De kan läsa men inte skicka. En admin, säkerhet eller ägaren kan öppna chatten igen. Linjan till personalen är alltid öppen.||They can read but not send. An admin, security or the owner can unmute. The line to staff always stays open.",
              warn: "Används bättre än ban för småsaker. Den syns inte för andra i chatten.||Better than a ban for small things. It isn't visible to others in the chat.",
            },
            {
              name: "Fäst (rosa)||Pin (pink)",
              what: "Fäster personen högst upp i listan.||Pins the person to the top of the list.",
              how: "Växlar av och på.||Toggles off and on.",
            },
            {
              name: "Anteckning (gul)||Note (gold)",
              what: "Hemlig anteckning som bara personal ser, under personens namn.||A secret note only staff see, under the person's name.",
              how: "Både du, säkerhet och ägaren ser den. Skriv fakta, inte åsikter.||You, security and the owner all see it. Write facts, not opinions.",
            },
            {
              name: "Unbanna (grön)||Unban (green)",
              what: "Släpper in en bannad person igen.||Lets a banned person back in.",
              how: "Knappen visas i stället för de andra när personen är bannad.||It replaces the others while the person is banned.",
            },
          ],
        },
      ],
    },
    {
      id: "chats",
      title: "Chatspaning||Chat Spy",
      lead: "Fyra rutor med senaste meddelanden: Global/Klass, Inkorg, Stab-kanaler och Chatt-förfrågningar. Allt är läsning — du kan inte svara härifrån.||Four boxes of recent messages: Global/Class, Inbox, Staff channels and Chat requests. It's all reading — you can't reply from here.",
      groups: [
        {
          title: "Rutorna||The boxes",
          items: [
            {
              name: "Global / Klass||Global / Class",
              what: "De senaste 200 meddelandena i de allmänna chattarna.||The 200 most recent messages in the public chats.",
            },
            {
              name: "Inkorg||Inbox",
              what: "Meddelanden som användare skickat till ägaren.||Messages users have sent to the owner.",
            },
            {
              name: "Stab-kanaler||Staff channels",
              what: "De senaste 100 meddelandena i stabs-chatten.||The 100 most recent messages in the staff chat.",
            },
            {
              name: "Chatt-förfrågningar||Chat requests",
              what: "Vem som bett vem om en privat chatt, med status.||Who asked whom for a private chat, with status.",
            },
          ],
        },
      ],
    },
    {
      id: "broadcast",
      title: "Sändning||Broadcast",
      lead: "Ett meddelande till alla som är inloggade, som en gul banderoll.||One message to everyone signed in, as a yellow banner.",
      groups: [
        {
          title: "Sänd rutan||The broadcast box",
          items: [
            {
              name: "Sänd",
              what: "Visar texten för ALLA. Ägaren ser den i loggen.||Shows the text to EVERYONE. The owner sees it in the log.",
              how: "Skriv kort och tydligt, t.ex. \"Quiz-tävling kl 14:00!\".||Keep it short and clear, e.g. \"Quiz contest at 14:00!\".",
            },
            {
              name: "Rensa",
              what: "Tar bort banderollen.||Removes the banner.",
            },
          ],
        },
      ],
    },
    {
      id: "staffchat",
      title: "Stabs-chatt||Staff chat",
      lead: "Pratar bara med personalen — användare ser inget härifrån.||Only talks to staff — users see nothing from here.",
      groups: [
        {
          title: "Så funkar den||How it works",
          items: [
            {
              name: "Hela chatten · Ägaren · Admins · Säkerhet||The whole chat · The Owner · Admins · Security",
              what: "Fyra kanaler. Hela chatten är den gemensamma, de andra är riktade.||Four channels. The whole chat is shared, the others are directed.",
              how: "Nya meddelanden dyker upp inom fem sekunder. Max 1000 tecken.||New messages appear within five seconds. Max 1000 characters.",
            },
            {
              name: "Emoji & Skicka||Emoji & Send",
              what: "Emoji-knappen lägger in en emoji där markören står, Skicka skickar.||The emoji button inserts one at the cursor, Send sends it.",
            },
          ],
        },
      ],
    },
    {
      id: "tools",
      title: "Verktyg||Tools",
      lead:
        "Tre mindre verktyg. De stora — nollställningar, saneringar och nödbromsen — är ägarens, och det är med flit.||" +
        "Three smaller tools. The big ones — resets, purges and the panic button — are the owner's, deliberately.",
      groups: [
        {
          title: "Belöningsvåg||Reward wave",
          items: [
            {
              name: "Skicka dagens våg",
              what: "Ger +25 XP till alla elever som inte är bannade.||Gives +25 XP to every student who isn't banned.",
              how: "En gång per dag, oavsett vem som trycker först. Andra trycket samma dag säger att vågen redan är skickad.||Once a day, whoever presses first. A second press the same day says the wave is already sent.",
              warn: "Fast summa, bara elever — inte samma sak som ägarens massvåg, som kan ge vilken summa som helst till vilken grupp som helst.||A fixed amount, students only — not the owner's mass wave, which can give any amount to any group.",
            },
          ],
        },
        {
          title: "Popup till en grupp||Popup to a group",
          items: [
            {
              name: "Skicka popup",
              what: "Ett meddelande som alla elever eller alla lärare ser nästa gång de är inne.||A message every student or every teacher sees next time they're on.",
              warn: "Bara elever och lärare. Personalens popup skickar ägaren.||Students and teachers only. Staff popups are sent by the owner.",
            },
          ],
        },
        {
          title: "Myntliggaren idag||Today's coin ledger",
          items: [
            {
              name: "Myntliggaren",
              what: "Varje myntutdelning idag, med mottagare och vem som gav — både från appen och från konsolen.||Every coin grant today, with recipient and giver — from the app and from the console.",
              how: "Läsläge. Använd den för att se hur mycket som redan delats ut innan du ger mer.||Read-only. Use it to see how much has already gone out before giving more.",
            },
          ],
        },
      ],
    },
    {
      id: "log",
      title: "Logg||Log",
      lead: "De senaste 100 händelserna, nyast överst.||The last 100 events, newest first.",
      groups: [
        {
          title: "Så läser du den||How to read it",
          items: [
            {
              name: "Dina egna rader||Your own rows",
              what: "Dina åtgärder står med [ADMIN] framför, så ägaren kan se exakt vem som gjorde vad.||Your actions are marked [ADMIN] so the owner can see exactly who did what.",
            },
          ],
        },
      ],
    },
    {
      id: "cannot",
      title: "Det här kan du inte||What you can't do",
      lead: "Allt nedan är ägarens. Behöver du det, skriv till ägaren i stabs-chatten eller använd Be om mer.||Everything below belongs to the owner. Need it? Message the owner in the staff chat or use Ask for more.",
      groups: [
        {
          title: "Bara ägaren||Owner only",
          items: [
            {
              name: "Radera konto||Delete an account",
              what: "Du kan banna men aldrig radera. Det är med flit — en radering går inte att ångra.||You can ban but never delete. That's deliberate — a delete cannot be undone.",
            },
            {
              name: "Banna längre än 1 dag||Ban longer than 1 day",
              what: "Skicka Be om mer, så bannar ägaren exakt den tid de väljer.||Send Ask for more and the owner bans for exactly the time they pick.",
            },
            {
              name: "Mynt, roll, namnbyte, lösenord, koder, stänga sajten||Coins, role, rename, password, codes, shutting the site",
              what: "Allt det ligger i ägarkonsolen.||All of that sits in the owner console.",
            },
          ],
        },
      ],
    },
  ],
};

// ─── SECURITY ────────────────────────────────────────────────────────────

const SECURITY: HelpDoc = {
  title: "SÄKERHET — ISVAKT: guide||SECURITY — ICE WATCH: guide",
  lead:
    "Du är den som ser vad som händer och stoppar bråk innan de blir stora. Här står varje knapp, varje gräns och vad du inte får röra.||" +
    "You're the one who sees what's happening and stops trouble before it grows. Every button, every limit and what you mustn't touch.",
  rules: [
    "Du bannar i max 1 timme. Vill du mer: be en admin eller ägaren.||You ban for max 1 hour. Want more? Ask an admin or the owner.",
    "3 varningar ger automatisk ban i 24 timmar. Varna sparsamt och rättvist — varningar försvinner inte av sig själva, men du kan nollställa dem med Amnesti.||3 warnings cause an automatic 24-hour ban. Warn sparingly and fairly — warnings don't disappear on their own, but you can clear them with Amnesty.",
    "Tysta chatten är oftast bättre än att banna. Börja där.||A mute is usually better than a ban. Start there.",
    LOG_TIP,
    TIME_TIP,
    SESSION_TIP,
    HELP_BUTTON_TIP,
  ],
  sections: [
    {
      id: "start",
      title: "Kom igång||Getting started",
      lead: "Fem steg.||Five steps.",
      steps: [
        "Lås upp med säkerhetskoden på startsidan.||Unlock with the security code on the start page.",
        "Flikarna till vänster: Användare · Chatspaning · Stabs-chatt · Logg.||The tabs on the left: Users · Chat Spy · Staff chat · Log.",
        "Sök upp personen uppe till höger och titta på knappraden som hör till raden.||Search for the person top right and look at the button row belonging to that row.",
        "En grön prick före namnet betyder att personen är online just nu (sett senaste 2 minuterna).||A green dot before the name means the person is online right now (seen in the last 2 minutes).",
        "Räknaren \"3/3 varningar\" under namnet visar läget. Vid 3/3 bannas personen automatiskt på riktigt.||The \"3/3 warnings\" counter under the name shows the state. At 3/3 the person really does get banned automatically.",
      ],
      groups: [],
    },
    {
      id: "buttons",
      title: "Användare — varje knapp||Users — every button",
      lead: "Klicka på en person i listan och knappraden öppnas. Ordningen här är samma som på skärmen.||Click a person in the list and the row opens. The order here matches the screen.",
      groups: [
        {
          title: "Knappraden||The button row",
          items: [
            {
              name: "Live (röd, videokamera)||Live (red, camera)",
              what: "Ber om personens skärm live.||Asks for the person's screen live.",
              how: "Påminn personen att de måste godkänna — annars står det bara \"Väntar på att …\". Stäng med Stäng eller Escape.||Remind them they must accept — otherwise it just says \"Waiting for …\". Close with Close or Escape.",
            },
            {
              name: "Namnbyte (indigoblå, pennikon)||Rename (indigo, pencil)",
              what: "Ber personen byta namn. Personen möts av en låst skärm tills de valt ett nytt namn.||Asks the person to rename. They face a locked screen until they pick a new one.",
              warn: "Krångligt för personen och syns i loggen. Spara till namn som faktiskt bryter mot reglerna.||Annoying for them and it shows in the log. Save it for names that really break the rules.",
            },
            {
              name: "Varna (gul triangel)||Warn (gold triangle)",
              what: "Ger en varning. Räknaren under namnet går ett steg uppåt.||Gives one warning. The counter under the name goes up one step.",
              warn: "Vid 3/3 bannas personen automatiskt i 24 timmar. En varning går inte att ta tillbaka — men du kan nollställa räknaren med Amnesti.||At 3/3 the person is banned automatically for 24 hours. A warning cannot be taken back — but you can clear the counter with Amnesty.",
            },
            {
              name: "Amnesti (grön bock)||Amnesty (green check)",
              what: "Nollställer personens varningar till 0/3.||Resets that person's warnings to 0/3.",
              how: "Knappen är grå tills personen faktiskt har en varning. En person i taget — hela grupper är ägarens verktyg.||The button is grey until the person actually has a warning. One person at a time — whole groups are the owner's tool.",
              warn: "Syns i loggen som [SECURITY]. Ta tillbaka en varning bara när personen förtjänat det, inte för att slippa en obekväm konversation.||Shows in the log as [SECURITY]. Take a warning back only when the person earned it, not to avoid an awkward conversation.",
            },
            {
              name: "5min · 1h (blå)||5min · 1h (blue)",
              what: "Bannar i 5 minuter respektive 1 timme.||Bans for 5 minutes or 1 hour.",
              how: "5 minuter räcker för att kyla ner en het stund. 1 timme när det behövs mer.||5 minutes cools a hot moment. 1 hour when more is needed.",
              warn: "Det här är din gräns — vill du längre måste en admin eller ägaren göra det.||This is your ceiling — longer requires an admin or the owner.",
            },
            {
              name: "Tysta (lila)||Mute (purple)",
              what: "Tystar chatten. En ruta frågar hur många minuter — 0 = för alltid. Personen ser själv en gul ruta i chatten som säger att de är tystade.||Mutes the chat. A dialog asks how many minutes — 0 = forever. The person sees a yellow notice in the chat saying they're muted.",
              how: "Du hör inget mer från dem i klasschatten. Deras linja till personalen är alltid öppen, så de kan fortfarande be om hjälp.||You hear nothing more from them in the class chat. Their line to staff always stays open, so they can still ask for help.",
            },
            {
              name: "Öppna chatten (grön, högtalare)||Unmute (green, speaker)",
              what: "Släpper på tystnaden direkt.||Releases the mute immediately.",
            },
            {
              name: "Osynlig (grå, spöke)||Ghost (grey, ghost)",
              what: "Personens meddelanden blir osynliga i de gemensamma chattarna (klass och personal). De kan fortfarande skriva, och de ser sina egna meddelanden — men ingen annan gör det.||The person's messages become invisible in the shared chats (class and staff). They can still type and they see their own messages — nobody else does.",
              how: "Växlar av och på. Bra mot spam eller taskig text innan du hinner prata med dem. Personalen ser alltid allt, även osynliga meddelanden.||Toggles. Good against spam or nasty text before you get a chance to talk to them. Staff always see everything, including ghosted messages.",
              warn: "Bara du har den här knappen bland personalen, och direkta samtal (elev↔lärare) påverkas inte — där vore ett tyst försvinnande förvirrande. Berätta i stabs-chatten vad du gjort.||You're the only staff member with this button, and direct conversations (student↔teacher) are not affected — a message silently vanishing there would only confuse. Tell the staff chat what you did.",
            },
            {
              name: "Fäst (rosa)||Pin (pink)",
              what: "Fäster personen högst upp i listan så du hittar dem snabbt igen.||Pins the person to the top of the list so you find them fast again.",
              how: "Växlar av och på.||Toggles off and on.",
            },
            {
              name: "Anteckning (gul)||Note (gold)",
              what: "Hemlig anteckning som bara personal ser, under personens namn.||A secret note only staff see, under the person's name.",
              how: "Skriv vad som hänt med korta fakta, t.ex. \"spammade chatten 14/10\". Alla tre konsolerna ser den.||Write the short facts, e.g. \"spammed the chat 14/10\". All three consoles see it.",
            },
            {
              name: "Unbanna (grön)||Unban (green)",
              what: "Släpper in en bannad person igen.||Lets a banned person back in.",
              how: "Knappen visas i stället för de andra när personen är bannad.||It replaces the others while the person is banned.",
            },
          ],
        },
      ],
    },
    {
      id: "header",
      title: "Siffrorna högst upp||The numbers at the top",
      lead: "Två siffror att hålla koll på.||Two numbers to keep an eye on.",
      groups: [
        {
          title: "Räknarna||The counters",
          items: [
            {
              name: "användare||users",
              what: "Hur många konton som finns, och hur många som är online just nu.||How many accounts exist, and how many are online right now.",
            },
            {
              name: "varningar||warnings",
              what: "Summan av alla varningar som just nu ligger ute på folk. Stiger den snabbt är något på gång.||The sum of every warning currently out there. If it climbs fast, something's going on.",
            },
          ],
        },
      ],
    },
    {
      id: "chats",
      title: "Chatspaning||Chat Spy",
      lead: "Fyra rutor med senaste meddelanden: Global/Klass, Inkorg, Stab-kanaler och Chatt-förfrågningar. Läsning — du kan inte svara härifrån.||Four boxes of recent messages: Global/Class, Inbox, Staff channels and Chat requests. Reading — you can't reply from here.",
      groups: [
        {
          title: "Rutorna||The boxes",
          items: [
            {
              name: "Global / Klass||Global / Class",
              what: "De senaste 200 meddelandena i de allmänna chattarna. Här ser du vad som faktiskt sades.||The 200 most recent messages in the public chats. This is where you see what was actually said.",
            },
            { name: "Inkorg||Inbox", what: "Meddelanden som användare skickat till ägaren.||Messages users have sent to the owner." },
            { name: "Stab-kanaler||Staff channels", what: "De senaste 100 meddelandena i stabs-chatten.||The 100 most recent messages in the staff chat." },
            { name: "Chatt-förfrågningar||Chat requests", what: "Vem som bett vem om en privat chatt, med status.||Who asked whom for a private chat, with status." },
          ],
        },
      ],
    },
    {
      id: "stafchat",
      title: "Stabs-chatt||Staff chat",
      lead: "Prata med admin och ägaren innan du gör något stort. De ser samma sak som du.||Talk to the admins and the owner before you do something big. They see what you see.",
      groups: [
        {
          title: "Så funkar den||How it works",
          items: [
            {
              name: "Hela chatten · Ägaren · Admins · Säkerhet||The whole chat · The Owner · Admins · Security",
              what: "Fyra kanaler. Skriv i Säkerhet om du bara vill prata med ditt eget lag.||Four channels. Use Security when you only want your own team.",
              how: "Nya meddelanden dyker upp inom fem sekunder. Max 1000 tecken.||New messages appear within five seconds. Max 1000 characters.",
            },
          ],
        },
      ],
    },
    {
      id: "log",
      title: "Logg||Log",
      lead: "De senaste 100 händelserna, nyast överst.||The last 100 events, newest first.",
      groups: [
        {
          title: "Så läser du den||How to read it",
          items: [
            {
              name: "Aktivitetslogg||Activity log",
              what: "Dina egna åtgärder står med [SECURITY] framför. Övriga rader är användarnas egna handlingar.||Your own actions are marked [SECURITY]. Other rows are the users' own actions.",
            },
          ],
        },
      ],
    },
    {
      id: "cannot",
      title: "Det här kan du inte||What you can't do",
      lead: "Allt nedan tillhör admin eller ägaren. Be dem i stabs-chatten i stället.||Everything below belongs to an admin or the owner. Ask them in the staff chat instead.",
      groups: [
        {
          title: "Inte din knapp||Not your button",
          items: [
            {
              name: "Banna längre än 1 timme||Ban longer than 1 hour",
              what: "Max en timme. Längre är en admin eller ägarens beslut.||One hour max. Longer is an admin's or the owner's call.",
            },
            {
              name: "XP, mynt och nivå||XP, coins and level",
              what: "Du kan inte ändra poäng eller pengar. Bara ägaren och admin delar ut XP.||You can't change scores or money. Only the owner and admins hand out XP.",
            },
            {
              name: "Radera konton, byta namn åt någon, roller, koder, stänga sajten||Delete accounts, rename someone, roles, codes, shutting the site",
              what: "Allt det ligger i ägar- eller adminkonsolen.||All of that sits in the owner or admin console.",
            },
          ],
        },
      ],
    },
  ],
};

export const HELP: Record<ConsoleKind, HelpDoc> = {
  OWNER,
  ADMIN,
  SECURITY,
};
