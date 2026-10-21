import Link from "next/link";
import { AppShell, Icon, TeacherCard } from "../site";
import { people } from "../data";

export default function ExplorePage() {
  return (
    <AppShell title="Explore skills">
      <div className="page-heading">
        <div className="eyebrow">FIND YOUR NEXT THING</div>
        <h1>Good skills, good people.</h1>
        <p className="lead">Learn from someone nearby. Share a little of what you know.</p>
      </div>

      <div className="explore-search">
        <Icon name="search" />
        <input defaultValue="" placeholder="Try “Yoruba”, “Excel”, or “guitar”" aria-label="Search skills" />
        <button className="button button-primary" type="button"><Icon name="filter" size={17} /> Filters</button>
      </div>

      <div className="filter-row">
        {['All skills','Tech & office','Languages','Creative','Business','Life skills'].map((item) => (
          <button className={`filter-chip ${item === 'All skills' ? 'selected' : ''}`} type="button" key={item}>{item}</button>
        ))}
      </div>

      <div className="section-heading explore-title">
        <div>
          <div className="eyebrow">A FEW GOOD MATCHES</div>
          <h3>Teachers worth your time</h3>
        </div>
        <span className="result-count">Showing 24 people</span>
      </div>

      <div className="teacher-grid explore-grid">
        {people.map((person) => (
          <TeacherCard key={person.name} person={person} />
        ))}
      </div>

      <div className="fairness-note">
        <Icon name="shield" />
        <span><b>Same time, same worth.</b> One hour of any skill is always one time credit.</span>
      </div>

      <div className="link-row">
        <Link href="/session" className="text-link">Open sample session <Icon name="arrow" size={14} /></Link>
      </div>
    </AppShell>
  );
}
