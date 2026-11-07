// Delivers queued notification emails. Called after member actions (via
// after()) and by the scheduled /api/cron/notifications route.
import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { emailConfigured, sendEmail } from "./email";
import { renderNotification, type ClaimedNotification } from "./templates";

export type OutboxResult = { configured: boolean; sent: number; skipped: number; failed: number };

export async function processOutbox(batches = 4, batchSize = 25): Promise<OutboxResult> {
  const result: OutboxResult = { configured: false, sent: 0, skipped: 0, failed: 0 };
  const supabase = createSupabaseAdminClient();
  if (!supabase || !emailConfigured()) return result;
  result.configured = true;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  for (let batch = 0; batch < batches; batch += 1) {
    const { data, error } = await supabase.rpc("claim_notifications", { p_limit: batchSize });
    if (error) {
      console.error("Could not claim notifications:", error);
      break;
    }
    const rows = (data ?? []) as ClaimedNotification[];
    if (!rows.length) break;

    for (const row of rows) {
      const rendered = renderNotification(row, siteUrl);
      let outcome: { result: "sent" | "skipped" | "failed"; detail?: string };
      if ("skip" in rendered) {
        outcome = { result: "skipped", detail: rendered.skip };
      } else {
        const sent = await sendEmail({ to: row.recipient_email!, ...rendered });
        outcome = sent.ok ? { result: "sent" } : { result: "failed", detail: sent.error };
        if (!sent.ok) console.error(`Could not send ${row.kind} email ${row.id}:`, sent.error);
      }
      result[outcome.result === "sent" ? "sent" : outcome.result === "skipped" ? "skipped" : "failed"] += 1;
      const { error: finishError } = await supabase.rpc("finish_notification", {
        p_id: row.id,
        p_result: outcome.result,
        p_detail: outcome.detail ?? null,
      });
      if (finishError) console.error("Could not record notification result:", finishError);
    }
    if (rows.length < batchSize) break;
  }
  return result;
}

/** Sends any queued emails after the current response, without delaying it. */
export function sendQueuedEmailsSoon() {
  after(async () => {
    try {
      await processOutbox(1);
    } catch (error) {
      console.error("Background email sending failed:", error);
    }
  });
}
