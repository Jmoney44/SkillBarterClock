import { AppShell, Avatar, Icon } from "../site";
import { people } from "../data";

export default function SessionPage() {
  return (
    <AppShell title="Session room">
      <button className="back-link" type="button">← Back to sessions</button>

      <div className="room-heading">
        <div>
          <div className="eyebrow">SESSION ROOM <span className="eyebrow-dot" /></div>
          <h1>Yoruba conversation</h1>
          <p className="lead">You and Amaka · Today at 4:30 PM · 1.5 hours</p>
        </div>
        <span className="room-status"><i /> Ready when you are</span>
      </div>

      <div className="room-layout">
        <section className="clock-panel">
          <div className="clock-panel-top"><span>SESSION CLOCK</span><span className="stake"><i /> 1.5 TC held safely</span></div>
          <div className="timer-dial">
            <div className="timer-face">
              <span className="timer-live">READY TO BEGIN</span>
              <strong>00:00:00</strong>
              <span className="timer-sub">Both partners start the clock</span>
            </div>
            <span className="dial-number n12">12</span>
            <span className="dial-number n3">03</span>
            <span className="dial-number n6">06</span>
            <span className="dial-number n9">09</span>
          </div>

          <div className="clock-partners">
            <div>
              <Avatar image={people[0].image} name="Maya Collins" />
              <span><b>Maya Collins</b><small>You</small></span>
              <i className="ready-check"><Icon name="check" size={12} /></i>
            </div>
            <span className="partner-plus">+</span>
            <div>
              <Avatar image={people[0].image} name="Amaka Okafor" />
              <span><b>Amaka Okafor</b><small>Ready to start</small></span>
              <i className="ready-check waiting-check"><Icon name="clock" size={12} /></i>
            </div>
          </div>

          <div className="clock-controls">
            <button className="button button-primary clock-action" type="button">Start session</button>
            <button className="button button-secondary" type="button">End session</button>
          </div>

          <p className="clock-footnote"><Icon name="shield" size={15} /> Both partners need to start and end the clock. Your credits stay held until you both confirm.</p>
        </section>

        <aside className="room-aside">
          <div className="room-side-card">
            <div className="eyebrow">TODAY’S PLAN</div>
            <h3>Let’s get talking</h3>
            <p>Practice greetings, everyday phrases, and the little things that make conversation feel natural.</p>
            <div className="agenda-item"><span>01</span><div><b>Warm-up & greetings</b><small>15 minutes</small></div></div>
            <div className="agenda-item"><span>02</span><div><b>Everyday conversation</b><small>45 minutes</small></div></div>
            <div className="agenda-item"><span>03</span><div><b>New phrases to keep</b><small>30 minutes</small></div></div>
            <button className="room-note-button" type="button">＋ Add a note</button>
          </div>

          <div className="room-side-card room-help">
            <Icon name="shield" />
            <div>
              <b>Need a hand?</b>
              <span>Report a concern or ask for help with this session.</span>
              <button className="text-link" type="button">Get support <Icon name="arrow" size={13} /></button>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
