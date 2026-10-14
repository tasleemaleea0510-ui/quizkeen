"use client";

/**
 * QuizKeen translation engine.
 *
 * The app is written with Swedish strings baked into JSX (with a few English
 * ones mixed in). Rather than rewriting every component, this module patches
 * the rendered DOM and can switch in BOTH directions, live, without a reload.
 *
 * How it stays correct:
 *  - it remembers the ORIGINAL text of every node, so switching back always
 *    restores exactly what the app rendered (no compounding translations);
 *  - replacements only ever hit whole words (Unicode aware), so "Chatt" is
 *    never mangled into "Chattt" by the en→sv direction;
 *  - a MutationObserver re-applies after React re-renders, instead of polling;
 *  - anything marked `data-no-translate` (user chat messages, code, inputs)
 *    is left alone, so we never rewrite what a person typed.
 */

export type Lang = "sv" | "en";

export const LANG_KEY = "qk_lang";

export function readLang(): Lang {
  if (typeof window === "undefined") return "sv";
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    return v === "en" ? "en" : "sv";
  } catch {
    return "sv";
  }
}

export function writeLang(lang: Lang) {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage may be unavailable — translation still works this session */
  }
}

/** [swedish, english] — the single source of truth for both directions. */
const PAIRS: [string, string][] = [
  // ── navigation & chrome ──────────────────────────────────────────────
  ["Översikt", "Dashboard"],
  ["Instrumentpanel", "Dashboard"],
  ["Klassrum", "Classroom"],
  ["Klassrummet", "The classroom"],
  ["Gloskort", "Flashcards"],
  ["Inställningar", "Settings"],
  ["Logga ut", "Log out"],
  ["Logga in", "Log in"],
  ["Registrera", "Register"],
  ["Registrera dig", "Sign up"],
  ["Hem", "Home"],
  ["Meny", "Menu"],
  ["Profil", "Profile"],
  ["Statistik", "Stats"],
  ["Roll", "Role"],
  ["Konto", "Account"],
  ["Språk", "Language"],
  ["Sök", "Search"],
  ["Sök användare...", "Search users..."],
  ["Sök användare…", "Search users…"],
  ["Stäng", "Close"],
  ["Avbryt", "Cancel"],
  ["Bekräfta", "Confirm"],
  ["Spara", "Save"],
  ["Spara ändringar", "Save changes"],
  ["Spara koder", "Save codes"],
  ["Spara fråga", "Save question"],
  ["Rensa", "Clear"],
  ["Rensa popup", "Clear popup"],
  ["Ta bort", "Delete"],
  ["Ta bort elev", "Remove student"],
  ["Ta bort kort", "Delete card"],
  ["Radera", "Delete"],
  ["Radera läxa", "Delete homework"],
  ["RADERA ANVÄNDARE", "DELETE USER"],
  ["Redigera", "Edit"],
  ["Lägg till", "Add"],
  ["Lägg till ett kort", "Add a card"],
  ["Lägg till kort", "Add card"],
  ["Lägg till fråga", "Add question"],
  ["Lägg till medlärare", "Add co-teacher"],
  ["Tillbaka", "Back"],
  ["Nästa", "Next"],
  ["Nästa fråga", "Next question"],
  ["Nästa rond", "Next round"],
  ["Föregående", "Previous"],
  ["Klar", "Done"],
  ["Klart!", "Done!"],
  ["Klara", "Finished"],
  ["Pågående", "Ongoing"],
  ["Förfallen", "Overdue"],
  ["Förfaller", "Due"],
  ["Ja", "Yes"],
  ["Nej", "No"],
  ["Laddar...", "Loading..."],
  ["Laddar…", "Loading…"],
  ["Laddar", "Loading"],
  ["Laddar sidan…", "Loading the page…"],
  ["Laddar chatten...", "Loading chat..."],
  ["Uppdatera", "Update"],
  ["Uppdaterad!", "Updated!"],
  ["Återställ", "Reset"],
  ["Reset XP", "Reset XP"],
  ["Reset mynt", "Reset coins"],
  ["Reset ALLT", "Reset EVERYTHING"],
  ["Arbetar...", "Working..."],
  ["Jobbar...", "Working..."],
  ["Visa email", "Show email"],

  // ── auth ─────────────────────────────────────────────────────────────
  ["Användarnamn", "Username"],
  ["Användarnamn:", "Username:"],
  ["Nytt användarnamn", "New username"],
  ["Byt användarnamn", "Change username"],
  ["Byt namn", "Change name"],
  ["Lösenord", "Password"],
  ["Nytt lösenord", "New password"],
  ["Bekräfta lösenord", "Confirm password"],
  ["Byt lösenord", "Change password"],
  ["Glömt lösenordet?", "Forgot the password?"],
  ["E-post", "Email"],
  ["Email", "Email"],
  ["Fel lösenord", "Wrong password"],
  ["Fel kod", "Wrong code"],
  ["Finns redan", "Already exists"],
  ["Minst 3 tecken", "At least 3 characters"],
  ["Minst 6 tecken", "At least 6 characters"],
  ["Välkommen!", "Welcome!"],
  ["Välkommen tillbaka!", "Welcome back!"],
  ["Skapa konto", "Create account"],
  ["Har inget konto?", "No account?"],
  ["Redan medlem?", "Already a member?"],
  ["Ogiltigt användarnamn", "Invalid username"],
  ["Ogiltig email", "Invalid email"],
  ["Logga in för att chatta", "Log in to chat"],
  ["Du behöver vara inloggad på ditt konto för att delta i klass-chattar och skicka meddelanden.", "You need to be signed in to your account to join class chats and send messages."],

  // ── landing ──────────────────────────────────────────────────────────
  ["Börja spela — Gratis", "Start playing — Free"],
  ["Gå med i ett spel", "Join a game"],
  ["Gå med med en PIN-kod", "Join with a PIN code"],
  ["Gå med i ett klassrum", "Join a classroom"],
  ["Gå med i klassrum", "Join a classroom"],
  ["Live Multiplayer", "Live Multiplayer"],
  ["Minispel i lobbyn", "Mini-game in the lobby"],
  ["XP, mynt & nivåer", "XP, coins & levels"],
  ["Lär. Spela.", "Learn. Play."],
  ["Tävla.", "Compete."],
  ["Spring medan du väntar", "Run while you wait"],
  ["Svara snabbt!", "Answer fast!"],
  ["Starta en live-frågesport", "Start a live quiz"],
  ["Vem som helst kan starta live-frågesporter", "Anyone can start live quizzes"],
  ["kortleksstrider med en 6-siffrig PIN-kod.", "deck battles with a 6-digit PIN code."],
  ["Hela klassen går med och tävlar i realtid.", "The whole class joins and competes in real time."],

  // ── dashboard ────────────────────────────────────────────────────────
  ["Hej,", "Hey,"],
  ["Nivå", "Level"],
  ["Sätt nivå", "Set level"],
  ["Mynt", "Coins"],
  ["Totala mynt", "Total coins"],
  ["Total XP", "Total XP"],
  ["Frysta mynt", "Frozen coins"],
  ["Toppspelare", "Top players"],
  ["Topplista", "Leaderboard"],
  ["Poängtavla", "Leaderboard"],
  ["Dina quizar", "Your quizzes"],
  ["Dina gloskort", "Your flashcards"],
  ["Dina chatter", "Your chats"],
  ["Dina klassrum", "Your classrooms"],
  ["Dina läxor", "Your homework"],
  ["Starta", "Start"],
  ["Starta spel", "Start game"],
  ["Starta spelet", "Start the game"],
  ["Starta strid", "Start battle"],
  ["Starta frågesporter", "Start quizzes"],
  ["Påbörja", "Start"],
  ["Plugga", "Study"],
  ["Studera", "Study"],
  ["Strid", "Battle"],
  ["Blanda", "Shuffle"],
  ["Vänd", "Flip"],
  ["kort", "cards"],
  ["Kort", "Card"],
  ["1 kort", "1 card"],
  ["Inga quizar ännu", "No quizzes yet"],
  ["Skapa din första quiz!", "Create your first quiz!"],
  ["Ny quiz", "New quiz"],
  ["Mina quizar", "My quizzes"],
  ["Quizar", "Quizzes"],
  ["Quiz", "Quiz"],
  ["Spel", "Games"],
  ["Spelare", "Players"],
  ["Gloskortlekar", "Flashcard decks"],
  ["Glos", "Flash"],
  ["Kortlekar", "Card decks"],
  ["Kortleksstrider", "Deck battles"],
  ["fejk-svar", "fake answers"],

  // ── classroom / teacher ──────────────────────────────────────────────
  ["Lärarpanel", "Teacher panel"],
  ["Analys", "Analytics"],
  ["Elever", "Students"],
  ["Läxor", "Homework"],
  ["Varningar", "Warnings"],
  ["Varna", "Warn"],
  ["Kopiera", "Copy"],
  ["Kopiera PIN", "Copy PIN"],
  ["Join-kod", "Join code"],
  ["Lärare", "Teachers"],
  ["Läraren", "The teacher"],
  ["Skapa klassrum", "Create classroom"],
  ["Klassrummets namn", "Classroom name"],
  ["Beskrivning", "Description"],
  ["Beskrivning (valfritt)", "Description (optional)"],
  ["Skapa", "Create"],
  ["Skapa läxa", "Create homework"],
  ["Skapa gloskort", "Create flashcards"],
  ["Skapa nya gloskort", "Create new flashcards"],
  ["Gå med", "Join"],
  ["Hoppa in!", "Jump in!"],
  ["Medlemmar", "Members"],
  ["Medlärare", "Co-teacher"],
  ["Klass-bibliotek", "Class library"],
  ["Bonus-XP", "Bonus XP"],
  ["avklarad", "completed"],
  ["Delad med", "Shared with"],
  ["Dela", "Share"],
  ["Dela PIN", "Share PIN"],
  ["Välj quiz", "Pick a quiz"],
  ["Förfallodatum", "Due date"],
  ["Tilldela elev", "Assign student"],
  ["Prov-läge", "Test mode"],
  ["Skicka läxa", "Send homework"],
  ["Skicka in", "Submit"],
  ["Skicka", "Send"],
  ["Inga läxor ännu", "No homework yet"],
  ["Pågående läxor", "Ongoing homework"],
  ["Klara läxor", "Finished homework"],
  ["Rätt per fråga", "Correct per question"],
  ["Genomsnitt", "Average"],
  ["Bästa spelare", "Best player"],
  ["Spelade gånger", "Times played"],
  ["Ingen data ännu", "No data yet"],
  ["Ditt resultat", "Your result"],
  ["Gör läxan", "Do the homework"],
  ["Läraren har inte delat något ännu.", "The teacher hasn't shared anything yet."],
  ["Skriv join-koden", "Type the join code"],
  ["Klassen", "The class"],
  ["Alla mina klassrum", "All my classrooms"],
  ["Dela med klass", "Share with class"],

  // ── quiz builder ─────────────────────────────────────────────────────
  ["Ny fråga", "New question"],
  ["Fråga", "Question"],
  ["Frågetext", "Question text"],
  ["Fråga (framsida)", "Question (front)"],
  ["Flerval", "Multiple choice"],
  ["Sant/Falskt", "True/False"],
  ["Sant", "True"],
  ["Falskt", "False"],
  ["Svarsalternativ", "Answer options"],
  ["Rätt svar", "Correct answer"],
  ["Fel svar", "Wrong answer"],
  ["Poäng", "Score"],
  ["Tidsgräns", "Time limit"],
  ["Svar", "Answer"],
  ["Tid kvar", "Time left"],
  ["Sekunder", "Seconds"],
  ["rätt!", "correct!"],
  ["fel!", "wrong!"],
  ["Avsluta spel", "End game"],
  ["Lämna spelet", "Leave the game"],
  ["Till lobbyn", "To the lobby"],
  ["Spela igen", "Play again"],
  ["Resultat", "Results"],
  ["Pallplats", "Podium"],
  ["Omgång", "Round"],
  ["Vinnare", "Winner"],
  ["Förlorare", "Loser"],
  ["Oavgjort", "Draw"],
  ["Välj en sida!", "Pick a side!"],
  ["VÄNSTER", "LEFT"],
  ["HÖGER", "RIGHT"],
  ["Rösta!", "Vote!"],
  ["Välj en quiz att starta", "Pick a quiz to start"],
  ["Lobby", "Lobby"],
  ["Väntar på spelare", "Waiting for players"],
  ["Väntar på spelare...", "Waiting for players..."],
  ["Väntar på spelare…", "Waiting for players…"],
  ["Väntar på att starta", "Waiting to start"],
  ["Spelets PIN-kod", "The game's PIN code"],
  ["PIN-kod", "PIN code"],
  ["Ditt namn", "Your name"],
  ["Fel PIN-kod", "Wrong PIN code"],
  ["Du är med!", "You're in!"],
  ["Spring & hoppa!", "Run & jump!"],
  ["Spring & hoppa med dina vänner!", "Run & jump with your friends!"],
  ["Hoppa!", "Jump!"],
  ["Spring!", "Run!"],
  ["Spelet är slut!", "The game is over!"],
  ["Du fick", "You got"],

  // ── chat ─────────────────────────────────────────────────────────────
  ["Chatt", "Chat"],
  ["Chatten", "The chat"],
  ["Klass-chattar", "Class chats"],
  ["Klass-chattar, direktmeddelanden och personalkontakt", "Class chats, direct messages and staff contact"],
  ["Skriv ett meddelande...", "Type a message..."],
  ["Skriv ett meddelande…", "Type a message…"],
  ["användarnamn...", "username..."],
  ["Välj en chatt till vänster!", "Pick a chat on the left!"],
  ["Välj en konversation i listan för att börja chatta", "Pick a conversation in the list to start chatting"],
  ["Be någon om chatt", "Ask someone to chat"],
  ["Starta ny chatt", "Start a new chat"],
  ["Dina konversationer", "Your conversations"],
  ["Hela chatten", "The whole chat"],
  ["Ägaren", "The Owner"],
  ["Privat chatt", "Private chat"],
  ["Chatt-förfrågningar", "Chat requests"],
  ["Inga meddelanden ännu i den här chatten.", "No messages in this chat yet."],
  ["Inga meddelanden ännu — säj hej!", "No messages yet — say hi!"],
  ["Inga meddelanden ännu.", "No messages yet."],
  ["Acceptera", "Accept"],
  ["Neka", "Decline"],
  ["Avvisa", "Decline"],
  ["Avböj", "Decline"],
  ["Ni kan nu chatta!", "You can now chat!"],
  ["vill chatta med dig", "wants to chat with you"],
  ["Chattförfrågan skickad!", "Chat request sent!"],
  ["Snabbsvar", "Quick replies"],
  ["Svar", "Reply"],
  ["Emoji", "Emoji"],
  ["Emojis", "Emojis"],
  ["Skicka ett meddelande", "Send a message"],
  ["Skriv ett meddelande", "Type a message"],

  // ── generic messages ─────────────────────────────────────────────────
  ["Kunde inte hitta användaren.", "Could not find that user."],
  ["Du måste vara inloggad.", "You must be signed in."],
  ["Förfrågan är redan skickad.", "The request has already been sent."],
  ["Ett fel uppstod vid skapande av förfrågan.", "Something went wrong while creating the request."],
  ["Nätverksfel — försök igen.", "Network error — please try again."],
  ["Något gick fel. Försök igen.", "Something went wrong. Please try again."],
  ["Sparat!", "Saved!"],
  ["Kopierat!", "Copied!"],
  ["Tillagd!", "Added!"],
  ["Raderad!", "Deleted!"],
  ["Uppdaterad", "Updated"],

  // ── moderation / staff ───────────────────────────────────────────────
  ["Du har blivit bannad", "You have been banned"],
  ["Du har blivit bannad av ägaren", "You have been banned by the owner"],
  ["Du har blivit bannad av en ADMIN", "You have been banned by an ADMIN"],
  ["Du har blivit bannad av SÄKERHET", "You have been banned by SECURITY"],
  ["Bannad", "Banned"],
  ["BANNAD", "BANNED"],
  ["Banna", "Ban"],
  ["Bannade", "Banned"],
  ["bannade", "banned"],
  ["Unbanna", "Unban"],
  ["Varningar", "Warnings"],
  ["Övervakning", "Surveillance"],
  ["Åtgärd", "Action"],
  ["Anledning", "Reason"],
  ["meddelande (valfritt)", "message (optional)"],
  ["FÖR ALLTID", "FOREVER"],
  ["Underhåll", "Maintenance"],
  ["Sajten är stängd just nu", "The site is closed right now"],
  ["Vi är snart tillbaka!", "We'll be back soon!"],
  ["kontakta ägaren", "contact the owner"],
  ["Dags att byta namn!", "Time to change your name!"],
  ["Välj ett nytt namn", "Pick a new name"],
  ["Spara nytt namn", "Save new name"],
  ["måste byta namn för att fortsätta!", "must change name to continue!"],
  ["Namnbyte", "Rename"],
  ["Be om namnbyte (LÅSER sajten)", "Request rename (LOCKS the site)"],
  ["Personalen vill se din skärm LIVE", "The staff wants to see your screen LIVE"],
  ["Du väljer själv vad som delas och kan avsluta när som helst.", "You choose what is shared and can stop anytime."],
  ["Be om LIVE-skärm", "Request LIVE screen"],
  ["Förfrågan om skärmdelning", "Screen share request"],
  ["En lärare eller administratör har begärt att se din skärm. Du väljer själv vad som visas och kan avbryta när som helst.", "A teacher or administrator has asked to see your screen. You choose what is shown and can stop at any time."],
  ["Dela skärm", "Share screen"],
  ["LIVE-skärmdelning", "LIVE screen share"],

  // ── owner console ────────────────────────────────────────────────────
  ["ÄGARKONSOL", "OWNER CONSOLE"],
  ["Ägarkonsol", "Owner console"],
  ["GULD-TRONEN", "THE GOLD THRONE"],
  ["Guld-tronen", "The gold throne"],
  ["Användare", "Users"],
  ["Sändning", "Broadcast"],
  ["Global sändning", "Global broadcast"],
  ["Koder", "Codes"],
  ["Logg", "Log"],
  ["Aktivitetslogg", "Activity log"],
  ["Loggen", "The log"],
  ["Ban-begäranden", "Ban requests"],
  ["Väntande begäranden", "Pending requests"],
  ["Väntande", "Pending"],
  ["Hanterade", "Handled"],
  ["Godkänn", "Approve"],
  ["Avslå", "Reject"],
  ["Avvisa", "Reject"],
  ["1 tim", "1 hour"],
  ["1 timme", "1 hour"],
  ["1 dag", "1 day"],
  ["2 dagar", "2 days"],
  ["1 vecka", "1 week"],
  ["Egen tid", "Custom time"],
  ["egna minuter", "custom minutes"],
  ["Skicka popup", "Send popup"],
  ["Be om mer", "Ask for more"],
  ["Ägarkod", "Owner code"],
  ["Admin-kod", "Admin code"],
  ["Säkerhetskod", "Security code"],
  ["Stabs-chat", "Staff chat"],
  ["Sänd", "Send"],
  ["Öppna sajten", "Open the site"],
  ["STÄNG sajten", "SHUT DOWN the site"],
  ["Sändning & Nödläge", "Broadcast & Emergency"],
  ["Skriv ett meddelande som ALLA användare ser...", "Type a message ALL users see..."],
  ["Skriv ett meddelande till HELA sajten...", "Type a message to the WHOLE site..."],
  ["Nödläge — stäng hela sajten", "Emergency — shut down the whole site"],
  ["ALLA användare ser detta som en gul banderoll. Ägaren ser i loggen när du sänder.", "ALL users see this as a gold banner. The owner sees it in the log when you broadcast."],
  ["Sändning ute till HELA sajten!", "Broadcast sent to the WHOLE site!"],
  ["Allt ditt rike, i ett ögonkast. Endast för betrodda. Alla öppningar loggas.", "Your whole kingdom at a glance. Trusted only. Every open is logged."],
  ["En admin vill banna längre än 1 dag? Här godkänner eller avslår du — och väljer EXAKT hur länge.", "An admin wants to ban longer than 1 day? Here you approve or reject — and pick EXACTLY how long."],
  ["Inga väntande begäranden. Alla admins sköter sig!", "No pending requests. All admins behave!"],
  ["XP & mynt & nivå", "XP & coins & level"],
  ["Byt namn & roll", "Rename & role"],
  ["Lösenord & email", "Password & email"],
  ["Personligt meddelande (popup för BARA denna användare)", "Personal message (popup for ONLY this user)"],
  ["Skriv något bara denna personen ser...", "Write something only this person sees..."],
  ["Meddela med popup", "Notify with popup"],
  ["eget lösenord (valfritt, 6+ tecken)", "custom password (optional, 6+ chars)"],
  ["Be ägaren om längre ban", "Ask the owner for a longer ban"],
  ["Belöna (max 500, 3/dag)", "Reward (max 500, 3/day)"],
  ["Banna (5min/1tim/1dag)", "Ban (5min/1hour/1day)"],
  ["längre än så? Be ägaren om lov!", "longer than that? Ask the owner!"],
  ["Allt loggas.", "Everything is logged."],
  ["Övervaka, varna, kyla ner (5 min / 1 tim) och begär namnbyte. Allt loggas.", "Monitor, warn, cool down (5 min / 1 hour) and request a rename. Everything is logged."],
  ["Hemlig anteckning", "Secret note"],
  ["Hemlig anteckning sparad", "Secret note saved"],
  ["Personlig anteckning", "Personal note"],
  ["Tvinga omstart av inloggning", "Force re-login"],
  ["Tidsmaskin", "Time machine"],
  ["Frys mynt", "Freeze coins"],
  ["Skugga", "Shadow"],
  ["Daglig bonus", "Daily bonus"],
  ["Tysta chatten", "Mute chat"],
  ["Öppna chatten", "Unmute chat"],
  ["Fäst", "Pin"],
  ["Avfäst", "Unpin"],

  // ── phrases ──────────────────────────────────────────────────────────
  ["Lär. Spela. Tävla.", "Learn. Play. Compete."],
  ["QuizKeen förvandlar ditt klassrum till en live gameshow.", "QuizKeen turns your classroom into a live gameshow."],
  ["Starta frågesporter med en PIN-kod, spela minispel i lobbyn, samla XP och mynt, och klättra på topplistan.", "Start quizzes with a PIN code, play mini-games in the lobby, collect XP and coins, and climb the leaderboard."],
  ["Inga tråkiga vänteskärmar — spring & hoppa med dina vänner i lobbyns minispel medan arrangören gör sig redo.", "No boring waiting screens — run & jump with your friends in the lobby mini-game while the host gets ready."],
  ["Varje rätt svar ger XP & mynt. Gå upp i nivå, klättra på topplistan och bemästra allt med den inbyggda guiden!", "Every correct answer gives XP & coins. Level up, climb the leaderboard and master everything with the built-in guide!"],
  ["Så spelar du", "How to play"],
  ["Rundturen på 60 sekunder — allt du behöver för att dominera!", "The 60-second tour — everything you need to dominate!"],
  ['Tryck på "Börja spela", välj en quiz och få en 6-siffrig PIN-kod. Dela med hela klassen!', 'Press "Start playing", pick a quiz and get a 6-digit PIN code. Share it with the whole class!'],
  ['Spelare trycker på "Gå med i ett spel", skriver PIN-koden + valfritt namn och hoppar in i lobbyn.', 'Players press "Join a game", type the PIN code + any name and jump into the lobby.'],
  ["Ingen tråkig väntan! Lobbyn har ett minispel — spring & hoppa med dina vänner tills arrangören startar.", "No boring waiting! The lobby has a mini-game — run & jump with your friends until the host starts."],
  ["Välj bland de färgade knapparna. Rätt + snabbt = mer poäng (upp till 150 per fråga!).", "Pick among the colored buttons. Correct + fast = more points (up to 150 per question!)."],
  ["Bygg kortlekar och vänd kort själv för att plugga. Ska du starta en strid? Lägg till fejk-svar också!", "Build decks and flip cards yourself to study. Starting a battle? Add fake answers too!"],
  ["Starta en strid med en PIN-kod — spelarna ser frågan, kämpar om att välja rätt sida, och kortet VÄNDS och avslöjar svaret!", "Start a battle with a PIN code — players see the question, fight to pick the right side, and the card FLIPS and reveals the answer!"],
  ["Bygg dina egna gloskort. Vänd. Lär. Dominera.", "Build your own flashcards. Flip. Learn. Dominate."],
  ["klicka på kortet för att vända!", "click the card to flip!"],
  ["Klicka på kortet för att vända!", "Click the card to flip!"],
  ["Alla rättigheter förbehållna.", "All rights reserved."],
  ["Byggt av", "Built by"],
  ["ÄGARE — tronens väktare", "OWNER — keeper of the throne"],
  ["tecken", "characters"],
  ["Klass-chattar · privat med lärare & vänner · personalen.", "Class chats · private with teachers & friends · staff."],
  ["Fråga ", "Question "],
  [" av ", " of "],
  ["Användarnamn:", "Username:"],
  ["Gick med:", "Joined:"],
  ["Roll:", "Role:"],
  ["Nu:", "Now:"],
  ["Inloggad:", "Signed in:"],
  ["Sist sedd:", "Last seen:"],
  ["Nivå ", "Level "],
  ["nivå", "level"],
  ["XP", "XP"],
  ["st", "pcs"],
  ["idag", "today"],
  ["imorgon", "tomorrow"],
  ["igår", "yesterday"],
  ["nu", "now"],
  ["snart", "soon"],
  ["minuter", "minutes"],
  ["timmar", "hours"],
  ["dagar", "days"],
  ["sekunder", "seconds"],
  ["5 min", "5 min"],
];

