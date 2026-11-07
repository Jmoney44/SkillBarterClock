"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthStory } from "../auth-story";

export default function ForgotPasswordForm({ linkExpired }: { linkExpired: boolean }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "We couldn’t send a reset link. Please try again.");
        return;
      }
      setSentTo(email.trim());
    } catch {
      setError("We couldn’t reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <AuthStory />

        <section className="auth-card" aria-labelledby="forgot-heading">
          {sentTo ? (
            <div className="auth-confirmation" role="status">
              <span className="auth-confirmation-icon"><span>✓</span></span>
              <div className="eyebrow">CHECK YOUR EMAIL</div>
              <h1 id="forgot-heading">Reset link on its way.</h1>
              <p className="lead">If an account exists for <b>{sentTo}</b>, we’ve sent a link to reset your password. It expires in one hour. Check your spam folder if you don’t see it.</p>
              <Link href="/login" className="button button-primary auth-submit">Back to log in</Link>
            </div>
          ) : (
            <>
              <div className="auth-card-top">
                <div className="eyebrow">RESET YOUR PASSWORD</div>
                <h1 id="forgot-heading">Forgot your password?</h1>
                <p className="lead">Enter the email you signed up with and we’ll send you a link to choose a new one.</p>
              </div>

              {linkExpired && (
                <p className="form-error" role="alert">That reset link has expired or was already used. Request a new one below.</p>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <label className="field-wrap" htmlFor="forgot-email">
                  <span>Email address</span>
                  <input
                    id="forgot-email"
                    name="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                  />
                </label>

                {error && <p className="form-error" role="alert">{error}</p>}

                <button type="submit" className="button button-primary auth-submit" disabled={loading}>
                  {loading ? "Sending link..." : "Send reset link"}
                </button>
              </form>

              <div className="auth-footer">
                <span>Remembered it?</span>
                <Link href="/login" className="text-link">Back to log in</Link>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
