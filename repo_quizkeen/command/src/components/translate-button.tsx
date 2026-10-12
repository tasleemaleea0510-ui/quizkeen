"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const EXACT: Record<string, string> = {
  "Översikt": "Dashboard", "Klassrum": "Classroom", "Gloskort": "Flashcards", "Inställningar": "Settings",
  "Logga ut": "Log out", "Logga in": "Log in", "Registrera": "Register", "Hem": "Home", "Meny": "Menu",
  "Sök": "Search", "Stäng": "Close", "Avbryt": "Cancel", "Bekräfta": "Confirm", "Spara": "Save",
  "Rensa": "Clear", "Ta bort": "Delete", "Redigera": "Edit", "Lägg till": "Add", "Tillbaka": "Back",
  "Nästa": "Next", "Föregående": "Previous", "Klar": "Done", "Klart!": "Done!", "Ja": "Yes", "Nej": "No",
  "Laddar...": "Loading...", "Laddar": "Loading", "Uppdatera": "Update", "Uppdaterad!": "Updated!",
  "Användarnamn": "Username", "Lösenord": "Password", "Email": "Email", "E-post": "Email",
  "Fel lösenord": "Wrong password", "Fel kod": "Wrong code", "Finns redan": "Already exists",
  "Minst 3 tecken": "At least 3 characters", "Minst 6 tecken": "At least 6 characters",
  "Välkommen!": "Welcome!", "Välkommen tillbaka!": "Welcome back!", "Skapa konto": "Create account",
  "Har inget konto?": "No account?", "Redan medlem?": "Already a member?", "Glömt lösenordet?": "Forgot the password?",
  "Ogiltigt användarnamn": "Invalid username", "Ogiltig email": "Invalid email",
  "Börja spela — Gratis": "Start playing — Free", "Gå med i ett spel": "Join a game",
  "Live Multiplayer": "Live Multiplayer", "Minispel i lobbyn": "Mini-game in the lobby",
  "XP, mynt & nivåer": "XP, coins & levels", "Lär. Spela.": "Learn. Play.", "Tävla.": "Compete.",
  "Hej,": "Hey,", "Nivå": "Level", "Mynt": "Coins", "Toppspelare": "Top players",
  "Dina quizar": "Your quizzes", "Dina gloskort": "Your flashcards", "Dina chatter": "Your chats",
  "Dina klassrum": "Your classrooms", "Dina läxor": "Your homework", "Starta": "Start", "Plugga": "Study",
  "Strid": "Battle", "kort": "cards", "Kort": "Card", "Inga quizar ännu": "No quizzes yet",
  "Skapa din första quiz!": "Create your first quiz!", "Ny quiz": "New quiz", "Mina quizar": "My quizzes",
  "Lärarpanel": "Teacher panel", "Analys": "Analytics", "Elever": "Students", "Läxor": "Homework",
  "Varningar": "Warnings", "Kopiera": "Copy", "Join-kod": "Join code", "Lärare": "Teachers",
  "Skapa klassrum": "Create classroom", "Klassrummets namn": "Classroom name", "Beskrivning": "Description",
  "Skapa": "Create", "Gå med": "Join", "Hoppa in!": "Jump in!", "Medlemmar": "Members",
  "Medlärare": "Co-teacher", "Lägg till medlärare": "Add co-teacher", "Ta bort elev": "Remove student",
  "Pågående": "Ongoing", "Klara": "Done", "Förfallen": "Overdue", "Förfaller": "Due", "Påbörja": "Start",
  "Fortsätt": "Continue", "Skicka in": "Submit", "Ditt resultat": "Your result", "Gör läxan": "Do the homework",
  "Klass-bibliotek": "Class library", "Bonus-XP": "Bonus XP", "avklarad": "completed", "Delad med": "Shared with",
  "Skapa läxa": "Create homework", "Välj quiz": "Pick a quiz", "Förfallodatum": "Due date", "Tilldela elev": "Assign student",
  "Prov-läge": "Test mode", "Skicka läxa": "Send homework", "Radera läxa": "Delete homework",
  "Inga läxor ännu": "No homework yet", "Pågående läxor": "Ongoing homework", "Klara läxor": "Finished homework",
  "Rätt per fråga": "Correct per question", "Genomsnitt": "Average", "Bästa spelare": "Best player",
  "Spelade gånger": "Times played", "Ingen data ännu": "No data yet",
  "Skapa nya gloskort": "Create new flashcards", "Skapa gloskort": "Create flashcards",
  "Kortens namn (t.ex. Bio kap. 4)": "Deck name (e.g. Bio ch. 4)", "Beskrivning (valfritt)": "Description (optional)",
  "Alla gloskort": "All flashcards", "Lägg till ett kort": "Add a card", "Fråga (framsida)": "Question (front)",
  "Rätt svar": "Correct answer", "Fel svar": "Wrong answer", "Lägg till kort": "Add card", "Ta bort kort": "Delete card",
  "Vänd": "Flip", "Blanda": "Shuffle", "Starta strid": "Start battle", "1 kort": "1 card", "Glos": "Flash",
  "Kortlekar": "Card decks", "Kortleksstrider": "Deck battles", "fejk-svar": "fake answers",
  "Välj en sida!": "Pick a side!", "VÄNSTER": "LEFT", "HÖGER": "RIGHT", "Rösta!": "Vote!",
  "Omgång": "Round", "Vinnare": "Winner", "Förlorare": "Loser", "Oavgjort": "Draw", "Nästa rond": "Next round",
  "Välj en quiz att starta": "Pick a quiz to start", "Starta spel": "Start game", "Starta spelet": "Start the game",
  "Ny fråga": "New question", "Lägg till fråga": "Add question", "Frågetext": "Question text",
  "Flerval": "Multiple choice", "Sant/Falskt": "True/False", "Sant": "True", "Falskt": "False",
  "Svarsalternativ": "Answer options", "Poäng": "Score", "Tidsgräns": "Time limit", "Spara fråga": "Save question",
  "Lobby": "Lobby", "Spelare": "Players", "Väntar på spelare": "Waiting for players", "Kopiera PIN": "Copy PIN",
  "Dela PIN": "Share PIN", "Spelets PIN-kod": "The game's PIN code", "Fråga": "Question", "Svar": "Answer",
  "Tid kvar": "Time left", "Sekunder": "Seconds", "rätt!": "correct!", "fel!": "wrong!", "Nästa fråga": "Next question",
  "Avsluta spel": "End game", "Resultat": "Results", "Pallplats": "Podium", "Spela igen": "Play again",
  "Till lobbyn": "To the lobby", "Lämna spelet": "Leave the game", "Spring & hoppa!": "Run & jump!",
  "Hoppa!": "Jump!", "Spring!": "Run!", "Poängtavla": "Leaderboard", "Topplista": "Leaderboard",
  "PIN-kod": "PIN code", "Ditt namn": "Your name", "Fel PIN-kod": "Wrong PIN code", "Du är med!": "You're in!",
  "Dela": "Share",
  "Profil": "Profile", "Statistik": "Stats", "Roll": "Role", "Konto": "Account", "Språk": "Language",
  "Byt användarnamn": "Change username", "Byt namn": "Change name", "Nytt användarnamn": "New username",
  "Byt lösenord": "Change password", "Nytt lösenord": "New password", "Bekräfta lösenord": "Confirm password",
  "Spara ändringar": "Save changes", "Ditt konto": "Your account", "Elev": "Student",
  "Chat": "Chat", "Skicka": "Send", "Skriv ett meddelande...": "Type a message...", "användarnamn...": "username...",
  "Laddar chatten...": "Loading chat...", "Välj en chatt till vänster!": "Pick a chat on the left!",
  "Be någon om chatt": "Ask someone to chat", "Hela chatten": "The whole chat", "Ägaren": "The Owner",
  "Admins": "Admins", "Säkerhet": "Security", "Admin": "Admin", "Elever → dig": "Students → you",
  "Lärare → dig": "Teachers → you", "Privat chatt": "Private chat", "(privat)": "(private)", "privat": "private",
  "klass-chatten": "the class chat", "Acceptera": "Accept", "Avvisa": "Decline", "Ni kan nu chatta!": "You can now chat!",
  "Du har blivit bannad": "You have been banned", "FÖR ALLTID": "FOREVER", "Underhåll": "Maintenance",
  "Dags att byta namn!": "Time to change your name!", "Välj ett nytt namn": "Pick a new name", "Spara nytt namn": "Save new name",
  "Ange koden": "Enter the code", "Lås upp": "Unlock", "ÄGARE": "OWNER", "SÄKERHET": "SECURITY",
  "ÄGARKONSOL": "OWNER CONSOLE", "GULD-TRONEN": "THE GOLD THRONE", "Användare": "Users", "Sändning": "Broadcast",
  "Koder": "Codes", "Logg": "Log", "Ban-begäranden": "Ban requests", "Quizar": "Quizzes", "Spel": "Games",
  "Gloskortlekar": "Flashcard decks", "Total XP": "Total XP", "Totala mynt": "Total coins",
  "Väntande begäranden": "Pending requests", "Väntande": "Pending", "Hanterade": "Handled", "Godkänn": "Approve",
  "Avslå": "Reject", "1 tim": "1 hour", "1 dag": "1 day", "2 dagar": "2 days", "1 vecka": "1 week",
  "Egen tid": "Custom time", "egna minuter": "custom minutes", "meddelande (valfritt)": "message (optional)",
  "Återställ": "Reset", "Visa email": "Show email", "RADERA ANVÄNDARE": "DELETE USER", "Skicka popup": "Send popup",
  "Rensa popup": "Clear popup", "Be om mer": "Ask for more", "Jobbar...": "Working...", "Spara koder": "Save codes",
  "Ägarkod": "Owner code", "Admin-kod": "Admin code", "Säkerhetskod": "Security code", "Stabs-chat": "Staff chat",
  "Sök användare...": "Search users...", "Reset XP": "Reset XP", "Reset mynt": "Reset coins",
  "Reset ALLT": "Reset EVERYTHING", "Sätt nivå": "Set level", "Öppna sajten": "Open the site",
  "STÄNG sajten": "SHUT DOWN the site", "Sänd": "Send", "Bannad": "Banned", "BANNAD": "BANNED", "Unbanna": "Unban",
  "Global sändning": "Global broadcast", "bannade": "banned",
  "Övervakning": "Surveillance", "Varna": "Warn", "Namnbyte": "Rename", "Banna": "Ban", "5 min": "5 min",
  "minuter": "minutes", "timmar": "hours", "dagar": "days", "idag": "today", "imorgon": "tomorrow",
  "igår": "yesterday", "nu": "now", "snart": "soon",
};

