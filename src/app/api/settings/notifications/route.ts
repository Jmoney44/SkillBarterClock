import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** PATCH { emailNotifications: boolean } turns notification emails on or off. */
export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { emailNotifications?: unknown } | null;
  if (typeof body?.emailNotifications !== "boolean") {
    return NextResponse.json({ error: "Choose whether to receive emails." }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ email_notifications: body.emailNotifications })
    .eq("id", user.id);
  if (error) {
    console.error("Could not update email preference:", error);
    return NextResponse.json({ error: "Could not save your email preference." }, { status: 500 });
  }
  return NextResponse.json({ success: true, emailNotifications: body.emailNotifications });
}
