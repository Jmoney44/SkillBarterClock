"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, Avatar, Icon } from "../site";

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
    if (session?.status !== "in_progress") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
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

  const scheduled = session ? new Date(session.scheduled_at) : null;
  const currentUserStarted = session && (session.role === "learner" ? session.learner_started : session.teacher_started);
  const otherUserStarted = session && (session.role === "learner" ? session.teacher_started : session.learner_started);
  const currentUserEnded = session && (session.role === "learner" ? session.learner_ended : session.teacher_ended);
  const otherUserEnded = session && (session.role === "learner" ? session.teacher_ended : session.learner_ended);

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
            <span className="room-status"><i />{session.status.replace("_", " ")}</span>
          </div>

          <div className="room-layout">
            <section className="clock-panel">
              <div className="clock-panel-top">
                <span>SESSION CLOCK</span>
                <span className="stake"><i /> {Number(session.duration_hours).toFixed(1)} TC held safely</span>
              </div>
              <div className="timer-dial">
                <div className="timer-face">
                  <span className="timer-live">{session.status === "in_progress" ? "SESSION IN PROGRESS" : session.status.toUpperCase().replace("_", " ")}</span>
                  <strong>{formatElapsed(session.started_at, now)}</strong>
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
                  <button className="button button-primary clock-action" type="button" disabled={Boolean(activeAction) || Boolean(currentUserStarted)} onClick={() => void act("start")}>
                    {currentUserStarted ? "Waiting for your partner" : "Start session"}
                  </button>
                )}
                {session.status === "in_progress" && (
                  <button className="button button-primary clock-action" type="button" disabled={Boolean(activeAction) || Boolean(currentUserEnded)} onClick={() => void act("end")}>
                    {currentUserEnded ? "Waiting for your partner to finish" : "End session"}
                  </button>
                )}
                {["requested", "confirmed"].includes(session.status) && (
                  <button className="button button-secondary" type="button" disabled={Boolean(activeAction)} onClick={() => void act("cancel")}>Cancel session</button>
                )}
              </div>

              <p className="clock-footnote"><Icon name="shield" size={15} /> Both partners need to start and end the clock. Held credits are sent to the teacher after both confirm completion.</p>
            </section>

            <aside className="room-aside">
              <div className="room-side-card">
                <div className="eyebrow">SESSION DETAILS</div>
                <h3>{session.status === "completed" ? "Session complete" : "Your time together"}</h3>
                <div className="profile-languages"><b>Partner timezone</b><span>{session.partner_timezone || "Not set"}</span></div>
                <div className="profile-languages"><b>Scheduled for</b><span>{scheduled ? new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(scheduled) : "Not set"}</span></div>
                {session.learner_note && <div className="profile-languages"><b>Learning note</b><span>{session.learner_note}</span></div>}
                <Link className="text-link" href="/sessions">View all sessions <Icon name="arrow" size={13} /></Link>
              </div>
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
