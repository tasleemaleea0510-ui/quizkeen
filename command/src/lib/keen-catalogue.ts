/**
 * The Keen catalogue, as much of it as QuizKeen Command needs.
 *
 * Command is a separate deployment from the player site and cannot import from
 * `quizkeen/src`, but the owner's vault has to offer the SAME collectibles the
 * game hands out — a gift of a Keen id the app does not know lands in the
 * database and shows up as nothing. So this file is a copy of the catalogue's
 * identity columns (id, name, rarity, shelf, emoji), generated from
 * `quizkeen/src/lib/keens.ts` by compiling that one module and dumping
 * `KEENS.map(({ id, name, rarity, pack, emoji }) => ...)`.
 *
 * Add a Keen to the game, regenerate this list in the same breath. The drawing,
 * the odds and the prices stay in the player repo — only what a staff member has
 * to pick from lives here.
 */

export type KeenEntry = {
  id: string;
  name: string;
  /** Same strings the database stores: VANLIG … MYSTISK. */
  rarity: string;
  /** The shelf it belongs to: a pack id, "start" or "admin". */
  pack: string;
  emoji: string;
};

/** Shelves in the order the vault shows them; the label is what staff read. */
export const KEEN_SHELVES: { id: string; label: string }[] = [
  { id: "start", label: "Startpaketet" },
  { id: "djur", label: "Djur" },
  { id: "skola", label: "Skola" },
  { id: "rymd", label: "Rymd" },
  { id: "djungel", label: "Djungel" },
  { id: "godis", label: "Godis" },
  { id: "mytisk", label: "Mytisk" },
  { id: "gamer", label: "Gamer" },
  { id: "halloween", label: "Halloween" },
  { id: "admin", label: "Admin-gåva" },
];

