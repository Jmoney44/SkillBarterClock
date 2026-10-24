"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AppShell, Avatar, Icon } from "../site";

type SettingsProfile = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: "member" | "admin";
  timezone: string;
  createdAt: string;
};

type NotificationPreferences = {
  sessionUpdates: boolean;
  adminAnnouncements: boolean;
  creditActivity: boolean;
};

const defaultPreferences: NotificationPreferences = {
  sessionUpdates: true,
  adminAnnouncements: true,
  creditActivity: true,
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const data = await response.json();
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) throw new Error(data.error || "Unable to load your account settings.");
        if (!active) return;
        setProfile(data.user);
        try {
          const stored = window.localStorage.getItem(`notification-preferences:${data.user.id}`);
          if (stored) setPreferences({ ...defaultPreferences, ...JSON.parse(stored) });
        } catch {
          setError("Your saved notification preferences could not be read on this device.");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load your account settings.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadSettings();
    return () => { active = false; };
  }, [router]);

  function updatePreference(field: keyof NotificationPreferences, checked: boolean) {
    setPreferences((current) => ({ ...current, [field]: checked }));
    setSaved(false);
  }

  function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    try {
      window.localStorage.setItem(`notification-preferences:${profile.id}`, JSON.stringify(preferences));
      setError("");
      setSaved(true);
    } catch {
      setError("Could not save your notification preferences on this device.");
      setSaved(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPasswordStatus("");
    if (newPassword.length < 8 || newPassword.length > 128) {
      setError("Your new password must be between 8 and 128 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new password and confirmation do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update your password.");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus("Your password has been updated.");
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Unable to update your password.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to log out. Please try again.");
      router.push("/login");
      router.refresh();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <AppShell title="Settings">
      <div className="page-heading settings-heading">
        <div>
          <div className="eyebrow">YOUR ACCOUNT, YOUR PREFERENCES</div>
          <h1>Settings</h1>
          <p className="lead">Manage your account details, notifications, and sign-in options.</p>
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? (
        <div className="profile-edit-card" role="status">Loading your settings…</div>
      ) : profile ? (
        <div className="settings-layout">
          <div className="settings-main">
            <section className="settings-card">
              <div className="settings-section-heading">
                <span className="settings-section-icon"><Icon name="message" size={17} /></span>
                <div><h2>Account details</h2><p>Your sign-in and community account information.</p></div>
              </div>
              <div className="settings-account">
                <Avatar src={profile.avatarUrl || undefined} name={profile.name || "Your profile"} size="lg" />
                <div className="settings-account-info">
                  <strong>{profile.name || "Name not set"}</strong>
                  <span>{profile.email}</span>
                  <small>{profile.role === "admin" ? "Administrator" : "Community member"} · Joined {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(profile.createdAt))}</small>
                </div>
                <Link className="button button-secondary small-button" href="/profile/edit">Edit profile</Link>
              </div>
              <div className="settings-detail-grid">
                <div><span>Email address</span><b>{profile.email}</b></div>
                <div><span>Timezone</span><b>{profile.timezone}</b></div>
              </div>
            </section>

            <form className="settings-card" onSubmit={savePreferences}>
              <div className="settings-section-heading">
                <span className="settings-section-icon"><Icon name="bell" size={17} /></span>
                <div><h2>In-app notifications</h2><p>Choose which updates appear in your notification menu.</p></div>
              </div>
              <div className="settings-preference-list">
                <label className="settings-preference">
                  <span><b>Session updates</b><small>Requests, confirmations, and changes to your sessions.</small></span>
                  <input type="checkbox" checked={preferences.sessionUpdates} onChange={(event) => updatePreference("sessionUpdates", event.target.checked)} />
                </label>
                <label className="settings-preference">
                  <span><b>Admin announcements</b><small>News and important information from the community team.</small></span>
                  <input type="checkbox" checked={preferences.adminAnnouncements} onChange={(event) => updatePreference("adminAnnouncements", event.target.checked)} />
                </label>
                <label className="settings-preference">
                  <span><b>Time-credit activity</b><small>Updates when credits are held, returned, or earned.</small></span>
                  <input type="checkbox" checked={preferences.creditActivity} onChange={(event) => updatePreference("creditActivity", event.target.checked)} />
                </label>
              </div>
              <div className="settings-save-row">
                {saved && <span className="form-success" role="status">Notification preferences saved on this device.</span>}
                <button className="button button-primary" type="submit">Save preferences</button>
              </div>
            </form>

            <section className="settings-card">
              <div className="settings-section-heading">
                <span className="settings-section-icon"><Icon name="shield" size={17} /></span>
                <div><h2>Security and privacy</h2><p>Manage your sign-in details and what other members can see.</p></div>
              </div>
              <div className="settings-action-row">
                <div><b>Profile and email</b><span>Update your name, email, profile photo, and public details.</span></div>
                <Link className="text-link" href="/profile/edit">Manage <Icon name="arrow" size={14} /></Link>
              </div>
              <div className="settings-action-row">
                <div><b>Public profile</b><span>Review the information visible to other community members.</span></div>
                <Link className="text-link" href="/profile">View profile <Icon name="arrow" size={14} /></Link>
              </div>
              <form className="settings-password-form" onSubmit={changePassword}>
                <div className="settings-password-heading"><b>Change password</b><span>Use at least 8 characters for your new password.</span></div>
                <div className="settings-password-fields">
                  <label className="field-wrap" htmlFor="settings-password">
                    <span>New password</span>
                    <input id="settings-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required />
                  </label>
                  <label className="field-wrap" htmlFor="settings-password-confirm">
                    <span>Confirm new password</span>
                    <input id="settings-password-confirm" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required />
                  </label>
                </div>
                {passwordStatus && <p className="form-success" role="status">{passwordStatus}</p>}
                <button className="button button-secondary" type="submit" disabled={changingPassword}>{changingPassword ? "Updating…" : "Update password"}</button>
              </form>
            </section>
          </div>

          <aside className="settings-aside">
            <section className="settings-card settings-help-card">
              <span className="settings-section-icon"><Icon name="clock" size={17} /></span>
              <h2>Account at a glance</h2>
              <p>Your time credits stay safe and are only transferred when a session is completed by both people.</p>
              <Link href="/wallet" className="text-link">View time wallet <Icon name="arrow" size={14} /></Link>
            </section>
            <section className="settings-card settings-logout-card">
              <h2>Sign out</h2>
              <p>End your current session on this device.</p>
              <button className="button button-quiet" type="button" onClick={logout} disabled={loggingOut}>
                {loggingOut ? "Signing out…" : "Log out"}
              </button>
            </section>
          </aside>
        </div>
      ) : null}
    </AppShell>
  );
}
