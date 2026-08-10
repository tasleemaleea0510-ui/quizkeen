import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
          } catch {}
        },
      },
    }
  );

  try {
    const { data } = await client.auth.getSession();
    if (!data.session) {
      const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host.split('.')[0];
      const raw = cookieStore.get(`sb-${ref}-auth-token`)?.value;
      if (raw) {
        let parsed: any = null;
        try { parsed = JSON.parse(raw); } catch {}
        if (!parsed) { try { parsed = JSON.parse(decodeURIComponent(raw)); } catch {} }
        if (!parsed) { try { parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); } catch {} }
        if (parsed && parsed.access_token) {
          await client.auth.setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token || parsed.access_token,
          });
        }
      }
    }
  } catch {}

  return client;
}