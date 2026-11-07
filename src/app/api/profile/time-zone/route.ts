import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** POST { timeZone } records the member's browser time zone for email times. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { timeZone?: unknown } | null;
  const timeZone = typeof body?.timeZone === "string" ? body.timeZone : "";
  if (!timeZone || timeZone.length > 64) {
    return NextResponse.json({ error: "Choose a valid time zone." }, { status: 400 });
  }

  const { error } = await supabase.rpc("set_my_time_zone", { p_time_zone: timeZone });
  if (error) {
    if (error.code === "22023") return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Could not save time zone:", error);
    return NextResponse.json({ error: "Could not save your time zone." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