// ── compiled lookup tables ───────────────────────────────────────────────

const SV_TO_EN = new Map<string, string>();
const EN_TO_SV = new Map<string, string>();
for (const [sv, en] of PAIRS) {
  if (!SV_TO_EN.has(sv)) SV_TO_EN.set(sv, en);
  if (!EN_TO_SV.has(en)) EN_TO_SV.set(en, sv);
}

type Matcher = { re: RegExp; map: Map<string, string> };

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMatcher(map: Map<string, string>): Matcher {
  const keys = [...map.keys()]
    .filter((k) => k.length >= 2)
    .sort((a, b) => b.length - a.length);
  return { re: new RegExp(keys.map(escapeRegExp).join("|"), "g"), map };
}

const MATCHERS: Record<Lang, Matcher> = {
  en: buildMatcher(SV_TO_EN),
  sv: buildMatcher(EN_TO_SV),
};

const WORD = /[\p{L}\p{N}]/u;
function isWordChar(c: string | undefined) {
  return !!c && WORD.test(c);
}

/** Replace only whole words, so "Chatt" can never become "Chattt". */
function replaceWholeWords(text: string, matcher: Matcher) {
  const { re, map } = matcher;
  re.lastIndex = 0;
  return text.replace(re, (match, offset: number, full: string) => {
    const before = full[offset - 1];
    const after = full[offset + match.length];
    if (isWordChar(match[0]) && isWordChar(before)) return match;
    if (isWordChar(match[match.length - 1]) && isWordChar(after)) return match;
    return map.get(match) ?? match;
  });
}

