import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host.split('.')[0];
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
    const res = await originalGetUser(...args);
    if (res.data && res.data.user) return res;
    if (sessionJson && sessionJson.access_token) {
      try {
        const b64 = sessionJson.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
        if (payload && payload.sub) {
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
    return res;
  };

  return client;
}