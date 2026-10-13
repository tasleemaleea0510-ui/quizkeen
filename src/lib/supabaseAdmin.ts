import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase/client";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  serviceRoleKey
);