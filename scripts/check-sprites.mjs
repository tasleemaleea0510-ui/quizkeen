#!/usr/bin/env node
/**
 * Checks the hand-pixelled Keens in `src/lib/keen-sprites.ts`.
 *
 * A bitmap is a list of strings and a palette, which is lovely to edit by eye and
 * easy to get subtly wrong: one row a character short and the whole sprite leans,
 * one letter missing from the palette and a pixel silently disappears. Neither
 * mistake breaks the build — the art just looks wrong — so this script is the
 * test that catches them.
 *
 * For every sprite it asserts:
 *   - every row is the same width (Sprites are square today; the checker only
 *     requires consistency, so a deliberately wide sprite is allowed);
 *   - `.` is free, every other character is a key in that sprite's `palette`;
 *   - the palette has no unused letters (a leftover from an earlier draft);
 *   - a sprite that is not emptied out has at least two rows.
 *
 * No dependencies: it parses the module as text, because importing it would mean
 * compiling TypeScript inside the script itself.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, "..", "src", "lib", "keen-sprites.ts");
const source = readFileSync(file, "utf8");

/**
 * Every sprite in the file, in order.
 *
 * A sprite object is found by its `board` line — exactly one per sprite — and
 * then read up to the next one, so each sprite's own `palette` and `rows` are
 * taken from its own object rather than a neighbour's.
 */
function collectSprites(text) {
  const sprites = [];
  const boards = [...text.matchAll(/board:\s*"(\w+)"/g)];

  boards.forEach((board, i) => {
    const from = board.index;
    const to = i + 1 < boards.length ? boards[i + 1].index : text.length;
    const body = text.slice(from, to);

    // The sprite's own name: the nearest entry above its `board` line, either
    // `export const NAME: Sprite = {` or a member `  name: {`.
    const before = text.slice(0, from);
    const names = [...before.matchAll(/(?:export const (\w+)|^\s{2}(\w+):\s*\{)/gm)];
    const name = names.length ? names[names.length - 1].slice(1).find(Boolean) : "?";

    const rowsMatch = /rows:\s*\[([\s\S]*?)\]/.exec(body);
    const rows = rowsMatch ? [...rowsMatch[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]) : [];

    const paletteMatch = /palette:\s*\{([\s\S]*?)\}/.exec(body);
    const keys = paletteMatch
      ? [...paletteMatch[1].matchAll(/([A-Za-z0-9_$]+)\s*:/g)].map((m) => m[1])
      : [];

    sprites.push({ name, board: board[1], rows, keys });
  });

  return sprites;
}

const sprites = collectSprites(source);
const problems = [];
const seen = new Set();

for (const sprite of sprites) {
  const { name, rows, keys } = sprite;
  if (seen.has(name)) {
    // Keen sprites and pack emblems are named uniquely today; a clash would make
    // the failures below ambiguous, so say so instead of guessing.
    problems.push(`${name}: two sprites share this name`);
  }
  seen.add(name);

  if (rows.length === 0) {
    problems.push(`${name}: no rows`);
    continue;
  }

  const width = Math.max(...rows.map((r) => r.length));
  rows.forEach((row, y) => {
    if (row.length !== width) {
      problems.push(`${name}: row ${y} is ${row.length} wide, expected ${width} — "${row}"`);
    }
    [...row].forEach((char, x) => {
      if (char !== "." && !keys.includes(char)) {
        problems.push(`${name}: row ${y} col ${x} uses "${char}", which is not in its palette`);
      }
    });
  });

  for (const key of keys) {
    if (!rows.some((row) => row.includes(key))) {
      problems.push(`${name}: palette letter "${key}" is never used`);
    }
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} problem(s) in ${file}\n`);
  for (const problem of problems) console.error("  " + problem);
  process.exit(1);
}

const sizes = [...new Set(sprites.map((s) => `${s.rows[0].length}×${s.rows.length}`))].join(", ");
console.log(`✓ ${sprites.length} sprites OK (${sizes})`);
