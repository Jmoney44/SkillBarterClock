import Link from "next/link";
import { AppShell, Avatar, Icon } from "../site";
import { people } from "../data";

export default function BookPage() {
  const teacher = people[0];

  return (
    <AppShell title="Book a session">
      <div className="page-heading">
        <div>
          <div className="eyebrow">BOOK A SESSION</div>
          <h1>Swap time for something useful.</h1>
        </div>
        <Link href="/explore" className="text-link">
          Browse more skills <Icon name="arrow" size={14} />
        </Link>
      </div>

      <div className="room-layout">
        <section className="clock-panel">
          <div className="clock-panel-top">
            <span>SESSION SUMMARY</span>
            <span className="stake"><i /> 1.5 TC held on booking</span>
          </div>

          <div className="room-side-card" style={{ border: "none", padding: 0, background: "transparent" }}>
            <div className="teacher-top" style={{ marginBottom: 18 }}>
              <Avatar image={teacher.image} name={teacher.name} size="md" />
              <div>
                <strong>{teacher.name}</strong>
                <span>{teacher.skill}</span>
              </div>
            </div>

            <div className="profile-languages" style={{ marginBottom: 18 }}>
              <b>Session type</b>
              <span>1:1 conversation · 90 minutes</span>
            </div>

            <div className="profile-languages" style={{ marginBottom: 18 }}>
              <b>When</b>
              <span>Thursday, 4:30 PM · Lagos time</span>
            </div>

            <div className="profile-languages" style={{ marginBottom: 18 }}>
              <b>What you’ll cover</b>
              <span>Greetings, everyday phrases, and confidence-building practice</span>
            </div>
          </div>
        </section>

        <aside className="room-aside">
          <div className="room-side-card">
            <div className="eyebrow">BOOKING DETAILS</div>
            <h3>Confirm the swap</h3>

            <div className="profile-languages" style={{ marginBottom: 16 }}>
              <b>Time credit cost</b>
              <span>1.5 TC</span>
            </div>

            <div className="profile-languages" style={{ marginBottom: 16 }}>
              <b>Available balance</b>
              <span>6.25 TC</span>
            </div>

            <label className="profile-languages" style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              <b>Session note</b>
              <textarea
                rows={4}
                placeholder="Share what you want to practice or learn"
                style={{
                  width: "100%",
                  resize: "vertical",
                  border: "1px solid #e9e4da",
                  background: "#fffdf9",
                  borderRadius: 8,
                  padding: "10px 12px",
                  color: "#24332f",
                }}
              />
            </label>

            <div className="clock-controls" style={{ justifyContent: "stretch" }}>
              <Link href="/session" className="button button-primary" style={{ width: "100%" }}>
                Confirm booking
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
