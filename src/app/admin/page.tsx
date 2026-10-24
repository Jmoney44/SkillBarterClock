"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../site";
import { AdminShell } from "./admin-shell";

type AdminOverview = {
  stats: {
    members: number;
    onboardedMembers: number;
    sessions: number;
    pendingRequests: number;
    activeSessions: number;
    completedSessions: number;
  };
  members: Array<{
    id: string;
    full_name: string;
    email: string | null;
    location: string;
    timezone: string;
    onboarding_complete: boolean;
    role: "member" | "admin";
    credit_balance: number | string;
    pending_credits: number | string;
    created_at: string;
  }>;
  recentSessions: Array<{
    id: string;
    skill: string;
    scheduled_at: string;
    duration_hours: number | string;
    status: string;
    created_at: string;
    learner_name: string;
    teacher_name: string;
  }>;
};

class UnauthorizedError extends Error {}
class ForbiddenError extends Error {}

async function fetchAdminOverview(): Promise<AdminOverview> {
  const response = await fetch("/api/admin/overview", { cache: "no-store" });
  const data = await response.json();
  if (response.status === 401) throw new UnauthorizedError("Not authenticated");
  if (response.status === 403) throw new ForbiddenError("Admin access required.");
  if (!response.ok) throw new Error(data.error || "Could not load the admin overview.");
  return data;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementError, setAnnouncementError] = useState("");
  const [announcementSent, setAnnouncementSent] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAdminOverview()
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        if (loadError instanceof UnauthorizedError) {
          router.replace("/login");
          return;
        }
        if (loadError instanceof ForbiddenError) {
          setError("This account does not have admin access.");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Could not load the admin overview.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [router]);

  async function publishAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPublishing(true);
    setAnnouncementError("");
    setAnnouncementSent(false);
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: announcementTitle, message: announcementMessage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish the announcement.");
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setAnnouncementSent(true);
    } catch (publishError) {
      setAnnouncementError(publishError instanceof Error ? publishError.message : "Could not publish the announcement.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <AdminShell>
      <div className="admin-page-heading">
        <div>
          <div className="eyebrow">PLATFORM OPERATIONS</div>
          <h1>Admin overview</h1>
          <p className="lead">Monitor community activity and share important updates with members.</p>
        </div>
        <span className="admin-readonly-pill"><Icon name="shield" size={14} /> ADMIN TOOLS</span>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? (
        <p className="lead" role="status">Loading admin overview…</p>
      ) : overview ? (
        <>
          <div className="admin-stats">
            <article><span><Icon name="message" /></span><b>{overview.stats.members}</b><small>Members</small></article>
            <article><span><Icon name="check" /></span><b>{overview.stats.onboardedMembers}</b><small>Onboarded</small></article>
            <article><span><Icon name="calendar" /></span><b>{overview.stats.activeSessions}</b><small>Active sessions</small></article>
            <article><span><Icon name="clock" /></span><b>{overview.stats.pendingRequests}</b><small>Requests waiting</small></article>
            <article><span><Icon name="shield" /></span><b>{overview.stats.completedSessions}</b><small>Completed sessions</small></article>
          </div>

          <section className="admin-section" id="community">
            <div className="section-heading">
              <div><div className="eyebrow">COMMUNITY</div><h3>Recent members</h3></div>
              <span className="result-count">Latest {overview.members.length} accounts</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Member</th><th>Location / timezone</th><th>Onboarding</th><th>Credits</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {overview.members.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <b>{member.full_name || "Name not set"}</b>
                        <span>{member.email || "No email"}</span>
                        {member.role === "admin" && <em>Admin</em>}
                      </td>
                      <td>{member.location || member.timezone}</td>
                      <td><span className={`admin-badge ${member.onboarding_complete ? "complete" : ""}`}>{member.onboarding_complete ? "Complete" : "Pending"}</span></td>
                      <td>{Number(member.credit_balance).toFixed(2)} available<br />{Number(member.pending_credits).toFixed(2)} held</td>
                      <td>{formatDate(member.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {overview.members.length === 0 && <p className="admin-empty">No members to display.</p>}
            </div>
          </section>

          <section className="admin-section" id="sessions">
            <div className="section-heading">
              <div><div className="eyebrow">EXCHANGE ACTIVITY</div><h3>Recent sessions</h3></div>
              <span className="result-count">{overview.stats.sessions} total sessions</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Skill</th><th>Learner</th><th>Teacher</th><th>Scheduled</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {overview.recentSessions.map((session) => (
                    <tr key={session.id}>
                      <td><b>{session.skill}</b><span>{Number(session.duration_hours)} hour{Number(session.duration_hours) === 1 ? "" : "s"}</span></td>
                      <td>{session.learner_name}</td>
                      <td>{session.teacher_name}</td>
                      <td>{formatDate(session.scheduled_at)}</td>
                      <td><span className={`admin-badge ${session.status === "completed" ? "complete" : ""}`}>{session.status.replace("_", " ")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {overview.recentSessions.length === 0 && <p className="admin-empty">No sessions to display.</p>}
            </div>
          </section>

          <section className="admin-section" id="announcements">
            <div className="section-heading">
              <div><div className="eyebrow">COMMUNITY UPDATES</div><h3>Send an announcement</h3></div>
            </div>
            <form className="admin-announcement-form" onSubmit={publishAnnouncement}>
              <label className="field-wrap" htmlFor="announcement-title">
                <span>Title</span>
                <input id="announcement-title" value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} minLength={3} maxLength={100} required placeholder="A short, clear headline" />
              </label>
              <label className="field-wrap" htmlFor="announcement-message">
                <span>Message</span>
                <textarea id="announcement-message" value={announcementMessage} onChange={(event) => setAnnouncementMessage(event.target.value)} minLength={5} maxLength={500} rows={4} required placeholder="Share an update with all members…" />
              </label>
              {announcementError && <p className="form-error" role="alert">{announcementError}</p>}
              {announcementSent && <p className="form-success" role="status">Announcement published and delivered to member notifications.</p>}
              <div className="admin-announcement-actions">
                <small>Members will see this in their notification bell.</small>
                <button type="submit" className="button button-primary" disabled={publishing}>{publishing ? "Publishing…" : "Publish announcement"}</button>
              </div>
            </form>
          </section>

          <div className="fairness-note">
            <Icon name="shield" />
            <span><b>Credit balances are view-only here.</b> Time credits are changed only through verified session flows.</span>
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}
