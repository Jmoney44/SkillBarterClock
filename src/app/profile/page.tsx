"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell, Icon } from "../site";

type Profile = {
  name: string;
  email: string;
  bio: string;
  location: string;
  languages: string[];
  teaching: string[];
  learning: string[];
  timezone: string;
  availability: string;
  balance: number;
  pending: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

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
        setProfile(data.user);
      } catch {
        setError("We couldn’t reach the server to load your profile.");
      }
    }

    loadProfile();
  }, [router]);

  const initials = profile?.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppShell title="Profile">
      {error && <p className="form-error" role="alert">{error}</p>}
      {!profile ? (
        <div className="profile-edit-card" role="status">Loading your profile…</div>
      ) : (
        <>
          <div className="profile-banner">
            <div className="profile-portrait"><span className="avatar avatar-lg initials">{initials}</span></div>
            <div>
              <div className="eyebrow">YOUR COMMUNITY PROFILE</div>
              <h1>{profile.name}</h1>
              <p className="lead">{profile.bio || "Add a short introduction so other members can get to know you."}</p>
              <span className="profile-meta">
                {profile.location || "Add your location"} <i>·</i> {profile.email} <i>·</i>
                <Icon name="shield" size={14} /> Community member
              </span>
            </div>
            <Link className="button button-secondary" href="/profile/edit">Edit profile</Link>
          </div>

          <div className="profile-stats">
            <div><b>{profile.balance.toFixed(2)}</b><small>Available TC</small></div>
            <div><b>{profile.pending.toFixed(2)}</b><small>Held safely</small></div>
            <div><b>{profile.teaching.length}</b><small>Skills to teach</small></div>
            <div><b>{profile.learning.length}</b><small>Skills to learn</small></div>
          </div>

          <div className="profile-columns">
            <section>
              <div className="section-heading">
                <div>
                  <div className="eyebrow">WHAT I CAN SHARE</div>
                  <h3>Skills I teach</h3>
                </div>
                <Link className="text-link" href="/profile/edit">Edit skills</Link>
              </div>
              {profile.teaching.length ? (
                <div className="profile-tags">{profile.teaching.map((skill) => <span key={skill}>{skill}</span>)}</div>
              ) : <p className="profile-empty">Add skills you’d enjoy sharing with someone.</p>}

              <div className="section-heading profile-learn-heading">
                <div>
                  <div className="eyebrow">WHAT I’M HERE TO LEARN</div>
                  <h3>Skills I’m curious about</h3>
                </div>
              </div>
              {profile.learning.length ? (
                <div className="profile-tags">{profile.learning.map((skill) => <span key={skill}>{skill}</span>)}</div>
              ) : <p className="profile-empty">Add a skill you’re hoping to learn.</p>}
            </section>

            <section className="profile-about">
              <div className="eyebrow">A LITTLE ABOUT ME</div>
              <p>{profile.bio || "Add a short introduction to help future learning partners understand what you enjoy."}</p>
              <div className="profile-languages">
                <b>Languages</b>
                <span>{profile.languages.length ? profile.languages.join(" · ") : "Add the languages you speak or are learning."}</span>
              </div>
              <div className="profile-languages"><b>Timezone</b><span>{profile.timezone}</span></div>
              <div className="profile-languages"><b>Availability</b><span>{profile.availability || "Add when you’re usually available."}</span></div>
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}
