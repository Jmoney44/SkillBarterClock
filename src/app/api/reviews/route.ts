import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendQueuedEmailsSoon } from "@/lib/notifications/outbox";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Rating summary and recent reviews for a teacher: GET /api/reviews?teacherId=… */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const teacherId = new URL(request.url).searchParams.get("teacherId") ?? "";
  if (!uuidPattern.test(teacherId)) {
    return NextResponse.json({ error: "Choose a valid teacher." }, { status: 400 });
  }

  const [summaryResult, reviewsResult] = await Promise.all([
    supabase.rpc("get_teacher_rating", { p_teacher_id: teacherId }).single<{ rating_average: number | string | null; rating_count: number }>(),
    supabase.rpc("get_teacher_reviews", { p_teacher_id: teacherId, p_limit: 20 }),
  ]);
  const error = summaryResult.error ?? reviewsResult.error;
  if (error) {
    console.error("Could not load reviews:", error);
    return NextResponse.json({ error: "Could not load reviews." }, { status: 500 });
  }

  return NextResponse.json({
    ratingAverage: summaryResult.data?.rating_average === null || summaryResult.data?.rating_average === undefined
      ? null
      : Number(summaryResult.data.rating_average),
    ratingCount: summaryResult.data?.rating_count ?? 0,
    reviews: reviewsResult.data ?? [],
  });
}

/** Create or update the learner's review of a completed session. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const rating = body?.rating;
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

  if (!uuidPattern.test(sessionId)) {
    return NextResponse.json({ error: "Choose a valid session." }, { status: 400 });
  }
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Choose a rating from 1 to 5 stars." }, { status: 400 });
  }
  if (comment.length > 500) {
    return NextResponse.json({ error: "Reviews must be 500 characters or fewer." }, { status: 400 });
  }

  const { data: reviewId, error } = await supabase.rpc("submit_session_review", {
    p_session_id: sessionId,
    p_rating: rating,
    p_comment: comment,
  });
  if (error) {
    if (error.code === "28000") return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (["22023", "P0002"].includes(error.code ?? "")) {
      return NextResponse.json({ error: error.message }, { status: error.code === "P0002" ? 404 : 400 });
    }
    console.error("Could not save review:", error);
    return NextResponse.json({ error: "Could not save your review." }, { status: 500 });
  }

  sendQueuedEmailsSoon();
  return NextResponse.json({ success: true, reviewId });
}
