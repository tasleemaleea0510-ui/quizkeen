"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const EXACT: Record<string, string> = {
  "Översikt": "Dashboard", "Klassrum": "Classroom", "Gloskort": "Flashcards", "Inställningar": "Settings",
  "Logga ut": "Log out", "Logga in": "Log in", "Registrera": "Register", "Starta": "Start", "Plugga": "Study",
  "Strid": "Battle", "Skicka": "Send", "Vänd": "Flip", "Nästa": "Next", "Föregående": "Previous", "Blanda": "Shuffle",
  "Nej": "No", "Dela": "Share", "Ja": "Yes", "Nivå": "Level", "Mynt": "Coins", "Elever": "Students", "Läxor": "Homework",
  "Varningar": "Warnings", "Kopiera": "Copy", "Analys": "Analytics", "Ny quiz": "New quiz", "Mina quizar": "My quizzes",
  "Lärarpanel": "Teacher panel", "Ägaren": "The Owner", "Säkerhet": "Security", "Admin": "Admin", "Användare": "Users",
  "Sändning": "Broadcast", "Koder": "Codes", "Logg": "Log", "Chat": "Chat", "Lärare": "Teachers", "Quizar": "Quizzes",
  "Spel": "Games", "Varna": "Warn", "Namnbyte": "Rename", "Unbanna": "Unban", "Banna": "Ban", "Spara": "Save",
  "Rensa": "Clear", "Sänd": "Send", "Stäng": "Close", "Poäng": "Score", "Fråga": "Question", "Svar": "Answer",
  "Rätt svar": "Correct answer", "Lösenord": "Password", "Email": "Email", "Användarnamn": "Username", "Roll": "Role",
  "Sök användare...": "Search users...", "Toppspelare": "Top players", "Dina quizar": "Your quizzes",
  "Dina gloskort": "Your flashcards", "Dina chatter": "Your chats", "Dina klassrum": "Your classrooms",
  "Övervakning": "Surveillance", "ÄGARKONSOL": "OWNER CONSOLE", "GULD-TRONEN": "THE GOLD THRONE",
  "Ban-begäranden": "Ban requests", "Väntande": "Pending", "Hanterade": "Handled", "Godkänn": "Approve", "Avslå": "Reject",
  "FÖR ALLTID": "FOREVER", "egna minuter": "custom minutes", "meddelande (valfritt)": "message (optional)",
  "Återställ": "Reset", "Visa email": "Show email", "RADERA ANVÄNDARE": "DELETE USER", "Skicka popup": "Send popup",
  "Rensa popup": "Clear popup", "Be om mer": "Ask for more", "Jobbar...": "Working...", "Klart!": "Done!",
  "Spara koder": "Save codes", "Ägarkod": "Owner code", "Admin-kod": "Admin code", "Säkerhetskod": "Security code",
  "Stabs-chat": "Staff chat", "Global sändning": "Global broadcast", "Be någon om chatt": "Ask someone to chat",
  "Välj en chatt till vänster!": "Pick a chat on the left!", "Skriv ett meddelande...": "Type a message...",
  "Laddar chatten...": "Loading chat...", "Laddar tronen... 👑": "Loading the throne... 👑", "Starta strid": "Start battle",
  "Lägg till ett kort": "Add a card", "Skapa gloskort": "Create flashcards", "Skapa nya gloskort": "Create new flashcards",
  "Alla gloskort": "All flashcards", "Börja spela — Gratis": "Start playing — Free", "Gå med i ett spel": "Join a game",
  "Hej,": "Hey,", "kort": "cards", "Kort": "Card", "1 tim": "1 hour", "5 min": "5 min", "1 dag": "1 day",
  "Reset XP": "Reset XP", "Reset mynt": "Reset coins", "Reset ALLT": "Reset EVERYTHING", "Sätt nivå": "Set level",
  "Öppna sajten": "Open the site", "STÄNG sajten": "SHUT DOWN the site", "1 kort": "1 card", "Hoppa in!": "Jump in!",
  "Starta spelet": "Start the game", "Lämna spelet": "Leave the game", "Spela igen": "Play again", "Påbörja": "Start",
  "Klar!": "Done!", "Förfallen": "Overdue", "Topplista": "Leaderboard", "Ditt konto": "Your account",
  "Byt lösenord": "Change password", "Nytt lösenord": "New password", "Bekräfta lösenord": "Confirm password",
  "Spara ändringar": "Save changes", "Skapa konto": "Create account", "Välkommen tillbaka!": "Welcome back!",
  "Har inget konto?": "No account?", "Redan medlem?": "Already a member?", "Glömt lösenordet?": "Forgot the password?",
  "Lär. Spela.": "Learn. Play.", "Tävla.": "Compete.", "(privat)": "(private)", "privat": "private",
  "Spelare": "Players", "Lobby": "Lobby", "Resultat": "Results", "Vinnare": "Winner", "Nästa fråga": "Next question",
  "Avsluta spel": "End game", "Tid kvar": "Time left", "Sekunder": "Seconds", "Lägg till fråga": "Add question",
  "Frågetext": "Question text", "Sant": "True", "Falskt": "False", "Sant/Falskt": "True/False", "Flerval": "Multiple choice",
  "Svarsalternativ": "Answer options", "Tidsgräns": "Time limit", "Ta bort": "Delete", "Redigera": "Edit",
  "Spara fråga": "Save question", "Klar": "Done", "Kopiera PIN": "Copy PIN", "Dela PIN": "Share PIN",
  "PIN-kod": "PIN code", "Ditt namn": "Your name", "Gå med": "Join", "Fel PIN-kod": "Wrong PIN code", "Du är med!": "You're in!",
  "Spring!": "Run!", "Hoppa!": "Jump!", "Dina läxor": "Your homework", "Pågående": "Ongoing", "Klara": "Done",
  "Gör läxan": "Do the homework", "Skicka in": "Submit", "Ditt resultat": "Your result", "Skapa klassrum": "Create classroom",
  "Klassrummets namn": "Classroom name", "Beskrivning": "Description", "Skapa": "Create", "Medlemmar": "Members",
  "Medlärare": "Co-teacher", "Lägg till medlärare": "Add co-teacher", "Ta bort elev": "Remove student",
  "Konto": "Account", "Språk": "Language", "Byt namn": "Change name", "Nytt användarnamn": "New username",
  "Inkorg": "Inbox", "Olösta": "Unresolved", "Lösta": "Resolved", "Bannad": "Banned", "BANNAD": "BANNED",
  "Ange koden": "Enter the code", "Lås upp": "Unlock", "Fel kod": "Wrong code", "ÄGARE": "OWNER", "SÄKERHET": "SECURITY",
  "Acceptera": "Accept", "Avvisa": "Decline", "Underhåll": "Maintenance", "Välj ett nytt namn": "Pick a new name",
  "Minst 3 tecken": "At least 3 characters", "Kortlekar": "Card decks", "Kortleksstrider": "Deck battles",
  "Svara snabbt!": "Answer fast!", "Gloskortlekar": "Flashcard decks", "Totala mynt": "Total coins",
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
  ["Minispel i lobbyn", "Mini-game in the lobby"], ["XP, mynt & nivåer", "XP, coins & levels"],
  ["Klass-chattar · privat med lärare & vänner · personalen.", "Class chats · private with teachers & friends · the staff."],
  ["Inga meddelanden ännu — säj hej!", "No messages yet — say hi!"], ["användarnamn...", "username..."],
  ["klass-chatten", "the class chat"], ["Så spelar du", "How to play"],
  ["Rundturen på 60 sekunder — allt du behöver för att dominera!", "The 60-second tour — everything you need to dominate!"],
  ["Personalen vill se din skärm LIVE", "The staff wants to see your screen LIVE"],
  ["Du väljer själv vad som delas och kan avsluta när som helst.", "You choose what is shared and can stop anytime."],
  ["Dags att byta namn!", "Time to change your name!"], ["Spara nytt namn", "Save new name"],
  ["klicka på kortet för att vända!", "click the card to flip!"], ["Klicka på kortet för att vända!", "Click the card to flip!"],
  ["Byggt av", "Built by"], ["ÄGARE — tronens väktare", "OWNER — keeper of the throne"], ["Join-kod", "Join code"],
  ["måste byta namn för att fortsätta!", "must change name to continue!"],
  ["Be om namnbyte (LÅSER sajten)", "Request rename (LOCKS the site)"], ["Be om LIVE-skärm", "Request LIVE screen"],
  ["Övervaka, varna, kyla ner (5 min / 1 tim) och begär namnbyte. Allt loggas.", "Monitor, warn, cool down (5 min / 1 hour) and request rename. Everything is logged."],
  ["Belöna (max 500, 3/dag)", "Reward (max 500, 3/day)"], ["Banna (5min/1tim/1dag)", "Ban (5min/1hour/1day)"],
  ["längre än så? Be ägaren om lov!", "longer than that? Ask the owner!"], ["Allt loggas.", "Everything is logged."],
  ["Skriv ett meddelande till HELA sajten...", "Type a message to the WHOLE site..."],
  ["ALLA användare ser detta som en gul banderoll. Ägaren ser i loggen när du sänder.", "ALL users see this as a gold banner. The owner sees in the log when you broadcast."],
  ["Nödläge — stäng hela sajten", "Emergency — shut down the whole site"],
  ["Ditt klassrum. Dina krafter. Elever ser ALDRIG det här.", "Your classroom. Your powers. Students NEVER see this."],
  ["Väntar på spelare", "Waiting for players"], ["Spelet är slut!", "The game is over!"], ["Du fick", "You got"],
  ["Gå med i ett klassrum", "Join a classroom"], ["Skriv join-koden", "Type the join code"],
  ["Pågående läxor", "Ongoing homework"], ["Klara läxor", "Finished homework"], ["Inga läxor ännu", "No homework yet"],
  ["Bonus-XP", "Bonus XP"], ["Elever → dig", "Students → you"], ["Hela chatten", "The whole chat"],
  ["Kortens namn (t.ex. Bio kap. 4)", "Deck name (e.g. Bio ch. 4)"], ["Beskrivning (valfritt)", "Description (optional)"],
  ["Fråga (framsida)", "Question (front)"], ["Dina gloskort (", "Your flashcards ("],
  ["Du har blivit bannad", "You have been banned"], [" i ", " for "], [" minuter", " minutes"],
  ["kontakta ägaren", "contact the owner"], ["Sajten är stängd just nu", "The site is closed right now"],
  ["Vi är snart tillbaka!", "We'll be back soon!"], ["vill chatta med dig", "wants to chat with you"],
  ["Lärare → dig", "Teachers → you"], ["Privat chatt", "Private chat"], ["Välj en quiz att starta", "Pick a quiz to start"],
  ["väntar på att alla ska bli redo", "waiting for everyone to get ready"], ["Spelets PIN-kod", "The game's PIN code"],
  ["Starta en live-frågesport", "Start a live quiz sport"], ["Gå med med en PIN-kod", "Join with a PIN code"],
  ["Spring medan du väntar", "Run while you wait"], ["Förfaller", "Due"], ["avklarad", "completed"],
  ["Delad med", "Shared with"], ["Godkänn känslig begäran", "Approve sensitive request"],
  ["Väntande begäranden", "Pending requests"], ["Total XP", "Total XP"],
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