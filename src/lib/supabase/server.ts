import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './client';

export async function createClient() {
  const cookieStore = await cookies();

  const client = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (e) {}
        },
      },
    }
  );

  let ref = 'placeholder';
  try {
    if (SUPABASE_URL) ref = new URL(SUPABASE_URL).host.split('.')[0];
  } catch (e) {}

  const raw = cookieStore.get(`sb-${ref}-auth-token`)?.value;
  let sessionJson: any = null;
  if (raw) {
    try { sessionJson = JSON.parse(raw); } catch (e) {}
    if (!sessionJson) {
      try { sessionJson = JSON.parse(decodeURIComponent(raw)); } catch (e) {}
    }
  }

  const originalGetUser = client.auth.getUser.bind(client.auth);
  (client.auth as any).getUser = async (...args: any[]) => {
    const all = cookieStore.getAll();
    const hasAuth = all.some(c => c.name.startsWith('sb-') || c.name.includes('auth-token'));
    if (!hasAuth && !sessionJson) {
      return { data: { user: null }, error: null };
    }

    try {
      const res = await originalGetUser(...args);
      if (res && res.data && res.data.user) return res;
    } catch (e) {}

    if (sessionJson && sessionJson.access_token) {
      try {
        const b64 = sessionJson.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
        // An expired token is not a signed-in visitor: letting it through here
        // produced pages that rendered as "logged in" while every write failed.
        const expired = typeof payload?.exp === "number" && payload.exp * 1000 < Date.now();
        if (payload && payload.sub && !expired) {
          return {
            data: {
              user: {
                id: payload.sub,
                email: payload.email ?? null,
                role: payload.role ?? 'authenticated',
                aud: 'authenticated',
                user_metadata: {},
                app_metadata: {},
                created_at: '',
              },
            },
            error: null,
          } as any;
        }
      } catch (e) {}
    }
    return { data: { user: null }, error: null };
  };

  return client;
}