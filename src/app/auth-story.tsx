import Link from "next/link";

/** Left-hand brand panel shared by the account recovery pages. */
export function AuthStory() {
  return (
    <aside className="auth-story">
      <Link className="brand auth-story-brand" href="/" aria-label="Skill Barter Clock home">
        <span className="brand-mark"><span /><i /></span>
        <span className="brand-name">skill barter<span>clock</span></span>
      </Link>
      <div className="auth-story-copy">
        <div className="eyebrow">A COMMUNITY THAT RUNS ON TIME</div>
        <h2>Your time credits are waiting for you.</h2>
        <p>Reset your password and pick up where you left off. Your sessions and credits stay exactly as they were.</p>
      </div>
      <div className="auth-story-note">
        <span className="auth-story-clock"><span>1</span><small>hour</small></span>
        <span><b>Same time. Same worth.</b><small>One hour of every skill equals one time credit.</small></span>
      </div>
    </aside>
  );
}
