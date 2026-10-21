/**
 * The Keen catalogue, as much of it as QuizKeen Command needs.
 *
 * Command is a separate deployment from the player site and cannot import from
 * `quizkeen/src`, but the owner's vault has to offer the SAME collectibles the
 * game hands out — a gift of a Keen id the app does not know lands in the
 * database and shows up as nothing. So this file is a copy of the catalogue's
 * identity columns (id, name, rarity, shelf, hue, emoji), generated from
 * `quizkeen/src/lib/keens.ts` by compiling that one module and dumping
 * `KEENS.map(({ id, name, rarity, pack, hue, emoji }) => ...)`.
 *
 * `lib/keen-art.ts` is copied verbatim from the player repo's file of the same
 * name for the same reason: the vault shows the character the player will see,
 * not a placeholder. Add a Keen to the game, regenerate both in the same breath.
 */

export type KeenEntry = {
  id: string;
  name: string;
  /** Same strings the database stores: VANLIG … MYSTISK. */
  rarity: string;
  /** The shelf it belongs to: a pack id, "start" or "admin". */
  pack: string;
  /** Base hue (0–360) — the artwork picks its palette from it. */
  hue: number;
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
  { id: "keenungen", name: "Keenungen", rarity: "VANLIG", pack: "start", hue: 45, emoji: "🐣" },
  { id: "blipp", name: "Roboten Blipp", rarity: "VANLIG", pack: "start", hue: 210, emoji: "🤖" },
  { id: "puff", name: "Molnet Puff", rarity: "VANLIG", pack: "start", hue: 205, emoji: "☁️" },
  { id: "driz", name: "Droppen Driz", rarity: "VANLIG", pack: "start", hue: 190, emoji: "💧" },
  { id: "sunny", name: "Solstrålen Sunny", rarity: "VANLIG", pack: "start", hue: 48, emoji: "☀️" },
  { id: "blom", name: "Blomman Blom", rarity: "OVANLIG", pack: "start", hue: 330, emoji: "🌸" },
  { id: "svamp", name: "Svampen Svamp", rarity: "OVANLIG", pack: "start", hue: 355, emoji: "🍄" },
  { id: "sten", name: "Stenen Sten", rarity: "OVANLIG", pack: "start", hue: 235, emoji: "🪨" },
  { id: "popp", name: "Ballongen Popp", rarity: "OVANLIG", pack: "start", hue: 5, emoji: "🎈" },
  { id: "tia", name: "Tärningen Tia", rarity: "OVANLIG", pack: "start", hue: 265, emoji: "🎲" },
  { id: "kisse", name: "Katten Kisse", rarity: "VANLIG", pack: "djur", hue: 28, emoji: "🐱" },
  { id: "vovve", name: "Valpen Vovve", rarity: "VANLIG", pack: "djur", hue: 45, emoji: "🐶" },
  { id: "kaninen", name: "Kaninen Bus", rarity: "OVANLIG", pack: "djur", hue: 340, emoji: "🐰" },
  { id: "turt", name: "Sköldpaddan Turt", rarity: "OVANLIG", pack: "djur", hue: 160, emoji: "🐢" },
  { id: "pippi", name: "Fågeln Pippi", rarity: "OVANLIG", pack: "djur", hue: 195, emoji: "🐦" },
  { id: "sly", name: "Räven Sly", rarity: "SALLSYNT", pack: "djur", hue: 18, emoji: "🦊" },
  { id: "bruno", name: "Björnen Bruno", rarity: "EPISK", pack: "djur", hue: 25, emoji: "🐻" },
  { id: "fenrir", name: "Vargen Fenrir", rarity: "LEGENDARISK", pack: "djur", hue: 220, emoji: "🐺" },
  { id: "penny", name: "Pennan Penny", rarity: "VANLIG", pack: "skola", hue: 48, emoji: "✏️" },
  { id: "gummi", name: "Suddgummit Gummi", rarity: "VANLIG", pack: "skola", hue: 200, emoji: "🧽" },
  { id: "bag", name: "Ryggsäcken Bag", rarity: "OVANLIG", pack: "skola", hue: 205, emoji: "🎒" },
  { id: "kalkyl", name: "Miniräknaren Kalkyl", rarity: "OVANLIG", pack: "skola", hue: 230, emoji: "🧮" },
  { id: "prov", name: "Provpappret Prov", rarity: "OVANLIG", pack: "skola", hue: 0, emoji: "📝" },
  { id: "larsson", name: "Läraren Larsson", rarity: "SALLSYNT", pack: "skola", hue: 215, emoji: "🧑‍🏫" },
  { id: "nobel", name: "Nobelpriset Nobel", rarity: "EPISK", pack: "skola", hue: 42, emoji: "🏅" },
  { id: "rektor", name: "Rektorn Rector", rarity: "LEGENDARISK", pack: "skola", hue: 225, emoji: "🎓" },
  { id: "raffe", name: "Raketen Raffe", rarity: "VANLIG", pack: "rymd", hue: 8, emoji: "🚀" },
  { id: "stella", name: "Stjärnan Stella", rarity: "VANLIG", pack: "rymd", hue: 50, emoji: "⭐" },
  { id: "luna", name: "Månen Luna", rarity: "OVANLIG", pack: "rymd", hue: 235, emoji: "🌙" },
  { id: "kalle", name: "Kometen Kalle", rarity: "OVANLIG", pack: "rymd", hue: 20, emoji: "☄️" },
  { id: "tella", name: "Teleskopet Tella", rarity: "OVANLIG", pack: "rymd", hue: 190, emoji: "🔭" },
  { id: "astro", name: "Astronauten Astro", rarity: "SALLSYNT", pack: "rymd", hue: 210, emoji: "🧑‍🚀" },
  { id: "saturnus", name: "Planeten Saturnus", rarity: "EPISK", pack: "rymd", hue: 30, emoji: "🪐" },
  { id: "zorg", name: "Alien Zorg", rarity: "LEGENDARISK", pack: "rymd", hue: 120, emoji: "👽" },
  { id: "polly", name: "Papegojan Polly", rarity: "VANLIG", pack: "djungel", hue: 150, emoji: "🦜" },
  { id: "ving", name: "Fjärilen Ving", rarity: "VANLIG", pack: "djungel", hue: 275, emoji: "🦋" },
  { id: "abbe", name: "Apan Abbe", rarity: "OVANLIG", pack: "djungel", hue: 25, emoji: "🐵" },
  { id: "slir", name: "Ormen Slir", rarity: "OVANLIG", pack: "djungel", hue: 130, emoji: "🐍" },
  { id: "groda", name: "Grodan Groda", rarity: "OVANLIG", pack: "djungel", hue: 105, emoji: "🐸" },
  { id: "leo", name: "Leoparden Leo", rarity: "SALLSYNT", pack: "djungel", hue: 40, emoji: "🐆" },
  { id: "elsa", name: "Elefanten Elsa", rarity: "EPISK", pack: "djungel", hue: 250, emoji: "🐘" },
  { id: "leon", name: "Lejonet Leon", rarity: "LEGENDARISK", pack: "djungel", hue: 45, emoji: "🦁" },
  { id: "klubba", name: "Klubban Klubba", rarity: "VANLIG", pack: "godis", hue: 300, emoji: "🍭" },
  { id: "kex", name: "Keksen Kex", rarity: "VANLIG", pack: "godis", hue: 30, emoji: "🍪" },
  { id: "munk", name: "Munken Munk", rarity: "OVANLIG", pack: "godis", hue: 330, emoji: "🍩" },
  { id: "choklad", name: "Chokladen Choklad", rarity: "OVANLIG", pack: "godis", hue: 20, emoji: "🍫" },
  { id: "glass", name: "Glasskupen Glass", rarity: "OVANLIG", pack: "godis", hue: 340, emoji: "🍨" },
  { id: "tarta", name: "Tårtan Tårta", rarity: "SALLSYNT", pack: "godis", hue: 350, emoji: "🎂" },
  { id: "cupcake", name: "Cupcaken Cupcake", rarity: "EPISK", pack: "godis", hue: 315, emoji: "🧁" },
  { id: "rainbow", name: "Regnbågsgodiset Rainbow", rarity: "LEGENDARISK", pack: "godis", hue: 265, emoji: "🌈" },
  { id: "uno", name: "Enhörningen Uno", rarity: "EPISK", pack: "mytisk", hue: 290, emoji: "🦄" },
  { id: "drako", name: "Drakungen Drako", rarity: "EPISK", pack: "mytisk", hue: 110, emoji: "🐉" },
  { id: "fenix", name: "Fenixen Fenix", rarity: "LEGENDARISK", pack: "mytisk", hue: 15, emoji: "🔥" },
  { id: "marina", name: "Sjöjungfrun Marina", rarity: "LEGENDARISK", pack: "mytisk", hue: 175, emoji: "🧜" },
  { id: "merlin", name: "Trollkarlen Merlin", rarity: "LEGENDARISK", pack: "mytisk", hue: 255, emoji: "🧙" },
  { id: "kromakatt", name: "Kroma-Katten", rarity: "KROMA", pack: "mytisk", hue: 0, emoji: "😻" },
  { id: "kromadrake", name: "Kroma-Draken", rarity: "KROMA", pack: "mytisk", hue: 0, emoji: "🐲" },
  { id: "kromakrona", name: "Kroma-Kronan", rarity: "KROMA", pack: "mytisk", hue: 0, emoji: "👑" },
  { id: "invader", name: "Space Invader", rarity: "VANLIG", pack: "gamer", hue: 120, emoji: "👾" },
  { id: "crewmate", name: "Crewmate", rarity: "SALLSYNT", pack: "gamer", hue: 0, emoji: "🚀" },
  { id: "chubbypig", name: "Chubby Pig", rarity: "EPISK", pack: "gamer", hue: 110, emoji: "🐷" },
  { id: "creeper", name: "Creeper", rarity: "LEGENDARISK", pack: "gamer", hue: 130, emoji: "🧟" },
  { id: "pixelthorne", name: "Pixel Thorne", rarity: "HEMLIG", pack: "gamer", hue: 285, emoji: "🦔" },
  { id: "pumpkin", name: "Pumpan Grin", rarity: "VANLIG", pack: "halloween", hue: 24, emoji: "🎃" },
  { id: "chickenchick", name: "Kuben Chick", rarity: "SALLSYNT", pack: "halloween", hue: 200, emoji: "🐤" },
  { id: "chickchicken", name: "Kuben Chicken", rarity: "SALLSYNT", pack: "halloween", hue: 48, emoji: "🐔" },
  { id: "frogula", name: "Vampyrgrodan Frogula", rarity: "EPISK", pack: "halloween", hue: 120, emoji: "🐸" },
  { id: "cookiepumpkin", name: "Kakpumpan Cookie", rarity: "LEGENDARISK", pack: "halloween", hue: 30, emoji: "🍪" },
  { id: "cookiemummy", name: "Kakmumien Mummy", rarity: "LEGENDARISK", pack: "halloween", hue: 35, emoji: "🧟" },
  { id: "cookieghost", name: "Kakspöket Boo", rarity: "HEMLIG", pack: "halloween", hue: 195, emoji: "👻" },
  { id: "pumpkinking", name: "Pumpakungen", rarity: "MYSTISK", pack: "halloween", hue: 285, emoji: "👑" },
  { id: "omeisaurus", name: "Omeisaurus", rarity: "MYSTISK", pack: "admin", hue: 30, emoji: "🐉" },
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
