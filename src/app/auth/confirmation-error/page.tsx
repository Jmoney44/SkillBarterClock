import Link from "next/link";

export default function ConfirmationErrorPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card auth-confirmation">
        <div className="eyebrow">EMAIL CONFIRMATION</div>
        <h1>That link couldn’t be verified.</h1>
        <p className="lead">It may have expired or already been used. Try logging in, or create a new account to request another confirmation email.</p>
        <Link href="/login" className="button button-primary auth-submit">Go to log in</Link>
      </section>
    </main>
  );
}
