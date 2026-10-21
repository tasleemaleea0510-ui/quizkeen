/**
 * How the console is allowed to talk about an address.
 *
 * The student app records the country, city and (masked-at-display) address on
 * every presence ping; this file only formats what it finds. Duplicated from
 * the student app's lib/geo.ts because the two deployments build separately.
 */

export function maskIp(ip: string | null | undefined): string {
  if (!ip) return "okänd";
  if (ip.includes(":")) return `${ip.split(":").slice(0, 4).join(":")}:…`;
  const parts = ip.split(".");
  if (parts.length !== 4) return ip;
  return `${parts[0]}.${parts[1]}.x.x`;
}

export function flagFor(code: string | null | undefined): string {
  const cc = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🌍";
  return String.fromCodePoint(...cc.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function countryName(code: string | null | undefined, fallback?: string | null): string {
  const cc = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return fallback?.trim() || "okänt land";
  try {
    return new Intl.DisplayNames(["sv"], { type: "region" }).of(cc) || fallback || cc;
  } catch {
    return fallback || cc;
  }
}

/** "🇸🇪 Sverige · Stockholm · 95.12.x.x", or a clear "not seen yet". */
export function describeLocation(p: {
  lastIp?: string | null;
  ipCountry?: string | null;
  ipCountryCode?: string | null;
  ipCity?: string | null;
  ipAt?: Date | null;
}): string {
  if (!p.lastIp && !p.ipAt) return "Ingen plats sparad än — personen måste vara inloggad i QuizKeen en stund.";
  const country = p.ipCountryCode ? countryName(p.ipCountryCode, p.ipCountry) : p.ipCountry;
  const bits = [country, p.ipCity, p.lastIp ? maskIp(p.lastIp) : null].filter(Boolean);
  return bits.length ? `${flagFor(p.ipCountryCode)} ${bits.join(" · ")}` : "Ingen plats sparad än";
}
