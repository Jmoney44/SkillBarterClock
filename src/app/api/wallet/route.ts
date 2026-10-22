import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/profile";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [profile, transactionsResult] = await Promise.all([
    getProfile(supabase, user),
    supabase
      .from("wallet_transactions")
      .select("id, kind, title, detail, amount, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (transactionsResult.error) {
    console.error("Could not load wallet transactions:", transactionsResult.error);
    return NextResponse.json({ error: "Could not load wallet activity." }, { status: 500 });
  }

  return NextResponse.json({
    balance: profile.balance,
    pending: profile.pending,
    transactions: transactionsResult.data,
  });
}
