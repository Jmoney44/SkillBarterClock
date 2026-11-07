// Session timing rules. The database enforces these in act_on_session and
// resolve_stale_sessions (supabase/schema.sql); keep both in sync.

/** A confirmed session can be started from this many minutes before its scheduled time. */
export const START_WINDOW_OPENS_MINUTES = 15;

export type ClosedReason =
  | "declined"
  | "cancelled"
  | "expired"
  | "no_show"
  | "completed"
  | "auto_completed";

type TimedSession = {
  scheduled_at: string;
  duration_hours: number | string;
};

export function startWindow(session: TimedSession) {
  const scheduled = new Date(session.scheduled_at).getTime();
  return {
    opensAt: scheduled - START_WINDOW_OPENS_MINUTES * 60_000,
    closesAt: scheduled + Number(session.duration_hours) * 3_600_000,
  };
}

/** Whether a confirmed session can be started now, with a hint when it can't. */
export function startAvailability(session: TimedSession, now: number | null) {
  if (now === null) return { canStart: false, hint: "" };
  const { opensAt, closesAt } = startWindow(session);
  if (now < opensAt) {
    const opens = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(opensAt);
    return { canStart: false, hint: `You can start from ${opens}.` };
  }
  if (now >= closesAt) {
    return { canStart: false, hint: "This session’s time has passed. Held credits will be returned to the learner." };
  }
  return { canStart: true, hint: "" };
}

export function closedReasonLabel(reason: ClosedReason | null | undefined) {
  switch (reason) {
    case "declined": return "Declined";
    case "expired": return "Expired";
    case "no_show": return "Not started";
    case "auto_completed": return "Auto-completed";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return null;
  }
}