/** Whole-string match, keeping any surrounding punctuation intact. */
function matchExact(text: string, map: Map<string, string>): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const hit = map.get(trimmed);
  if (hit !== undefined) return text.replace(trimmed, hit);
  const core = trimmed.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}]+$/u, "");
  if (core && core !== trimmed) {
    const coreHit = map.get(core);
    if (coreHit !== undefined) return text.replace(core, coreHit);
  }
  return null;
}

/** Translate one string. Unknown strings pass through untouched. */
export function translateText(text: string, lang: Lang): string {
  if (!text) return text;
  const matcher = MATCHERS[lang];
  const exact = matchExact(text, matcher.map);
  if (exact !== null) return exact;
  return replaceWholeWords(text, matcher);
}

// ── DOM patching ─────────────────────────────────────────────────────────

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "SVG", "CANVAS", "IFRAME", "INPUT",
]);
const ATTRS = ["placeholder", "title", "aria-label"] as const;

const ORIGINAL_TEXT = new WeakMap<Text, string>();
const LAST_APPLIED = new WeakMap<Text, string>();
const ORIGINAL_ATTRS = new WeakMap<Element, Map<string, string>>();

function shouldSkip(el: Element | null): boolean {
  let node: Element | null = el;
  while (node) {
    if (SKIP_TAGS.has(node.tagName)) return true;
    if (node.hasAttribute("data-no-translate") || node.hasAttribute("data-qk-i18n")) return true;
    node = node.parentElement;
  }
  return false;
}

