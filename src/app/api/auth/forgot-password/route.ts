import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL("/auth/callback?next=/reset-password", siteUrl).toString(),
  });

  if (error?.status === 429) {
    return NextResponse.json(
      { error: "Too many reset requests. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }
  if (error) {
    // Don't reveal whether the address has an account; log for operators instead.
    console.error("Could not send password reset email:", error);
  }

  return NextResponse.json({ success: true });
}
