import { AppShell, Avatar, Icon } from "../site";
import { initialSessions } from "../data";

export default function SessionsPage() {
  return (
    <AppShell title="My sessions">
      <div className="page-heading sessions-heading">
        <div>
          <div className="eyebrow">YOUR TIME, WELL SPENT</div>
          <h1>My sessions</h1>
          <p className="lead">Every good exchange starts with showing up.</p>
        </div>
        <button className="button button-primary" type="button"><Icon name="plus" size={17} /> Book a session</button>
      </div>

      <div className="session-tabs">
        <button className="selected" type="button">Upcoming <span>2</span></button>
        <button type="button">Past sessions</button>
        <button type="button">Requests <span className="tab-count">1</span></button>
      </div>

      <div className="session-page-list">
        {initialSessions.map((session) => (
          <article className="session-card" key={session.id}>
            <div className="date-tile">
              <b>{session.date.split(" ")[1]?.replace(",", "") ?? "20"}</b>
              <span>{session.date.split(" ")[0]}</span>
            </div>
            <Avatar image={session.image} name={session.name} />
            <div className="session-main">
              <strong>{session.skill}</strong>
              <span>{session.name} <i>·</i> {session.date} at {session.time}</span>
              <small><Icon name="clock" size={14} /> {session.duration} hour{session.duration > 1 ? "s" : ""} <i>·</i> Video call</small>
            </div>
            <span className={`status-pill ${session.status === "Completed" ? "status-done" : session.status === "Awaiting confirmation" ? "status-wait" : ""}`}><i />{session.status}</span>
            <button className="button button-secondary small-button" type="button">Open session</button>
          </article>
        ))}
      </div>

      <div className="empty-hint">
        <Icon name="calendar" />
        <span>Plans change. You can reschedule up to 12 hours before a session.</span>
      </div>
    </AppShell>
  );
}
