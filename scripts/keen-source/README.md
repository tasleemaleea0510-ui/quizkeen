# Keen source images

Design sheets go in this folder, one picture per Keen, named after the Keen's id.
`scripts/crop-keens.mjs` trims the flat background, keeps the largest shape,
squares it, cuts the background out to transparency and writes a 512×512 PNG into
`public/keens/`.

A pack's cover art is named `pack-<packId>.png` and lands in
`public/keens/packs/<packId>.png` instead — same trim and square, but the picture
keeps its own background, because a cover is artwork rather than a cut-out.

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
| `pack-halloween.png` | the Halloween pack cover | — |

## Running it

```bash
node scripts/crop-keens.mjs            # crop everything in this folder
node scripts/crop-keens.mjs --self-test # prove the decoder/cropper works
```

## What the crop does

A design sheet is not just the character: it has a caption underneath
("Common (Pumpkin)"), sometimes a stray mark at the edge, sometimes a title above
the art. So the cropper flood-fills the artwork at full resolution and keeps the
**largest connected shape**, which is the character — a caption is a scatter of
small blobs by comparison. That is why the label never ends up inside the card.

The background threshold is deliberately a little generous so a soft drop shadow
on the sheet does not survive as a pale halo on the dark UI.

Only 8-bit RGB/RGBA PNGs are read. A JPEG must be re-saved as PNG first — the
script says so rather than guessing.

Everything here except this README and `.gitignore` is ignored by git: the
shipped art lives in `public/keens/`, and a design sheet is not a build asset.
