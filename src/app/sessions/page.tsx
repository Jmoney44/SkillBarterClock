"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  role: "learner" | "teacher";
  partner_id: string;
  partner_name: string;
};
type SessionTab = "upcoming" | "past" | "requests";

class UnauthorizedError extends Error {}

function statusLabel(status: SessionStatus) {
  const labels: Record<SessionStatus, string> = {
    requested: "Awaiting response",
    confirmed: "Confirmed",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status];
}

async function fetchSessions(): Promise<SessionRecord[]> {
  const response = await fetch("/api/sessions", { cache: "no-store" });
  const data = await response.json();
  if (response.status === 401) throw new UnauthorizedError("Not authenticated");
  if (!response.ok) throw new Error(data.error || "Could not load sessions.");
  return data.sessions ?? [];
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [tab, setTab] = useState<SessionTab>("upcoming");
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState("");
  const [error, setError] = useState("");

  const loadSessions = useCallback(async () => setSessions(await fetchSessions()), []);

  useEffect(() => {
    let active = true;
    fetchSessions()
      .then((results) => {
        if (active) setSessions(results);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        if (loadError instanceof UnauthorizedError) {
          router.replace("/login");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Could not load sessions.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [router]);

  const requestCount = sessions.filter((session) => session.status === "requested" && session.role === "teacher").length;
  const visibleSessions = useMemo(() => sessions.filter((session) => {
    if (tab === "requests") return session.status === "requested" && session.role === "teacher";
    if (tab === "past") return session.status === "completed" || session.status === "cancelled";
    return ["requested", "confirmed", "in_progress"].includes(session.status);
  }), [sessions, tab]);

  async function actOnSession(sessionId: string, action: string) {
    setActiveId(sessionId);
    setError("");
    try {
      const response = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not update the session.");
        return;
      }
      await loadSessions();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not update the session.");
    } finally {
      setActiveId("");
    }
  }

  return (
    <AppShell title="My sessions">
      <div className="page-heading sessions-heading">
        <div>
          <div className="eyebrow">YOUR TIME, WELL SPENT</div>
          <h1>My sessions</h1>
          <p className="lead">Every good exchange starts with showing up.</p>
        </div>
        <Link className="button button-primary" href="/book"><Icon name="plus" size={17} /> Book a session</Link>
      </div>

      <div className="session-tabs">
        <button className={tab === "upcoming" ? "selected" : ""} type="button" onClick={() => setTab("upcoming")}>
          Upcoming <span>{sessions.filter((session) => ["requested", "confirmed", "in_progress"].includes(session.status)).length}</span>
        </button>
        <button className={tab === "past" ? "selected" : ""} type="button" onClick={() => setTab("past")}>Past sessions</button>
        <button className={tab === "requests" ? "selected" : ""} type="button" onClick={() => setTab("requests")}>
          Requests <span className="tab-count">{requestCount}</span>
        </button>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="session-page-list">
        {visibleSessions.map((session) => {
          const scheduled = new Date(session.scheduled_at);
          const canManageRequest = session.role === "teacher" && session.status === "requested";
          return (
            <article className="session-card" key={session.id}>
              <div className="date-tile">
                <b>{new Intl.DateTimeFormat(undefined, { day: "numeric" }).format(scheduled)}</b>
                <span>{new Intl.DateTimeFormat(undefined, { month: "short" }).format(scheduled)}</span>
              </div>
              <Avatar name={session.partner_name} />
              <div className="session-main">
                <strong>{session.skill}</strong>
                <span>{session.role === "learner" ? "Teaching by" : "Learning with"} {session.partner_name} <i>·</i> {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(scheduled)}</span>
                <small><Icon name="clock" size={14} /> {Number(session.duration_hours)} hour{Number(session.duration_hours) === 1 ? "" : "s"} <i>·</i> {session.role === "learner" ? "You’re learning" : "You’re teaching"}</small>
              </div>
              <span className={`status-pill ${session.status === "completed" ? "status-done" : ["requested", "in_progress"].includes(session.status) ? "status-wait" : ""}`}><i />{statusLabel(session.status)}</span>
              <div className="session-actions">
                {canManageRequest && (
                  <>
                    <button className="button button-primary small-button" type="button" disabled={activeId === session.id} onClick={() => void actOnSession(session.id, "accept")}>Accept</button>
                    <button className="button button-secondary small-button" type="button" disabled={activeId === session.id} onClick={() => void actOnSession(session.id, "decline")}>Decline</button>
                  </>
                )}
                {session.status === "confirmed" && (
                  <button className="button button-secondary small-button" type="button" disabled={activeId === session.id} onClick={() => void actOnSession(session.id, "start")}>Start</button>
                )}
                {session.status === "in_progress" && (
                  <button className="button button-secondary small-button" type="button" disabled={activeId === session.id} onClick={() => void actOnSession(session.id, "end")}>Finish</button>
                )}
                {["requested", "confirmed"].includes(session.status) && (
                  <button className="button button-secondary small-button" type="button" disabled={activeId === session.id} onClick={() => void actOnSession(session.id, "cancel")}>Cancel</button>
                )}
                <Link className="button button-secondary small-button" href={`/session?id=${encodeURIComponent(session.id)}`}>Open</Link>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && visibleSessions.length === 0 && !error && (
        <div className="empty-hint">
          <Icon name="calendar" />
          <span>{tab === "requests" ? "No session requests need your response." : "No sessions in this list yet. Browse skills to find your next exchange."}</span>
        </div>
      )}
      {loading && <p className="lead" role="status">Loading your sessions…</p>}

      <div className="empty-hint">
        <Icon name="calendar" />
        <span>Credits return automatically when a request is declined or cancelled before the session starts.</span>
      </div>
    </AppShell>
  );
}
