import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfile(supabase, user);
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (title.length < 3 || title.length > 100 || message.length < 5 || message.length > 500) {
    return NextResponse.json(
      { error: "Use a title of 3–100 characters and a message of 5–500 characters." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("admin_announcements").insert({
    author_id: user.id,
    title,
    message,
  });

  if (error) {
    console.error("Could not publish admin announcement:", error);
    return NextResponse.json({ error: "Could not publish the announcement." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