const PHRASES: [string, string][] = [
  ["Lär. Spela. Tävla.", "Learn. Play. Compete."],
  ["QuizKeen förvandlar ditt klassrum till en live gameshow.", "QuizKeen turns your classroom into a live gameshow."],
  ["Starta frågesporter med en PIN-kod, spela minispel i lobbyn, samla XP och mynt, och klättra på topplistan.", "Start quiz sports with a PIN code, play mini-games in the lobby, collect XP and coins, and climb the leaderboard."],
  ["Vem som helst kan starta live-frågesporter", "Anyone can start live quiz sports"],
  ["kortleksstrider med en 6-siffrig PIN-kod.", "deck battles with a 6-digit PIN code."],
  ["Hela klassen går med och tävlar i realtid.", "The whole class joins and competes in real time."],
  ["Inga tråkiga vänteskärmar — spring & hoppa med dina vänner i lobbyns minispel medan arrangören gör sig redo.", "No boring waiting screens — run & jump with your friends in the lobby mini-game while the host gets ready."],
  ["Varje rätt svar ger XP & mynt. Gå upp i nivå, klättra på topplistan och bemästra allt med den inbyggda guiden!", "Every correct answer gives XP & coins. Level up, climb the leaderboard and master everything with the built-in guide!"],
  ["Så spelar du", "How to play"],
  ["Rundturen på 60 sekunder — allt du behöver för att dominera!", "The 60-second tour — everything you need to dominate!"],
  ['Tryck på "Börja spela", välj en quiz och få en 6-siffrig PIN-kod. Dela med hela klassen!', 'Press "Start playing", pick a quiz and get a 6-digit PIN code. Share with the whole class!'],
  ['Spelare trycker på "Gå med i ett spel", skriver PIN-koden + valfritt namn och hoppar in i lobbyn.', 'Players press "Join a game", type the PIN code + any name and jump into the lobby.'],
  ["Ingen tråkig väntan! Lobbyn har ett minispel — spring & hoppa med dina vänner tills arrangören startar.", "No boring waiting! The lobby has a mini-game — run & jump with your friends until the host starts."],
  ["Välj bland de färgade knapparna. Rätt + snabbt = mer poäng (upp till 150 per fråga!).", "Pick among the colored buttons. Correct + fast = more points (up to 150 per question!)."],
  ["Bygg kortlekar och vänd kort själv för att plugga. Ska du starta en strid? Lägg till fejk-svar också!", "Build decks and flip cards yourself to study. Starting a battle? Add fake answers too!"],
  ["Starta en strid med en PIN-kod — spelarna ser frågan, kämpar om att välja rätt sida, och kortet VÄNDS och avslöjar svaret!", "Start a battle with a PIN code — players see the question, fight to pick the right side, and the card FLIPS and reveals the answer!"],
  ["Starta en live-frågesport", "Start a live quiz sport"],
  ["Gå med med en PIN-kod", "Join with a PIN code"],
  ["Spring medan du väntar", "Run while you wait"],
  ["Svara snabbt!", "Answer fast!"],
  ["Bygg dina egna gloskort. Vänd. Lär. Dominera.", "Build your own flashcards. Flip. Learn. Dominate."],
  ["klicka på kortet för att vända!", "click the card to flip!"],
  ["Klicka på kortet för att vända!", "Click the card to flip!"],
  ["Dina gloskort (", "Your flashcards ("],
  ["1 cards", "1 card"],
  ["Gå med i ett klassrum", "Join a classroom"],
  ["Gå med i klassrum", "Join a classroom"],
  ["Skriv join-koden", "Type the join code"],
  ["Läraren har inte delat något ännu.", "The teacher hasn't shared anything yet."],
  ["Klar ·", "Done ·"],
  [" tecken", " characters"],
  ["(6 tecken)", "(6 characters)"],
  ["(6+ tecken)", "(6+ characters)"],
  ["Användarnamn:", "Username:"],
  ["Gick med:", "Joined:"],
  ["Roll:", "Role:"],
  ["Klass-chattar · privat med lärare & vänner · personalen.", "Class chats · private with teachers & friends · the staff."],
  ["Inga meddelanden ännu — säj hej!", "No messages yet — say hi!"],
  ["vill chatta med dig", "wants to chat with you"],
  ["Chattförfrågan skickad!", "Chat request sent!"],
  ["Personalen vill se din skärm LIVE", "The staff wants to see your screen LIVE"],
  ["Du väljer själv vad som delas och kan avsluta när som helst.", "You choose what is shared and can stop anytime."],
  ["Be om LIVE-skärm", "Request LIVE screen"],
  ["Be om namnbyte (LÅSER sajten)", "Request rename (LOCKS the site)"],
  ["måste byta namn för att fortsätta!", "must change name to continue!"],
  ["kontakta ägaren", "contact the owner"],
  ["Sajten är stängd just nu", "The site is closed right now"],
  ["Vi är snart tillbaka!", "We'll be back soon!"],
  ["Du har blivit bannad av ägaren", "You have been banned by the owner"],
  ["Du har blivit bannad av en ADMIN", "You have been banned by an ADMIN"],
  ["Du har blivit bannad av SÄKERHET", "You have been banned by SECURITY"],
  ["Laddar tronen... 👑", "Loading the throne... 👑"],
  ["Allt ditt rike, i ett ögonkast. Endast för betrodda. Alla öppningar loggas. 👁️", "Your whole kingdom, at a glance. Trusted only. Every open is logged. 👁️"],
  ["En admin vill banna längre än 1 dag? Här godkänner eller avslår du — och väljer EXAKT hur länge. 👑", "An admin wants to ban longer than 1 day? Here you approve or reject — and pick EXACTLY how long. 👑"],
  ["Inga väntande begäranden. Alla admins sköter sig! 😎", "No pending requests. All admins behave! 😎"],
  ["💰 XP & mynt & 🎚️ nivå", "💰 XP & coins & 🎚️ level"],
  ["✏️ Byt namn & 🎭 roll", "✏️ Rename & 🎭 role"],
  ["🔑 Lösenord & 📧 email", "🔑 Password & 📧 email"],
  [" Personligt meddelande (popup för BARA denna användare)", "📨 Personal message (popup for ONLY this user)"],
  ["Skriv något bara denna personen ser...", "Write something only this person sees..."],
  ["📢 Meddela med popup", "📢 Notify with popup"],
  ["eget lösenord (valfritt, 6+ tecken)", "custom password (optional, 6+ chars)"],
  ["🎥 LIVE-skärmdelning", "🎥 LIVE screen share"],
  ["🎥 Be om LIVE-skärm", "🎥 Request LIVE screen"],
  ["📢 Sändning & 🛠️ Nödläge", "📢 Broadcast & 🛠️ Emergency"],
  ["Skriv ett meddelande som ALLA användare ser...", "Type a message ALL users see..."],
  ["🛠️ Nödläge — stäng hela sajten", "🛠️ Emergency — shut down the whole site"],
  ["Belöna (max 500, 3/dag)", "Reward (max 500, 3/day)"],
  ["Banna (5min/1tim/1dag)", "Ban (5min/1hour/1day)"],
  ["längre än så? Be ägaren om lov!", "longer than that? Ask the owner!"],
  ["Allt loggas.", "Everything is logged."],
  ["Skriv ett meddelande till HELA sajten...", "Type a message to the WHOLE site..."],
  ["ALLA användare ser detta som en gul banderoll. Ägaren ser i loggen när du sänder.", "ALL users see this as a gold banner. The owner sees in the log when you broadcast."],
  ["📢 Sändning ute till HELA sajten!", "📢 Broadcast sent to the WHOLE site!"],
  ["Övervaka, varna, kyla ner (5 min / 1 tim) och begär namnbyte. Allt loggas. 👁️", "Monitor, warn, cool down (5 min / 1 hour) and request rename. Everything is logged. 👁️"],
  ["Väntar på att alla ska bli redo", "Waiting for everyone to get ready"],
  ["väntar på att arrangören startar", "waiting for the host to start"],
  ["Fråga ", "Question "],
  [" av ", " of "],
  ["Du fick", "You got"],
  ["Spelet är slut!", "The game is over!"],
  ["Väntar på spelare...", "Waiting for players..."],
  ["Spring & hoppa med dina vänner!", "Run & jump with your friends!"],
  ["Byggt av", "Built by"],
  ["ÄGARE — tronens väktare", "OWNER — keeper of the throne"],
];

