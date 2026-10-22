"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicTeacher } from "./data";
import { AppShell, Avatar, Icon, TeacherCard } from "./site";

type Profile = { name: string };
type Session = {
  id: string;
  skill: string;
  scheduled_at: string;
  duration_hours: number | string;
  status: "requested" | "confirmed" | "in_progress" | "completed" | "cancelled";
  role: "learner" | "teacher";
  partner_name: string;
};
type DashboardData = {
  profile: Profile;
  balance: number;
  pending: number;
  sessions: Session[];
  teachers: PublicTeacher[];
};

class UnauthorizedError extends Error {}

async function fetchDashboard(): Promise<DashboardData> {
  const responses = await Promise.all([
    fetch("/api/profile", { cache: "no-store" }),
    fetch("/api/wallet", { cache: "no-store" }),
    fetch("/api/sessions", { cache: "no-store" }),
    fetch("/api/teachers", { cache: "no-store" }),
  ]);
  const data = await Promise.all(responses.map((response) => response.json()));

  if (responses.some((response) => response.status === 401)) {
    throw new UnauthorizedError("Not authenticated");
  }
  const failedIndex = responses.findIndex((response) => !response.ok);
  if (failedIndex !== -1) {
    throw new Error(data[failedIndex].error || "Could not load your dashboard.");
  }

  return {
    profile: data[0].user,
    balance: Number(data[1].balance),
    pending: Number(data[1].pending),
    sessions: data[2].sessions ?? [],
    teachers: data[3].teachers ?? [],
  };
}

export default function Home() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchDashboard()
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        if (loadError instanceof UnauthorizedError) {
          router.replace("/login");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Could not load your dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [router]);

  const upcomingSessions = (dashboard?.sessions ?? [])
    .filter((session) => ["requested", "confirmed", "in_progress"].includes(session.status))
    .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime())
    .slice(0, 3);

  return (
    <AppShell title="Overview">
      {loading ? (
        <p className="lead" role="status">Loading your dashboard…</p>
      ) : error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : dashboard ? (
        <>
          <div className="welcome-row">
            <div>
              <div className="eyebrow">YOUR COMMUNITY, YOUR TIME</div>
              <h1>Welcome back, {dashboard.profile.name || "member"}.</h1>
              <p className="lead">A little time shared goes a long way.</p>
            </div>
            <Link className="button button-primary" href="/book"><Icon name="plus" size={17} /> Book a session</Link>
          </div>

          <div className="stat-strip">
            <div><span className="stat-icon"><Icon name="wallet" /></span><span><b>{dashboard.balance.toFixed(2)} TC</b><small>Available credits</small></span></div>
            <div><span className="stat-icon"><Icon name="clock" /></span><span><b>{dashboard.pending.toFixed(2)} TC</b><small>Held for sessions</small></span></div>
            <div><span className="stat-icon"><Icon name="calendar" /></span><span><b>{upcomingSessions.length}</b><small>Upcoming sessions</small></span></div>
            <div><span className="stat-icon"><Icon name="search" /></span><span><b>{dashboard.teachers.length}</b><small>Teachers to explore</small></span></div>
          </div>

          <div className="dashboard-grid">
            <section className="section-block">
              <div className="section-heading">
                <div><div className="eyebrow">ON THE HORIZON</div><h3>Your next sessions</h3></div>
                <Link className="text-link" href="/sessions">All sessions <Icon name="arrow" size={14} /></Link>
              </div>
              {upcomingSessions.length ? (
                <div className="session-page-list">
                  {upcomingSessions.map((session) => (
                    <article className="session-card" key={session.id}>
                      <div className="date-tile">
                        <b>{new Intl.DateTimeFormat(undefined, { day: "numeric" }).format(new Date(session.scheduled_at))}</b>
                        <span>{new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(session.scheduled_at))}</span>
                      </div>
                      <Avatar name={session.partner_name} />
                      <div className="session-main">
                        <strong>{session.skill}</strong>
                        <span>{session.role === "learner" ? "Learning with" : "Teaching"} {session.partner_name}</span>
                        <small><Icon name="clock" size={14} /> {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.scheduled_at))}</small>
                      </div>
                      <Link className="button button-secondary small-button" href={`/session?id=${encodeURIComponent(session.id)}`}>Open</Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-hint"><Icon name="calendar" /><span>No upcoming sessions yet. Explore skills to find your first match.</span></div>
              )}
            </section>

            <aside className="wallet-card">
              <div className="wallet-card-top"><span>YOUR TIME WALLET</span><Icon name="wallet" size={18} /></div>
              <strong>{dashboard.balance.toFixed(2)} <small>TC</small></strong>
              <span>Available to learn</span>
              <div className="wallet-card-bottom"><span>Held</span><b>{dashboard.pending.toFixed(2)} TC</b></div>
              <Link className="wallet-link" href="/wallet">View wallet activity <Icon name="arrow" size={14} /></Link>
            </aside>
          </div>

          <section className="section-block match-block">
            <div className="section-heading">
              <div><div className="eyebrow">GOOD PEOPLE, GOOD EXCHANGE</div><h3>People you might click with</h3></div>
              <Link className="text-link" href="/explore">Explore everyone <Icon name="arrow" size={14} /></Link>
            </div>
            {dashboard.teachers.length ? (
              <div className="teacher-grid">
                {dashboard.teachers.slice(0, 3).map((teacher) => <TeacherCard key={teacher.id} person={teacher} />)}
              </div>
            ) : (
              <div className="empty-hint"><Icon name="search" /><span>No other teacher profiles yet. Invite someone to join your community.</span></div>
            )}
          </section>

          <div className="trust-strip">
            <span className="trust-mark"><Icon name="shield" size={16} /></span>
            <span><strong>Time is the only currency here.</strong> Credits are held until both partners confirm their session.</span>
            <Link className="text-link" href="/wallet">How credits work <Icon name="arrow" size={13} /></Link>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
