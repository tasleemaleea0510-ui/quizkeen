import { promises as dns } from "node:dns";

/**
 * Is this a real, deliverable email address?
 *
 * Signup used to accept anything the browser's `type="email"` field let through,
 * so `nisse@kk` and `x@uhuyu` became working accounts. This module is the server
 * side of the answer: strict syntax, a check that the domain is a mailbox domain
 * rather than somebody's website, and a DNS check that it can receive mail.
 *
 * What this can never do is prove that a particular *mailbox* exists. Nobody can:
 * Gmail (like every large provider) refuses SMTP lookups, so `aaa@gmail.com`
 * looks exactly as valid as `yourname@gmail.com`. The only real proof is the
 * confirmation mail — the link goes to a mailbox that has to exist for anyone to
 * click it. That is why email confirmation must stay switched on in Supabase.
 *
 * Deliberate decisions:
 *  - A provider's own domain is the only one that has its mailboxes. `www.gmail.com`
 *    resolves in DNS (it is Google's website) but is not a Gmail mailbox, which is
 *    how `AAA@WWW.gmail.com` slipped through, so subdomains of known providers are
 *    rejected outright.
 *  - An MX record is required. RFC 5321 still allows mail to fall back to the
 *    address record, but no real mail server accepts that, so a zero-MX domain can
 *    only ever produce an account whose confirmation mail bounces.
 *  - A domain one typo away from a big provider (`gnail.com`, `gmial.com`) is
 *    reported as a typo rather than quietly accepted.
 *  - A DNS failure we can't interpret — timeout, SERVFAIL — is NOT treated as
 *    "fake". Giving someone a hard error because our resolver hiccuped is worse
 *    than letting a junk address through, so those fail open. Unknown domains
 *    (NXDOMAIN / no records at all) fail closed, which is the case that matters.
 *
 * Server-only: it imports node:dns, so it must never reach a client bundle.
 */

export type EmailVerdict =
  | { ok: true; email: string }
  | { ok: false; reason: "syntax" | "domain" | "provider" | "typo"; provider?: string; suggest?: string };

/**
 * Domains where the mailbox *is* the domain, i.e. the provider's own name.
 * Anything under one of these (`www.gmail.com`, `mail.hotmail.com`) is a website
 * hostname and never an address.
 */
const PROVIDER_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "tutanota.com",
  "tuta.io",
  "fastmail.com",
  "qq.com",
  "163.com",
  "126.com",
  "web.de",
];

/** The provider this domain sits under, when it is a subdomain of one. */
export function providerOf(domain: string): string | null {
  const d = (domain || "").toLowerCase();
  const hit = PROVIDER_DOMAINS.find((p) => d.endsWith(`.${p}`));
  return hit ?? null;
}

/**
 * The closest big provider, if this domain is one edit away from it.
 *
 * A plain keypress slip: `gnail.com`, `gmial.com`, `hotmial.com`. Those resolve
 * and even accept mail, so DNS alone cannot catch them.
 */
const POPULAR = ["gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "live.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com", "aol.com"];

/** Optimal-string-alignment distance, stopping as soon as it exceeds `max`. */
function almostEqual(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows.push(new Array(b.length + 1).fill(0));
    rows[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      // Adjacent transposition — the most common slip of all (`gmial`).
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, rows[i - 2][j - 2] + 1);
      }
      rows[i][j] = v;
      if (v < best) best = v;
    }
    if (best > max) return false;
  }
  return rows[a.length][b.length] <= max;
}

export function likelyProvider(domain: string): string | null {
  const d = (domain || "").toLowerCase();
  if (!d) return null;
  const hit = POPULAR.find((p) => p !== d && almostEqual(d, p, 1));
  return hit ?? null;
}

/** name@domain.tld — no spaces, a real TLD, at least one dot in the domain. */
const SYNTAX = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$/;

const TTL_MS = 10 * 60 * 1000;
const dnsCache = new Map<string, { ok: boolean; at: number }>();

export function normalizeEmail(raw: string): string {
  return (raw || "").trim().toLowerCase();
}

/** Cheap, synchronous shape check — used for instant feedback and before DNS. */
export function emailSyntaxOk(email: string): boolean {
  if (!email || email.length > 254) return false;
  if ((email.match(/@/g) || []).length !== 1) return false;
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  if (local.length > 64 || domain.length > 253) return false;
  if (domain.includes("..") || !domain.includes(".")) return false;
  return SYNTAX.test(email);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      const err: any = new Error("dns timeout");
      err.code = "ETIMEOUT";
      reject(err);
    }, ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

type Probe = true | false | "unknown";

async function probe(fn: (domain: string) => Promise<unknown>, domain: string): Promise<Probe> {
  try {
    const res = await withTimeout(fn(domain), 4000);
    return Array.isArray(res) && res.length > 0;
  } catch (e: any) {
    const code = e?.code;
    // "we couldn't reach a verdict" — don't punish the person signing up.
    if (code === "ETIMEOUT" || code === "EAI_AGAIN" || code === "ESERVFAIL" || code === "EREFUSED") return "unknown";
    return false;
  }
}

/**
 * true  — the domain can take mail (or we couldn't tell, so we allow it)
 * false — the domain does not exist / takes no mail
 */
export async function domainCanReceiveMail(domain: string): Promise<boolean> {
  const key = (domain || "").toLowerCase();
  if (!key) return false;
  const hit = dnsCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.ok;

  // MX or nothing: a domain whose only record is an address record cannot take
  // the confirmation mail, so admitting it just creates a dead account.
  const mx = await probe(dns.resolveMx, key);
  const ok = mx !== false; // "unknown" fails open, see the note at the top

  dnsCache.set(key, { ok, at: Date.now() });
  return ok;
}

/** The full check used at signup. */
export async function checkEmail(raw: string): Promise<EmailVerdict> {
  const email = normalizeEmail(raw);
  if (!emailSyntaxOk(email)) return { ok: false, reason: "syntax" };

  const domain = email.split("@")[1];

  // Free checks first: they need no lookup, and they catch the case DNS cannot
  // — a website hostname that resolves perfectly well.
  const provider = providerOf(domain);
  if (provider) return { ok: false, reason: "provider", provider };

  const suggest = likelyProvider(domain);
  if (suggest) return { ok: false, reason: "typo", suggest };

  const reachable = await domainCanReceiveMail(domain);
  if (!reachable) return { ok: false, reason: "domain" };
  return { ok: true, email };
}

/** Usernames: 3–20 characters, letters (Swedish ones too), digits or _. */
export const USERNAME_RE = /^[A-Za-zÅÄÖåäö0-9_]{3,20}$/;
