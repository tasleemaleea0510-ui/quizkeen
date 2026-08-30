"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const EXACT: Record<string, string> = {
  "Översikt": "Dashboard", "Klassrum": "Classroom", "Gloskort": "Flashcards", "Inställningar": "Settings",
  "Logga ut": "Log out", "Börja spela — Gratis": "Start playing — Free", "Gå med i ett spel": "Join a game",
  "Starta": "Start", "Plugga": "Study", "Strid": "Battle", "Skicka": "Send", "Vänd": "Flip", "Nästa": "Next",
  "Föregående": "Previous", "Blanda": "Shuffle", "Nej": "No", "Dela": "Share", "Nivå": "Level", "Mynt": "Coins",
  "Toppspelare": "Top players", "Dina quizar": "Your quizzes", "Dina gloskort": "Your flashcards",
  "Dina chatter": "Your chats", "Dina klassrum": "Your classrooms", "Elever": "Students", "Läxor": "Homework",
  "Varningar": "Warnings", "Kopiera": "Copy", "Analys": "Analytics", "Ny quiz": "New quiz", "Mina quizar": "My quizzes",
  "Lärarpanel": "Teacher panel", "Ägaren": "The Owner", "Säkerhet": "Security", "Admin": "Admin",
  "Alla gloskort": "All flashcards", "Skapa gloskort": "Create flashcards", "Skapa nya gloskort": "Create new flashcards",
  "Lägg till ett kort": "Add a card", "Starta strid": "Start battle", "Rätt svar": "Correct answer",
  "Kortens namn (t.ex. Bio kap. 4)": "Deck name (e.g. Bio ch. 4)", "Beskrivning (valfritt)": "Description (optional)",
  "Fråga (framsida)": "Question (front)", "Hej,": "Hey,", "kort": "cards", "Kort": "Card",
  "Lär. Spela.": "Learn. Play.", "Tävla.": "Compete.", "(privat)": "(private)", "privat": "private",
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
  ["Be någon om chatt", "Ask someone to chat"], ["Välj en chatt till vänster!", "Pick a chat on the left!"],
  ["Inga meddelanden ännu — säj hej!", "No messages yet — say hi!"], ["Skriv ett meddelande...", "Type a message..."],
  ["användarnamn...", "username..."], ["klass-chatten", "the class chat"], ["Laddar chatten...", "Loading chat..."],
  ["Så spelar du", "How to play"], ["Rundturen på 60 sekunder — allt du behöver för att dominera!", "The 60-second tour — everything you need to dominate!"],
  ["Personalen vill se din skärm LIVE", "The staff wants to see your screen LIVE"],
  ["Du väljer själv vad som delas och kan avsluta när som helst.", "You choose what is shared and can stop anytime."],
  ["Dags att byta namn!", "Time to change your name!"], ["Spara nytt namn", "Save new name"],
  ["Sök användare...", "Search users..."], ["klicka på kortet för att vända!", "click the card to flip!"],
  ["Byggt av", "Built by"], ["ÄGARE — tronens väktare", "OWNER — keeper of the throne"], ["Join-kod", "Join code"],
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
        .qk-tb{position:fixed;left:12px;top:12px;z-index:999;width:56px;height:56px;border-radius:9999px;overflow:hidden;animation:qk-tb-pulse 1.6s ease-out infinite;}
        .qk-tb::before{content:"";position:absolute;inset:-60%;background:conic-gradient(#6366f1,#ec4899,#f59e0b,#22c55e,#6366f1);animation:qk-tb-spin 2.5s linear infinite;}
        .qk-tb:hover::before{animation-duration:.5s;}
        .qk-tb>span{position:relative;display:grid;place-items:center;width:48px;height:48px;border-radius:9999px;background:#0b1120;font-size:15px;font-weight:800;color:#fff;animation:qk-tb-wiggle 2s ease-in-out infinite;}
        .qk-tb:hover>span{animation:qk-tb-wiggle .3s ease-in-out infinite;}
        @keyframes qk-tb-spin{to{transform:rotate(360deg)}}
        @keyframes qk-tb-pulse{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.8)}50%{box-shadow:0 0 0 16px rgba(99,102,241,0)}}
        @keyframes qk-tb-wiggle{0%,100%{transform:rotate(-10deg) scale(1)}50%{transform:rotate(10deg) scale(1.12)}}
      `}</style>
      <span>{lang === "sv" ? "EN" : "SV"}</span>
    </button>
  );
}
