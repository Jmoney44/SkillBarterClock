import Link from "next/link";

export default function AccountDeletedPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card auth-confirmation">
        <div className="eyebrow">ACCOUNT DELETED</div>
        <h1>Your account has been deleted.</h1>
        <p className="lead">
          Your profile, photo, skills, and wallet history have been removed. Any upcoming sessions were cancelled and
          learners’ credits were returned. Thank you for sharing your time with the community.
        </p>
        <Link href="/signup" className="button button-primary auth-submit">Create a new account</Link>
      </section>
    </main>
  );
}
