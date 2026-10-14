"use client";

/**
 * QuizKeen Command translation engine.
 *
 * The console mixes hard-coded English and Swedish strings across its pages.
 * Instead of rewriting every label twice, this module patches the rendered DOM
 * and switches in BOTH directions live, with no reload:
 *  - it remembers the ORIGINAL text of every node, so toggling back is exact;
 *  - replacements only hit whole words, so "Chatt" never becomes "Chattt";
 *  - a MutationObserver re-applies after React re-renders;
 *  - `data-no-translate` content (chat messages, emoji palettes, inputs) is
 *    never rewritten, so we don't touch what a person typed.
 */

export type Lang = "sv" | "en";

export const LANG_KEY = "qk_lang";

export function readLang(): Lang {
  if (typeof window === "undefined") return "sv";
  try {
    return window.localStorage.getItem(LANG_KEY) === "en" ? "en" : "sv";
  } catch {
    return "sv";
  }
}

export function writeLang(lang: Lang) {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage unavailable — translation still works this session */
  }
}

/**
 * [swedish, english] — the single source of truth for both directions.
 * The command console was written mostly in English, so the en→sv direction
 * does most of the work here.
 */
const PAIRS: [string, string][] = [
  // ── gate ─────────────────────────────────────────────────────────────
  ["COMMAND CENTER", "COMMAND CENTER"],
  ["Ägare", "OWNER"],
  ["ÄGARE", "OWNER"],
  ["Ange den 8-siffriga koden för att låsa upp ÄGARE-kontroller.", "Enter the 8-digit code to unlock OWNER controls."],
  ["Ange den 8-siffriga koden för att låsa upp ADMIN-kontroller.", "Enter the 8-digit code to unlock ADMIN controls."],
  ["Ange den 8-siffriga koden för att låsa upp SÄKERHET-kontroller.", "Enter the 8-digit code to unlock SECURITY controls."],
  ["Ange 8-siffrig kod", "Enter 8-digit code"],
  ["Lås upp", "Unlock"],
  ["LÅS UPP", "UNLOCK"],
  ["Lås upp ÄGARE", "Unlock OWNER"],
  ["Kontrollerar...", "Checking..."],
  ["Kontrollerar…", "Checking…"],
  ["Senast inloggad som", "Last signed in as"],
  ["Fortsätt", "Continue"],
  ["Glöm", "Forget"],
  ["Fel kod. Försök igen.", "Wrong code. Try again."],
  ["Endast för betrodda. Alla öppningar loggas.", "Trusted staff only. Every open is logged."],
  ["Släpps inte in", "Not allowed"],

  // ── navigation ───────────────────────────────────────────────────────
  ["Översikt", "Overview"],
  ["Dashboard", "Overview"],
  ["Användare", "Users"],
  ["Users", "Users"],
  ["Chat Spy", "Chat Spy"],
  ["Chatspaning", "Chat Spy"],
  ["Sändning", "Broadcast"],
  ["Broadcast", "Broadcast"],
  ["Stabs-chat", "Staff chat"],
  ["Staff Chat", "Staff chat"],
  ["Logg", "Log"],
  ["Log", "Log"],
  ["Aktivitetslogg", "Activity log"],
  ["Ban-begäranden", "Ban requests"],
  ["Koder", "Codes"],
  ["Sök användare...", "Search users..."],
  ["Sök användare…", "Search users…"],
  ["Sök", "Search"],

  // ── console chrome ───────────────────────────────────────────────────
  ["ÄGARKONSOL", "OWNER CONSOLE"],
  ["GULD-TRONEN", "THE GOLD THRONE"],
  ["RÖD KONSOL", "RED COMMAND"],
  ["ISVAKT", "ICE WATCH"],
  ["Övervakning", "Surveillance"],
  ["Underhåll", "Maintenance"],
  ["Allt loggas.", "Everything is logged."],
  ["Allt loggas", "Everything is logged"],
  ["Endast för betrodda.", "Trusted staff only."],
  ["Jobbar...", "Working..."],
  ["Laddar tronen...", "Loading the throne..."],
  ["Laddar RÖD KONSOL...", "Loading RED COMMAND..."],
  ["Laddar ISVAKT...", "Loading ICE WATCH..."],
  ["Laddar...", "Loading..."],
  ["Klart!", "Done!"],
  ["Fungerade inte!", "That didn't work!"],
  ["Avbryt", "Cancel"],
  ["Stäng", "Close"],
  ["Spara", "Save"],
  ["Rensa", "Clear"],
  ["Skicka", "Send"],
  ["Godkänn", "Approve"],
  ["Avslå", "Reject"],
  ["Väntande", "Pending"],
  ["Hanterade", "Handled"],
  ["Tidigare", "Earlier"],

  // ── users & moderation ───────────────────────────────────────────────
  ["Banna", "Ban"],
  ["Bannad", "Banned"],
  ["BANNAD", "BANNED"],
  ["Unbanna", "Unban"],
  ["Varna", "Warn"],
  ["Varningar", "Warnings"],
  ["Namnbyte", "Rename"],
  ["Tysta", "Mute"],
  ["Tysta chatten", "Mute chat"],
  ["Öppna chatten", "Unmute chat"],
  ["Fäst", "Pin"],
  ["Avfäst", "Unpin"],
  ["Anteckning", "Note"],
  ["Hemlig anteckning", "Secret note"],
  ["Hemlig anteckning sparad", "Secret note saved"],
  ["Hemlig anteckning rensad", "Secret note cleared"],
  ["Osynlig", "Ghost"],
  ["Meddelanden osynliga för andra", "Messages hidden from others"],
  ["Synlig igen", "Visible again"],
  ["Belöna", "Reward"],
  ["Be om mer", "Ask for more"],
  ["Be ägaren om längre ban", "Ask the owner for a longer ban"],
  ["Hur länge (minuter)?", "How long (minutes)?"],
  ["Varför? (ägaren läser detta)", "Why? (the owner reads this)"],
  ["Skicka begäran", "Send request"],
  ["Begäran skickad till ägaren!", "Request sent to the owner!"],
  ["Godkänn i:", "Approve for:"],
  ["Egen tid", "Custom time"],
  ["egna min", "custom min"],
  ["FÖR ALLTID", "FOREVER"],
  ["1 tim", "1 hour"],
  ["1 dag", "1 day"],
  ["2 dagar", "2 days"],
  ["1 vecka", "1 week"],
  ["Max 1 timme — be ägaren", "Max 1 hour — ask the owner"],
  ["Max 1 dag — be ägaren", "Max 1 day — ask the owner"],
  ["Tvinga ny inloggning", "Force re-login"],
  ["Tidsmaskin", "Time machine"],
  ["Frys mynt", "Freeze coins"],
  ["Tinade mynt", "Coins unfrozen"],
  ["Daglig bonus", "Daily bonus"],
  ["Skugga", "Shadow"],
  ["Osynlig på topplistan", "Hidden from the leaderboard"],
  ["Kasta ut", "Sign out"],
  ["Visa email", "Show email"],
  ["Radera användare", "Delete user"],
  ["RADERA ANVÄNDARE", "DELETE USER"],
  ["Skicka popup", "Send popup"],
  ["Rensa popup", "Clear popup"],
  ["Personligt meddelande", "Personal message"],
  ["Meddela med popup", "Notify with popup"],
  ["eget lösenord (valfritt, 6+ tecken)", "custom password (optional, 6+ chars)"],
  ["Återställ lösenord", "Reset password"],
  ["Nytt lösenord", "New password"],
  ["Reset XP", "Reset XP"],
  ["Reset mynt", "Reset coins"],
  ["Reset ALLT", "Reset EVERYTHING"],
  ["Sätt nivå", "Set level"],
  ["nivå", "level"],
  ["Lv", "Lv"],
  ["XP", "XP"],
  ["mynt", "coins"],
  ["Spel", "Games"],
  ["Quizar", "Quizzes"],
  ["Gloskortlekar", "Flashcard decks"],
  ["Gloskort", "Flashcards"],
  ["Klassrum", "Classroom"],
  ["Klass", "Class"],
  ["Klasser", "Classes"],
  ["Total XP", "Total XP"],
  ["Totala mynt", "Total coins"],
  ["Lärare", "Teachers"],
  ["Elever", "Students"],
  ["Elev", "Student"],
  ["Medlemmar", "Members"],
  ["Analys", "Analytics"],
  ["Lärarpanel", "Teacher panel"],
  ["Väntande begäranden", "Pending requests"],
  ["Inloggad", "Signed in"],
  ["Sist sedd", "Last seen"],
  ["Roll", "Role"],
  ["Konto", "Account"],
  ["Profil", "Profile"],
  ["Statistik", "Stats"],
  ["Språk", "Language"],
  ["Inställningar", "Settings"],
  ["Logga ut", "Log out"],
  ["Logga in", "Log in"],
  ["Registrera", "Register"],
  ["Skapa konto", "Create account"],
  ["Användarnamn", "Username"],
  ["Lösenord", "Password"],
  ["E-post", "Email"],
  ["Välkommen!", "Welcome!"],
  ["Välkommen tillbaka!", "Welcome back!"],
  ["Har inget konto?", "No account?"],
  ["Redan medlem?", "Already a member?"],
  ["Användarkod", "User code"],
  ["Ägarkod", "Owner code"],
  ["Admin-kod", "Admin code"],
  ["Säkerhetskod", "Security code"],
  ["Spara koder", "Save codes"],

  // ── broadcast & emergency ────────────────────────────────────────────
  ["Global sändning", "Global broadcast"],
  ["Sändning & Nödläge", "Broadcast & Emergency"],
  ["Skriv ett meddelande till HELA sajten...", "Type a message to the WHOLE site..."],
  ["Skriv ett meddelande som ALLA användare ser...", "Type a message ALL users see..."],
  ["Öppna sajten", "Open the site"],
  ["STÄNG sajten", "SHUT DOWN the site"],
  ["Nödläge — stäng hela sajten", "Emergency — shut down the whole site"],
  ["Sajten är stängd just nu", "The site is closed right now"],
  ["Sänd", "Send"],
  ["Sänt!", "Sent!"],
  ["Rensat!", "Cleared!"],

  // ── chat ─────────────────────────────────────────────────────────────
  ["Chatt", "Chat"],
  ["Chat", "Chat"],
  ["Hela chatten", "The whole chat"],
  ["Ägaren", "The Owner"],
  ["Admins", "Admins"],
  ["Säkerhet", "Security"],
  ["Skriv ett meddelande...", "Type a message..."],
  ["Skicka ett meddelande", "Send a message"],
  ["Inga meddelanden ännu i den här kanalen.", "No messages in this channel yet."],
  ["Emoji", "Emoji"],
  ["Emojis", "Emojis"],
  ["Glada", "Happy"],
  ["Händer", "Hands"],
  ["Hjärtan", "Hearts"],
  ["Djur", "Animals"],
  ["Mat", "Food"],
  ["Saker", "Things"],
  ["Live", "Live"],
  ["Väntar på att", "Waiting for"],
  ["godkänner & delar...", "to accept & share..."],
  ["Välj en chatt till vänster!", "Pick a chat on the left!"],
  ["Privat chatt", "Private chat"],
  ["Acceptera", "Accept"],
  ["Avvisa", "Decline"],

  // ── log / spy ────────────────────────────────────────────────────────
  ["Global / Klass", "Global / Class"],
  ["Inbox", "Inbox"],
  ["Inkorg", "Inbox"],
  ["Stab-kanaler", "Staff channels"],
  ["Chatt-förfrågningar", "Chat requests"],
  ["Alla meddelanden", "Every message"],
  ["Alla meddelanden i riket", "Every message in the kingdom"],
  ["Alla meddelanden på sajten", "Every message on the site"],
  ["Godkänd", "Approved"],
  ["Avslagen", "Rejected"],
  ["Idag", "Today"],
  ["Igår", "Yesterday"],
  ["Imorgon", "Tomorrow"],
  ["Nu", "Now"],
  ["Snart", "Soon"],
  ["minuter", "minutes"],
  ["timmar", "hours"],
  ["dagar", "days"],

  // ── misc ─────────────────────────────────────────────────────────────
  ["SÄKERHET", "SECURITY"],
  ["Minst 3 tecken i namnet.", "At least 3 characters in the name."],
  ["Ogiltig roll.", "Invalid role."],
  ["Skriv ett meddelande först.", "Write a message first."],
  ["Alla koder måste vara 8 tecken.", "All codes must be 8 characters."],
  ["Välj en användare först.", "Pick a user first."],
  ["Begäran finns inte längre.", "That request no longer exists."],
  ["Koderna är sparade.", "The codes are saved."],
  ["Ingen användare matchade sökningen.", "No user matched the search."],
  ["Kunde inte läsa in chattar.", "Could not load the chats."],
  ["Redan belönad idag!", "Already rewarded today!"],
  ["Max 1 dag — be ägaren om mer!", "Max 1 day — ask the owner for more!"],
  ["Max 1 timme — be ägaren!", "Max 1 hour — ask the owner!"],
  ["LIVE-förfrågan skickad till", "LIVE request sent to"],
  ["Tysta chatten för", "Mute the chat for"],
  ["Hemlig anteckning om", "Secret note about"],
  ["Antal XP", "Amount of XP"],
  ["Tysta", "Mute"],
  ["stäng", "close"],
  ["Visa", "Show"],
  ["Nollställ allt", "Reset everything"],
  ["Växla fäst", "Toggle pin"],
  ["Öppna igen", "Unmute"],
  ["Nätverksfel — försök igen.", "Network error — please try again."],
  ["Något gick fel. Försök igen.", "Something went wrong. Please try again."],
  ["Be om LIVE-skärm", "Request LIVE screen"],
  ["Ansök om LIVE-skärm", "Request LIVE screen"],
  ["Kunde inte läsa in data. Försök igen.", "Could not load the data. Please try again."],
  ["Kontrollen misslyckades. Lås upp igen.", "That check failed. Unlock again."],
  ["Kod", "Code"],
  ["Tips", "Tip"],
];

