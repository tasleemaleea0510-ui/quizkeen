import { promises as dns } from "node:dns";

/**
 * Is this a real, deliverable email address?
 *
 * Signup used to accept anything the browser's `type="email"` field let through,
 * so `nisse@kk` and `x@uhuyu` became working accounts. This module is the server
 * side of the answer: strict syntax AND a DNS check that the domain can actually
 * receive mail.
 *
 * Two deliberate decisions:
 *  - A domain with no MX record but an A record is accepted (RFC 5321 says mail
 *    may fall back to the address record), so an unusual-but-real domain still
 *    works while `kk` / `uhuyu` (which resolve to nothing) do not.
 *  - A DNS failure we can't interpret — timeout, SERVFAIL — is NOT treated as
 *    "fake". Giving someone a hard error because our resolver hiccuped is worse
 *    than letting a junk address through, so those fail open. Unknown domains
 *    (NXDOMAIN / no records at all) fail closed, which is the case that matters.
 *
 * Server-only: it imports node:dns, so it must never reach a client bundle.
 */

export type EmailVerdict =
  | { ok: true; email: string }
  | { ok: false; reason: "syntax" | "domain" };

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

  const mx = await probe(dns.resolveMx, key);
  let ok: boolean;
  if (mx === true) ok = true;
  else if (mx === "unknown") ok = true; // fail open, see the note at the top
  else {
    // No MX: RFC 5321 lets mail fall back to the address record.
    const a = await probe(dns.resolve4, key);
    ok = a !== false;
  }

  dnsCache.set(key, { ok, at: Date.now() });
  return ok;
}

/** The full check used at signup. */
export async function checkEmail(raw: string): Promise<EmailVerdict> {
  const email = normalizeEmail(raw);
  if (!emailSyntaxOk(email)) return { ok: false, reason: "syntax" };
  const reachable = await domainCanReceiveMail(email.split("@")[1]);
  if (!reachable) return { ok: false, reason: "domain" };
  return { ok: true, email };
}

/** Usernames: 3–20 characters, letters (Swedish ones too), digits or _. */
export const USERNAME_RE = /^[A-Za-zÅÄÖåäö0-9_]{3,20}$/;
