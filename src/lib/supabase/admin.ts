// Service-role Supabase client for trusted server code only (the notification
// sender). It bypasses row-level security: never import this from a client
// component, and never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
