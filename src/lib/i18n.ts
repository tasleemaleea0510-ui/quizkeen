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
  // ── Keens: rarities, the Gamer pack, the Admin gift ───────────────────
  ["Mystisk", "Mystical"],
  ["Hemlig", "Secret"],
  ["Gamerpaketet", "Gamer pack"],
  ["Pixlar, neon och något som rör sig i mörkret.", "Pixels, neon and something moving in the dark."],
  ["Admin-gåva", "Admin gift"],
  ["Ägar-gåva", "Owner gift"],
  ["Gåva", "Gift"],
  [
    "Fler temapaket är inte till salu just nu — deras Keens finns kvar i samlingen och går att köpa i marknaden.",
    "More theme packs are not for sale right now — their Keens stay in the collection and can still be bought in the market.",
  ],
  [
    "Keens kommer från flera teman. Paketen som är till salu just nu står överst — resten av Keens går att köpa i marknaden. Ju sällsyntare, desto dyrare.",
    "Keens come from several themes. The packs on sale right now are at the top — the rest of the Keens can be bought in the market. The rarer, the dearer.",
  ],
  ["Inte utdelad än", "Not given out yet"],
  ["Delas ut", "Handed out"],
  ["Går inte att köpa", "Not for sale"],
  [
    "Den här Keen finns inte i något paket. Bara en admin i QuizKeen Command kan dela ut den, och då hamnar den direkt i samlingen — den går aldrig att köpa eller sälja.",
    "This Keen is not in any pack. Only an admin in QuizKeen Command can hand it out, and it lands in the collection right away — it can never be bought or sold.",
  ],

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

  // ── coverage pass ───────────────────────────────────────────────────────
  // Every string below used to be missing, so English mode replaced stray
  // words inside Swedish sentences and produced lines like "Nästa steg" or
  // "delas bara ut of en admin". With the whole sentence in the dictionary the
  // exact match wins and nothing is left half-translated.
  ["Ange spelets PIN-kod och ditt namn för att delta.", "Enter the game PIN and your name to join."],
  ["Bygg kortlekar och vänd kort för att träna inför prov.", "Build decks and flip cards to practise before exams."],
  ["Byter färg varje gång du blinkar.", "Changes colour every time you blink."],
  ["Fråga / Term (framsida)", "Question / Term (front)"],
  ["Bär", "Wearing"],
  ["Tio Keens som alla har från dag ett.", "Ten Keens everyone has from day one."],

  // Keen bios — one line each, shown on the card and in the sheet.
  ["Alla färger på en gång — och smakar regnbåge.", "All the colours at once — and it tastes like rainbow."],
  ["Bara det bästa — och Kroma-Keens.", "Only the best — and Kroma Keens."],
  ["Blir alltid nervös, även när det är grupparbete.", "Always nervous, even during group work."],
  ["Blommar när du svarar rätt, slokar när du gissar.", "Blooms when you answer right, wilts when you guess."],
  ["Bubblar fram svaret från havets botten.", "Bubbles the answer up from the seabed."],
  ["Byter skepnad och landar på rätt svar.", "Changes shape and lands on the right answer."],
  ["Bär alla böcker, glömmer alltid läxan hemma.", "Carries every book, always forgets the homework at home."],
  ["Eldar bara när svaret är fel.", "Only breathes fire when the answer is wrong."],
  ["En skugga med tänder — bara några har sett den.", "A shadow with teeth — only a few have seen it."],
  ["Ett horn, ett ben, ett rätt svar.", "One horn, one leg, one right answer."],
  ["Ett hål i mitten och socker överallt.", "A hole in the middle and sugar everywhere."],
  ["Ett lager för varje rätt svar.", "A layer for every right answer."],
  ["Frusen sedan i tisdags — men kammen är röd och glad.", "Frozen since Tuesday — but the comb is red and cheerful."],
  ["Från suddgummi till rektor.", "From eraser to head teacher."],
  ["Gladast av alla spöken — den är söt, inte hemsk.", "The happiest of all ghosts — cute, not scary."],
  ["Glömmer aldrig något — och verkligen inget prov.", "Never forgets anything — and certainly not an exam."],
  ["Gräddad i pumpform, med choklad i ögonen.", "Baked in a pumpkin mould, with chocolate eyes."],
  ["Går upp tidigt för att hinna studera ikapp.", "Gets up early to catch up on studying."],
  ["Halv, full eller bara trött — alltid vacker.", "Half, full or just tired — always beautiful."],
  ["Har ringar, attityd och alldeles för många månar.", "Has rings, attitude and far too many moons."],
  ["Hoppar hellre än går, och räknar morötter bäst i klassen.", "Would rather hop than walk, and counts carrots best in class."],
  ["Hämtar alltid bollen — även när du inte kastat den.", "Always fetches the ball — even when you didn't throw it."],
  ["Klänger på allt, även riktigt svåra uppgifter.", "Clings to everything, even really hard tasks."],
  ["Knaprig, med choklad i varje hörn.", "Crispy, with chocolate in every corner."],
  ["Kommer farande med svansen av glöd.", "Comes flying in with a tail of embers."],
  ["Kungen av djungeln, men rädd för bin.", "King of the jungle, but scared of bees."],
  ["Kungen i mörkret: 0,1 % chans och en hel armé av pumpor.", "King of the dark: a 0.1 % chance and a whole army of pumpkins."],
  ["Landar i åtta bitar och flyttar sig i sidled.", "Lands in eight pieces and moves sideways."],
  ["Lindad i band och redo för evigheten.", "Wrapped in bandages and ready for eternity."],
  ["Liten droppe, stor tålamod — rinner aldrig ut.", "Small drop, great patience — never runs out."],
  ["Liten, men med glasyr över hela krönet.", "Small, but with icing over the whole crown."],
  ["Lyser upp mörka nätter och svåra tal.", "Lights up dark nights and hard sums."],
  ["Lyser upp mörkret och ler bredare än alla andra.", "Lights up the dark and smiles wider than anyone."],
  ["Lånar dina pennor och lämnar tillbaka dem oslipade.", "Borrows your pencils and gives them back blunt."],
  ["Långsam på frågor, omöjlig att slå på tålamod.", "Slow at questions, impossible to beat at patience."],
  ["Nykläckt, nyfiken och med på varje fråga.", "Newly hatched, curious and in on every question."],
  ["Pip pip! Sjunger svaret när du inte hinner.", "Beep beep! Sings the answer when you're out of time."],
  ["Pratar i signaler och förstår ändå alla frågor.", "Speaks in signals and still understands every question."],
  ["Pumpor, spöken och en kung i mörkret.", "Pumpkins, ghosts and a king in the dark."],
  ["Raketer, planeter och något som tittar tillbaka.", "Rockets, planets and something looking back."],
  ["Regnbågens krona — den sista på hyllan.", "The rainbow crown — the last on the shelf."],
  ["Reser sig ur provet och börjar om.", "Rises from the exam and starts over."],
  ["Ringlar fram utan ben och utan brådska.", "Slithers along with no legs and no hurry."],
  ["Rund, arg och överraskande svårfångad.", "Round, angry and surprisingly hard to catch."],
  ["Räknar allt, piper när svaret är rätt.", "Counts everything, beeps when the answer is right."],
  ["Räknar ned från tio och lämnar atmosfären.", "Counts down from ten and leaves the atmosphere."],
  ["Räknar snabbare än du hinner skriva.", "Counts faster than you can write."],
  ["Rättar i röd penna och ler ändå.", "Marks in red pen and smiles anyway."],
  ["Samma kyckling, tinad, med slör och allt.", "Same chicken, thawed, bow tie and all."],
  ["Ser allt som är för långt borta för att se.", "Sees everything too far away to see."],
  ["Sitter still, sedan hopp — rätt svar.", "Sits still, then hops — right answer."],
  ["Slår alltid sex — utom när det gäller.", "Always rolls a six — except when it counts."],
  ["Smälter i handen, aldrig i provet.", "Melts in your hand, never in the exam."],
  ["Snabb, fläckig och misstänkt självsäker.", "Fast, spotty and suspiciously confident."],
  ["Sover genom provet och drömmer om honung.", "Sleeps through the exam and dreams of honey."],
  ["Sover i kistan på dagen och hoppar i provet på natten.", "Sleeps in the coffin by day and hops through the exam at night."],
  ["Spetsad och redo — suddar aldrig ett rätt svar.", "Sharpened and ready — never erases a right answer."],
  ["Spricker av glädje varje gång du klarar ett prov.", "Bursts with joy every time you pass an exam."],
  ["Svävar in, svävar ut, glömmer aldrig ett glosförhör.", "Drifts in, drifts out, never forgets a vocabulary test."],
  ["Söt ut i tåspetsarna, kladdig i marginalen.", "Sweet to the tips of its toes, sticky in the margins."],
  ["Sött, sötare, regnbåge.", "Sweet, sweeter, rainbow."],
  ["Trollar fram rätt svar med en vink av staven.", "Conjures the right answer with a flick of the wand."],
  ["Trögstartad, men glömmer aldrig något den lärt sig.", "Slow to start, but never forgets what it has learned."],
  ["Upprepar allt du säger — även rätt svar.", "Repeats everything you say — right answers included."],
  ["Vinsten är tung att bära — men den är snygg.", "The trophy is heavy to carry — but it looks good."],
  ["Växer i skuggan av dina misstag — och lär sig av dem.", "Grows in the shadow of your mistakes — and learns from them."],
  ["Ylar mot månen och svarar rätt på ren instinkt.", "Howls at the moon and answers right on pure instinct."],
  ["Åtta i besättningen, och en av dem ljuger.", "Eight in the crew, and one of them is lying."],

  // Keens screens and pack opening.
  ["Allt är gjort för idag — samlingen är komplett. Njut.", "Everything is done for today — the collection is complete. Enjoy."],
  ["Bär den här Keen", "Wear this Keen"],
  ["Bästa drag:", "Best pull:"],
  ["Bästa samlarna", "Top collectors"],
  ["Daglig bonus är avstängd på ditt konto.", "The daily bonus is switched off for your account."],
  ["Den Keen går inte att köpa längre — paketet den kom ifrån är inte till salu.", "That Keen can't be bought any more — its pack is no longer for sale."],
  ["Den Keen äger du inte — hitta den först!", "You don't own that Keen — find it first!"],
  ["Det paketet är inte till salu just nu.", "That pack isn't for sale right now."],
  ["Din myntplånbok är fryst — du kan samla och sälja, men inte köpa paket eller Keens.", "Your coin wallet is frozen — you can collect and sell, but not buy packs or Keens."],
  ["Din myntplånbok är fryst, så du kan inte handla just nu.", "Your coin wallet is frozen, so you can't trade right now."],
  ["Din plånbok", "Your wallet"],
  ["Ditt konto är avstängt och kan inte handla.", "Your account is suspended and can't trade."],
  ["Du bär den här — ta av", "You're wearing this — take it off"],
  ["Du bär den här Keen", "You're wearing this Keen"],
  ["Du har den inte än", "You don't have it yet"],
  ["Du har inte tillräckligt med mynt. Spela en quiz och tjäna fler!", "You don't have enough coins. Play a quiz and earn more!"],
  ["Du har redan öppnat dagens gratispaket — kom tillbaka imorgon!", "You've already opened today's free pack — come back tomorrow!"],
  ["Du kan inte öppna så många paket på en gång.", "You can't open that many packs at once."],
  ["Du äger", "You own"],
  ["Du äger ingen sådan Keen att sälja.", "You don't own one of those Keens to sell."],
  ["Dubbletter värda", "Duplicates worth"],
  ["Ett paket på huset — ta det innan midnatt.", "A pack on the house — take it before midnight."],
  ["Fler från samma paket", "More from the same pack"],
  ["Gratispaket att hämta", "Free pack to claim"],
  ["Gratispaket tillgängligt", "Free pack available"],
  ["Gratispaketet väntar", "Your free pack is waiting"],
  ["Gratispaketet är öppnat", "Free pack already opened"],
  ["Historien låses upp när du hittar den.", "The story unlocks when you find it."],
  ["Hitta den för att läsa historien.", "Find it to read the story."],
  ["Ingen har samlat några Keens än — bli den första!", "Nobody has collected any Keens yet — be the first!"],
  ["Inget att sälja.", "Nothing to sell."],
  ["Inte hittad än", "Not found yet"],
  ["Keenen du bär", "The Keen you're wearing"],
  ["Kom tillbaka imorgon för nästa.", "Come back tomorrow for the next one."],
  ["Köp och sälj Keens för mynt. Nya deals varje dag.", "Buy and sell Keens for coins. New deals every day."],
  ["Låst Keen", "Locked Keen"],
  ["Nästa köp:", "Next purchase:"],
  ["Nästa nivå", "Next level"],
  ["Nästa steg", "Next step"],
  ["Paketet är utgånget", "The pack is retired"],
  ["Paketpåsar", "Pack bags"],
  ["poäng", "points"],
  ["Råd att handla", "Tips for trading"],
  ["Saknar du en? Köp den i marknaden →", "Missing one? Buy it in the market →"],
  ["Samla Keens, öppna paket och handla i marknaden.", "Collect Keens, open packs and trade in the market."],
  ["Samlarnivå", "Collector level"],
  ["Senaste öppningar", "Recent pulls"],
  ["Servern hann inte med — inga mynt drogs. Försök igen!", "The server couldn't keep up — no coins were taken. Try again!"],
  ["Sortera: lägsta pris", "Sort: lowest price"],
  ["Sortera: sällsynthet", "Sort: rarity"],
  ["Sälj alla dubbletter", "Sell all duplicates"],
  ["Sök i marknaden…", "Search the market…"],
  ["Sök Keen…", "Search Keens…"],
  ["Tryck för att öppna direkt", "Press to open right away"],
  ["Tryck var som helst för att skynda på", "Press anywhere to speed it up"],
  ["Utgången", "Retired"],
  ["Varje Keen ger poäng efter sällsynthet — en Vanlig 1, en Mystisk 8. Det är de sällsynta som lyfter nivån.", "Each Keen gives points by rarity — a Common 1, a Mystical 8. The rare ones lift your level."],
  ["Öppna →", "Open →"],
  ["Öppna ett paket", "Open a pack"],
  ["Öppna paket", "Open packs"],
  ["Öppna paket och få nya Keens. Gratispaket varje dag.", "Open packs and get new Keens. A free pack every day."],
  ["Öppna paket, samla figurer och handla sällsynta Keens i marknaden.", "Open packs, collect characters and trade rare Keens in the market."],
  ["Öppnar…", "Opening…"],
  ["(utgången)", "(retired)"],

  // Classroom and teacher screens.
  ["— få realtidsöversikt över resultat och deltagande.", "— get a live overview of results and participation."],
  ["— gör frågesporter exklusiva för dina elever.", "— make quizzes exclusive to your students."],
  ["— till hela klassen eller en specifik elev, med deadline och prov-läge.", "— to the whole class or one student, with a deadline and exam mode."],
  ["(prov-läge)", "(exam mode)"],
  ["3 → ägaren!", "3 → the owner!"],
  ["ADMIN — Systemoperatör", "ADMIN — System operator"],
  ["Du är inte med i något klassrum än. Be din lärare om en join-kod!", "You're not in a classroom yet. Ask your teacher for a join code!"],
  ["Endast lärare kan skapa klassrum — elever ansluter via join-kod.", "Only teachers can create classrooms — students join with a code."],
  ["Endast lärare kan skapa klassrum.", "Only teachers can create classrooms."],
  ["Följ upp i Analys", "Follow up in Analytics"],
  ["Ge ut läxor", "Assign homework"],
  ["Hantera användarnamn och inställningar direkt via inställningspanelen.", "Manage usernames and settings straight from the settings panel."],
  ["Hantera klasser, läxor och elever", "Manage classes, homework and students"],
  ["Inga aktiva läxor för tillfället.", "No active homework right now."],
  ["Inga elever anslutna än — dela koden ovan.", "No students joined yet — share the code above."],
  ["Inga elever ännu.", "No students yet."],
  ["Inga klassrum än — skapa ditt första för att bjuda in elever.", "No classrooms yet — create your first to invite students."],
  ["Inga klassrum ännu — skapa ett först!", "No classrooms yet — create one first!"],
  ["Inga läxor tilldelade ännu.", "No homework assigned yet."],
  ["Inga samlingar delade ännu.", "No collections shared yet."],
  ["Join-kod för elever:", "Join code for students:"],
  ["Klass-meddelande (syns live för eleverna)", "Class message (shown live to students)"],
  ["Klassrummet behöver ett namn.", "The classroom needs a name."],
  ["Klassrumsöversikt och administrativ kontroll.", "Classroom overview and admin control."],
  ["Kom igång som lärare", "Get started as a teacher"],
  ["Kunde inte skapa en join-kod — försök igen.", "Couldn't create a join code — try again."],
  ["Laddar frågesport...", "Loading quiz..."],
  ["Laddar läxa...", "Loading homework..."],
  ["Lärare kan skapa klassrum, tilldela läxor och granska deltagarstatistik.", "Teachers can create classrooms, assign homework and review participation stats."],
  ["Lärarläge", "Teacher mode"],
  ["med eleverna — de ansluter via Klassrum &rarr; Gå med.", "with your students — they join via Classroom &rarr; Join."],
  ["nedan — du får en join-kod direkt.", "below — you get a join code right away."],
  ["Prov-läge: 1 försök", "Exam mode: 1 attempt"],
  ["Redan slutförd", "Already completed"],
  ["Roller & behörigheter", "Roles & permissions"],
  ["Skriv join-koden du fått av din lärare.", "Enter the join code you got from your teacher."],
  ["Starta läxa", "Start homework"],
  ["Systemet har separata vyer för elever, lärare, administratörer och moderatorer.", "The system has separate views for students, teachers, administrators and moderators."],
  ["Tilldela läxa", "Assign homework"],
  ["Topp 5 ställning", "Top 5 standings"],
  ["Översikt över elevernas aktivitet, läxor och resultat", "Overview of student activity, homework and results"],
  ["eftersläpning", "lag"],

  // Play, chat, quizzes and flashcards.
  ["Användarnamn...", "Username..."],
  ["Användarnamnet har uppdaterats.", "Your username has been updated."],
  ["Användarnamnet måste vara 3–20 tecken: bokstäver, siffror eller _.", "The username must be 3–20 characters: letters, numbers or _."],
  ["Användarnamnet måste vara mellan 3 och 20 tecken.", "The username must be between 3 and 20 characters."],
  ["Användarnamnet måste vara minst 3 tecken.", "The username must be at least 3 characters."],
  ["Användarnamnet är redan upptaget. Välj ett annat.", "That username is already taken. Pick another one."],
  ["Användarnamnet är upptaget — välj ett annat.", "That username is taken — pick another one."],
  ["Avbryt flervalsläge", "Cancel multiple-choice mode"],
  ["Dags att byta användarnamn", "Time to change your username"],
  ["Ditt nya användarnamn...", "Your new username..."],
  ["Du har inte skapat några quizar än. Skapa din första med knappen ovan!", "You haven't created any quizzes yet. Make your first one with the button above!"],
  ["Du är tystad i chatten", "You are muted in chat"],
  ["E-postadressen kunde inte verifieras, så kontot skapades inte. Använd en riktig adress.", "The email address couldn't be verified, so the account wasn't created. Use a real address."],
  ["Förfrågan avslogs.", "The request was rejected."],
  ["Gå med i QuizKeen!", "Join QuizKeen!"],
  ["Gör offentlig", "Make public"],
  ["Hitta den för att läsa historien.", "Find it to read the story."],
  ["Hittar du inget mejl? Kolla skräpposten. Adressen måste vara en riktig adress som du äger.", "No email? Check your spam folder. The address must be a real one you own."],
  ["Hjärtan", "Hearts"],
  ["Hoppa över till sammanfattningen", "Skip to the summary"],
  ["Inga gloskort skapade än. Skapa din första uppsättning i formuläret ovan!", "No flashcards yet. Create your first set in the form above!"],
  ["Inga gloskort än — skapa din första uppsättning för att träna!", "No flashcards yet — create your first set to practise!"],
  ["Inga kort än — lägg till ditt första kort nedan.", "No cards yet — add your first card below."],
  ["Inga quizar än — skapa din första för att utmana vänner!", "No quizzes yet — create your first to challenge friends!"],
  ["Inga quizar än — skapa din första!", "No quizzes yet — create your first!"],
  ["INTE RIKTIGT DEN HÄR GÅNGEN", "NOT QUITE THIS TIME"],
  ["Inte tillgängligt", "Not available"],
  ["Klicka för att markera som rätt svar", "Click to mark as the right answer"],
  ["Klicka på kortet för att vända", "Click the card to flip it"],
  ["Kom igång", "Get started"],
  ["Kontot är avstängt", "The account is suspended"],
  ["Kunde inte byta lösenord just nu. Försök igen om en stund.", "Couldn't change the password right now. Try again in a moment."],
  ["Kunde inte nå servern — försök igen.", "Couldn't reach the server — try again."],
  ["Kör realtidsstrider på dina kortlekar — vem vinner?", "Run real-time battles on your decks — who wins?"],
  ["Live flerspelarquiz för hela klassrummet", "Live multiplayer quizzes for the whole classroom"],
  ["Logga in för att fortsätta spela och tävla.", "Sign in to keep playing and competing."],
  ["Lås", "Lock"],
  ["Lås quizar", "Lock quizzes"],
  ["låst", "locked"],
  ["Lägg till fler svarsalternativ", "Add more answer options"],
  ["Lägg till några kort i den här kortleken först!", "Add some cards to this deck first!"],
  ["Lösenord (6+ tecken)", "Password (6+ characters)"],
  ["Lösenordet har ändrats.", "Your password has been changed."],
  ["Lösenordet måste vara minst 6 tecken.", "The password must be at least 6 characters."],
  ["Markera knappen för det alternativ som är det korrekta svaret.", "Mark the button for the option that is the correct answer."],
  ["Namnet är redan upptaget.", "That name is already taken."],
  ["Nytt lösenord (6+ tecken)", "New password (6+ characters)"],
  ["Nästa kort", "Next card"],
  ["Nästan klart!", "Almost done!"],
  ["Ogiltigt användarnamn.", "Invalid username."],
  ["okänd", "unknown"],
  ["Personalen har bett dig välja ett nytt användarnamn. Kontot är spärrat tills ett nytt namn valts.", "Staff have asked you to pick a new username. The account is locked until you choose one."],
  ["På dig", "On you"],
  ["QuizKeen — Lär. Spela. Tävla.", "QuizKeen — Learn. Play. Compete."],
  ["Redan öppnat", "Already opened"],
  ["Rätt svar / Definition", "Correct answer / Definition"],
  ["RÄTT SVAR!", "CORRECT!"],
  ["Rätta svar ger erfarenhetspoäng och mynt för att klättra på topplistan.", "Correct answers give XP and coins to climb the leaderboard."],
  ["Skapa digitala kortlekar och vänd kort för att öva själv inför prov.", "Create digital decks and flip cards to practise on your own before exams."],
  ["Skapa dina egna gloskort, öva inför prov och testa dina kunskaper.", "Make your own flashcards, practise before exams and test your knowledge."],
  ["Skapa ett konto och börja spela på under en minut.", "Create an account and start playing in under a minute."],
  ["Skapa ny kortuppsättning", "Create a new card set"],
  ["Skriv din fråga här...", "Write your question here..."],
  ["Snabbguide över funktionerna i plattformen.", "A quick guide to the platform's features."],
  ["Spela minispelet i väntrummet medan arrangören förbereder start.", "Play the minigame in the waiting room while the host prepares to start."],
  ["Spelare väljer “Gå med i ett spel”, anger PIN-koden och sitt namn för att delta i lobbyn.", "Players choose “Join a game”, enter the PIN and their name to join the lobby."],
  ["Spärr: För många lösenordsbyten på kort tid. Vänta några minuter och försök igen.", "Locked: too many password changes in a short time. Wait a few minutes and try again."],
  ["Starta live-frågesporter och kortleksstrider med en 6-siffrig PIN-kod. Hela klassen ansluter och tävlar i realtid.", "Start live quizzes and deck battles with a 6-digit PIN. The whole class joins and competes in real time."],
  ["Stäng av ljud", "Mute sound"],
  ["Svara snabbt för bonuspoäng", "Answer fast for bonus points"],
  ["Svaret är registrerat! Väntar på resultatet...", "Answer recorded! Waiting for the result..."],
  ["Systemet uppdateras för tillfället — vi är snart tillbaka!", "The system is being updated — we'll be right back!"],
  ["Så fungerar", "How it works"],
  ["Sätt på ljud", "Unmute sound"],
  ["Söker efter spel...", "Looking for a game..."],
  ["Tack för att du deltog i QuizKeen", "Thanks for playing QuizKeen"],
  ["Utmana vänner i realtidsstrider baserade på dina gloskort.", "Challenge friends to real-time battles built from your flashcards."],
  ["Varje rätt svar belönas med XP och mynt. Gå upp i nivå, klättra på topplistan och bemästra allt med den inbyggda guiden.", "Every right answer earns XP and coins. Level up, climb the leaderboard and master it all with the built-in guide."],
  ["Vill du starta en strid med de här gloskorten? Lägg till svarsalternativ så att spelarna har val att välja mellan.", "Want to start a battle with these flashcards? Add answer options so players have choices."],
  ["Välj bland svarsalternativen. Snabbare svar ger högre poäng.", "Pick one of the options. Faster answers score higher."],
  ["Välj en quiz och få en 6-siffrig PIN-kod att dela med hela klassen.", "Pick a quiz and get a 6-digit PIN to share with the whole class."],
  ["Välj en quiz, få en PIN-kod och dela med klassen.", "Pick a quiz, get a PIN and share it with the class."],
  ["Välj ett spelarnamn", "Choose a player name"],
  ["Väntar på att arrangören startar spelet. Spela minispelet under tiden!", "Waiting for the host to start. Play the minigame meanwhile!"],
  ["Väntar på att spelare ansluter...", "Waiting for players to join..."],
  ["Väntar på att spelledaren ska starta nästa fråga...", "Waiting for the host to start the next question..."],
  ["Värde", "Value"],
  ["Återaktiveras om", "Reactivates in"],
  ["är under underhåll", "is under maintenance"],
  ["Öppna chatt", "Open chat"],
  ["Hantera konto, lösenord och profiluppgifter", "Manage your account, password and profile"],
  ["Går upp tidigt för att hinna plugga ikapp.", "Gets up early to catch up on studying."],
  [
    "Inga tråkiga vänteskärmar — spela och interagera med dina vänner i lobbyns minispel medan arrangören gör sig redo.",
    "No boring waiting screens — play and interact with your friends in the lobby minigame while the host gets ready.",
  ],

  // ── short labels and data copy ─────────────────────────────────────────
  // Sentences without å/ä/ö ("Starta en quiz") were invisible to the first
  // sweep, so English mode left them half-translated: "Start a quiz" came out
  // as "Start en quiz". These are the rest of them.
  ["Starta en quiz", "Start a quiz"],
  ["Plugga med gloskort", "Study with flashcards"],
  ["Samla Keens", "Collect Keens"],
  ["Utmana i strid", "Battle it out"],
  ["Till samlingen", "To the collection"],
  ["Alla gloskort", "All flashcards"],
  ["Skapa en quiz", "Create a quiz"],
  ["Aktivera flervalsalternativ", "Enable multiple-choice options"],
  ["Spara kort", "Save card"],
  ["Anpassa din profil", "Customise your profile"],
  ["Gloskort & kortlekar", "Flashcards & decks"],
  ["Lärarverktyg", "Teacher tools"],
  ["Systemmeddelande", "System message"],
  ["Registrerad:", "Registered:"],
  ["Till inloggningen", "Go to sign-in"],
  ["Vi har skickat ett mejl till", "We've sent an email to"],
  ["Skapa ett klassrum", "Create a classroom"],
  ["Skapa nytt klassrum", "Create a new classroom"],
  ["Dela koden", "Share the code"],
  ["Hela klassen", "The whole class"],
  ["PROV", "EXAM"],
  ["Anslut till lobby", "Join the lobby"],
  ["Avsluta", "End"],
  ["Laddar lobbyn...", "Loading the lobby..."],
  ["Laddar minispelet...", "Loading the minigame..."],
  ["Laddar spelet...", "Loading the game..."],
  ["Spel-PIN", "Game PIN"],
  ["Spel-PIN — dela denna kod", "Game PIN — share this code"],
  ["STARTA SPELET", "START THE GAME"],
  ["STARTA STRIDEN", "START THE BATTLE"],
  ["Slutresultat", "Final results"],
  ["Visa slutresultat", "Show final results"],
  ["Keens — marknad · QuizKeen", "Keens — market · QuizKeen"],
  ["Keens — paket · QuizKeen", "Keens — packs · QuizKeen"],
  ["Handtecknade", "Hand-drawn"],
  ["Storlekarna", "The sizes"],

  // Keens labels, ranks and pack names.
  ["Alla", "All"],
  ["Alla paket", "All packs"],
  ["Alla Keens", "All Keens"],
  ["Alla hittade! 🎉", "All found! 🎉"],
  ["Chans i paketet", "Chance in the pack"],
  ["Dagens deal", "Today's deal"],
  ["Dagens deals", "Today's deals"],
  ["Dagens Keen", "Today's Keen"],
  ["Dina Keens", "Your Keens"],
  ["Dubbletter", "Duplicates"],
  ["Dubbletter gav tillbaka", "Duplicates gave back"],
  ["Gratis!", "Free!"],
  ["I samlingen", "In the collection"],
  ["Inga Keens matchar filtret.", "No Keens match the filter."],
  ["Kostade", "Cost"],
  ["Marknad", "Market"],
  ["Marknadspris", "Market price"],
  ["Min samling", "My collection"],
  ["Ny Keen!", "New Keen!"],
  ["Närmast klart", "Closest to complete"],
  ["Närmast komplett", "Closest to complete"],
  ["Toppen av paketet", "Top of the pack"],
  ["Jaga", "Chase"],
  ["Inga dubbletter", "No duplicates"],
  ["Köp för", "Buy for"],
  ["Köp nu", "Buy now"],
  ["Köp", "Buy"],
  ["Köper…", "Buying…"],
  ["Köper", "Buying"],
  ["Ägda", "Owned"],
  ["Paket", "Packs"],
  ["Pakethyllan", "The pack shelf"],
  ["Samlade Keens", "Keens collected"],
  ["Samling", "Collection"],
  ["Se hela samlingen →", "See the whole collection →"],
  ["Sortera: antal", "Sort: count"],
  ["Sortera: namn", "Sort: name"],
  ["Sällsynthetsjakt", "Rarity hunt"],
  ["Ta av", "Take off"],
  ["Till marknaden", "To the market"],
  ["Varje dag", "Every day"],
  ["Visa detaljer", "View details"],
  [
    "Kroma-Keens finns bara i Mytiskapaketet — eller i marknaden.",
    "Kroma Keens only come from the Mythical pack — or the market.",
  ],

  // Rarities and ranks.
  ["Nyfiken", "Curious"],
  ["Samlare", "Collector"],
  ["Kännare", "Connoisseur"],
  ["Mästare", "Master"],
  ["Keen-Kungen", "Keen King"],
  ["Jägare", "Hunter"],
  ["Vanlig", "Common"],
  ["Ovanlig", "Uncommon"],
  ["Sällsynt", "Rare"],
  ["Episk", "Epic"],
  ["Legendar", "Legendary"],
  ["Legendarisk", "Legendary"],
  ["Saker", "Things"],

  // Packs.
  ["Startpaketet", "Starter pack"],
  ["Gratispaketet", "Free pack"],
  ["Djungelpaketet", "Jungle pack"],
  ["Djurpaketet", "Animal pack"],
  ["Godispaketet", "Candy pack"],
  ["Halloweenpaketet", "Halloween pack"],
  ["Rymdpaketet", "Space pack"],
  ["Skolpaketet", "School pack"],
  ["Mytiskapaketet", "Mythical pack"],

  // Emoji-picker categories.
  ["Djur", "Animals"],
  ["Glada", "Happy"],
  ["Händer", "Hands"],
  ["Mat", "Food"],

  // Roles.
  ["ELEV", "STUDENT"],
  ["LÄRARE", "TEACHER"],
  ["ÄGARE", "OWNER"],
  ["SÄKERHET", "SECURITY"],
  ["Säkerhet", "Security"],
  ["Dina Keens", "Your Keens"],
  ["Skapa ditt klassrum", "Create your classroom"],

  // Long paragraphs (multi-line JSX) that the first sweep could not see.
  [
    "QuizKeen förvandlar ditt klassrum till en levande frågesport. Starta spel med en PIN-kod, kör roliga minispel i lobbyn, samla XP och mynt, och klättra på topplistan.",
    "QuizKeen turns your classroom into a live quiz show. Start games with a PIN code, play fun minigames in the lobby, collect XP and coins, and climb the leaderboard.",
  ],
  [
    "Den här får alla från dag ett. Den kan inte köpas, säljas eller tappas — men den kan bäras, och då syns den i quizen, lobbyn och på gloskorten.",
    "Everyone gets this one from day one. It can't be bought, sold or lost — but it can be worn, and then it shows up in quizzes, the lobby and on flashcards.",
  ],
  [
    "Den här Keen kommer från ett paket som inte är till salu längre, så den går bara att sälja — den syns kvar i samlingen för att du redan har den.",
    "This Keen comes from a pack that is no longer for sale, so it can only be sold — it stays in the collection because you already have it.",
  ],
  [
    "Dubbletter betalar tillbaka sig själva direkt: får du en Keen du redan har får du mynt tillbaka — säljvärdet för den sällsyntheten. Öppna fler paket på en gång för fler chanser!",
    "Duplicates pay you back straight away: pull a Keen you already have and you get coins back — the sell value for that rarity. Open more packs at once for more chances!",
  ],
  [
    "Marknaden säljer Keens som paketen i butiken kan ge. En Keen från ett paket som tagits bort syns bara om du redan har den, och då kan du sälja den — men inte köpa fler.",
    "The market sells the Keens the packs in the shop can give. A Keen from a removed pack only shows if you already have it, and then you can sell it — but not buy more.",
  ],
  [
    "Gamerpaketet är först ut: fem figurer, från vanliga till hemliga. Fler paket är på väg — och två Keens delas bara ut av ägaren och en admin. Tjäna mynt genom att svara rätt och öppna paket.",
    "The Gamer pack is up first: five characters, from Common to Secret. More packs are on the way — and two Keens are only handed out by the owner and an admin. Earn coins by answering right and opening packs.",
  ],
  ["Instruktioner", "Instructions"],
  ["Erfarenhet (XP)", "Experience (XP)"],
  // Words that only ever appear inside a counted sentence, e.g. "3 kvar att hitta".
  ["kvar att hitta", "left to find"],
  ["kvar att spara", "left to save"],
  ["kvar", "left"],
  ["hittade", "found"],
  ["Hitta", "Find"],
  ["i den nivån", "in that level"],
  ["Samla", "Collect"],
  ["figurer", "characters"],
  ["öppna", "open"],
  ["paket", "packs"],
  ["handla", "trade"],
  ["marknaden", "the market"],
  ["Du har samlat alla! 🎉", "You have collected them all! 🎉"],
  ["Fyll", "Fill"],
  ["Till paketen", "To the packs"],
  ["Öppna gratis", "Open free"],
  ["till Jägare", "to Hunter"],
  ["Öppna", "Open"],
  ["i marknaden", "in the market"],
  ["byts om", "changes in"],
  ["Dina", "Your"],
  ["samlingar", "collections"],
  ["Elev", "Student"],
  // Rarity names appear lowercase when they are interpolated into a sentence.
  ["vanlig", "common"],
  ["ovanlig", "uncommon"],
  ["sällsynt", "rare"],
  ["episk", "epic"],
  ["legendarisk", "legendary"],
  ["hemlig", "secret"],
  ["kroma", "chroma"],
  ["mystisk", "mystical"],
  ["Dubblett", "Duplicate"],
  ["chans", "chance"],
  // The Keens footer interpolates rank names, so only these fragments are text nodes.
  ["samla på dig poäng för att klättra från", "collect points to climb from"],
  ["toppen", "the top"],
  ["nya deals om", "new deals in"],
  ["Dagens Keen byts vid midnatt UTC", "Today's Keen changes at midnight UTC"],
  [
    "samlade · köp paket med dina mynt och handla i marknaden",
    "collected · buy packs with your coins and trade in the market",
  ],
  ["mynt", "coins"],
  ["Dina mynt", "Your coins"],
  ["Du spelar som", "You are playing as"],
  ["Nya", "New"],
  ["Pluggar med dig", "Studies with you"],
  // ── Keen catalogue: the English names the content already carries ────
  ["Keenungen", "Keenling"],
  ["Roboten Blipp", "Blipp the Robot"],
  ["Molnet Puff", "Puff the Cloud"],
  ["Droppen Driz", "Driz the Droplet"],
  ["Solstrålen Sunny", "Sunny the Sunbeam"],
  ["Blomman Blom", "Blom the Flower"],
  ["Svampen Svamp", "Svamp the Mushroom"],
  ["Stenen Sten", "Sten the Stone"],
  ["Ballongen Popp", "Popp the Balloon"],
  ["Tärningen Tia", "Tia the Dice"],
  ["Katten Kisse", "Kisse the Cat"],
  ["Valpen Vovve", "Vovve the Pup"],
  ["Kaninen Bus", "Bus the Rabbit"],
  ["Sköldpaddan Turt", "Turt the Turtle"],
  ["Fågeln Pippi", "Pippi the Bird"],
  ["Räven Sly", "Sly the Fox"],
  ["Björnen Bruno", "Bruno the Bear"],
  ["Vargen Fenrir", "Fenrir the Wolf"],
  ["Pennan Penny", "Penny the Pencil"],
  ["Suddgummit Gummi", "Gummi the Eraser"],
  ["Ryggsäcken Bag", "Bag the Backpack"],
  ["Miniräknaren Kalkyl", "Kalkyl the Calculator"],
  ["Provpappret Prov", "Prov the Test Paper"],
  ["Läraren Larsson", "Larsson the Teacher"],
  ["Nobelpriset Nobel", "Nobel the Prize"],
  ["Rektorn Rector", "Rector the Principal"],
  ["Raketen Raffe", "Raffe the Rocket"],
  ["Stjärnan Stella", "Stella the Star"],
  ["Månen Luna", "Luna the Moon"],
  ["Kometen Kalle", "Kalle the Comet"],
  ["Teleskopet Tella", "Tella the Telescope"],
  ["Astronauten Astro", "Astro the Astronaut"],
  ["Planeten Saturnus", "Saturn the Planet"],
  ["Alien Zorg", "Zorg the Alien"],
  ["Papegojan Polly", "Polly the Parrot"],
  ["Fjärilen Ving", "Ving the Butterfly"],
  ["Apan Abbe", "Abbe the Monkey"],
  ["Ormen Slir", "Slir the Snake"],
  ["Grodan Groda", "Groda the Frog"],
  ["Leoparden Leo", "Leo the Leopard"],
  ["Elefanten Elsa", "Elsa the Elephant"],
  ["Lejonet Leon", "Leon the Lion"],
  ["Klubban Klubba", "Klubba the Lollipop"],
  ["Keksen Kex", "Kex the Cookie"],
  ["Munken Munk", "Munk the Donut"],
  ["Chokladen Choklad", "Choklad the Chocolate"],
  ["Glasskupen Glass", "Glass the Sundae"],
  ["Tårtan Tårta", "Tårta the Cake"],
  ["Cupcaken Cupcake", "Cupcake the Cupcake"],
  ["Regnbågsgodiset Rainbow", "Rainbow the Candy"],
  ["Enhörningen Uno", "Uno the Unicorn"],
  ["Drakungen Drako", "Drako the Dragon"],
  ["Fenixen Fenix", "Fenix the Phoenix"],
  ["Sjöjungfrun Marina", "Marina the Mermaid"],
  ["Trollkarlen Merlin", "Merlin the Wizard"],
  ["Kroma-Katten", "Chroma Cat"],
  ["Kroma-Draken", "Chroma Dragon"],
  ["Kroma-Kronan", "Chroma Crown"],
  ["Pumpan Grin", "Grin the Pumpkin"],
  ["Kuben Chick", "Chicken Chick"],
  ["Kuben Chicken", "Chick Chicken"],
  ["Vampyrgrodan Frogula", "Frogula the Vampire Frog"],
  ["Kakpumpan Cookie", "Cookie Pumpkin"],
  ["Kakmumien Mummy", "Cookie Mummy"],
  ["Kakspöket Boo", "Cookie Ghost"],
  ["Pumpakungen", "Pumpkin King"],
  ["Kroma", "Chroma"],
  ["Ett gratis paket varje dag — missa inte!", "One free pack every day — don't miss it!"],
  ["Katter, hundar och en och annan varg.", "Cats, dogs and the occasional wolf."],
  ["Vilda djur och en lejonkung.", "Wild animals and a lion king."],

  // ── Keen bios ───────────────────────────────────────────────────────
  ["Sover 18 timmar om dagen och vinner resten av tiden.", "Sleeps 18 hours a day and wins the rest of the time."],
  ["Tar bort misstag, ett sudd i taget.", "Removes mistakes, one rub at a time."],
  ["Utropar studiedag med ett litet leende.", "Declares a study day with a little smile."],
  ["Tar ett litet steg, sedan en hel lektion.", "Takes one small step, then a whole lesson."],
  ["Tre kulor, en kula och alltid i tid.", "Three scoops, one scoop and always on time."],
  ["Äter guldmynt och andas glitter.", "Eats gold coins and breathes glitter."],
  ["Kommer tyst, exploderar mitt i provet.", "Arrives silently, explodes in the middle of the test."],
  ["Chefens egen drake — delas bara ut av en admin.", "The boss's own dragon — only handed out by an admin."],

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
  const keys = Array.from(map.keys())
    .filter((k) => k.length >= 2)
    .sort((a, b) => b.length - a.length);
  return { re: new RegExp(keys.map(escapeRegExp).join("|"), "g"), map };
}

