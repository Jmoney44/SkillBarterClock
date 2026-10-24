import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "../site";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: "grid" },
  { href: "/admin#community", label: "Members", icon: "message" },
  { href: "/admin#sessions", label: "Sessions", icon: "calendar" },
  { href: "/admin#announcements", label: "Announcements", icon: "bell" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <span className="admin-brand-mark"><Icon name="settings" size={18} /></span>
          <span>Skill Barter<strong>ADMIN</strong></span>
        </Link>

        <div className="admin-nav-label">WORKSPACE</div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {adminLinks.map(({ href, icon, label }, index) => (
            <Link className={`admin-nav-link ${index === 0 ? "active" : ""}`} href={href} key={label}>
              <Icon name={icon} size={17} />
              <span>{label}</span>
              {label === "Overview" && <i />}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div><span className="admin-online-dot" />Admin session</div>
          <Link href="/"><Icon name="arrow" size={15} /> Return to member app</Link>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span>SKILL BARTER CLOCK</span>
            <b>Platform administration</b>
          </div>
          <Link className="admin-view-app" href="/">View member app <Icon name="arrow" size={14} /></Link>
        </header>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
