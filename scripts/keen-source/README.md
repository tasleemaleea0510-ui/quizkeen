# Keen source images

Drop the original design-sheet images here, one file per Keen, named after the
Keen's id. They are read by `scripts/crop-keens.mjs`, which trims the flat
background, squares the artwork, cuts the background out to transparency and
writes a 512×512 PNG into `public/keens/`.

| File | Keen | Rarity |
| --- | --- | --- |
| `pumpkin.png` | Pumpkin | Common (`VANLIG`) |
| `chickenchick.png` | Chicken Chick | Rare (`SALLSYNT`) |
| `chickchicken.png` | Chick Chicken | Rare (`SALLSYNT`) |
| `frogula.png` | Frogula | Epic (`EPISK`) |
| `cookiepumpkin.png` | Cookie Pumpkin | Legendary (`LEGENDARISK`) |
| `cookiemummy.png` | Cookie Mummy | Legendary (`LEGENDARISK`) |
| `cookieghost.png` | Cookie Ghost | Secret (`HEMLIG`) |
| `pumpkinkingu.png` | Pumpkin King | Mythical (`MYSTISK`) |

Then run, from the project root:

```bash
node scripts/crop-keens.mjs
```

`node scripts/crop-keens.mjs --self-test` proves the decoder/cropper works
without touching any real file.

Only 8-bit RGB/RGBA PNGs are read (what a screenshot or design export produces).
If a file arrives as JPEG, re-save it as PNG first — the script will say so
rather than guessing.