const MATCHERS: Record<Lang, Matcher> = {
  en: buildMatcher(SV_TO_EN),
  sv: buildMatcher(EN_TO_SV),
};

// Latin letters (including the Swedish ones) and digits. Written as an explicit
// class instead of \p{L} so this file type-checks under the project's es5 target.
const WORD = /[0-9A-Za-z\u00C0-\u024F]/;
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
  const core = trimmed.replace(/^[^0-9A-Za-z\u00C0-\u024F]+/, "").replace(/[^0-9A-Za-z\u00C0-\u024F]+$/, "");
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
const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;

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

/**
 * Has React taken ownership of this node yet?
 *
 * Next streams a route's HTML first and hydrates it a moment later. Text that
 * is rewritten in that window is text React never rendered, and the comparison
 * throws "Text content does not match server-rendered HTML" (and re-renders the
 * whole Suspense boundary on the client). React tags the nodes it owns with a
 * `__reactFiber$…` / `__reactProps$…` expando, so waiting for that marker is a
 * direct signal instead of a guessed delay. Nodes without it are left alone
 * until a later pass — by then hydration has claimed them.
 */
function isHydrated(el: Element): boolean {
  for (const key in el) {
    if (key.startsWith("__reactFiber$") || key.startsWith("__reactProps$") || key.startsWith("__reactInternalInstance$")) {
      return true;
    }
  }
  return false;
}

