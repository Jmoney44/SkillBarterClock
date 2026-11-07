"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../site";
import { AdminShell } from "./admin-shell";

type Member = {
  id: string;
  full_name: string;
  email: string | null;
  location: string;
  timezone: string;
  onboarding_complete: boolean;
  role: "member" | "admin";
  credit_balance: number | string;
  pending_credits: number | string;
  suspended_at: string | null;
  suspension_reason: string | null;
  deleted_at: string | null;
  created_at: string;
};

type AdminSession = {
  id: string;
  skill: string;
  scheduled_at: string;
  duration_hours: number | string;
  status: string;
  closed_reason: string | null;
  learner_started: boolean;
  teacher_started: boolean;
  learner_ended: boolean;
  teacher_ended: boolean;
  open: boolean;
  learner_name: string;
  teacher_name: string;
};

type AdminReview = {
  id: string;
  rating: number;
  comment: string;
  hidden_at: string | null;
  hidden_reason: string | null;
  created_at: string;
  skill: string;
  reviewer_name: string;
  teacher_name: string;
};

type AdminAction = {
  id: string;
  action: string;
  amount: number | string | null;
  reason: string;
  created_at: string;
  admin_name: string;
  target_name: string | null;
  session_skill: string | null;
};

type AdminOverview = {
  viewerId: string;
  stats: {
    members: number;
    onboardedMembers: number;
    suspendedMembers: number;
    sessions: number;
    pendingRequests: number;
    activeSessions: number;
    completedSessions: number;
    hiddenReviews: number;
  };
  members: Member[];
  recentSessions: AdminSession[];
  reviews: AdminReview[];
  announcements: Array<{ id: string; title: string; message: string; created_at: string }>;
  actions: AdminAction[];
};

type PendingAction = {
  action: string;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  needsAmount?: boolean;
  target: { memberId?: string; sessionId?: string; reviewId?: string; announcementId?: string };
};

const actionLabels: Record<string, string> = {
  suspend_member: "Suspended member",
  unsuspend_member: "Unsuspended member",
  adjust_credits: "Adjusted credits",
  hide_review: "Hid review",
  unhide_review: "Restored review",
  cancel_session: "Cancelled session",
  complete_session: "Completed session",
  delete_announcement: "Deleted announcement",
  make_admin: "Made admin",
  remove_admin: "Removed admin",
  promote_admin: "Made admin",
  demote_admin: "Removed admin",
};

class UnauthorizedError extends Error {}
class ForbiddenError extends Error {}

