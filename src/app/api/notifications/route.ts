import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SessionNotificationSource = {
  id: string;
  skill: string;
  status: string;
  scheduled_at: string;
  created_at: string;
  partner_name: string;
};

type WalletNotificationSource = {
  id: string;
  title: string;
  detail: string;
  created_at: string;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [announcementResult, sessionResult, walletResult] = await Promise.all([
    supabase
      .from("admin_announcements")
      .select("id, title, message, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.rpc("get_my_sessions"),
    supabase
      .from("wallet_transactions")
      .select("id, title, detail, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const error = announcementResult.error ?? sessionResult.error ?? walletResult.error;
  if (error) {
    console.error("Could not load notifications:", error);
    return NextResponse.json({ error: "Could not load notifications." }, { status: 500 });
  }

  const announcements = (announcementResult.data ?? []).map((announcement) => ({
    id: `announcement-${announcement.id}`,
    category: "announcement" as const,
    title: announcement.title,
    message: announcement.message,
    createdAt: announcement.created_at,
    href: "/",
  }));

  const sessions = ((sessionResult.data ?? []) as SessionNotificationSource[])
    .slice(0, 8)
    .map((session) => ({
      id: `session-${session.id}-${session.status}`,
      category: "session" as const,
      title: session.status === "requested" ? "Session request received" : `Session ${session.status.replaceAll("_", " ")}`,
      message: `${session.partner_name} · ${session.skill}`,
      createdAt: session.created_at || session.scheduled_at,
      href: "/sessions",
    }));

  const credits = ((walletResult.data ?? []) as WalletNotificationSource[]).map((transaction) => ({
    id: `credit-${transaction.id}`,
    category: "credit" as const,
    title: transaction.title,
    message: transaction.detail || "Your time-credit balance has been updated.",
    createdAt: transaction.created_at,
    href: "/wallet",
  }));

  const notifications = [...announcements, ...sessions, ...credits]
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 12);

  return NextResponse.json({ notifications });
}
