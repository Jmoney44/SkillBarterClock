"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, Icon, TeacherCard } from "../site";
import type { PublicTeacher } from "../data";

export default function ExplorePage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<PublicTeacher[]>([]);
  const [query, setQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("All skills");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTeachers() {
      try {
        const response = await fetch("/api/teachers", { cache: "no-store" });
        const data = await response.json();
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          setError(data.error || "Could not load teachers.");
          return;
        }
        setTeachers(data.teachers ?? []);
      } catch {
        setError("We couldn’t reach the server. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadTeachers();
  }, [router]);

  const skills = useMemo(
    () => ["All skills", ...new Set(teachers.flatMap((teacher) => teacher.teaching_skills))],
    [teachers],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visibleTeachers = teachers.filter((teacher) => {
    const matchesSkill = selectedSkill === "All skills" || teacher.teaching_skills.includes(selectedSkill);
    const searchable = [
      teacher.full_name,
      teacher.bio,
      teacher.location,
      teacher.languages.join(" "),
      teacher.teaching_skills.join(" "),
      teacher.learning_skills.join(" "),
    ].join(" ").toLowerCase();
    return matchesSkill && (!normalizedQuery || searchable.includes(normalizedQuery));
  });

  return (
    <AppShell title="Explore skills">
      <div className="page-heading">
        <div className="eyebrow">FIND YOUR NEXT THING</div>
        <h1>Good skills, good people.</h1>
        <p className="lead">Learn from someone nearby. Share a little of what you know.</p>
      </div>

      <div className="explore-search">
        <Icon name="search" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try “Yoruba”, “Excel”, or “guitar”"
          aria-label="Search skills"
        />
        <button
          className="button button-primary"
          type="button"
          onClick={() => setQuery(query.trim())}
        >
          <Icon name="filter" size={17} /> Search
        </button>
      </div>

      <div className="filter-row">
        {skills.map((skill) => (
          <button
            className={`filter-chip ${selectedSkill === skill ? "selected" : ""}`}
            type="button"
            key={skill}
            onClick={() => setSelectedSkill(skill)}
          >
            {skill}
          </button>
        ))}
      </div>

      <div className="section-heading explore-title">
        <div>
          <div className="eyebrow">A FEW GOOD MATCHES</div>
          <h3>Teachers worth your time</h3>
        </div>
        <span className="result-count">
          {loading ? "Loading…" : `Showing ${visibleTeachers.length} ${visibleTeachers.length === 1 ? "person" : "people"}`}
        </span>
      </div>

      {error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : loading ? (
        <p className="lead" role="status">Finding community teachers…</p>
      ) : visibleTeachers.length ? (
        <div className="teacher-grid explore-grid">
          {visibleTeachers.map((teacher) => <TeacherCard key={teacher.id} person={teacher} />)}
        </div>
      ) : (
        <div className="empty-hint">
          <Icon name="search" />
          <span>{teachers.length ? "No teachers match those filters yet." : "No completed teacher profiles yet. Finish onboarding to appear in Explore."}</span>
        </div>
      )}

      <div className="fairness-note">
        <Icon name="shield" />
        <span><b>Same time, same worth.</b> One hour of any skill is always one time credit.</span>
      </div>
    </AppShell>
  );
}