function patchText(node: Text, lang: Lang) {
  if (!node.parentElement || shouldSkip(node.parentElement)) return;
  if (!isHydrated(node.parentElement)) return;

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
  // Only the ancestors decide the skip here: an inline SVG's own `aria-label`
  // is the name of the picture ("Låst Keen") and is safe to translate, while
  // everything inside it stays untouched.
  if (el.hasAttribute("data-no-translate") || el.hasAttribute("data-qk-i18n")) return;
  if (shouldSkip(el.parentElement)) return;
  // Art drawn with `dangerouslySetInnerHTML` has no React marker of its own —
  // the owning component does — so an inline SVG is checked through its parent.
  const owner = el.tagName === "svg" && el.parentElement ? el.parentElement : el;
  if (!isHydrated(owner)) return;
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

  // React owns these nodes, so the pass has to wait for it.
  //
  // Next streams the server HTML for a route and React hydrates it a moment
  // later. Rewriting the text as soon as the markup lands — which is what a
  // per-frame pass did — made hydration compare text it never rendered against
  // the DOM and throw "Text content does not match server-rendered HTML".
  // Waiting past hydration keeps the console quiet: React has already claimed
  // the nodes by then, so the only thing the pass does is swap words.
  let timer = 0;
  const DELAY_MS = 180;
  const schedule = () => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = 0;
      applyTranslations(lang);
    }, DELAY_MS);
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
    if (timer) window.clearTimeout(timer);
  };
}
