"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AppShell, Avatar, Icon } from "../../site";

type ProfileForm = {
  name: string;
  email: string;
  bio: string;
  location: string;
  languages: string;
  teaching: string;
  learning: string;
  timezone: string;
  availability: string;
};

const emptyProfile: ProfileForm = {
  name: "",
  email: "",
  bio: "",
  location: "",
  languages: "",
  teaching: "",
  learning: "",
  timezone: "Lagos (UTC+1)",
  availability: "",
};

const timezones = [
  "Lagos (UTC+1)",
  "London (UTC+0)",
  "New York (UTC-5)",
  "Dubai (UTC+4)",
  "Johannesburg (UTC+2)",
];

function toList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function EditProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyProfile);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [emailChangePending, setEmailChangePending] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Unable to load your profile.");
          return;
        }
        const user = data.user;
        setAvatarUrl(user.avatarUrl ?? "");
        setForm({
          name: user.name ?? "",
          email: user.email ?? "",
          bio: user.bio ?? "",
          location: user.location ?? "",
          languages: (user.languages ?? []).join(", "),
          teaching: (user.teaching ?? []).join(", "),
          learning: (user.learning ?? []).join(", "),
          timezone: user.timezone ?? "Lagos (UTC+1)",
          availability: user.availability ?? "",
        });
      } catch {
        setError("We couldn’t reach the server to load your profile.");
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile();
  }, [router]);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  async function uploadAvatar() {
    if (!avatarFile) return;
    setAvatarBusy(true);
    setAvatarMessage("");
    setError("");
    try {
      const payload = new FormData();
      payload.set("avatar", avatarFile);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: payload });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to upload your profile image.");
        return;
      }
      setAvatarUrl(data.avatarUrl);
      setAvatarFile(null);
      if (avatarInput.current) avatarInput.current.value = "";
      setAvatarMessage(data.cleanupWarning || "Profile image updated.");
    } catch {
      setError("We couldn’t reach the server. Your image wasn’t uploaded.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setAvatarMessage("");
    setError("");
    try {
      const response = await fetch("/api/profile/avatar", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to remove your profile image.");
        return;
      }
      setAvatarUrl("");
      setAvatarFile(null);
      if (avatarInput.current) avatarInput.current.value = "";
      setAvatarMessage(data.cleanupWarning || "Profile image removed.");
    } catch {
      setError("We couldn’t reach the server. Your image wasn’t removed.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    setEmailChangePending(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          languages: toList(form.languages),
          teaching: toList(form.teaching),
          learning: toList(form.learning),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to save your profile.");
        return;
      }
      setSaved(true);
      setEmailChangePending(data.emailChangePending === true);
    } catch {
      setError("We couldn’t reach the server. Your changes weren’t saved.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("Unable to log out. Please try again.");
        setLoggingOut(false);
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError("We couldn’t reach the server. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <AppShell title="Edit profile">
      <div className="page-heading profile-edit-heading">
        <div>
          <div className="eyebrow">YOUR DETAILS, YOUR WAY</div>
          <h1>Edit your profile</h1>
          <p className="lead">Help the community learn what you can share and what you hope to learn.</p>
        </div>
        <Link href="/profile" className="button button-secondary">
          <Icon name="arrow" size={15} /> View profile
        </Link>
      </div>

      {loadingProfile ? (
        <div className="profile-edit-card" role="status">Loading your profile…</div>
      ) : (
        <form className="profile-edit-form" onSubmit={saveProfile}>
          <section className="profile-edit-card profile-photo-card">
            <div className="profile-edit-section-title">
              <span className="profile-edit-step">00</span>
              <div><h2>Profile photo</h2><p>Add a clear image so other members can recognize you.</p></div>
            </div>
            <div className="profile-photo-controls">
              <Avatar src={avatarUrl || undefined} name={form.name || "Your profile"} size="lg" />
              <div className="profile-photo-actions">
                <input
                  ref={avatarInput}
                  id="profile-avatar"
                  className="profile-avatar-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    setAvatarFile(event.target.files?.[0] ?? null);
                    setAvatarMessage("");
                  }}
                />
                <label className="button button-secondary profile-photo-choose" htmlFor="profile-avatar">
                  Choose image
                </label>
                {avatarFile && <span className="profile-photo-filename">{avatarFile.name}</span>}
                <small>JPEG, PNG, or WebP · up to 5 MB</small>
              </div>
              <div className="profile-photo-buttons">
                <button type="button" className="button button-primary" onClick={uploadAvatar} disabled={!avatarFile || avatarBusy}>
                  {avatarBusy ? "Uploading…" : "Upload photo"}
                </button>
                {avatarUrl && (
                  <button type="button" className="button button-quiet" onClick={removeAvatar} disabled={avatarBusy}>
                    Remove
                  </button>
                )}
              </div>
            </div>
            {avatarMessage && <p className="form-success" role="status">{avatarMessage}</p>}
          </section>

          <section className="profile-edit-card">
            <div className="profile-edit-section-title">
              <span className="profile-edit-step">01</span>
              <div><h2>About you</h2><p>Use the details you’re comfortable sharing with other members.</p></div>
            </div>
            <div className="profile-edit-fields">
              <label className="field-wrap" htmlFor="profile-name">
                <span>Full name</span>
                <input id="profile-name" value={form.name} onChange={(event) => updateField("name", event.target.value)} minLength={2} required />
              </label>
              <label className="field-wrap" htmlFor="profile-email">
                <span>Email address</span>
                <input id="profile-email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
              </label>
              <label className="field-wrap" htmlFor="profile-location">
                <span>City and country</span>
                <input id="profile-location" value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="For example, Lagos, Nigeria" maxLength={100} />
              </label>
              <label className="field-wrap" htmlFor="profile-languages">
                <span>Languages</span>
                <input id="profile-languages" value={form.languages} onChange={(event) => updateField("languages", event.target.value)} placeholder="English, Yoruba" />
                <small>Separate each language with a comma.</small>
              </label>
              <label className="field-wrap profile-field-wide" htmlFor="profile-bio">
                <span>About you</span>
                <textarea id="profile-bio" value={form.bio} onChange={(event) => updateField("bio", event.target.value)} rows={4} maxLength={500} placeholder="What do you enjoy sharing? What should a new learning partner know?" />
                <small>{form.bio.length}/500 characters</small>
              </label>
            </div>
          </section>

          <section className="profile-edit-card">
            <div className="profile-edit-section-title">
              <span className="profile-edit-step">02</span>
              <div><h2>Your skill exchange</h2><p>These details help us find a useful, balanced match.</p></div>
            </div>
            <div className="profile-edit-fields">
              <label className="field-wrap" htmlFor="profile-teaching">
                <span>Skills you can teach</span>
                <input id="profile-teaching" value={form.teaching} onChange={(event) => updateField("teaching", event.target.value)} placeholder="Canva, Excel, public speaking" />
                <small>Separate skills with commas; add up to 10.</small>
              </label>
              <label className="field-wrap" htmlFor="profile-learning">
                <span>Skills you want to learn</span>
                <input id="profile-learning" value={form.learning} onChange={(event) => updateField("learning", event.target.value)} placeholder="Yoruba, guitar" />
                <small>Separate skills with commas; add up to 10.</small>
              </label>
              <label className="field-wrap" htmlFor="profile-timezone">
                <span>Timezone</span>
                <select id="profile-timezone" value={form.timezone} onChange={(event) => updateField("timezone", event.target.value)}>
                  {timezones.map((timezone) => <option key={timezone}>{timezone}</option>)}
                </select>
              </label>
              <label className="field-wrap" htmlFor="profile-availability">
                <span>When you’re usually available</span>
                <input id="profile-availability" value={form.availability} onChange={(event) => updateField("availability", event.target.value)} placeholder="Weeknights, 6:00–9:00 PM" required />
              </label>
            </div>
          </section>

          {error && <p className="form-error" role="alert">{error}</p>}
          {saved && (
            <p className="form-success" role="status">
              Your profile has been saved.
              {emailChangePending && " Confirm the email change using the link sent to your new address."}
            </p>
          )}

          <div className="profile-edit-actions">
            <button type="button" className="button button-quiet" onClick={logout} disabled={loggingOut}>
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
            <div>
              <Link href="/profile" className="button button-secondary">Cancel</Link>
              <button type="submit" className="button button-primary" disabled={saving || loadingProfile}>
                {saving ? "Saving changes…" : "Save profile"}
              </button>
            </div>
          </div>
        </form>
      )}
    </AppShell>
  );
}