export const KEEN_CATALOGUE: KeenEntry[] = [
  { id: "keenungen", name: "Keenungen", rarity: "VANLIG", pack: "start", emoji: "🐣" },
  { id: "blipp", name: "Roboten Blipp", rarity: "VANLIG", pack: "start", emoji: "🤖" },
  { id: "puff", name: "Molnet Puff", rarity: "VANLIG", pack: "start", emoji: "☁️" },
  { id: "driz", name: "Droppen Driz", rarity: "VANLIG", pack: "start", emoji: "💧" },
  { id: "sunny", name: "Solstrålen Sunny", rarity: "VANLIG", pack: "start", emoji: "☀️" },
  { id: "blom", name: "Blomman Blom", rarity: "OVANLIG", pack: "start", emoji: "🌸" },
  { id: "svamp", name: "Svampen Svamp", rarity: "OVANLIG", pack: "start", emoji: "🍄" },
  { id: "sten", name: "Stenen Sten", rarity: "OVANLIG", pack: "start", emoji: "🪨" },
  { id: "popp", name: "Ballongen Popp", rarity: "OVANLIG", pack: "start", emoji: "🎈" },
  { id: "tia", name: "Tärningen Tia", rarity: "OVANLIG", pack: "start", emoji: "🎲" },
  { id: "kisse", name: "Katten Kisse", rarity: "VANLIG", pack: "djur", emoji: "🐱" },
  { id: "vovve", name: "Valpen Vovve", rarity: "VANLIG", pack: "djur", emoji: "🐶" },
  { id: "kaninen", name: "Kaninen Bus", rarity: "OVANLIG", pack: "djur", emoji: "🐰" },
  { id: "turt", name: "Sköldpaddan Turt", rarity: "OVANLIG", pack: "djur", emoji: "🐢" },
  { id: "pippi", name: "Fågeln Pippi", rarity: "OVANLIG", pack: "djur", emoji: "🐦" },
  { id: "sly", name: "Räven Sly", rarity: "SALLSYNT", pack: "djur", emoji: "🦊" },
  { id: "bruno", name: "Björnen Bruno", rarity: "EPISK", pack: "djur", emoji: "🐻" },
  { id: "fenrir", name: "Vargen Fenrir", rarity: "LEGENDARISK", pack: "djur", emoji: "🐺" },
  { id: "penny", name: "Pennan Penny", rarity: "VANLIG", pack: "skola", emoji: "✏️" },
  { id: "gummi", name: "Suddgummit Gummi", rarity: "VANLIG", pack: "skola", emoji: "🧽" },
  { id: "bag", name: "Ryggsäcken Bag", rarity: "OVANLIG", pack: "skola", emoji: "🎒" },
  { id: "kalkyl", name: "Miniräknaren Kalkyl", rarity: "OVANLIG", pack: "skola", emoji: "🧮" },
  { id: "prov", name: "Provpappret Prov", rarity: "OVANLIG", pack: "skola", emoji: "📝" },
  { id: "larsson", name: "Läraren Larsson", rarity: "SALLSYNT", pack: "skola", emoji: "🧑‍🏫" },
  { id: "nobel", name: "Nobelpriset Nobel", rarity: "EPISK", pack: "skola", emoji: "🏅" },
  { id: "rektor", name: "Rektorn Rector", rarity: "LEGENDARISK", pack: "skola", emoji: "🎓" },
  { id: "raffe", name: "Raketen Raffe", rarity: "VANLIG", pack: "rymd", emoji: "🚀" },
  { id: "stella", name: "Stjärnan Stella", rarity: "VANLIG", pack: "rymd", emoji: "⭐" },
  { id: "luna", name: "Månen Luna", rarity: "OVANLIG", pack: "rymd", emoji: "🌙" },
  { id: "kalle", name: "Kometen Kalle", rarity: "OVANLIG", pack: "rymd", emoji: "☄️" },
  { id: "tella", name: "Teleskopet Tella", rarity: "OVANLIG", pack: "rymd", emoji: "🔭" },
  { id: "astro", name: "Astronauten Astro", rarity: "SALLSYNT", pack: "rymd", emoji: "🧑‍🚀" },
  { id: "saturnus", name: "Planeten Saturnus", rarity: "EPISK", pack: "rymd", emoji: "🪐" },
  { id: "zorg", name: "Alien Zorg", rarity: "LEGENDARISK", pack: "rymd", emoji: "👽" },
  { id: "polly", name: "Papegojan Polly", rarity: "VANLIG", pack: "djungel", emoji: "🦜" },
  { id: "ving", name: "Fjärilen Ving", rarity: "VANLIG", pack: "djungel", emoji: "🦋" },
  { id: "abbe", name: "Apan Abbe", rarity: "OVANLIG", pack: "djungel", emoji: "🐵" },
  { id: "slir", name: "Ormen Slir", rarity: "OVANLIG", pack: "djungel", emoji: "🐍" },
  { id: "groda", name: "Grodan Groda", rarity: "OVANLIG", pack: "djungel", emoji: "🐸" },
  { id: "leo", name: "Leoparden Leo", rarity: "SALLSYNT", pack: "djungel", emoji: "🐆" },
  { id: "elsa", name: "Elefanten Elsa", rarity: "EPISK", pack: "djungel", emoji: "🐘" },
  { id: "leon", name: "Lejonet Leon", rarity: "LEGENDARISK", pack: "djungel", emoji: "🦁" },
  { id: "klubba", name: "Klubban Klubba", rarity: "VANLIG", pack: "godis", emoji: "🍭" },
  { id: "kex", name: "Keksen Kex", rarity: "VANLIG", pack: "godis", emoji: "🍪" },
  { id: "munk", name: "Munken Munk", rarity: "OVANLIG", pack: "godis", emoji: "🍩" },
  { id: "choklad", name: "Chokladen Choklad", rarity: "OVANLIG", pack: "godis", emoji: "🍫" },
  { id: "glass", name: "Glasskupen Glass", rarity: "OVANLIG", pack: "godis", emoji: "🍨" },
  { id: "tarta", name: "Tårtan Tårta", rarity: "SALLSYNT", pack: "godis", emoji: "🎂" },
  { id: "cupcake", name: "Cupcaken Cupcake", rarity: "EPISK", pack: "godis", emoji: "🧁" },
  { id: "rainbow", name: "Regnbågsgodiset Rainbow", rarity: "LEGENDARISK", pack: "godis", emoji: "🌈" },
  { id: "uno", name: "Enhörningen Uno", rarity: "EPISK", pack: "mytisk", emoji: "🦄" },
  { id: "drako", name: "Drakungen Drako", rarity: "EPISK", pack: "mytisk", emoji: "🐉" },
  { id: "fenix", name: "Fenixen Fenix", rarity: "LEGENDARISK", pack: "mytisk", emoji: "🔥" },
  { id: "marina", name: "Sjöjungfrun Marina", rarity: "LEGENDARISK", pack: "mytisk", emoji: "🧜" },
  { id: "merlin", name: "Trollkarlen Merlin", rarity: "LEGENDARISK", pack: "mytisk", emoji: "🧙" },
  { id: "kromakatt", name: "Kroma-Katten", rarity: "KROMA", pack: "mytisk", emoji: "😻" },
  { id: "kromadrake", name: "Kroma-Draken", rarity: "KROMA", pack: "mytisk", emoji: "🐲" },
  { id: "kromakrona", name: "Kroma-Kronan", rarity: "KROMA", pack: "mytisk", emoji: "👑" },
  { id: "invader", name: "Space Invader", rarity: "VANLIG", pack: "gamer", emoji: "👾" },
  { id: "crewmate", name: "Crewmate", rarity: "SALLSYNT", pack: "gamer", emoji: "🚀" },
  { id: "chubbypig", name: "Chubby Pig", rarity: "EPISK", pack: "gamer", emoji: "🐷" },
  { id: "creeper", name: "Creeper", rarity: "LEGENDARISK", pack: "gamer", emoji: "🧟" },
  { id: "pixelthorne", name: "Pixel Thorne", rarity: "HEMLIG", pack: "gamer", emoji: "🦔" },
  { id: "pumpkin", name: "Pumpan Grin", rarity: "VANLIG", pack: "halloween", emoji: "🎃" },
  { id: "chickenchick", name: "Kuben Chick", rarity: "SALLSYNT", pack: "halloween", emoji: "🐤" },
  { id: "chickchicken", name: "Kuben Chicken", rarity: "SALLSYNT", pack: "halloween", emoji: "🐔" },
  { id: "frogula", name: "Vampyrgrodan Frogula", rarity: "EPISK", pack: "halloween", emoji: "🐸" },
  { id: "cookiepumpkin", name: "Kakpumpan Cookie", rarity: "LEGENDARISK", pack: "halloween", emoji: "🍪" },
  { id: "cookiemummy", name: "Kakmumien Mummy", rarity: "LEGENDARISK", pack: "halloween", emoji: "🧟" },
  { id: "cookieghost", name: "Kakspöket Boo", rarity: "HEMLIG", pack: "halloween", emoji: "👻" },
  { id: "pumpkinking", name: "Pumpakungen", rarity: "MYSTISK", pack: "halloween", emoji: "👑" },
  { id: "omeisaurus", name: "Omeisaurus", rarity: "MYSTISK", pack: "admin", emoji: "🐉" },
];

export const KEEN_BY_ID: Record<string, KeenEntry> = Object.fromEntries(
  KEEN_CATALOGUE.map((k) => [k.id, k])
);

/** Swedish rarity labels for the chips in the vault. */
export const RARITY_LABEL: Record<string, string> = {
  VANLIG: "Vanlig",
  OVANLIG: "Ovanlig",
  SALLSYNT: "Sällsynt",
  EPISK: "Episk",
  LEGENDARISK: "Legendarisk",
  HEMLIG: "Hemlig",
  KROMA: "Kroma",
  MYSTISK: "Mystisk",
};
