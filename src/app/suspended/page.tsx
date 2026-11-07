"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SuspendedPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-confirmation">
        <div className="eyebrow">ACCOUNT SUSPENDED</div>
        <h1>Your account is suspended.</h1>
        <p className="lead">
          The community team has paused your account, so you can’t book or teach sessions right now. Any upcoming
          sessions were cancelled and held credits were returned. If you think this is a mistake, reply to any email
          from the community team.
        </p>
        <button type="button" className="button button-primary auth-submit" onClick={() => void logout()} disabled={loggingOut}>
          {loggingOut ? "Logging out…" : "Log out"}
        </button>
      </section>
    </main>
  );
}