function patchText(node: Text, lang: Lang) {
  if (!node.parentElement || shouldSkip(node.parentElement)) return;

  const current = node.textContent ?? "";
  const original = ORIGINAL_TEXT.get(node);
  const lastApplied = LAST_APPLIED.get(node);

  // If the app re-rendered this node with fresh content, adopt it as the new original.
  let source: string;
  if (original === undefined || (current !== original && current !== lastApplied)) {
    source = current;
    ORIGINAL_TEXT.set(node, source);
  } else {
    source = original;
  }

  const next = translateText(source, lang);
  LAST_APPLIED.set(node, next);
  if (current !== next) node.textContent = next;
}

function patchAttrs(el: Element, lang: Lang) {
  if (shouldSkip(el)) return;
  let store = ORIGINAL_ATTRS.get(el);
  for (const attr of ATTRS) {
    const value = el.getAttribute(attr);
    if (value === null) continue;
    if (!store) {
      store = new Map();
      ORIGINAL_ATTRS.set(el, store);
    }
    const known = store.get(attr);
    if (known === undefined || (value !== known && value !== translateText(known, lang))) {
      store.set(attr, value);
    }
    const source = store.get(attr)!;
    const next = translateText(source, lang);
    if (value !== next) el.setAttribute(attr, next);
  }
}

/** Walk the whole document once and patch every translatable string. */
export function applyTranslations(lang: Lang) {
  if (typeof document === "undefined") return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  for (const node of texts) patchText(node, lang);

  const all = document.body.querySelectorAll("*");
  for (let i = 0; i < all.length; i++) patchAttrs(all[i], lang);

  if (document.title) {
    const el = document.documentElement;
    const known = el.dataset.qkTitleOriginal;
    const current = document.title;
    if (!known || (current !== known && current !== translateText(known, lang))) {
      el.dataset.qkTitleOriginal = current;
    }
    const source = el.dataset.qkTitleOriginal ?? current;
    const next = translateText(source, lang);
    if (next !== current) document.title = next;
  }
}

/**
 * Keep the DOM translated until the returned cleanup function runs.
 * Uses a MutationObserver (debounced to the next frame) so React re-renders
 * are picked up immediately instead of on a 3 second poll.
 */
export function observeTranslations(lang: Lang): () => void {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      applyTranslations(lang);
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS],
  });

  return () => {
    observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
  };
}
