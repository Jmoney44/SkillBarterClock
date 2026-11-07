import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/access-cookie";
import { sendQueuedEmailsSoon } from "@/lib/notifications/outbox";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * DELETE /api/account { password, confirmation: "DELETE" }
 * Deletes the member's sign-in. A database trigger then settles their open
 * sessions (refunding learners) and anonymises their profile, so partners keep
 * their session history. See close_member_account in supabase/schema.sql.
 */
export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Account deletion isn’t available right now. Please contact the community team." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: unknown; confirmation?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (body?.confirmation !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
  }
  if (!password || password.length > 128 || !user.email) {
    return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (profileError) {
    console.error("Could not load profile before account deletion:", profileError);
    return NextResponse.json({ error: "Could not delete your account." }, { status: 500 });
  }
  if (profile.role === "admin") {
    return NextResponse.json(
      { error: "Admin accounts can’t be deleted here. Ask another admin to change your role to member first." },
      { status: 403 },
    );
  }

  // Re-check the password with a throwaway client so the browser session isn't touched.
  const verifier = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: passwordError } = await verifier.auth.signInWithPassword({ email: user.email, password });
  if (passwordError) {
    return NextResponse.json({ error: "That password isn’t correct." }, { status: 400 });
  }

  // Remove profile photos while the member can still act on their own folder.
  const avatars = supabase.storage.from("avatars");
  const { data: files } = await avatars.list(user.id, { limit: 100 });
  if (files?.length) {
    const { error: removeError } = await avatars.remove(files.map((file) => `${user.id}/${file.name}`));
    if (removeError) console.error("Could not remove profile photos during account deletion:", removeError);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Could not delete account:", deleteError);
    return NextResponse.json({ error: "Could not delete your account. Please try again." }, { status: 500 });
  }

  // The sign-in no longer exists; clear this browser's session cookies.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  sendQueuedEmailsSoon(); // Tell partners about cancelled sessions.

  const response = NextResponse.json({ success: true });
  response.cookies.delete(ACCESS_COOKIE);
  return response;
}
