import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: string; email?: string; password?: string } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
  }
  if (
    name.length < 2
    || name.length > 80
    || email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || password.length < 8
    || password.length > 128
  ) {
    return NextResponse.json(
      { error: "Enter a valid name and email, and use a password between 8 and 128 characters." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: new URL("/auth/callback?next=/onboarding", siteUrl).toString(),
    },
  });

  if (error) {
    const duplicate = /already registered|already exists/i.test(error.message);
    return NextResponse.json(
      { error: duplicate ? "An account with that email already exists." : error.message },
      { status: duplicate ? 409 : 400 },
    );
  }

  return NextResponse.json({
    success: true,
    requiresEmailConfirmation: !data.session,
    user: data.user ? { id: data.user.id, name, email: data.user.email ?? email } : null,
  });
}
