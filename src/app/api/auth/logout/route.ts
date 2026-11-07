import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACCESS_COOKIE } from "@/lib/access-cookie";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: "Unable to log out. Please try again." }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(ACCESS_COOKIE);
  return response;
}
