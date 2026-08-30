"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const DICT: [string, string][] = [
  ["Översikt", "Overview"], ["Klassrum", "Classroom"], ["Gloskort", "Flashcards"], ["Inställningar", "Settings"],
  ["Logga ut", "Log out"], ["Börja spela — Gratis", "Start playing — Free"], ["Gå med i ett spel", "Join a game"],
  ["Lär. Spela. Tävla.", "Learn. Play. Compete."], ["Minispel i lobbyn", "Mini-game in the lobby"],
  ["XP, mynt & nivåer", "XP, coins & levels"], ["Hej,", "Hey,"], ["Nivå", "Level"], ["Mynt", "Coins"],
  ["Dina quizar", "Your quizzes"], ["Toppspelare", "Top players"], ["Dina gloskort", "Your flashcards"],
  ["Starta", "Start"], ["Plugga", "Study"], ["Strid", "Battle"], ["Skicka", "Send"],
  ["Skriv ett meddelande...", "Type a message..."], ["Dina chatter", "Your chats"],
  ["Be någon om chatt", "Ask someone to chat"], ["Välj en chatt till vänster!", "Pick a chat on the left!"],
  ["Inga meddelanden ännu — säj hej!", "No messages yet — say hi!"], ["användarnamn...", "username..."],
  ["klass-chatten", "the class chat"], ["privat", "private"], ["Ägaren", "The Owner"], ["Säkerhet", "Security"],
  ["Laddar chatten...", "Loading chat..."], ["Klass-chattar · privat med lärare & vänner · personalen.", "Class chats · private with teachers & friends · the staff."],
  ["Ny quiz", "New quiz"], ["Mina quizar", "My quizzes"], ["Lärarpanel", "Teacher panel"], ["Elever", "Students"],
  ["Läxor", "Homework"], ["Varningar", "Warnings"], ["Dina klassrum", "Your classrooms"], ["Join-kod", "Join code"],
  ["Kopiera", "Copy"], ["Analys", "Analytics"], ["Alla gloskort", "All flashcards"],
  ["Skapa nya gloskort", "Create new flashcards"], ["Kortens namn (t.ex. Bio kap. 4)", "Deck name (e.g. Bio ch. 4)"],
  ["Beskrivning (valfritt)", "Description (optional)"], ["Skapa gloskort", "Create flashcards"],
  ["Fråga (framsida)", "Question (front)"], ["Rätt svar", "Correct answer"], ["Lägg till ett kort", "Add a card"],
  ["Föregående", "Previous"], ["Vänd", "Flip"], ["Nästa", "Next"], ["Blanda", "Shuffle"],
  ["Starta strid", "Start battle"], ["klicka på kortet för att vända!", "click the card to flip!"], ["Kort", "Card"],
  ["Så spelar du", "How to play"], ["Rundturen på 60 sekunder — allt du behöver för att dominera!", "The 60-second tour — everything you need to dominate!"],
  ["Personalen vill se din skärm LIVE", "The staff wants to see your screen LIVE"],
  ["Du väljer själv vad som delas och kan avsluta när som helst.", "You choose what is shared and can stop anytime."],
  ["Nej", "No"], ["Dela", "Share"], ["Dags att byta namn!", "Time to change your name!"], ["Spara nytt namn", "Save new name"],
  ["Sök användare...", "Search users..."], ["kort", "cards"], ["QuizKeen förvandlar ditt klassrum till en live gameshow. Starta frågesporter med en PIN-kod, spela minispel i lobbyn, samla XP och mynt, och klättra på topplistan.", "QuizKeen turns your classroom into a live gameshow. Start quiz sports with a PIN code, play mini-games in the lobby, collect XP and coins, and climb the leaderboard."],
  ["Vem som helst kan starta live-frågesporter & ⚔️ kortleksstrider med en 6-siffrig PIN-kod. Hela klassen går med och tävlar i realtid.", "Anyone can start live quiz sports & ⚔️ deck battles with a 6-digit PIN code. The whole class joins and competes in real time."],
  ["Inga tråkiga vänteskärmar — spring & hoppa med dina vänner i lobbyns minispel medan arrangören gör sig redo.", "No boring waiting screens — run & jump with your friends in the lobby mini-game while the host gets ready."],
  ["Varje rätt svar ger XP & mynt. Gå upp i nivå, klättra på topplistan och bemästra allt med den inbyggda guiden!", "Every correct answer gives XP & coins. Level up, climb the leaderboard and master everything with the built-in guide!"],
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
    function translate() {
      if (!on) return;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      nodes.forEach((n) => {
        let t = n.textContent || "";
        DICT.forEach(([sv, en]) => { if (t.includes(sv)) t = t.split(sv).join(en); });
        if (t !== n.textContent) n.textContent = t;
      });
      document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((el) => {
        let p = el.getAttribute("placeholder") || "";
        const old = p;
        DICT.forEach(([sv, en]) => { if (p.includes(sv)) p = p.split(sv).join(en); });
        if (p !== old) el.setAttribute("placeholder", p);
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
        .qk-tb>span{position:relative;display:grid;place-items:center;width:48px;height:48px;border-radius:9999px;background:#0b1120;font-size:24px;animation:qk-tb-wiggle 2s ease-in-out infinite;}
        .qk-tb:hover>span{animation:qk-tb-wiggle .3s ease-in-out infinite;}
        @keyframes qk-tb-spin{to{transform:rotate(360deg)}}
        @keyframes qk-tb-pulse{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.8)}50%{box-shadow:0 0 0 16px rgba(99,102,241,0)}}
        @keyframes qk-tb-wiggle{0%,100%{transform:rotate(-10deg) scale(1)}50%{transform:rotate(10deg) scale(1.12)}}
      `}</style>
      <span>{lang === "sv" ? "🇬" : "🇪"}</span>
    </button>
  );
}