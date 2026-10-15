import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase/client";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

/**
 * True only when a real service key is configured — NOT when we fell back to
 * the public anon key.
 *
 * The anon key can't reach Supabase's admin endpoints, so without this flag a
 * caller cannot tell "the key is missing" from "the user doesn't exist" and
 * may end up failing closed on every request. See createProfile in
 * app/register/actions.ts, which uses it to pick a safe fallback.
 */
export const hasServiceRoleKey = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== SUPABASE_ANON_KEY
);

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  serviceRoleKey
);