async function fetchAdminOverview(search: string): Promise<AdminOverview> {
  const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
  const response = await fetch(`/api/admin/overview${query}`, { cache: "no-store" });
  const data = await response.json();
  if (response.status === 401) throw new UnauthorizedError("Not authenticated");
  if (response.status === 403) throw new ForbiddenError("Admin access required.");
  if (!response.ok) throw new Error(data.error || "Could not load the admin overview.");
  return data;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function sessionStatusLabel(session: AdminSession) {
  if (session.closed_reason === "admin_cancelled") return "cancelled by admin";
  if (session.closed_reason === "admin_completed") return "completed by admin";
  if (session.closed_reason === "auto_completed") return "auto-completed";
  if (session.closed_reason === "no_show") return "not started";
  if (session.closed_reason === "expired") return "expired";
  if (session.closed_reason === "declined") return "declined";
  if (session.status === "in_progress") {
    const ended = [session.learner_ended && "learner", session.teacher_ended && "teacher"].filter(Boolean);
    return ended.length ? `in progress (${ended.join(" & ")} ended)` : "in progress";
  }
  if (session.status === "confirmed" && (session.learner_started || session.teacher_started)) {
    return `confirmed (${session.learner_started ? "learner" : "teacher"} started)`;
  }
  return session.status.replace("_", " ");
}

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [actionError, setActionError] = useState("");
  const [working, setWorking] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementError, setAnnouncementError] = useState("");
  const [announcementSent, setAnnouncementSent] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async (query: string) => {
    try {
      setOverview(await fetchAdminOverview(query));
      setError("");
    } catch (loadError) {
      if (loadError instanceof UnauthorizedError) {
        router.replace("/login");
        return;
      }
      setError(loadError instanceof ForbiddenError
        ? "This account does not have admin access."
        : loadError instanceof Error ? loadError.message : "Could not load the admin overview.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    fetchAdminOverview("")
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        if (loadError instanceof UnauthorizedError) {
          router.replace("/login");
          return;
        }
        setError(loadError instanceof ForbiddenError
          ? "This account does not have admin access."
          : loadError instanceof Error ? loadError.message : "Could not load the admin overview.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [router]);

  function openAction(action: PendingAction) {
    setPending(action);
    setReason("");
    setAmount("");
    setActionError("");
  }

  async function runAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending) return;
    const numericAmount = Number(amount);
    if (pending.needsAmount && (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount === 0)) {
      setActionError("Enter a positive amount to add or a negative amount to remove.");
      return;
    }
    setWorking(true);
    setActionError("");
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pending.action,
          reason,
          ...pending.target,
          ...(pending.needsAmount ? { amount: numericAmount } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not complete that action.");
      setNotice(data.warning ? `${actionLabels[pending.action]}. ${data.warning}` : `${actionLabels[pending.action]}.`);
      setPending(null);
      await load(search);
    } catch (runError) {
      setActionError(runError instanceof Error ? runError.message : "Could not complete that action.");
    } finally {
      setWorking(false);
    }
  }

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
      await load(search);
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
          <p className="lead">Look after members, sessions, and reviews. Every action needs a reason and is recorded in the audit log.</p>
        </div>
        <span className="admin-readonly-pill"><Icon name="shield" size={14} /> ADMIN TOOLS</span>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-success" role="status">{notice}</p>}
      {loading ? (
        <p className="lead" role="status">Loading admin overview…</p>
      ) : overview ? (
        <>
          <div className="admin-stats">
            <article><span><Icon name="message" /></span><b>{overview.stats.members}</b><small>Members</small></article>
            <article><span><Icon name="check" /></span><b>{overview.stats.onboardedMembers}</b><small>Onboarded</small></article>
            <article><span><Icon name="calendar" /></span><b>{overview.stats.activeSessions}</b><small>Active sessions</small></article>
            <article><span><Icon name="clock" /></span><b>{overview.stats.pendingRequests}</b><small>Requests waiting</small></article>
            <article><span><Icon name="shield" /></span><b>{overview.stats.suspendedMembers}</b><small>Suspended</small></article>
          </div>

          <section className="admin-section" id="community">
            <div className="section-heading">
              <div><div className="eyebrow">COMMUNITY</div><h3>Members</h3></div>
              <form
                className="admin-search"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  void load(search);
                }}
              >
                <input
                  aria-label="Search members by name or email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or email"
                />
                <button className="button button-secondary small-button" type="submit"><Icon name="search" size={14} /> Search</button>
              </form>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Member</th><th>Status</th><th>Credits</th><th>Joined</th><th><span className="visually-hidden">Actions</span></th></tr>
                </thead>
                <tbody>
                  {overview.members.map((member) => {
                    const actionable = member.role !== "admin" && !member.deleted_at;
                    const isViewer = member.id === overview.viewerId;
                    return (
                      <tr key={member.id}>
                        <td>
                          <b>{member.full_name || "Name not set"}</b>
                          <span>{member.email || (member.deleted_at ? "Account deleted" : "No email")}</span>
                          {member.role === "admin" && <em>{isViewer ? "Admin (you)" : "Admin"}</em>}
                        </td>
                        <td>
                          {member.deleted_at ? (
                            <span className="admin-badge">Deleted</span>
                          ) : member.suspended_at ? (
                            <>
                              <span className="admin-badge admin-badge-danger">Suspended</span>
                              {member.suspension_reason && <span>{member.suspension_reason}</span>}
                            </>
                          ) : (
                            <span className={`admin-badge ${member.onboarding_complete ? "complete" : ""}`}>{member.onboarding_complete ? "Active" : "Onboarding"}</span>
                          )}
                        </td>
                        <td>{Number(member.credit_balance).toFixed(2)} available<br />{Number(member.pending_credits).toFixed(2)} held</td>
                        <td>{formatDate(member.created_at)}</td>
                        <td className="admin-row-actions">
                          {actionable && (
                            <>
                              <button
                                className="text-link"
                                type="button"
                                onClick={() => openAction({
                                  action: "adjust_credits",
                                  title: `Adjust credits for ${member.full_name}`,
                                  description: `Current balance: ${Number(member.credit_balance).toFixed(2)} TC. Use a negative amount to remove credits. This appears in their wallet with your reason.`,
                                  confirmLabel: "Adjust credits",
                                  needsAmount: true,
                                  target: { memberId: member.id },
                                })}
                              >
                                Adjust credits
                              </button>
                              {member.suspended_at ? (
                                <button
                                  className="text-link"
                                  type="button"
                                  onClick={() => openAction({
                                    action: "unsuspend_member",
                                    title: `Unsuspend ${member.full_name}`,
                                    description: "They’ll be able to sign in, book, and teach again, and will reappear in Explore.",
                                    confirmLabel: "Unsuspend",
                                    target: { memberId: member.id },
                                  })}
                                >
                                  Unsuspend
                                </button>
                              ) : (
                                <button
                                  className="text-link danger-button"
                                  type="button"
                                  onClick={() => openAction({
                                    action: "suspend_member",
                                    title: `Suspend ${member.full_name}`,
                                    description: "They’ll be signed out and blocked from signing in, booking, teaching, and reviewing, and hidden from Explore. Their requested and confirmed sessions are cancelled and learners refunded. Sessions already in progress are left for you to resolve.",
                                    confirmLabel: "Suspend member",
                                    danger: true,
                                    target: { memberId: member.id },
                                  })}
                                >
                                  Suspend
                                </button>
                              )}
                              {!member.suspended_at && (
                                <button
                                  className="text-link"
                                  type="button"
                                  onClick={() => openAction({
                                    action: "make_admin",
                                    title: `Make ${member.full_name} an admin`,
                                    description: "They’ll get full access to this admin page: suspending members, adjusting credits, resolving sessions, moderating reviews, and changing other members’ roles. Only give this to people you trust.",
                                    confirmLabel: "Make admin",
                                    danger: true,
                                    target: { memberId: member.id },
                                  })}
                                >
                                  Make admin
                                </button>
                              )}
                            </>
                          )}
                          {member.role === "admin" && !isViewer && !member.deleted_at && (
                            <button
                              className="text-link danger-button"
                              type="button"
                              onClick={() => openAction({
                                action: "remove_admin",
                                title: `Remove admin access from ${member.full_name}`,
                                description: "They’ll become a regular member and lose access to this admin page. Their account, sessions, and credits are unchanged.",
                                confirmLabel: "Remove admin",
                                danger: true,
                                target: { memberId: member.id },
                              })}
                            >
                              Remove admin
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {overview.members.length === 0 && <p className="admin-empty">No members match that search.</p>}
            </div>
          </section>

          <section className="admin-section" id="sessions">
            <div className="section-heading">
              <div><div className="eyebrow">EXCHANGE ACTIVITY</div><h3>Sessions</h3></div>
              <span className="result-count">Open sessions first · {overview.stats.sessions} total</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Skill</th><th>Learner</th><th>Teacher</th><th>Scheduled</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr>
                </thead>
                <tbody>
                  {overview.recentSessions.map((session) => (
                    <tr key={session.id}>
                      <td><b>{session.skill}</b><span>{Number(session.duration_hours)} hour{Number(session.duration_hours) === 1 ? "" : "s"}</span></td>
                      <td>{session.learner_name}</td>
                      <td>{session.teacher_name}</td>
                      <td>{formatDate(session.scheduled_at)}</td>
                      <td><span className={`admin-badge ${session.status === "completed" ? "complete" : ""}`}>{sessionStatusLabel(session)}</span></td>
                      <td className="admin-row-actions">
                        {session.open && (
                          <button
                            className="text-link danger-button"
                            type="button"
                            onClick={() => openAction({
                              action: "cancel_session",
                              title: `Cancel ${session.skill} (${session.learner_name} with ${session.teacher_name})`,
                              description: `The learner gets their ${Number(session.duration_hours).toFixed(1)} held credits back and both people are emailed.`,
                              confirmLabel: "Cancel and refund",
                              danger: true,
                              target: { sessionId: session.id },
                            })}
                          >
                            Cancel &amp; refund
                          </button>
                        )}
                        {(session.status === "in_progress" || session.status === "confirmed") && (
                          <button
                            className="text-link"
                            type="button"
                            onClick={() => openAction({
                              action: "complete_session",
                              title: `Mark ${session.skill} complete`,
                              description: `${session.teacher_name} receives the learner’s ${Number(session.duration_hours).toFixed(1)} held credits and both people are emailed. Use this when the session happened but wasn’t closed properly.`,
                              confirmLabel: "Mark complete",
                              target: { sessionId: session.id },
                            })}
                          >
                            Mark complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {overview.recentSessions.length === 0 && <p className="admin-empty">No sessions to display.</p>}
            </div>
          </section>

          <section className="admin-section" id="reviews">
            <div className="section-heading">
              <div><div className="eyebrow">MODERATION</div><h3>Recent reviews</h3></div>
              <span className="result-count">{overview.stats.hiddenReviews} hidden</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Review</th><th>For</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr>
                </thead>
                <tbody>
                  {overview.reviews.map((review) => (
                    <tr key={review.id}>
                      <td>
                        <b>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} · {review.reviewer_name}</b>
                        <span>{review.comment || "No comment"}</span>
                      </td>
                      <td>{review.teacher_name}<br /><span>{review.skill} · {formatDate(review.created_at)}</span></td>
                      <td>
                        {review.hidden_at
                          ? <><span className="admin-badge admin-badge-danger">Hidden</span>{review.hidden_reason && <span>{review.hidden_reason}</span>}</>
                          : <span className="admin-badge complete">Visible</span>}
                      </td>
                      <td className="admin-row-actions">
                        <button
                          className={`text-link ${review.hidden_at ? "" : "danger-button"}`}
                          type="button"
                          onClick={() => openAction(review.hidden_at
                            ? { action: "unhide_review", title: "Restore this review", description: "It will show on the teacher’s profile and count towards their rating again.", confirmLabel: "Restore review", target: { reviewId: review.id } }
                            : { action: "hide_review", title: "Hide this review", description: "It will be removed from the teacher’s profile and rating. You can restore it later.", confirmLabel: "Hide review", danger: true, target: { reviewId: review.id } })}
                        >
                          {review.hidden_at ? "Restore" : "Hide"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {overview.reviews.length === 0 && <p className="admin-empty">No reviews yet.</p>}
            </div>
          </section>

          <section className="admin-section" id="announcements">
            <div className="section-heading">
              <div><div className="eyebrow">COMMUNITY UPDATES</div><h3>Announcements</h3></div>
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
            {overview.announcements.length > 0 && (
              <div className="admin-table-wrap" style={{ marginTop: 14 }}>
                <table className="admin-table">
                  <thead><tr><th>Published</th><th>Announcement</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
                  <tbody>
                    {overview.announcements.map((announcement) => (
                      <tr key={announcement.id}>
                        <td>{formatDate(announcement.created_at)}</td>
                        <td><b>{announcement.title}</b><span>{announcement.message}</span></td>
                        <td className="admin-row-actions">
                          <button
                            className="text-link danger-button"
                            type="button"
                            onClick={() => openAction({ action: "delete_announcement", title: `Delete “${announcement.title}”`, description: "It will be removed from every member’s notification bell.", confirmLabel: "Delete announcement", danger: true, target: { announcementId: announcement.id } })}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="admin-section" id="audit-log">
            <div className="section-heading">
              <div><div className="eyebrow">ACCOUNTABILITY</div><h3>Audit log</h3></div>
              <span className="result-count">Latest {overview.actions.length} actions</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Reason</th></tr></thead>
                <tbody>
                  {overview.actions.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.created_at)}</td>
                      <td>{entry.admin_name}</td>
                      <td>
                        <b>{actionLabels[entry.action] ?? entry.action}</b>
                        <span>
                          {[entry.target_name, entry.session_skill, entry.amount !== null ? `${Number(entry.amount) > 0 ? "+" : ""}${Number(entry.amount).toFixed(2)} TC` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </td>
                      <td>{entry.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {overview.actions.length === 0 && <p className="admin-empty">No admin actions yet.</p>}
            </div>
          </section>
        </>
      ) : null}

      {pending && (
        <div className="admin-dialog-backdrop" onClick={() => !working && setPending(null)}>
          <form
            className="admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-dialog-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !working) setPending(null);
            }}
            onSubmit={runAction}
          >
            <h3 id="admin-dialog-title">{pending.title}</h3>
            <p>{pending.description}</p>
            {pending.needsAmount && (
              <label className="field-wrap" htmlFor="admin-amount">
                <span>Amount (TC)</span>
                <input id="admin-amount" type="number" step="0.5" min={-100} max={100} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 2 or -1.5" required autoFocus />
              </label>
            )}
            <label className="field-wrap" htmlFor="admin-reason">
              <span>Reason (recorded in the audit log)</span>
              <textarea id="admin-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={300} rows={3} required autoFocus={!pending.needsAmount} />
            </label>
            {actionError && <p className="form-error" role="alert">{actionError}</p>}
            <div className="admin-dialog-actions">
              <button className="button button-quiet" type="button" disabled={working} onClick={() => setPending(null)}>Back</button>
              <button className={`button button-primary ${pending.danger ? "danger-button" : ""}`} type="submit" disabled={working || reason.trim().length < 3}>
                {working ? "Working…" : pending.confirmLabel}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  );
}
