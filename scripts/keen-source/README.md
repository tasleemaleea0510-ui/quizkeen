# Keen source images

Two ways art arrives here:

1. **Drawn in-house** — `art/<id>.svg`, one hand-written vector per Keen. This is
   where the Halloween pack lives. Nothing is traced or copied from another
   game's asset files.
2. **Supplied as a picture** — a PNG dropped in this folder, named after the
   Keen's id.

Either way the last step is the same: `scripts/crop-keens.mjs` trims the flat
background, squares the artwork, cuts the background out to transparency and
writes a 512×512 PNG into `public/keens/`.

| File | Keen | Rarity |
| --- | --- | --- |
| `pumpkin` | Pumpkin | Common (`VANLIG`) |
| `chickenchick` | Chicken Chick | Rare (`SALLSYNT`) |
| `chickchicken` | Chick Chicken | Rare (`SALLSYNT`) |
| `frogula` | Frogula | Epic (`EPISK`) |
| `cookiepumpkin` | Cookie Pumpkin | Legendary (`LEGENDARISK`) |
| `cookiemummy` | Cookie Mummy | Legendary (`LEGENDARISK`) |
| `cookieghost` | Cookie Ghost | Secret (`HEMLIG`) |
| `pumpkinkingu` | Pumpkin King | Mythical (`MYSTISK`) |

## Rebuilding the Halloween art

```bash
# 1. render the vectors to PNG at 1024 (needs the one-off renderer)
npm i --no-save @resvg/resvg-js
node scripts/keen-source/rasterize.mjs

# 2. trim, square, cut out and downscale to 512
node scripts/crop-keens.mjs
```

`rasterize.mjs` reads `art/*.svg` and writes `<id>.png` beside it. The renderer is
deliberately *not* a project dependency: it is a conversion tool, not something
the site ships.

`node scripts/crop-keens.mjs --self-test` proves the decoder/cropper works
without touching any real file.

Only 8-bit RGB/RGBA PNGs are read. A JPEG must be re-saved as PNG first — the
script says so rather than guessing.

The rendered PNGs in this folder are ignored by git; `art/` is tracked, because
the drawings are the source.