// ── compiled lookup tables ───────────────────────────────────────────────

const SV_TO_EN = new Map<string, string>();
const EN_TO_SV = new Map<string, string>();
for (const [sv, en] of PAIRS) {
  if (sv !== en && !SV_TO_EN.has(sv)) SV_TO_EN.set(sv, en);
  if (sv !== en && !EN_TO_SV.has(en)) EN_TO_SV.set(en, sv);
}

type Matcher = { re: RegExp; map: Map<string, string> };

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMatcher(map: Map<string, string>): Matcher {
  const keys = Array.from(map.keys())
    .filter((k) => k.length >= 2)
    .sort((a, b) => b.length - a.length);
  const source = keys.length ? keys.map(escapeRegExp).join("|") : "(?!x)x";
  return { re: new RegExp(source, "g"), map };
}

const MATCHERS: Record<Lang, Matcher> = {
  en: buildMatcher(SV_TO_EN),
  sv: buildMatcher(EN_TO_SV),
};

// Latin letters (incl. Swedish) + digits, as an explicit class so this file
// type-checks under the project's es5 target.
const WORD = /[0-9A-Za-z\u00C0-\u024F]/;
function isWordChar(c: string | undefined) {
  return !!c && WORD.test(c);
}

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

export function applyTranslations(lang: Lang) {
  if (typeof document === "undefined" || !document.body) return;

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

  document.documentElement.lang = lang === "en" ? "en" : "sv";
}

export function observeTranslations(lang: Lang): () => void {
  if (typeof document === "undefined" || !document.body || typeof MutationObserver === "undefined") {
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
