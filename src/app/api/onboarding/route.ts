import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const skills = (items: unknown) => Array.isArray(items)
    ? [...new Set(items.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))]
    : [];
  const teaching = skills(body?.teaching);
  const learning = skills(body?.learning);
  const timezone = typeof body?.timezone === "string" ? body.timezone.trim() : "";
  const availability = typeof body?.availability === "string" ? body.availability.trim() : "";

  if (!teaching.length || !learning.length || !timezone || !availability) {
    return NextResponse.json(
      { error: "Choose at least one skill to teach and learn, and add your timezone and availability." },
      { status: 400 },
    );
  }
  if (teaching.length > 10 || learning.length > 10 || [...teaching, ...learning].some((skill) => skill.length > 50)) {
    return NextResponse.json({ error: "Use no more than 10 skills in either list, with each under 50 characters." }, { status: 400 });
  }
  if (timezone.length > 80 || availability.length > 120) {
    return NextResponse.json({ error: "Timezone or availability is too long." }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      teaching_skills: teaching,
      learning_skills: learning,
      timezone,
      availability,
      onboarding_complete: true,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: `Could not save onboarding: ${error.message}` }, { status: 500 });
  }

  const profile = await getProfile(supabase, user);
  return NextResponse.json({ success: true, user: profile });
}
