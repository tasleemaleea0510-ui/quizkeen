/**
 * Where a visitor is connecting from.
 *
 * Every request that reaches a server action carries the caller's address in
 * `x-forwarded-for` (Vercel, Render and local `next start` all set it). Turning
 * that into a country used to be the owner console's weakest feature: it read
 * `user_metadata.ip`, a value nothing ever wrote, so every player showed up as
 * "okänd" no matter where they were. This module is the one place that reads
 * the address and resolves it to a country/city.
 *
 * The address itself is stored in full, because "two accounts, one connection"
 * cannot be answered with half of one. Who may read it is decided in one place
 * — app/system/moderation.ts — so that rule cannot drift from the screens that
 * draw it.
 */

export type Geo = {
  country: string | null;
  countryCode: string | null;
  city: string | null;
};

/** First hop in `x-forwarded-for`; that is the client, the rest are proxies. */
export function clientIp(h: Headers): string | null {
  const forwarded = h.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  const raw = first || h.get("x-real-ip") || h.get("cf-connecting-ip") || "";
  if (!raw) return null;

  // "[2a02::1]:443" keeps the port inside brackets; "95.1.2.3:443" does not.
  // Stripping `:\d+$` blindly turned "::1" into ":" and then happily stored a
  // one-character "address".
  let ip = raw;
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(ip);
  if (bracketed) ip = bracketed[1];
  else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.replace(/:\d+$/, "");

  if (!ip || ip === "unknown") return null;
  if (ip === "::1" || ip.startsWith("127.")) return null;
  return ip;
}

/** Loopback and RFC1918 ranges carry no country, so never spend a lookup on them. */
export function isPrivateIp(ip: string): boolean {
  if (ip.startsWith("10.") || ip.startsWith("127.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.") || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  const m = /^172\.(\d+)\./.exec(ip);
  return !!m && Number(m[1]) >= 16 && Number(m[1]) <= 31;
}

/** 🇸🇪 from "SE" — two regional-indicator letters. */
export function flagFor(code: string | null | undefined): string {
  const cc = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🌍";
  return String.fromCodePoint(...cc.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** "Sverige" from "SE", in Swedish, without shipping a country table. */
export function countryName(code: string | null | undefined, fallback?: string | null): string {
  const cc = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return fallback?.trim() || "okänt land";
  try {
    return new Intl.DisplayNames(["sv"], { type: "region" }).of(cc) || fallback || cc;
  } catch {
    return fallback || cc;
  }
}

/**
 * Country and city for one address, cheapest source first.
 *
 * Vercel adds the answer to every request as headers, so production pays
 * nothing. Anywhere else (Render, a laptop) one lookup goes to ipwho.is, a
 * keyless endpoint that answers in ~100 ms. A failure returns null and the
 * caller keeps whatever it had: geolocation must never break a presence ping.
 */
export async function resolveGeo(h: Headers, ip: string): Promise<Geo | null> {
  const hdrCountry = h.get("x-vercel-ip-country") || h.get("cf-ipcountry");
  if (hdrCountry) {
    let city: string | null = null;
    try {
      const rawCity = h.get("x-vercel-ip-city");
      city = rawCity ? decodeURIComponent(rawCity) : null;
    } catch {
      city = h.get("x-vercel-ip-city");
    }
    return { country: null, countryCode: hdrCountry.toUpperCase(), city };
  }

  if (isPrivateIp(ip)) return null;

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,country_code,city`, {
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (!data?.success) return null;
    return {
      country: typeof data.country === "string" ? data.country : null,
      countryCode: typeof data.country_code === "string" ? data.country_code.toUpperCase() : null,
      city: typeof data.city === "string" ? data.city : null,
    };
  } catch {
    return null;
  }
}

