import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const actions = new Set(["accept", "decline", "start", "end", "cancel"]);

type SessionAction = "accept" | "decline" | "start" | "end" | "cancel";

function badRequestJson(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_my_sessions");
  if (error) {
    console.error("Could not load sessions:", error);
    return NextResponse.json({ error: "Could not load sessions." }, { status: 500 });
  }

  const sessions = (data ?? []).map((session: {
    learner_id: string;
    teacher_id: string;
  }) => ({
    ...session,
    role: session.learner_id === user.id ? "learner" : "teacher",
  }));

  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestJson("Request body must be valid JSON.");
  }

  if (!body || typeof body !== "object") {
    return badRequestJson("Enter the session details.");
  }

  const values = body as Record<string, unknown>;
  const teacherId = typeof values.teacherId === "string" ? values.teacherId : "";
  const skill = typeof values.skill === "string" ? values.skill.trim() : "";
  const scheduledAt = typeof values.scheduledAt === "string" ? values.scheduledAt : "";
  const durationHours = values.durationHours;
  const learnerNote = typeof values.note === "string" ? values.note.trim() : "";

  if (!uuidPattern.test(teacherId)) {
    return badRequestJson("Choose a valid teacher.");
  }
  if (
    !skill
    || skill.length > 80
    || !scheduledAt
    || Number.isNaN(Date.parse(scheduledAt))
    || typeof durationHours !== "number"
    || !Number.isFinite(durationHours)
    || learnerNote.length > 500
  ) {
    return badRequestJson("Check the skill, time, session length, and note.");
  }

  const { data: sessionId, error } = await supabase.rpc("request_session", {
    p_teacher_id: teacherId,
    p_skill: skill,
    p_scheduled_at: new Date(scheduledAt).toISOString(),
    p_duration_hours: durationHours,
    p_learner_note: learnerNote,
  });

  if (error) {
    if (error.code === "28000") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (["22023", "23514", "P0001"].includes(error.code ?? "")) {
      return badRequestJson(error.message);
    }
    console.error("Could not create session request:", error);
    return NextResponse.json({ error: "Could not create the session request." }, { status: 500 });
  }

  return NextResponse.json({ success: true, sessionId }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestJson("Request body must be valid JSON.");
  }

  if (!body || typeof body !== "object") {
    return badRequestJson("Enter the session action.");
  }

  const values = body as Record<string, unknown>;
  const sessionId = typeof values.sessionId === "string" ? values.sessionId : "";
  const action = typeof values.action === "string" ? values.action : "";
  if (!uuidPattern.test(sessionId) || !actions.has(action)) {
    return badRequestJson("Choose a valid session and action.");
  }

  const { data: status, error } = await supabase.rpc("act_on_session", {
    p_session_id: sessionId,
    p_action: action as SessionAction,
  });

  if (error) {
    if (error.code === "28000") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (["22023", "23514", "P0001", "P0002"].includes(error.code ?? "")) {
      return NextResponse.json({ error: error.message }, { status: error.code === "P0002" ? 404 : 400 });
    }
    console.error("Could not update session:", error);
    return NextResponse.json({ error: "Could not update the session." }, { status: 500 });
  }

  return NextResponse.json({ success: true, status });
}
