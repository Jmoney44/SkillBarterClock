import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const teacherId = new URL(request.url).searchParams.get("id");
  if (teacherId && !uuidPattern.test(teacherId)) {
    return NextResponse.json({ error: "Invalid teacher ID." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_public_teachers", {
    p_teacher_id: teacherId,
  });

  if (error) {
    console.error("Could not load public teacher profiles:", error);
    return NextResponse.json({ error: "Could not load teacher profiles." }, { status: 500 });
  }

  const teachers = (data ?? []).map((teacher: { avatar_path: string | null }) => {
    const { avatar_path: avatarPath, ...publicTeacher } = teacher;
    return {
      ...publicTeacher,
      avatar_url: avatarPath
      ? supabase.storage.from("avatars").getPublicUrl(avatarPath).data.publicUrl
      : "",
    };
  });

  return NextResponse.json({ teachers });
}
