"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicTeacher } from "../../data";
import { AppShell, Avatar, Icon } from "../../site";
import { RatingSummary, ReviewList, type TeacherReview } from "../../ratings";

export default function TeacherProfile({ teacherId }: { teacherId: string }) {
  const router = useRouter();
  const [teacher, setTeacher] = useState<PublicTeacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState<TeacherReview[]>([]);
  const [reviewsError, setReviewsError] = useState("");

  useEffect(() => {
    async function loadTeacher() {
      try {
        const response = await fetch(`/api/teachers?id=${encodeURIComponent(teacherId)}`, { cache: "no-store" });
        const data = await response.json();
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          setError(data.error || "Could not load this teacher profile.");
          return;
        }
        setTeacher(data.teachers?.[0] ?? null);
      } catch {
        setError("We couldn’t reach the server. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    async function loadReviews() {
      try {
        const response = await fetch(`/api/reviews?teacherId=${encodeURIComponent(teacherId)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) {
          if (response.status !== 401) setReviewsError(data.error || "Could not load reviews.");
          return;
        }
        setReviews(data.reviews ?? []);
      } catch {
        setReviewsError("Could not load reviews.");
      }
    }

    void loadTeacher();
    void loadReviews();
  }, [router, teacherId]);

  return (
    <AppShell title="Teacher profile">
      {loading ? (
        <p className="lead" role="status">Loading teacher profile…</p>
      ) : error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : !teacher ? (
        <div className="empty-hint"><Icon name="search" /><span>This teacher profile is not available.</span></div>
      ) : (
        <>
          <div className="page-heading">
            <div>
              <div className="eyebrow">TEACHER PROFILE</div>
              <h1>{teacher.full_name}</h1>
              <p className="lead">{teacher.teaching_skills.join(" · ")}</p>
              <RatingSummary average={teacher.rating_average} count={teacher.rating_count} />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/explore" className="button button-secondary">Back to explore</Link>
              <Link
                href={`/book?teacher=${encodeURIComponent(teacher.id)}&skill=${encodeURIComponent(teacher.teaching_skills[0] ?? "")}`}
                className="button button-primary"
              >
                Book a session
              </Link>
            </div>
          </div>

          <div className="profile-banner">
            <div className="profile-portrait"><Avatar src={teacher.avatar_url} name={teacher.full_name} size="lg" /></div>
            <div>
              <div className="eyebrow">COMMUNITY MATCH</div>
              <h3 style={{ margin: "6px 0 6px" }}>{teacher.full_name}</h3>
              <p className="lead">{teacher.bio || "A member of the Skill Barter Clock community."}</p>
              <span className="profile-meta">
                {teacher.location || teacher.timezone}
                {teacher.availability && <> <i>·</i> {teacher.availability}</>}
              </span>
            </div>
          </div>

          <div className="profile-columns">
            <section>
              <div className="section-heading">
                <div><div className="eyebrow">WHAT THEY TEACH</div><h3>Skills shared</h3></div>
              </div>
              <div className="profile-tags">
                {teacher.teaching_skills.map((skill) => <span key={skill}>{skill}</span>)}
              </div>

              {teacher.learning_skills.length > 0 && (
                <>
                  <div className="section-heading profile-learn-heading">
                    <div><div className="eyebrow">ALSO OPEN TO SWAP</div><h3>Skills they want to learn</h3></div>
                  </div>
                  <div className="profile-tags">
                    {teacher.learning_skills.map((skill) => <span key={skill}>{skill}</span>)}
                  </div>
                </>
              )}
            </section>

            <section className="profile-about">
              <div className="eyebrow">ABOUT THIS MATCH</div>
              <p>{teacher.bio || `${teacher.full_name} is ready to share skills with the community.`}</p>
              <div className="profile-languages"><b>Languages</b><span>{teacher.languages.join(", ") || "Not specified"}</span></div>
              <div className="profile-languages"><b>Timezone</b><span>{teacher.timezone}</span></div>
              <div className="profile-languages"><b>Availability</b><span>{teacher.availability || "Not specified"}</span></div>
            </section>
          </div>

          <section className="section-block" style={{ marginTop: 28 }}>
            <div className="section-heading">
              <div><div className="eyebrow">FROM THEIR LEARNERS</div><h3>Reviews</h3></div>
              <RatingSummary average={teacher.rating_average} count={teacher.rating_count} />
            </div>
            {reviewsError ? (
              <p className="form-error" role="alert">{reviewsError}</p>
            ) : reviews.length ? (
              <ReviewList reviews={reviews} />
            ) : (
              <div className="empty-hint"><Icon name="message" /><span>No reviews yet. Learners can leave one after a completed session.</span></div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
