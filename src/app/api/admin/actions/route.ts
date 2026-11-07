import { NextResponse } from "next/server";
import { sendQueuedEmailsSoon } from "@/lib/notifications/outbox";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ActionBody = {
  action?: unknown;
  memberId?: unknown;
  sessionId?: unknown;
  reviewId?: unknown;
  announcementId?: unknown;
  amount?: unknown;
  reason?: unknown;
};

/**
 * POST /api/admin/actions: one endpoint for admin tools. Each action runs a
 * database function that checks the caller is an admin and records the action
 * and reason in the audit log.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ActionBody | null;
  const action = typeof body?.action === "string" ? body.action : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const id = (value: unknown) => (typeof value === "string" && uuidPattern.test(value) ? value : null);
  if (reason.length < 3 || reason.length > 300) {
    return NextResponse.json({ error: "Give a reason of 3 to 300 characters." }, { status: 400 });
  }

  let rpc: PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;
  switch (action) {
    case "suspend_member":
    case "unsuspend_member": {
      const memberId = id(body?.memberId);
      if (!memberId) return NextResponse.json({ error: "Choose a valid member." }, { status: 400 });
      rpc = supabase.rpc(action === "suspend_member" ? "admin_suspend_member" : "admin_unsuspend_member", { p_user_id: memberId, p_reason: reason });
      break;
    }
    case "adjust_credits": {
      const memberId = id(body?.memberId);
      const amount = typeof body?.amount === "number" ? body.amount : Number.NaN;
      if (!memberId || !Number.isFinite(amount)) return NextResponse.json({ error: "Choose a member and an amount." }, { status: 400 });
      rpc = supabase.rpc("admin_adjust_credits", { p_user_id: memberId, p_amount: amount, p_reason: reason });
      break;
    }
    case "hide_review":
    case "unhide_review": {
      const reviewId = id(body?.reviewId);
      if (!reviewId) return NextResponse.json({ error: "Choose a valid review." }, { status: 400 });
      rpc = supabase.rpc("admin_set_review_hidden", { p_review_id: reviewId, p_hidden: action === "hide_review", p_reason: reason });
      break;
    }
    case "cancel_session":
    case "complete_session": {
      const sessionId = id(body?.sessionId);
      if (!sessionId) return NextResponse.json({ error: "Choose a valid session." }, { status: 400 });
      rpc = supabase.rpc("admin_resolve_session", { p_session_id: sessionId, p_resolution: action === "cancel_session" ? "cancel" : "complete", p_reason: reason });
      break;
    }
    case "delete_announcement": {
      const announcementId = id(body?.announcementId);
      if (!announcementId) return NextResponse.json({ error: "Choose a valid announcement." }, { status: 400 });
      rpc = supabase.rpc("admin_delete_announcement", { p_announcement_id: announcementId, p_reason: reason });
      break;
    }
    default:
      return NextResponse.json({ error: "Choose a valid admin action." }, { status: 400 });
  }

  const { data, error } = await rpc;
  if (error) {
    if (error.code === "42501") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    if (error.code === "22023") return NextResponse.json({ error: error.message }, { status: 400 });
    if (error.code === "P0002") return NextResponse.json({ error: error.message }, { status: 404 });
    console.error(`Admin action ${action} failed:`, error);
    return NextResponse.json({ error: "Could not complete that action." }, { status: 500 });
  }

  // Suspension also blocks sign-in at Supabase Auth, so the member can't refresh their session.
  let warning = "";
  if (action === "suspend_member" || action === "unsuspend_member") {
    const admin = createSupabaseAdminClient();
    const { error: banError } = admin
      ? await admin.auth.admin.updateUserById(body!.memberId as string, { ban_duration: action === "suspend_member" ? "876000h" : "none" })
      : { error: new Error("SUPABASE_SERVICE_ROLE_KEY is not set") };
    if (banError) {
      console.error("Could not update sign-in ban:", banError);
      warning = action === "suspend_member"
        ? "The member is suspended in the app, but their sign-in couldn’t be blocked."
        : "The member is unsuspended in the app, but their sign-in block couldn’t be removed.";
    }
  }

  sendQueuedEmailsSoon();
  return NextResponse.json({ success: true, result: data ?? null, warning });
}
