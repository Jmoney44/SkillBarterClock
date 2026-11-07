import type { createSupabaseServerClient } from "./server";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Closes the signed-in member's sessions whose time has passed (expired
 * requests, no-shows, and sessions never ended) so held credits never get
 * stuck. pg_cron also runs this for everyone; this call keeps reads current
 * between cron runs. Failures are logged and do not block the request.
 */
export async function resolveMyStaleSessions(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("resolve_my_stale_sessions");
  if (error) console.error("Could not resolve stale sessions:", error);
}
