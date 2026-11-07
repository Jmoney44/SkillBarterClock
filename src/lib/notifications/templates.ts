// Turns a claimed outbox row into an email, or returns a reason to skip it
// when the session has moved on since the email was queued.

export type ClaimedNotification = {
  id: string;
  kind: string;
  recipient_email: string | null;
  recipient_name: string;
  recipient_time_zone: string;
  session_id: string | null;
  skill: string | null;
  scheduled_at: string | null;
  duration_hours: number | string | null;
  meeting_details: string | null;
  session_status: string | null;
  recipient_role: "learner" | "teacher";
  partner_name: string | null;
  review_rating: number | null;
  review_comment: string | null;
};

type Rendered = { subject: string; text: string; html: string } | { skip: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function formatWhen(iso: string, timeZone: string) {
  const zone = (() => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone });
      return timeZone;
    } catch {
      return "UTC";
    }
  })();
  const when = new Intl.DateTimeFormat("en-US", { timeZone: zone, dateStyle: "full", timeStyle: "short" }).format(new Date(iso));
  return `${when} (${zone.replaceAll("_", " ")} time)`;
}

const activeStatuses = ["requested", "confirmed", "in_progress"];

export function renderNotification(row: ClaimedNotification, siteUrl: string): Rendered {
  if (!row.recipient_email) return { skip: "no_email" };
  if (!row.session_id || !row.scheduled_at) return { skip: "session_deleted" };

  const firstName = row.recipient_name.trim().split(" ")[0] || "there";
  const partnerDeleted = row.partner_name === "Deleted member";
  const partner = partnerDeleted ? "your partner" : row.partner_name?.trim() || "your partner";
  const skill = row.skill ?? "your session";
  const hours = Number(row.duration_hours ?? 0);
  const when = formatWhen(row.scheduled_at, row.recipient_time_zone);
  const sessionUrl = `${siteUrl}/session?id=${encodeURIComponent(row.session_id)}`;
  const status = row.session_status ?? "";

  let subject = "";
  let lines: string[] = [];
  let action = { label: "Open the session", url: sessionUrl };

  switch (row.kind) {
    case "session_requested":
      if (status !== "requested") return { skip: "no_longer_requested" };
      subject = `New session request: ${skill} with ${partner}`;
      lines = [`${partner} would like to learn ${skill} with you.`, `When: ${when}`, `Length: ${hours} hour${hours === 1 ? "" : "s"}`, "Accept or decline the request before its start time, or it will expire."];
      action = { label: "Respond to the request", url: `${siteUrl}/teacher` };
      break;
    case "request_accepted":
      if (!["confirmed", "in_progress"].includes(status)) return { skip: "no_longer_confirmed" };
      subject = `${partner} accepted your ${skill} session`;
      lines = [`Your session with ${partner} is confirmed.`, `When: ${when}`, row.meeting_details ? `Where: ${row.meeting_details}` : "Add meeting details in the session room so you both know where to meet."];
      break;
    case "request_declined":
      subject = `${partner} declined your ${skill} request`;
      lines = [`${partner} couldn’t take your ${skill} session on ${when}.`, `Your ${hours.toFixed(1)} time credits have been returned to your wallet.`];
      action = { label: "Find another teacher", url: `${siteUrl}/explore` };
      break;
    case "request_expired":
      subject = `Your ${skill} request expired`;
      lines = [`${partner} didn’t respond to your request for ${when} before it started.`, `Your ${hours.toFixed(1)} time credits have been returned to your wallet.`];
      action = { label: "Book another time", url: `${siteUrl}/explore` };
      break;
    case "session_cancelled":
      subject = `${skill} session on ${new Date(row.scheduled_at).toISOString().slice(0, 10)} was cancelled`;
      lines = [partnerDeleted
        ? `Your ${skill} session for ${when} was cancelled because your partner closed their account.`
        : `${partner} cancelled your ${skill} session for ${when}.`, row.recipient_role === "learner" ? `Your ${hours.toFixed(1)} time credits have been returned to your wallet.` : "No credits were transferred."];
      action = { label: "View your sessions", url: `${siteUrl}/sessions` };
      break;
    case "session_not_started":
      subject = `Your ${skill} session wasn’t started`;
      lines = [`Your ${skill} session with ${partner} on ${when} wasn’t started by both of you before its scheduled end, so it has been closed.`, row.recipient_role === "learner" ? `Your ${hours.toFixed(1)} time credits have been returned to your wallet.` : "The learner’s held credits were returned to them."];
      action = { label: "View your sessions", url: `${siteUrl}/sessions` };
      break;
    case "session_auto_completed":
      subject = `Your ${skill} session was completed automatically`;
      lines = [`Your ${skill} session with ${partner} wasn’t ended by both of you, so it was completed automatically an hour after it should have finished.`, row.recipient_role === "teacher" ? `${hours.toFixed(1)} time credits have been added to your wallet.` : `${hours.toFixed(1)} time credits were transferred to ${partner}. You can leave a review for 30 days.`];
      break;
    case "meeting_details_changed":
      if (!activeStatuses.includes(status) || !row.meeting_details) return { skip: "not_active" };
      subject = `Meeting details updated for your ${skill} session`;
      lines = [`${partner} updated where you’ll meet for your session on ${when}.`, `Where: ${row.meeting_details}`];
      break;
    case "session_reminder":
      if (status !== "confirmed") return { skip: "no_longer_confirmed" };
      subject = `Starting soon: ${skill} with ${partner}`;
      lines = [`Your ${skill} session with ${partner} starts soon.`, `When: ${when}`, row.meeting_details ? `Where: ${row.meeting_details}` : "No meeting details yet. Add them in the session room.", "Both of you can start the clock from 15 minutes before the start time."];
      break;
    case "review_received":
      if (!row.review_rating) return { skip: "review_deleted" };
      subject = `${partner} left you a ${row.review_rating}-star review`;
      lines = [`${partner} rated your ${skill} session ${row.review_rating} out of 5.`, ...(row.review_comment ? [`“${row.review_comment}”`] : [])];
      action = { label: "See your reviews", url: `${siteUrl}/teacher` };
      break;
    default:
      return { skip: "unknown_kind" };
  }

  const footer = `You’re receiving this because you have email notifications turned on. Turn them off in Settings: ${siteUrl}/settings`;
  const text = [`Hi ${firstName},`, "", ...lines, "", `${action.label}: ${action.url}`, "", "Skill Barter Clock", footer].join("\n");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f4ee;font-family:Arial,Helvetica,sans-serif;color:#24332f">
<div style="max-width:520px;margin:0 auto;background:#fffdf9;border:1px solid #e9e4da;border-radius:10px;padding:24px">
<p style="margin:0 0 16px;font-size:12px;letter-spacing:.08em;color:#0f766e;font-weight:bold">SKILL BARTER CLOCK</p>
<p style="margin:0 0 12px">Hi ${escapeHtml(firstName)},</p>
${lines.map((line) => `<p style="margin:0 0 10px;line-height:1.5">${escapeHtml(line)}</p>`).join("\n")}
<p style="margin:20px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#c0573f;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:bold">${escapeHtml(action.label)}</a></p>
<p style="margin:16px 0 0;font-size:12px;color:#6b7a75">You’re receiving this because you have email notifications turned on. <a href="${escapeHtml(`${siteUrl}/settings`)}" style="color:#6b7a75">Turn them off in Settings</a>.</p>
</div></body></html>`;
  return { subject, text, html };
}
