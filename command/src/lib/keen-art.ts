/**
 * The Admin Keen's artwork, for QuizKeen Command.
 *
 * Command is a separate app from the player site, so it cannot import the Keen
 * renderer from `quizkeen/`. What it can do is show the *same* drawing: this is
 * the Omeisaurus recipe from `src/lib/keen-art.ts` in the player repo, with the
 * gradients inlined. Keep the two in step — the admin panel is where a staff
 * member decides who gets the dragon, and it should be the dragon they see.
 */

const NS = 'xmlns="http://www.w3.org/2000/svg"';

export function omeisaurusSvg(size = 96): string {
  const id = "omeisaurus";

  return (
    `<svg ${NS} viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Omeisaurus">` +
    `<defs>` +
    `<linearGradient id="${id}-tile" x1="0.15" y1="0" x2="0.75" y2="1">` +
    `<stop offset="0" stop-color="#8b3ae0"/><stop offset="1" stop-color="#4c1594"/>` +
    `</linearGradient>` +
    `<radialGradient id="${id}-glow" cx="0.5" cy="0.55" r="0.62">` +
    `<stop offset="0" stop-color="#c084fc" stop-opacity="0.5"/>` +
    `<stop offset="0.7" stop-color="#c084fc" stop-opacity="0.12"/>` +
    `<stop offset="1" stop-color="#c084fc" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<linearGradient id="${id}-body" x1="0.2" y1="0" x2="0.75" y2="1">` +
    `<stop offset="0" stop-color="#ff8a5c"/><stop offset="0.45" stop-color="#e2452a"/>` +
    `<stop offset="1" stop-color="#a81f13"/>` +
    `</linearGradient>` +
    `<clipPath id="${id}-clip"><rect x="3" y="3" width="94" height="94" rx="25"/></clipPath>` +
    `</defs>` +
    `<rect x="3" y="3" width="94" height="94" rx="25" fill="url(#${id}-tile)"/>` +
    `<g clip-path="url(#${id}-clip)">` +
    `<ellipse cx="50" cy="52" rx="47" ry="45" fill="url(#${id}-glow)"/>` +
    `<ellipse cx="50" cy="93" rx="33" ry="6" fill="#000" opacity="0.3"/>` +
    // head
    `<path d="M50 13c-9 0-19 2-26 10-6 7-9 18-9 31 0 14 5 24 14 30 8 5 14 7 21 7s13-2 21-7c9-6 14-16 14-30 0-13-3-24-9-31-7-8-17-10-26-10Z" fill="url(#${id}-body)" stroke="#7f1d1d" stroke-width="2.4" stroke-linejoin="round"/>` +
    `<path d="M18 54c0 16 4 27 12 34-6-9-8-21-8-34Z" fill="#ff9a5c" opacity="0.35"/>` +
    `<path d="M82 54c0 16-4 27-12 34 6-9 8-21 8-34Z" fill="#8f1a10" opacity="0.4"/>` +
    // horns
    `<path d="M31 19c-1-7-6-12-12-14 0 8 4 14 10 18Z" fill="#ffe3a3" stroke="#a16207" stroke-width="2" stroke-linejoin="round"/>` +
    `<path d="M69 19c1-7 6-12 12-14 0 8-4 14-10 18Z" fill="#ffe3a3" stroke="#a16207" stroke-width="2" stroke-linejoin="round"/>` +
    // gold flame curls
    `<g fill="none" stroke="#f7c948" stroke-width="3.4" stroke-linecap="round">` +
    `<path d="M50 20c4 5 4 10 0 15"/>` +
    `<path d="M40 24c5 2 8 7 9 12"/>` +
    `<path d="M60 24c-5 2-8 7-9 12"/>` +
    `<path d="M27 37c5 4 7 10 6 17"/>` +
    `<path d="M73 37c-5 4-7 10-6 17"/>` +
    `<path d="M20 63c4 3 6 9 5 14"/>` +
    `<path d="M80 63c-4 3-6 9-5 14"/>` +
    `</g>` +
    `<g fill="#f7c948"><circle cx="50" cy="17" r="2.6"/><path d="M23 52l3-5 3 5-3 5Z"/><path d="M77 52l-3-5-3 5 3 5Z"/></g>` +
    // eyes
    `<ellipse cx="34.5" cy="44" rx="13.5" ry="14" fill="#fff8ef" stroke="#6b1a10" stroke-width="2"/>` +
    `<ellipse cx="65.5" cy="44" rx="13.5" ry="14" fill="#fff8ef" stroke="#6b1a10" stroke-width="2"/>` +
    `<circle cx="36" cy="46" r="8.4" fill="#241318"/><circle cx="64" cy="46" r="8.4" fill="#241318"/>` +
    `<circle cx="33" cy="42" r="3.2" fill="#ffffff"/><circle cx="61" cy="42" r="3.2" fill="#ffffff"/>` +
    `<circle cx="39.5" cy="50" r="1.6" fill="#ffffff" opacity="0.8"/>` +
    `<circle cx="67.5" cy="50" r="1.6" fill="#ffffff" opacity="0.8"/>` +
    // muzzle
    `<path d="M50 57c-9 0-17 3-21 9-4 6-1 13 6 16 5 2 10 3 15 3s10-1 15-3c7-3 10-10 6-16-4-6-12-9-21-9Z" fill="#ffc93c" stroke="#a9540b" stroke-width="2.2"/>` +
    `<ellipse cx="46" cy="64" rx="2.2" ry="1.8" fill="#7f1d1d" opacity="0.7"/>` +
    `<ellipse cx="54" cy="64" rx="2.2" ry="1.8" fill="#7f1d1d" opacity="0.7"/>` +
    `<path d="M34 71c4 7 10 10 16 10s12-3 16-10Z" fill="#5b120c"/>` +
    `<path d="M42 76c2 3 5 4 8 4s6-1 8-4c-2 1-5 2-8 2s-6-1-8-2Z" fill="#e8552a"/>` +
    `<path d="M35 77l3.4-7 3.4 7Z" fill="#fffaf0"/><path d="M57.2 77l3.4-7 3.4 7Z" fill="#fffaf0"/>` +
    `<path d="M27 80c2 6 7 11 13 13l-3-10Z" fill="#f0b429" opacity="0.85"/>` +
    `<path d="M73 80c-2 6-7 11-13 13l3-10Z" fill="#f0b429" opacity="0.85"/>` +
    `</g>` +
    `<rect x="3" y="3" width="94" height="94" rx="25" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.4"/>` +
    `</svg>`
  );
}
