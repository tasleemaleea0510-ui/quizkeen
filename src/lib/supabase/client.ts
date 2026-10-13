import { createBrowserClient } from '@supabase/ssr';

export const SUPABASE_URL = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";

export const SUPABASE_ANON_KEY = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}