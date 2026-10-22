"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { PublicTeacher } from "../data";
import { AppShell, Avatar, Icon } from "../site";

function toLocalDateTime(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function BookingForm({
  initialTeacherId,
  initialSkill,
}: {
  initialTeacherId: string;
  initialSkill: string;
}) {
  const router = useRouter();
  const [teachers, setTeachers] = useState<PublicTeacher[]>([]);
  const [teacherId, setTeacherId] = useState(initialTeacherId);
  const [skill, setSkill] = useState(initialSkill);
  const [scheduledAt, setScheduledAt] = useState(() => toLocalDateTime(new Date(Date.now() + 2 * 60 * 60 * 1000)));
  const [minimumDateTime] = useState(() => toLocalDateTime(new Date(Date.now() + 60 * 60 * 1000)));
  const [durationHours, setDurationHours] = useState(1.5);
  const [note, setNote] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBookingDetails() {
      try {
        const [teachersResponse, walletResponse] = await Promise.all([
          fetch("/api/teachers", { cache: "no-store" }),
          fetch("/api/wallet", { cache: "no-store" }),
        ]);
        const teachersData = await teachersResponse.json();
        const walletData = await walletResponse.json();
        if (teachersResponse.status === 401 || walletResponse.status === 401) {
          router.replace("/login");
          return;
        }
        if (!teachersResponse.ok || !walletResponse.ok) {
          setError(teachersData.error || walletData.error || "Could not load booking details.");
          return;
        }

        const availableTeachers = (teachersData.teachers ?? []) as PublicTeacher[];
        setTeachers(availableTeachers);
        setBalance(Number(walletData.balance));
        const selected = availableTeachers.find((teacher) => teacher.id === initialTeacherId);
        if (!selected && availableTeachers[0]) {
          setTeacherId(availableTeachers[0].id);
          setSkill(availableTeachers[0].teaching_skills[0] ?? "");
        } else if (selected && !selected.teaching_skills.includes(initialSkill)) {
          setSkill(selected.teaching_skills[0] ?? "");
        }
      } catch {
        setError("We couldn’t reach the server. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadBookingDetails();
  }, [initialSkill, initialTeacherId, router]);

  const selectedTeacher = teachers.find((teacher) => teacher.id === teacherId);
  const skills = selectedTeacher?.teaching_skills ?? [];
  const scheduledLabel = useMemo(() => {
    if (!scheduledAt) return "Choose a date and time";
    const date = new Date(scheduledAt);
    return Number.isNaN(date.getTime())
      ? "Choose a date and time"
      : new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(date);
  }, [scheduledAt]);

  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          skill,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationHours,
          note,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not request this session.");
        return;
      }
      router.push("/sessions");
      router.refresh();
    } catch {
      setError("We couldn’t reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Book a session">
      <div className="page-heading">
        <div>
          <div className="eyebrow">BOOK A SESSION</div>
          <h1>Swap time for something useful.</h1>
        </div>
        <Link href="/explore" className="text-link">
          Browse skills <Icon name="arrow" size={14} />
        </Link>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? (
        <p className="lead" role="status">Loading available teachers…</p>
      ) : teachers.length === 0 ? (
        <div className="empty-hint">
          <Icon name="search" />
          <span>No available teacher profiles yet. Complete onboarding on another account to start a swap.</span>
        </div>
      ) : (
        <form className="room-layout" onSubmit={createBooking}>
          <section className="clock-panel">
            <div className="clock-panel-top">
              <span>SESSION SUMMARY</span>
              <span className="stake"><i /> {durationHours.toFixed(1)} TC held on request</span>
            </div>

            <div className="field-stack">
              <label className="field-wrap">
                <span>Teacher</span>
                <select
                  required
                  value={teacherId}
                  onChange={(event) => {
                    const nextTeacher = teachers.find((teacher) => teacher.id === event.target.value);
                    setTeacherId(event.target.value);
                    setSkill(nextTeacher?.teaching_skills[0] ?? "");
                  }}
                >
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                  ))}
                </select>
              </label>

              <label className="field-wrap">
                <span>Skill to learn</span>
                <select required value={skill} onChange={(event) => setSkill(event.target.value)}>
                  {skills.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label className="field-wrap">
                <span>Session date and time</span>
                <input
                  type="datetime-local"
                  required
                  min={minimumDateTime}
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                />
              </label>

              <label className="field-wrap">
                <span>Length</span>
                <select
                  value={durationHours}
                  onChange={(event) => setDurationHours(Number(event.target.value))}
                >
                  {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map((hours) => (
                    <option key={hours} value={hours}>{hours} hour{hours === 1 ? "" : "s"}</option>
                  ))}
                </select>
              </label>
            </div>

            {selectedTeacher && (
              <div className="teacher-top" style={{ marginTop: 24 }}>
                <Avatar name={selectedTeacher.full_name} />
                <div>
                  <strong>{selectedTeacher.full_name}</strong>
                  <span>{selectedTeacher.location || selectedTeacher.timezone}</span>
                </div>
              </div>
            )}
          </section>

          <aside className="room-aside">
            <div className="room-side-card">
              <div className="eyebrow">BOOKING DETAILS</div>
              <h3>Send a session request</h3>

              <div className="profile-languages" style={{ marginBottom: 16 }}>
                <b>Time credit cost</b>
                <span>{durationHours.toFixed(1)} TC</span>
              </div>
              <div className="profile-languages" style={{ marginBottom: 16 }}>
                <b>Available balance</b>
                <span>{balance === null ? "—" : `${balance.toFixed(2)} TC`}</span>
              </div>
              <div className="profile-languages" style={{ marginBottom: 16 }}>
                <b>When</b>
                <span>{scheduledLabel}</span>
              </div>

              <label className="profile-languages" style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                <b>Session note</b>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Share what you want to practice or learn"
                  style={{
                    width: "100%",
                    resize: "vertical",
                    border: "1px solid #e9e4da",
                    background: "#fffdf9",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "#24332f",
                  }}
                />
              </label>

              <button className="button button-primary" type="submit" disabled={submitting || !teacherId || !skill} style={{ width: "100%" }}>
                {submitting ? "Sending request…" : "Request session"}
              </button>
              <p className="clock-footnote">Credits are held now and returned if the request is declined or cancelled before it starts.</p>
            </div>
          </aside>
        </form>
      )}
    </AppShell>
  );
}
