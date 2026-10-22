"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicProfile } from "@/lib/supabase/profile";
import { AppShell, Avatar, Icon } from "../site";

type TeachingSession = {
  id: string;
  skill: string;
  scheduled_at: string;
  duration_hours: number | string;
  status: "requested" | "confirmed" | "in_progress" | "completed" | "cancelled";
  learner_note: string;
  role: "learner" | "teacher";
  partner_name: string;
};

class UnauthorizedError extends Error {}

async function fetchTeachingData() {
  const [profileResponse, sessionsResponse] = await Promise.all([
    fetch("/api/profile", { cache: "no-store" }),
    fetch("/api/sessions", { cache: "no-store" }),
  ]);
  const [profileData, sessionsData] = await Promise.all([
    profileResponse.json(),
    sessionsResponse.json(),
  ]);

  if (profileResponse.status === 401 || sessionsResponse.status === 401) {
    throw new UnauthorizedError("Not authenticated");
  }
  if (!profileResponse.ok) {
    throw new Error(profileData.error || "Could not load your profile.");
  }
  if (!sessionsResponse.ok) {
    throw new Error(sessionsData.error || "Could not load your teaching sessions.");
  }

  return {
    profile: profileData.user as PublicProfile,
    sessions: (sessionsData.sessions ?? []) as TeachingSession[],
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: TeachingSession["status"]) {
  const labels: Record<TeachingSession["status"], string> = {
    requested: "New request",
    confirmed: "Confirmed",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status];
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySessionId, setBusySessionId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const data = await fetchTeachingData();
    setProfile(data.profile);
    setSessions(data.sessions);
  }, []);

  useEffect(() => {
    let active = true;
    fetchTeachingData()
      .then((data) => {
        if (!active) return;
        setProfile(data.profile);
        setSessions(data.sessions);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        if (loadError instanceof UnauthorizedError) {
          router.replace("/login");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Could not load your teaching dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [router]);

  const teachingSessions = useMemo(
    () => sessions.filter((session) => session.role === "teacher"),
    [sessions],
  );
  const requests = teachingSessions
    .filter((session) => session.status === "requested")
    .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime());
  const upcoming = teachingSessions
    .filter((session) => ["confirmed", "in_progress"].includes(session.status))
    .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime());
  const totalTaught = teachingSessions
    .filter((session) => session.status === "completed")
    .reduce((total, session) => total + Number(session.duration_hours), 0);
  const scheduledHours = upcoming.reduce((total, session) => total + Number(session.duration_hours), 0);

  async function actOnSession(sessionId: string, action: "accept" | "decline" | "start" | "end") {
    setBusySessionId(sessionId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not update this session.");
        return;
      }
      await refresh();
      if (action === "accept") setNotice("Request accepted. The learner can now start the session with you.");
      if (action === "decline") setNotice("Request declined. The learner’s held credits have been returned.");
      if (action === "start") setNotice(data.status === "in_progress" ? "The session is now in progress." : "You’re ready. Waiting for the learner to start.");
      if (action === "end") setNotice(data.status === "completed" ? "Session completed. Credits have been transferred to your wallet." : "Your completion is recorded. Waiting for the learner to confirm.");
    } catch (actionError) {
      if (actionError instanceof UnauthorizedError) {
        router.replace("/login");
      } else {
        setError(actionError instanceof Error ? actionError.message : "Could not update this session.");
      }
    } finally {
      setBusySessionId("");
    }
  }

  return (
    <AppShell title="Teaching">
      <div className="teacher-dashboard-heading">
        <div>
          <div className="eyebrow">YOUR TEACHING SPACE</div>
          <h1>Teaching dashboard</h1>
          <p className="lead">Manage learner requests and keep your exchanges moving.</p>
        </div>
        <Link href="/profile/edit" className="button button-secondary"><Icon name="settings" size={16} /> Edit teaching profile</Link>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-success" role="status">{notice}</p>}

      {loading ? (
        <p className="lead" role="status">Loading your teaching dashboard…</p>
      ) : profile ? (
        <>
          <section className="teacher-welcome-card">
            <Avatar src={profile.avatarUrl || undefined} name={profile.name} size="lg" />
            <div className="teacher-welcome-copy">
              <span className="eyebrow">THANK YOU FOR SHARING YOUR TIME</span>
              <h2>{profile.name ? `Hello, ${profile.name.split(" ")[0]}.` : "Hello, teacher."}</h2>
              <p>{profile.teaching.length ? `You’re offering ${profile.teaching.join(", ")}.` : "Add the skills you’re ready to teach so learners can find you."}</p>
            </div>
            <Link className="text-link" href="/profile">View your profile <Icon name="arrow" size={14} /></Link>
          </section>

          <div className="teacher-dashboard-stats">
            <article><span className="teacher-stat-icon"><Icon name="message" size={17} /></span><div><b>{requests.length}</b><small>New requests</small></div></article>
            <article><span className="teacher-stat-icon"><Icon name="calendar" size={17} /></span><div><b>{upcoming.length}</b><small>Upcoming sessions</small></div></article>
            <article><span className="teacher-stat-icon"><Icon name="clock" size={17} /></span><div><b>{scheduledHours.toFixed(1)} h</b><small>Hours scheduled</small></div></article>
            <article><span className="teacher-stat-icon"><Icon name="check" size={17} /></span><div><b>{totalTaught.toFixed(1)} TC</b><small>Hours taught</small></div></article>
          </div>

          <section className="teacher-dashboard-section">
            <div className="section-heading">
              <div><div className="eyebrow">LEARNERS ARE WAITING</div><h3>Incoming requests</h3></div>
              <span className="result-count">{requests.length} {requests.length === 1 ? "request" : "requests"}</span>
            </div>
            {requests.length ? (
              <div className="teacher-session-list">
                {requests.map((session) => (
                  <article className="teacher-session-card request-card" key={session.id}>
                    <Avatar name={session.partner_name} />
                    <div className="teacher-session-main">
                      <div className="teacher-session-title"><b>{session.skill}</b><span className="admin-badge">New request</span></div>
                      <span>{session.partner_name} · {formatDate(session.scheduled_at)}</span>
                      <small>{Number(session.duration_hours)} hour{Number(session.duration_hours) === 1 ? "" : "s"} · {Number(session.duration_hours).toFixed(1)} TC to earn</small>
                      {session.learner_note && <p className="teacher-learner-note">“{session.learner_note}”</p>}
                    </div>
                    <div className="teacher-session-actions">
                      <button className="button button-primary small-button" type="button" disabled={busySessionId === session.id} onClick={() => void actOnSession(session.id, "accept")}>
                        {busySessionId === session.id ? "Saving…" : "Accept"}
                      </button>
                      <button className="button button-secondary small-button" type="button" disabled={busySessionId === session.id} onClick={() => void actOnSession(session.id, "decline")}>Decline</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="teacher-empty-state">
                <span><Icon name="check" size={18} /></span>
                <div><b>You’re all caught up</b><p>New learner requests will appear here. Keep your skills and availability up to date to help members find you.</p></div>
                <Link className="text-link" href="/profile/edit">Update profile <Icon name="arrow" size={13} /></Link>
              </div>
            )}
          </section>

          <section className="teacher-dashboard-section">
            <div className="section-heading">
              <div><div className="eyebrow">YOUR COMMITMENTS</div><h3>Upcoming teaching sessions</h3></div>
              <Link href="/sessions" className="text-link">All sessions <Icon name="arrow" size={14} /></Link>
            </div>
            {upcoming.length ? (
              <div className="teacher-session-list">
                {upcoming.map((session) => (
                  <article className="teacher-session-card" key={session.id}>
                    <Avatar name={session.partner_name} />
                    <div className="teacher-session-main">
                      <div className="teacher-session-title"><b>{session.skill}</b><span className={`admin-badge ${session.status === "in_progress" ? "complete" : ""}`}>{statusLabel(session.status)}</span></div>
                      <span>Learning with {session.partner_name} · {formatDate(session.scheduled_at)}</span>
                      <small>{Number(session.duration_hours)} hour{Number(session.duration_hours) === 1 ? "" : "s"}</small>
                    </div>
                    <div className="teacher-session-actions">
                      {session.status === "confirmed" && (
                        <button className="button button-primary small-button" type="button" disabled={busySessionId === session.id} onClick={() => void actOnSession(session.id, "start")}>Start session</button>
                      )}
                      {session.status === "in_progress" && (
                        <button className="button button-primary small-button" type="button" disabled={busySessionId === session.id} onClick={() => void actOnSession(session.id, "end")}>Finish session</button>
                      )}
                      <Link className="button button-secondary small-button" href={`/session?id=${encodeURIComponent(session.id)}`}>Open room</Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="teacher-empty-state compact">
                <span><Icon name="calendar" size={18} /></span>
                <div><b>No sessions on your calendar</b><p>Accepted sessions will show up here with the time and learner details.</p></div>
              </div>
            )}
          </section>

          <section className="teacher-dashboard-skills">
            <div>
              <div className="eyebrow">YOUR TEACHING PROFILE</div>
              <h3>Skills you share</h3>
              <p>Members can discover you based on the skills listed on your profile.</p>
            </div>
            {profile.teaching.length ? (
              <div className="profile-tags">{profile.teaching.map((skill) => <span key={skill}>{skill}</span>)}</div>
            ) : (
              <Link href="/profile/edit" className="button button-primary">Add teaching skills</Link>
            )}
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
