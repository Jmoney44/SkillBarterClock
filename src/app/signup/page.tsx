"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Those passwords don’t match. Please check and try again.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to create your account.");
        return;
      }

      if (data.requiresEmailConfirmation) {
        setConfirmationSent(true);
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("We couldn’t reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <aside className="auth-story">
          <Link className="brand auth-story-brand" href="/" aria-label="Skill Barter Clock home">
            <span className="brand-mark"><span /><i /></span>
            <span className="brand-name">skill barter<span>clock</span></span>
          </Link>
          <div className="auth-story-copy">
            <div className="eyebrow">YOUR NEXT SKILL STARTS HERE</div>
            <h2>There’s more than one way to be rich.</h2>
            <p>Build a circle of neighbors who teach what they know and learn from what you know.</p>
          </div>
          <div className="auth-story-note">
            <span className="auth-story-clock"><span>1</span><small>hour</small></span>
            <span><b>Time is the only currency.</b><small>Every member’s time has equal value.</small></span>
          </div>
        </aside>

        <section className="auth-card" aria-labelledby="signup-heading">
          {confirmationSent ? (
            <div className="auth-confirmation" role="status">
              <span className="auth-confirmation-icon"><span>✓</span></span>
              <div className="eyebrow">ONE LAST STEP</div>
              <h1 id="signup-heading">Check your inbox.</h1>
              <p className="lead">We sent a confirmation link to <b>{email}</b>. Confirm your email to continue setting up your profile.</p>
              <Link href="/login" className="button button-primary auth-submit">Back to log in</Link>
            </div>
          ) : (
            <>
              <div className="auth-card-top">
                <div className="eyebrow">JOIN THE COMMUNITY</div>
                <h1 id="signup-heading">Create your account.</h1>
                <p className="lead">A few details, then we’ll help you build your profile.</p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
            <label className="field-wrap" htmlFor="signup-name">
              <span>Full name</span>
              <input
                id="signup-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="How should we call you?"
                minLength={2}
                maxLength={80}
                required
              />
            </label>

            <label className="field-wrap" htmlFor="signup-email">
              <span>Email address</span>
              <input
                id="signup-email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                maxLength={254}
                required
              />
            </label>

            <div className="auth-form-row">
              <label className="field-wrap" htmlFor="signup-password">
                <span>Password</span>
                <input
                  id="signup-password"
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label>

              <label className="field-wrap" htmlFor="signup-confirm-password">
                <span>Confirm password</span>
                <input
                  id="signup-confirm-password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Enter it again"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label>
            </div>

            <p className="auth-hint">Use at least 8 characters. You can update your skills and availability later.</p>
            {error && <p className="form-error" role="alert">{error}</p>}

            <button type="submit" className="button button-primary auth-submit" disabled={loading}>
              {loading ? "Creating your account..." : "Create account"}
            </button>
              </form>

              <div className="auth-footer">
                <span>Already a member?</span>
                <Link href="/login" className="text-link">Log in</Link>
              </div>
              <p className="auth-privacy"><span aria-hidden="true">◈</span> Your account details stay private.</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
