"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to log in.");
        return;
      }

      router.push("/");
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
            <div className="eyebrow">A COMMUNITY THAT RUNS ON TIME</div>
            <h2>What you know can take someone further.</h2>
            <p>Share an hour of your skill. Earn an hour to learn something new. No money, just people helping people.</p>
          </div>
          <div className="auth-story-note">
            <span className="auth-story-clock"><span>1</span><small>hour</small></span>
            <span><b>Same time. Same worth.</b><small>One hour of every skill equals one time credit.</small></span>
          </div>
        </aside>

        <section className="auth-card" aria-labelledby="login-heading">
          <div className="auth-card-top">
            <div className="eyebrow">WELCOME BACK</div>
            <h1 id="login-heading">Good to see you again.</h1>
            <p className="lead">Log in to find your next good exchange.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="field-wrap" htmlFor="login-email">
              <span>Email address</span>
              <input
                id="login-email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="field-wrap" htmlFor="login-password">
              <span>Password</span>
              <input
                id="login-password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
            </label>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button type="submit" className="button button-primary auth-submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="auth-footer">
            <span>New to the community?</span>
            <Link href="/signup" className="text-link">Create an account</Link>
          </div>
          <p className="auth-privacy"><span aria-hidden="true">◈</span> Your account details stay private.</p>
        </section>
      </div>
    </main>
  );
}
