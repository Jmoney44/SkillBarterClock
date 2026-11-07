"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, Avatar, Icon } from "../site";
import { MeetingDetailsText } from "../meeting-details";
import { ReviewForm, Stars } from "../ratings";
import { closedReasonLabel, startAvailability, type ClosedReason } from "@/lib/session-rules";

type SessionStatus = "requested" | "confirmed" | "in_progress" | "completed" | "cancelled";
type SessionRecord = {
  id: string;
  learner_id: string;
  teacher_id: string;
  skill: string;
  scheduled_at: string;
  duration_hours: number | string;
  status: SessionStatus;
  learner_note: string;
  learner_started: boolean;
  teacher_started: boolean;
  learner_ended: boolean;
  teacher_ended: boolean;
  started_at: string | null;
  ended_at: string | null;
  closed_reason: ClosedReason | null;
  meeting_details: string;
  review_rating: number | null;
  review_comment: string | null;
  role: "learner" | "teacher";
  partner_name: string;
  partner_timezone: string;
};

function formatElapsed(startedAt: string | null, now: number) {
  if (!startedAt) return "00:00:00";
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export default function SessionRoom({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [activeAction, setActiveAction] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [editingMeeting, setEditingMeeting] = useState(false);
  const [meetingDraft, setMeetingDraft] = useState("");
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetingError, setMeetingError] = useState("");
  const [editingReview, setEditingReview] = useState(false);

  const fetchSession = useCallback(async (): Promise<SessionRecord | null> => {
    const response = await fetch("/api/sessions", { cache: "no-store" });
    const data = await response.json();
    if (response.status === 401) {
      router.replace("/login");
      return null;
    }
    if (!response.ok) throw new Error(data.error || "Could not load this session.");
    const found = (data.sessions ?? []).find((item: SessionRecord) => item.id === sessionId);
    return found ?? null;
  }, [router, sessionId]);

  const refreshSession = useCallback(async () => {
    setSession(await fetchSession());
  }, [fetchSession]);
  const shouldPoll = Boolean(session && ["confirmed", "in_progress"].includes(session.status));

  useEffect(() => {
    if (!sessionId) return;
    fetchSession()
      .then((result) => setSession(result))
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Could not load this session."))
      .finally(() => setLoading(false));
  }, [fetchSession, sessionId]);

  useEffect(() => {
    if (session?.status !== "in_progress" && session?.status !== "confirmed") return;
    // Tick every second for the elapsed clock; every 30s is enough to open the start window.
    const timer = window.setInterval(() => setNow(Date.now()), session.status === "in_progress" ? 1000 : 30_000);
    return () => window.clearInterval(timer);
  }, [session?.status]);

  useEffect(() => {
    if (!shouldPoll) return;
    const refresh = window.setInterval(() => {
      refreshSession().catch((refreshError: unknown) => {
        setError(refreshError instanceof Error ? refreshError.message : "Could not refresh this session.");
      });
    }, 5000);
    return () => window.clearInterval(refresh);
  }, [refreshSession, shouldPoll]);

  async function act(action: string) {
    if (!session) return;
    setActiveAction(action);
    setError("");
    try {
      const response = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, action }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not update the session.");
        return;
      }
      await refreshSession();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not update the session.");
    } finally {
      setActiveAction("");
    }
  }

  async function saveMeetingDetails() {
    if (!session) return;
    setSavingMeeting(true);
    setMeetingError("");
    try {
      const response = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, action: "set_meeting_details", meetingDetails: meetingDraft }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMeetingError(data.error || "Could not save the meeting details.");
        return;
      }
      setEditingMeeting(false);
      await refreshSession();
    } catch {
      setMeetingError("We couldn’t reach the server. Please try again.");
    } finally {
      setSavingMeeting(false);
    }
  }

  const scheduled = session ? new Date(session.scheduled_at) : null;
  const reviewWindowOpen = Boolean(
    session?.status === "completed"
      && now - new Date(session.ended_at ?? session.scheduled_at).getTime() < 30 * 24 * 3_600_000,
  );
  const canEditMeeting = Boolean(session && ["requested", "confirmed", "in_progress"].includes(session.status));
  const currentUserStarted = session && (session.role === "learner" ? session.learner_started : session.teacher_started);
  const otherUserStarted = session && (session.role === "learner" ? session.teacher_started : session.learner_started);
  const currentUserEnded = session && (session.role === "learner" ? session.learner_ended : session.teacher_ended);
  const otherUserEnded = session && (session.role === "learner" ? session.teacher_ended : session.learner_ended);
  const start = session ? startAvailability(session, now) : { canStart: false, hint: "" };
  const statusText = session ? closedReasonLabel(session.closed_reason) ?? session.status.replace("_", " ") : "";

  return (
    <AppShell title="Session room">
      <Link className="back-link" href="/sessions">← Back to sessions</Link>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? (
        <p className="lead" role="status">Loading session…</p>
      ) : !session ? (
        <div className="empty-hint"><Icon name="calendar" /><span>That session could not be found.</span></div>
      ) : (
        <>
          <div className="room-heading">
            <div>
              <div className="eyebrow">SESSION ROOM <span className="eyebrow-dot" /></div>
              <h1>{session.skill}</h1>
              <p className="lead">
                {session.role === "learner" ? "Learning with" : "Teaching"} {session.partner_name}
                {scheduled ? ` · ${new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(scheduled)}` : ""}
                {" · "}{Number(session.duration_hours)} hour{Number(session.duration_hours) === 1 ? "" : "s"}
              </p>
            </div>
            <span className="room-status"><i />{statusText}</span>
          </div>

          <div className="room-layout">
            <section className="clock-panel">
              <div className="clock-panel-top">
                <span>SESSION CLOCK</span>
                <span className="stake"><i /> {Number(session.duration_hours).toFixed(1)} TC {session.status === "completed" ? "paid to the teacher" : session.status === "cancelled" ? "returned to the learner" : "held safely"}</span>
              </div>
              <div className="timer-dial">
                <div className="timer-face">
                  <span className="timer-live">{session.status === "in_progress" ? "SESSION IN PROGRESS" : statusText.toUpperCase()}</span>
                  <strong>{formatElapsed(session.started_at, session.ended_at ? new Date(session.ended_at).getTime() : now)}</strong>
                  <span className="timer-sub">
                    {session.status === "in_progress" ? "Elapsed session time" : "Both partners start the clock"}
                  </span>
                </div>
                <span className="dial-number n12">12</span>
                <span className="dial-number n3">03</span>
                <span className="dial-number n6">06</span>
                <span className="dial-number n9">09</span>
              </div>

              <div className="clock-partners">
                <div>
                  <Avatar name="You" />
                  <span><b>You</b><small>{currentUserStarted ? "Ready" : "Not started"}</small></span>
                  <i className={`ready-check ${currentUserStarted ? "" : "waiting-check"}`}><Icon name={currentUserStarted ? "check" : "clock"} size={12} /></i>
                </div>
                <span className="partner-plus">+</span>
                <div>
                  <Avatar name={session.partner_name} />
                  <span><b>{session.partner_name}</b><small>{otherUserEnded ? "Finished" : otherUserStarted ? "Ready" : "Not started"}</small></span>
                  <i className={`ready-check ${otherUserStarted ? "" : "waiting-check"}`}><Icon name={otherUserStarted ? "check" : "clock"} size={12} /></i>
                </div>
              </div>

              <div className="clock-controls">
                {session.status === "requested" && session.role === "teacher" && (
                  <>
                    <button className="button button-primary clock-action" type="button" disabled={Boolean(activeAction)} onClick={() => void act("accept")}>Accept request</button>
                    <button className="button button-secondary" type="button" disabled={Boolean(activeAction)} onClick={() => void act("decline")}>Decline</button>
                  </>
                )}
                {session.status === "confirmed" && (
                  <button className="button button-primary clock-action" type="button" disabled={Boolean(activeAction) || Boolean(currentUserStarted) || !start.canStart} onClick={() => void act("start")}>
                    {currentUserStarted ? "Waiting for your partner" : "Start session"}
                  </button>
                )}
                {session.status === "confirmed" && start.hint && <p className="clock-footnote">{start.hint}</p>}
                {session.status === "in_progress" && (
                  <button className="button button-primary clock-action" type="button" disabled={Boolean(activeAction) || Boolean(currentUserEnded)} onClick={() => void act("end")}>
                    {currentUserEnded ? "Waiting for your partner to finish" : "End session"}
                  </button>
                )}
                {["requested", "confirmed"].includes(session.status) && (
                  <button className="button button-secondary" type="button" disabled={Boolean(activeAction)} onClick={() => void act("cancel")}>Cancel session</button>
                )}
              </div>

              <p className="clock-footnote"><Icon name="shield" size={15} /> Both partners start the clock from 15 minutes before the scheduled time. If it isn’t started by the scheduled end, the learner’s credits are returned. Held credits go to the teacher once both end the clock, or automatically an hour after the session should have finished.</p>
            </section>

            <aside className="room-aside">
              <div className="room-side-card">
                <div className="eyebrow">SESSION DETAILS</div>
                <h3>{session.status === "completed" ? "Session complete" : "Your time together"}</h3>
                <div className="profile-languages"><b>Partner timezone</b><span>{session.partner_timezone || "Not set"}</span></div>
                <div className="profile-languages"><b>Scheduled for</b><span>{scheduled ? new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(scheduled) : "Not set"}</span></div>
                <div className="profile-languages">
                  <b>Where to meet</b>
                  {editingMeeting ? (
                    <div className="meeting-editor field-wrap meeting-field">
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={meetingDraft}
                        onChange={(event) => setMeetingDraft(event.target.value)}
                        placeholder="Video call link, phone number, or meeting place"
                        aria-label="Meeting details"
                      />
                      {meetingError && <p className="form-error" role="alert">{meetingError}</p>}
                      <div className="meeting-editor-actions">
                        <button className="button button-primary small-button" type="button" disabled={savingMeeting} onClick={() => void saveMeetingDetails()}>
                          {savingMeeting ? "Saving…" : "Save"}
                        </button>
                        <button className="button button-secondary small-button" type="button" disabled={savingMeeting} onClick={() => { setEditingMeeting(false); setMeetingError(""); }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <span>
                      {session.meeting_details ? <MeetingDetailsText text={session.meeting_details} /> : canEditMeeting ? "Not added yet. Add a video link, phone number, or place." : "No meeting details were added."}
                      {canEditMeeting && (
                        <>
                          {" "}
                          <button className="text-link" type="button" onClick={() => { setMeetingDraft(session.meeting_details); setEditingMeeting(true); }}>
                            {session.meeting_details ? "Edit" : "Add meeting details"}
                          </button>
                        </>
                      )}
                    </span>
                  )}
                </div>
                {session.learner_note && <div className="profile-languages"><b>Learning note</b><span>{session.learner_note}</span></div>}
                <Link className="text-link" href="/sessions">View all sessions <Icon name="arrow" size={13} /></Link>
              </div>
              {session.status === "completed" && (
                <div className="room-side-card">
                  <div className="eyebrow">{session.role === "learner" ? "YOUR REVIEW" : "LEARNER REVIEW"}</div>
                  {session.review_rating && !editingReview ? (
                    <>
                      <h3><Stars rating={session.review_rating} /></h3>
                      {session.review_comment && <p className="review-comment">{session.review_comment}</p>}
                      {session.role === "learner" && reviewWindowOpen && (
                        <button className="text-link" type="button" onClick={() => setEditingReview(true)}>Edit your review</button>
                      )}
                    </>
                  ) : session.role === "learner" && reviewWindowOpen ? (
                    <>
                      <h3>How was {session.partner_name.split(" ")[0]}?</h3>
                      <ReviewForm
                        sessionId={session.id}
                        initialRating={session.review_rating}
                        initialComment={session.review_comment}
                        onSaved={async () => {
                          setEditingReview(false);
                          await refreshSession();
                        }}
                        onCancel={session.review_rating ? () => setEditingReview(false) : undefined}
                      />
                    </>
                  ) : (
                    <p>{session.role === "learner" ? "The 30-day window to review this session has closed." : "Your learner hasn’t left a review for this session."}</p>
                  )}
                </div>
              )}
              <div className="room-side-card room-help">
                <Icon name="shield" />
                <div><b>Credits stay protected</b><span>They transfer only after both partners end the clock.</span></div>
              </div>
            </aside>
          </div>
        </>
      )}
    </AppShell>
  );
}
