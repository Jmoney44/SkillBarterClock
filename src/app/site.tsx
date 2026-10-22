"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { Person, PublicTeacher } from "./data";

const navItems = [
  { href: "/", label: "Overview", icon: "grid" },
  { href: "/explore", label: "Explore skills", icon: "search" },
  { href: "/sessions", label: "My sessions", icon: "calendar" },
  { href: "/teacher", label: "Teaching", icon: "check" },
  { href: "/wallet", label: "Time wallet", icon: "wallet" },
  { href: "/profile", label: "Profile", icon: "message" },
] as const;

export function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 14h2"/></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 1 1 0 3.4H21a1.7 1.7 0 0 0-1.6 2.9z"/></>,
    arrow: <><path d="M5 12h14M12 5l7 7-7 7"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 12 2 2 4-4"/></>,
    filter: <><path d="M4 7h16M7 12h10m-7 5h4"/></>,
  };

  return <svg {...common}>{paths[name] ?? paths.clock}</svg>;
}

export function Avatar({ image, src, name, size = "md" }: { image?: string; src?: string; name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span className={`avatar avatar-${size}`} title={name}>
      {src || image ? <img src={src ?? `https://images.unsplash.com/${image}?auto=format&fit=crop&w=96&q=75`} alt="" /> : <span className="avatar-initials">{initials}</span>}
    </span>
  );
}

export function TeacherCard({ person }: { person: Person | PublicTeacher }) {
  const isPublicTeacher = "teaching_skills" in person;
  const name = isPublicTeacher ? person.full_name : person.name;
  const skill = isPublicTeacher ? person.teaching_skills.join(" · ") : person.skill;
  const learningSkills = isPublicTeacher ? person.learning_skills.join(", ") : person.swap;

  return (
    <article className="teacher-card">
      <div className="teacher-top">
        <Avatar image={isPublicTeacher ? undefined : person.image} src={isPublicTeacher ? person.avatar_url : undefined} name={name} size="md" />
        <div>
          <strong>{name}</strong>
          <span>{skill}</span>
        </div>
      </div>
      {isPublicTeacher ? (
        <p>{person.bio || `Based in ${person.location || person.timezone}. ${person.availability ? `Available: ${person.availability}.` : ""}`}</p>
      ) : (
        <div className="teacher-meta">
          <span>★ {person.rating}</span>
          <span>{person.hours}</span>
        </div>
      )}
      <p>Open to swap for: {learningSkills || "Open to learning"}</p>
      <div className="teacher-actions">
        <Link className="button button-secondary small-button" href={`/teacher/${person.id}`}>View profile</Link>
        <Link
          className="button button-primary small-button"
          href={`/book?teacher=${encodeURIComponent(person.id)}&skill=${encodeURIComponent(isPublicTeacher ? person.teaching_skills[0] ?? "" : person.skill.split(" · ")[0])}`}
        >
          Book
        </Link>
      </div>
    </article>
  );
}

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const router = useRouter();
  const [userName, setUserName] = useState("Maya Collins");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) {
          router.replace("/login");
          return;
        }

        const data = await response.json();
        if (data?.user?.name) {
          setUserName(data.user.name);
        }
        setAvatarUrl(data?.user?.avatarUrl ?? "");
        setIsAdmin(data?.user?.role === "admin");
      } catch {
        router.replace("/login");
      }
    }

    loadSession();
  }, [router]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Skill Barter Clock home">
          <span className="brand-mark"><span /><i /></span>
          <span className="brand-name">skill barter<span>clock</span></span>
        </Link>

        <div className="side-label">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {[...navItems, ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: "settings" as const }] : [])].map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${title === label || (href === "/profile" && title === "Edit profile") ? "active" : ""}`}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {href === "/profile" && <span className="nav-count">2</span>}
            </Link>
          ))}
        </nav>

        <div className="side-note">
          <div className="note-icon"><Icon name="shield" size={17} /></div>
          <strong>Time is the only currency here.</strong>
          <p>No money changes hands. Every hour is worth the same.</p>
          <button className="text-link" type="button">How fairness works <Icon name="arrow" size={14} /></button>
        </div>

        <div className="sidebar-bottom">
          <button className="nav-item" type="button"><Icon name="settings" /><span>Settings</span></button>
          <Link className="user-mini" href="/profile"><Avatar src={avatarUrl || undefined} name={userName} size="sm" /><span><b>{userName}</b><small>{isAdmin ? "Administrator" : "Community member"}</small></span><span className="dots">···</span></Link>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><span /><i /></span><span className="brand-name">skill barter<span>clock</span></span></div>
          <div className="breadcrumb"><span>My space</span><b>/</b><strong>{title}</strong></div>
          <div className="top-actions">
            <span className="top-time"><Icon name="clock" size={16} /> Lagos, 3:42 PM</span>
            <button className="icon-button notification" type="button" aria-label="Notifications"><Icon name="bell" /><i /></button>
            <Avatar src={avatarUrl || undefined} name={userName} size="sm" />
          </div>
        </header>

        <div className="content-wrap">{children}</div>
        <footer className="footer-line"><span>TIME IS THE ONLY CURRENCY HERE.</span><span>Made for people who love to learn <i>✳</i></span></footer>
      </main>
    </div>
  );
}
