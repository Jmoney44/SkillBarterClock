import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processOutbox } from "@/lib/notifications/outbox";

/**
 * Scheduled sender: resolves overdue sessions, queues reminders, and sends
 * queued emails. Call every 5-10 minutes with
 * "Authorization: Bearer <CRON_SECRET>" (Vercel Cron sends this header itself).
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (!secret || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const result = await processOutbox();
  if (!result.configured) {
    return NextResponse.json(
      { error: "Email isn't configured. Set SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, and EMAIL_FROM." },
      { status: 503 },
    );
  }
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
