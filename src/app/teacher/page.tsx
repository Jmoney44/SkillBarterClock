import Link from "next/link";
import { AppShell, Avatar, Icon } from "../site";
import { people } from "../data";

export default function TeacherPage({
  params,
}: {
  params: { id: string };
}) {
  const person = people.find((entry) => entry.id === params.id) ?? people[0];

  return (
    <AppShell title={person.name}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TEACHER PROFILE</div>
          <h1>{person.name}</h1>
          <p className="lead">{person.skill} · {person.category}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/explore" className="button button-secondary">Back to explore</Link>
          <Link href="/book" className="button button-primary">Book a session</Link>
        </div>
      </div>

      <div className="profile-banner">
        <div className="profile-portrait">
          <Avatar image={person.image} name={person.name} size="lg" />
        </div>
        <div>
          <div className="eyebrow">COMMUNITY MATCH</div>
          <h3 style={{ margin: "6px 0 6px" }}>{person.name}</h3>
          <p className="lead">Friendly, practical, and happy to teach in short, useful sessions.</p>
          <span className="profile-meta">
            Lagos, Nigeria <i>·</i> {person.hours} <i>·</i> <Icon name="shield" size={14} /> Verified teacher
          </span>
        </div>
      </div>

      <div className="profile-stats">
        <div><b>{person.rating} <span>★</span></b><small>Trust score</small></div>
        <div><b>{person.hours.split(" ")[0]}</b><small>Hours taught</small></div>
        <div><b>98%</b><small>Response rate</small></div>
        <div><b>7</b><small>Sessions this month</small></div>
      </div>

      <div className="profile-columns">
        <section>
          <div className="section-heading">
            <div>
              <div className="eyebrow">WHAT THEY TEACH</div>
              <h3>Skills shared</h3>
            </div>
          </div>
          <div className="skill-box"><b>{person.skill}</b><span>Great for learners who want a warm, practical first step.</span></div>

          <div className="section-heading profile-learn-heading">
            <div>
              <div className="eyebrow">ALSO OPEN TO SWAP</div>
              <h3>Other exchanges</h3>
            </div>
          </div>
          <div className="profile-tags"><span>{person.swap}</span></div>
        </section>

        <section className="profile-about">
          <div className="eyebrow">ABOUT THIS MATCH</div>
          <p>
            {person.name} enjoys helping people build confidence through short, useful sessions. This is a good fit for people who want a relaxed, real-world exchange without heavy formal teaching.
          </p>
          <div className="profile-languages"><b>Best for</b><span>Beginners, curious learners, and people who want practical guidance.</span></div>
          <div className="profile-languages"><b>Typical session</b><span>1–2 hour guided practice with clear next steps.</span></div>
        </section>
      </div>
    </AppShell>
  );
}
