import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_admin_overview");
  if (error) {
    if (error.code === "42501") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    console.error("Could not load admin overview:", error);
    return NextResponse.json({ error: "Could not load the admin overview." }, { status: 500 });
  }

  return NextResponse.json(data);
}
