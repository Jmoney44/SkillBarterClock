"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthStory } from "../auth-story";

type PageState = "checking" | "ready" | "no-session" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // The reset link signs the member in; without that session there's nothing to reset.
  useEffect(() => {
    let active = true;
    fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setState("no-session");
          return;
        }
        const data = await response.json();
        setEmail(data?.user?.email ?? "");
        setState("ready");
      })
      .catch(() => {
        if (active) setState("no-session");
      });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8 || password.length > 128) {
      setError("Use a password between 8 and 128 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Those passwords don’t match. Please check and try again.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (response.status === 401) {
        setState("no-session");
        return;
      }
      if (!response.ok) {
        setError(data.error || "We couldn’t update your password. Please try again.");
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setState("done");
    } catch {
      setError("We couldn’t reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <AuthStory />

        <section className="auth-card" aria-labelledby="reset-heading">
          {state === "checking" ? (
            <p className="lead" role="status">Checking your reset link…</p>
          ) : state === "no-session" ? (
            <div className="auth-confirmation">
              <div className="eyebrow">RESET YOUR PASSWORD</div>
              <h1 id="reset-heading">That reset link isn’t valid.</h1>
              <p className="lead">It may have expired or already been used. Request a new link to choose a new password.</p>
              <Link href="/forgot-password" className="button button-primary auth-submit">Request a new link</Link>
            </div>
          ) : state === "done" ? (
            <div className="auth-confirmation" role="status">
              <span className="auth-confirmation-icon"><span>✓</span></span>
              <div className="eyebrow">ALL SET</div>
              <h1 id="reset-heading">Your password has been updated.</h1>
              <p className="lead">You’re signed in. Use your new password the next time you log in.</p>
              <button
                type="button"
                className="button button-primary auth-submit"
                onClick={() => {
                  router.push("/");
                  router.refresh();
                }}
              >
                Continue to your dashboard
              </button>
            </div>
          ) : (
            <>
              <div className="auth-card-top">
                <div className="eyebrow">RESET YOUR PASSWORD</div>
                <h1 id="reset-heading">Choose a new password.</h1>
                <p className="lead">{email ? <>For <b>{email}</b>. </> : null}Use at least 8 characters.</p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                {/* Lets password managers save the new password against the right account. */}
                <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
                <label className="field-wrap" htmlFor="reset-password">
                  <span>New password</span>
                  <input
                    id="reset-password"
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </label>
                <label className="field-wrap" htmlFor="reset-confirm-password">
                  <span>Confirm new password</span>
                  <input
                    id="reset-confirm-password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </label>

                {error && <p className="form-error" role="alert">{error}</p>}

                <button type="submit" className="button button-primary auth-submit" disabled={saving}>
                  {saving ? "Saving..." : "Save new password"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