export default function TranslateButton() {
  const [lang, setLang] = useState<"sv" | "en">("sv");
  const path = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("qk_lang") as "sv" | "en" | null;
    if (saved) setLang(saved);
  }, []);

  useEffect(() => {
    if (lang !== "en") return;
    let on = true;
    function fix(t: string): string {
      const trimmed = t.trim();
      if (EXACT[trimmed]) return t.replace(trimmed, EXACT[trimmed]);
      const core = trimmed.replace(/^[^A-Za-zÅÄÖåäö]+/, "").replace(/[^A-Za-zÅÄÖåäö]+$/, "");
      if (core && core !== trimmed && EXACT[core]) return t.split(core).join(EXACT[core]);
      let out = t;
      PHRASES.forEach(([sv, en]) => { if (out.includes(sv)) out = out.split(sv).join(en); });
      return out;
    }
    function translate() {
      if (!on) return;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      nodes.forEach((n) => {
        const t = n.textContent || "";
        const nt = fix(t);
        if (nt !== t) n.textContent = nt;
      });
      document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((el) => {
        const p = el.getAttribute("placeholder") || "";
        const np = fix(p);
        if (np !== p) el.setAttribute("placeholder", np);
      });
    }
    translate();
    const iv = setInterval(translate, 3000);
    return () => { on = false; clearInterval(iv); };
  }, [lang, path]);

  function toggle() {
    const next = lang === "sv" ? "en" : "sv";
    localStorage.setItem("qk_lang", next);
    if (next === "sv") { window.location.reload(); return; }
    setLang("en");
  }

  return (
    <button onClick={toggle} aria-label="Translate Swedish/English" className="qk-tb">
      <style>{`
        .qk-tb{position:fixed;left:12px;top:12px;z-index:999;width:58px;height:58px;border-radius:9999px;overflow:hidden;animation:qk-tb-pulse 1.6s ease-out infinite;}
        .qk-tb::before{content:"";position:absolute;inset:-100%;background:conic-gradient(#ff0044,#ff8800,#ffee00,#22cc44,#00ccff,#8844ff,#ff0044);animation:qk-tb-spin 2.2s linear infinite;}
        .qk-tb:hover::before{animation-duration:.5s;}
        .qk-tb>span{position:relative;display:grid;place-items:center;width:50px;height:50px;border-radius:9999px;background:#0b1120;font-size:15px;font-weight:800;color:#fff;animation:qk-tb-wiggle 2s ease-in-out infinite;}
        .qk-tb:hover>span{animation:qk-tb-wiggle .3s ease-in-out infinite;}
        @keyframes qk-tb-spin{to{transform:rotate(360deg)}}
        @keyframes qk-tb-pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,0,68,.8)}50%{box-shadow:0 0 0 16px rgba(255,0,68,0)}}
        @keyframes qk-tb-wiggle{0%,100%{transform:rotate(-10deg) scale(1)}50%{transform:rotate(10deg) scale(1.12)}}
      `}</style>
      <span>{lang === "sv" ? "EN" : "SV"}</span>
    </button>
  );
}