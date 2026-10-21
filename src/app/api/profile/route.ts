import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfile(supabase, user);
  return NextResponse.json({ user: profile });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
  const name = text(body?.name);
  const email = text(body?.email).toLowerCase();
  const bio = text(body?.bio);
  const location = text(body?.location);
  const timezone = text(body?.timezone);
  const availability = text(body?.availability);
  const normalizeList = (items: unknown) => (
    Array.isArray(items)
      ? [...new Set(items.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))]
      : []
  );
  const languages = normalizeList(body?.languages);
  const teaching = normalizeList(body?.teaching);
  const learning = normalizeList(body?.learning);

  if (
    !name
    || name.length < 2
    || name.length > 80
    || !email
    || email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return NextResponse.json({ error: "Enter a valid name and email address." }, { status: 400 });
  }
  if (bio.length > 500 || location.length > 100 || !timezone || !availability) {
    return NextResponse.json({ error: "Check your bio, location, timezone, and availability fields." }, { status: 400 });
  }
  if (languages.length > 10 || teaching.length > 10 || learning.length > 10) {
    return NextResponse.json({ error: "Add no more than 10 items to each skills or languages list." }, { status: 400 });
  }
  if (
    [...languages, ...teaching, ...learning].some((item) => item.length > 50)
    || availability.length > 120
    || timezone.length > 80
  ) {
    return NextResponse.json({ error: "One or more profile fields are too long." }, { status: 400 });
  }

  let emailChangePending = false;
  if (email !== (user.email ?? "").toLowerCase()) {
    const { data, error } = await supabase.auth.updateUser({ email });
    if (error) {
      const duplicate = /already registered|already exists/i.test(error.message);
      return NextResponse.json(
        { error: duplicate ? "That email address is already in use." : error.message },
        { status: duplicate ? 409 : 400 },
      );
    }
    emailChangePending = data.user.email?.toLowerCase() !== email;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      full_name: name,
      bio,
      location,
      languages,
      timezone,
      availability,
      teaching_skills: teaching,
      learning_skills: learning,
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: `Could not save profile: ${updateError.message}` }, { status: 500 });
  }

  const { data: { user: updatedAuthUser } } = await supabase.auth.getUser();
  const profile = await getProfile(supabase, updatedAuthUser ?? user);
  return NextResponse.json({ success: true, emailChangePending, user: profile });
}
