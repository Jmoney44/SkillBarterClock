import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** GET /api/availability/slots?teacherId=…&from=ISO&to=ISO: free half-hour slot starts (max 35 days). */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const teacherId = params.get("teacherId") ?? "";
  const from = new Date(params.get("from") ?? "");
  const to = new Date(params.get("to") ?? "");
  if (!uuidPattern.test(teacherId) || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    return NextResponse.json({ error: "Choose a valid teacher and date range." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_teacher_open_slots", {
    p_teacher_id: teacherId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) {
    console.error("Could not load open slots:", error);
    return NextResponse.json({ error: "Could not load open times." }, { status: 500 });
  }
  return NextResponse.json({ slots: ((data ?? []) as { slot_start: string }[]).map((row) => row.slot_start) });
}
