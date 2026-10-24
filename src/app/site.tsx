"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState({
    sessionUpdates: true,
    adminAnnouncements: true,
    creditActivity: true,
  });
  const [notificationError, setNotificationError] = useState("");
  const [openMenu, setOpenMenu] = useState<"notifications" | "profile" | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const topActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    function closeMenu(event: PointerEvent) {
      if (!topActionsRef.current?.contains(event.target as Node)) setOpenMenu(null);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenu]);

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
        const loadedUserId = data?.user?.id ?? "";
        setUserId(loadedUserId);
        setAvatarUrl(data?.user?.avatarUrl ?? "");
        setIsAdmin(data?.user?.role === "admin");
        if (loadedUserId) {
          try {
            const storedReadIds = window.localStorage.getItem(`read-notifications:${loadedUserId}`);
            setReadNotificationIds(storedReadIds ? JSON.parse(storedReadIds) as string[] : []);
            const storedPreferences = window.localStorage.getItem(`notification-preferences:${loadedUserId}`);
            if (storedPreferences) {
              setNotificationPreferences((current) => ({ ...current, ...JSON.parse(storedPreferences) }));
            }
          } catch {
            setNotificationError("Could not read your saved notification settings on this device.");
          }
        }
      } catch {
        router.replace("/login");
      }
    }

    loadSession();
  }, [router]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 401) return;
          throw new Error(data.error || "Unable to load notifications.");
        }
        setNotifications(data.notifications);
      } catch (error) {
        setNotificationError(error instanceof Error ? error.message : "Unable to load notifications.");
      }
    }
    loadNotifications();
  }, []);

  async function logout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Unable to log out. Please try again.");
      }
      router.push("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  function markNotificationsRead() {
    const readIds = visibleNotifications.map((notification) => notification.id);
    setReadNotificationIds(readIds);
    if (userId) {
      try {
        window.localStorage.setItem(`read-notifications:${userId}`, JSON.stringify(readIds));
      } catch {
        setNotificationError("Could not save your notification read status on this device.");
      }
    }
  }

  const visibleNotifications = notifications.filter((notification) => {
    if (notification.category === "announcement") return notificationPreferences.adminAnnouncements;
    if (notification.category === "session") return notificationPreferences.sessionUpdates;
    return notificationPreferences.creditActivity;
  });
  const unreadCount = visibleNotifications.filter((notification) => !readNotificationIds.includes(notification.id)).length;

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
          <Link className="user-mini" href="/profile"><Avatar src={avatarUrl || undefined} name={userName || "Your profile"} size="sm" /><span><b>{userName || "Your profile"}</b><small>{isAdmin ? "Administrator" : "Community member"}</small></span></Link>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><span /><i /></span><span className="brand-name">skill barter<span>clock</span></span></div>
          <div className="topbar-left">
            <Link className="top-settings-link" href="/settings"><Icon name="settings" size={16} /><span>Settings</span></Link>
            <div className="breadcrumb"><span>My space</span><b>/</b><strong>{title}</strong></div>
          </div>
          <div className="top-actions" ref={topActionsRef}>
            <span className="top-time"><Icon name="clock" size={16} /> Lagos, 3:42 PM</span>
            <div className="header-menu-wrap">
              <button
                className="icon-button notification"
                type="button"
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                aria-expanded={openMenu === "notifications"}
                aria-controls="notification-menu"
                onClick={() => setOpenMenu(openMenu === "notifications" ? null : "notifications")}
              >
                <Icon name="bell" />
                {unreadCount > 0 && <i />}
              </button>
              {openMenu === "notifications" && (
                <section className="header-popover notification-popover" id="notification-menu" aria-label="Notifications">
                  <div className="popover-heading">
                    <div><strong>Notifications</strong><small>{unreadCount ? `${unreadCount} unread` : "You’re all caught up"}</small></div>
                    {unreadCount > 0 && <button type="button" className="text-link" onClick={markNotificationsRead}>Mark all read</button>}
                  </div>
                  {notificationError && <p className="popover-error" role="alert">{notificationError}</p>}
                  <div className="notification-list">
                    {visibleNotifications.map((notification) => (
                      <Link
                        className={`notification-item ${readNotificationIds.includes(notification.id) ? "" : "unread"}`}
                        href={notification.href}
                        key={notification.id}
                        onClick={() => {
                          const updated = [...new Set([...readNotificationIds, notification.id])];
                          setReadNotificationIds(updated);
                          if (userId) {
                            try {
                              window.localStorage.setItem(`read-notifications:${userId}`, JSON.stringify(updated));
                            } catch {
                              setNotificationError("Could not save your notification read status on this device.");
                            }
                          }
                          setOpenMenu(null);
                        }}
                      >
                        <span className={`notification-type ${notification.category}`}><Icon name={notification.category === "announcement" ? "shield" : notification.category === "credit" ? "wallet" : "calendar"} size={15} /></span>
                        <span className="notification-copy"><b>{notification.title}</b><span>{notification.message}</span><small>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(notification.createdAt))}</small></span>
                        {!readNotificationIds.includes(notification.id) && <i className="notification-unread-dot" />}
                      </Link>
                    ))}
                    {visibleNotifications.length === 0 && !notificationError && <p className="notification-empty">No updates yet. Session and community updates will appear here.</p>}
                  </div>
                  <Link className="notification-footer" href="/sessions" onClick={() => setOpenMenu(null)}>View my sessions <Icon name="arrow" size={14} /></Link>
                </section>
              )}
            </div>
            <div className="header-menu-wrap">
              <button
                className="profile-menu-trigger"
                type="button"
                aria-label="Open profile menu"
                aria-expanded={openMenu === "profile"}
                aria-controls="profile-menu"
                onClick={() => setOpenMenu(openMenu === "profile" ? null : "profile")}
              >
                <Avatar src={avatarUrl || undefined} name={userName || "Your profile"} size="sm" />
                <span className="profile-menu-chevron">⌄</span>
              </button>
              {openMenu === "profile" && (
                <div className="header-popover profile-popover" id="profile-menu">
                  <div className="profile-popover-user"><Avatar src={avatarUrl || undefined} name={userName || "Your profile"} size="md" /><span><b>{userName || "Your profile"}</b><small>{isAdmin ? "Administrator" : "Community member"}</small></span></div>
                  <Link href="/profile" onClick={() => setOpenMenu(null)}><Icon name="message" size={16} /> View profile</Link>
                  <Link href="/settings" onClick={() => setOpenMenu(null)}><Icon name="settings" size={16} /> Settings</Link>
                  <button type="button" onClick={logout} disabled={loggingOut}><Icon name="arrow" size={16} /> {loggingOut ? "Logging out…" : "Log out"}</button>
                  {logoutError && <p className="popover-error" role="alert">{logoutError}</p>}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-wrap">{children}</div>
        <footer className="footer-line"><span>TIME IS THE ONLY CURRENCY HERE.</span><span>Made for people who love to learn <i>✳</i></span></footer>
      </main>
    </div>
  );
}

type NotificationItem = {
  id: string;
  category: "announcement" | "session" | "credit";
  title: string;
  message: string;
  createdAt: string;
  href: string;
};
