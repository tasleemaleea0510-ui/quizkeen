import { NextResponse } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/client";
import { supabaseAdmin, hasServiceRoleKey } from "@/lib/supabaseAdmin";
import { authErrorSv } from "@/lib/auth-messages";

export const dynamic = "force-dynamic";
/** Supabase's front door can hang; the 10 s Hobby limit must fit the fallback too. */
export const maxDuration = 10;

/**
 * Create the auth account from QuizKeen's own origin.
 *
 * Two things went wrong when the browser called `supabase.co` directly:
 *
 * 1. The student's network sat between the form and the auth service. A school
 *    proxy — or a hiccup at Supabase's gateway — answers 504, and auth-js
 *    reports that as the literal string "HTTP 504", because HTTP/2 responses
 *    carry no status text.
 * 2. Supabase's own signup endpoint hangs when its confirmation mail cannot be
 *    sent (observed: a direct call never answers, `/resend` hangs too, while
 *    sign-in and the admin API answer in well under a second). Creating an
 *    account therefore failed for everyone, not just on one network.
 *
 * So the call happens here. The proper path — signup with a confirmation mail —
 * is tried first, so nothing changes the day mail delivery works again. If that
 * path fails at the gateway, the account is created through the admin API and
 * signed in immediately, and the client says plainly that no mail was sent.
 * Creating a user through the admin API takes ~0.4 s, so the student is not
 * left staring at a spinner either.
 */
const SIGNUP_TIMEOUT_MS = 4_000;
const GRANT_TIMEOUT_MS = 6_000;

type GoTrueUser = {
  id?: string;
  email?: string;
  identities?: unknown[];
};

type GoTrueBody = {
  user?: GoTrueUser | null;
  access_token?: string;
  refresh_token?: string;
  msg?: string;
  message?: string;
  error_description?: string;
  error?: string;
};

type Attempt = { status: number; json: GoTrueBody | null } | { status: 0; json: null };

async function askGoTrue(email: string, password: string): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SIGNUP_TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    let json: GoTrueBody | null = null;
    try {
      json = JSON.parse(text) as GoTrueBody;
    } catch {
      json = null;
    }
    return { status: res.status, json };
  } catch {
    // Timeout or connection failure: the gateway never answered.
    return { status: 0, json: null };
  } finally {
    clearTimeout(timer);
  }
}

/** The same tokens a successful signup would have returned. */
async function passwordGrant(email: string, password: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(GRANT_TIMEOUT_MS),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as GoTrueBody | null;
    if (!res.ok || !body?.access_token || !body.refresh_token) return null;
    return { access_token: body.access_token, refresh_token: body.refresh_token };
  } catch {
    return null;
  }
}

/**
 * The no-mail path: a confirmed account, made with the service key.
 *
 * Only reachable when Supabase's own signup could not answer. The account is
 * confirmed because there is no way to deliver a confirmation link; the profile
 * is still created separately, and the email still has to pass the same DNS
 * check in `createProfile`.
 */
async function createConfirmed(email: string, password: string) {
  if (!hasServiceRoleKey) return { ok: false as const, error: "Konton kan inte skapas just nu — försök igen senare." };

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    const message = String(error.message || "");
    if (/already (been )?registered|already exists/i.test(message)) {
      return { ok: true as const, existing: true as const };
    }
    return { ok: false as const, error: authErrorSv(message) };
  }

  const userId = data?.user?.id;
  if (!userId) return { ok: false as const, error: "Kontot kunde inte skapas — försök igen." };

  // The browser adopts this session, so the student lands signed in rather than
  // being asked for the password they just typed.
  const session = await passwordGrant(email, password);
  return { ok: true as const, existing: false as const, userId, session };
}

export async function POST(req: Request) {
  let body: { email?: string; password?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ogiltig begäran." }, { status: 400 });
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "E-post och lösenord krävs." }, { status: 400 });
  }

  const answer = await askGoTrue(email, password);
  const json = answer.json;

  // The proper path answered with a real verdict.
  if (answer.status >= 200 && answer.status < 500 && json) {
    if (answer.status >= 400) {
      const raw = json.msg || json.message || json.error_description || json.error || "";
      return NextResponse.json({ ok: false, error: authErrorSv(raw) }, { status: 200 });
    }

    const user = json.user ?? null;
    const hasSession = Boolean(json.access_token && json.refresh_token);

    // With email confirmations on, GoTrue answers a duplicate address with a
    // decoy user that has no identities — deliberately, so the endpoint cannot
    // be used to discover who has an account. We can still tell the person the
    // one thing that helps: sign in instead.
    if (!user || (Array.isArray(user.identities) && user.identities.length === 0)) {
      return NextResponse.json({ ok: true, existing: true }, { status: 200 });
    }

    return NextResponse.json(
      {
        ok: true,
        existing: false,
        userId: user.id,
        hasSession,
        noMail: false,
        session: hasSession ? { access_token: json.access_token, refresh_token: json.refresh_token } : null,
      },
      { status: 200 }
    );
  }

  // Gateway timeout, 5xx, or an answer we cannot read: send the mail is what is
  // broken, so make the account without it.
  const fallback = await createConfirmed(email, password);
  if (!fallback.ok) return NextResponse.json({ ok: false, error: fallback.error }, { status: 200 });
  if (fallback.existing) return NextResponse.json({ ok: true, existing: true }, { status: 200 });

  return NextResponse.json(
    {
      ok: true,
      existing: false,
      userId: fallback.userId,
      hasSession: Boolean(fallback.session),
      noMail: true,
      session: fallback.session,
    },
    { status: 200 }
  );
}
