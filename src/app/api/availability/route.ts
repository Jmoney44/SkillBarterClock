import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** GET /api/availability?userId=… (defaults to the signed-in member). */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = new URL(request.url).searchParams.get("userId") ?? user.id;
  if (!uuidPattern.test(userId)) {
    return NextResponse.json({ error: "Choose a valid member." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_availability", { p_user_id: userId });
  if (error) {
    console.error("Could not load availability:", error);
    return NextResponse.json({ error: "Could not load availability." }, { status: 500 });
  }
  return NextResponse.json(data ?? { timeZone: null, windows: [] });
}

/** PUT /api/availability { timeZone, windows: [{ weekday, startMinute, endMinute }] } */
export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const timeZone = typeof body?.timeZone === "string" ? body.timeZone : "";
  const windows = Array.isArray(body?.windows) ? body.windows : null;
  if (!timeZone || timeZone.length > 64 || !windows || windows.length > 42) {
    return NextResponse.json({ error: "Choose a time zone and no more than 42 time ranges." }, { status: 400 });
  }
  const parsed = windows.map((window) => {
    const value = window as Record<string, unknown>;
    return { weekday: value.weekday, start_minute: value.startMinute, end_minute: value.endMinute };
  });
  if (parsed.some((window) => [window.weekday, window.start_minute, window.end_minute].some((n) => typeof n !== "number" || !Number.isInteger(n)))) {
    return NextResponse.json({ error: "Each time range needs a day, start, and end." }, { status: 400 });
  }

  const { error } = await supabase.rpc("set_my_availability", { p_time_zone: timeZone, p_windows: parsed });
  if (error) {
    if (error.code === "28000") return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (error.code === "22023") return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Could not save availability:", error);
    return NextResponse.json({ error: "Could not save your availability." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
