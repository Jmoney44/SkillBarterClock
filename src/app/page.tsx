"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type View = "home" | "explore" | "sessions" | "wallet" | "room" | "profile" | "teacher";
type SessionStatus = "Confirmed" | "Awaiting confirmation" | "Completed";

type Session = {
  id: number;
  name: string;
  skill: string;
  date: string;
  time: string;
  duration: number;
  status: SessionStatus;
  image: string;
};

const people = [
  { name: "Amaka Okafor", skill: "Yoruba · Intermediate", rating: "4.98", hours: "42 hours taught", swap: "Excel, public speaking", category: "Languages", image: "photo-1534528741775-53994a69daeb" },
  { name: "Tunde Adebayo", skill: "Excel · Advanced", rating: "4.95", hours: "86 hours taught", swap: "Yoruba, guitar", category: "Tech & office", image: "photo-1500648767791-00dcc994a43e" },
  { name: "Chinwe Nwosu", skill: "Brand design · Advanced", rating: "5.0", hours: "31 hours taught", swap: "French, baking", category: "Creative", image: "photo-1531123897727-8f129e1688ce" },
];

const initialSessions: Session[] = [
  { id: 1, name: "Amaka Okafor", skill: "Yoruba conversation", date: "Today, Oct 20", time: "4:30 PM", duration: 1.5, status: "Confirmed", image: people[0].image },
  { id: 2, name: "David Chen", skill: "Portfolio review", date: "Wed, Oct 22", time: "11:00 AM", duration: 1, status: "Confirmed", image: "photo-1506794778202-cad84cf45f1d" },
  { id: 3, name: "Fatima Bello", skill: "Excel for beginners", date: "Oct 18", time: "2:00 PM", duration: 1, status: "Awaiting confirmation", image: "photo-1544005313-94ddf0286df2" },
];

const ledger = [
  { title: "Starter credits", detail: "Profile completion bonus", date: "Oct 16, 2026", amount: "+2.0", kind: "plus" },
  { title: "Taught Canva basics", detail: "with Nneka Eze", date: "Oct 17, 2026", amount: "+1.5", kind: "plus" },
  { title: "Yoruba conversation", detail: "Held for Amaka Okafor", date: "Oct 20, 2026", amount: "−1.5", kind: "hold" },
  { title: "Taught Excel formulas", detail: "with Musa Ibrahim", date: "Oct 14, 2026", amount: "+2.0", kind: "plus" },
];

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
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

function Avatar({ image, name, size = "md" }: { image: string; name: string; size?: "sm" | "md" | "lg" }) {
  return <span className={`avatar avatar-${size}`} title={name}><img src={`https://images.unsplash.com/${image}?auto=format&fit=crop&w=96&q=75`} alt="" /></span>;
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [wallet, setWallet] = useState({ balance: 6.25, pending: 1.5 });
  const [sessions, setSessions] = useState(initialSessions);
  const [hydrated, setHydrated] = useState(false);
  const [settled, setSettled] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSkill, setBookingSkill] = useState("Yoruba conversation");
  const [bookingDuration, setBookingDuration] = useState(1.5);
  const [bookingTeacher, setBookingTeacher] = useState(people[0]);
  const [bookingDone, setBookingDone] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [clockRunning, setClockRunning] = useState(false);
  const [ended, setEnded] = useState(false);
  const [myConfirmed, setMyConfirmed] = useState(false);
  const [partnerConfirmed, setPartnerConfirmed] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All skills");
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("skill-barter-clock-demo");
      if (saved) {
        const parsed = JSON.parse(saved) as { wallet?: typeof wallet; sessions?: Session[] };
        if (parsed.wallet && Number.isFinite(parsed.wallet.balance) && Number.isFinite(parsed.wallet.pending)) setWallet(parsed.wallet);
        if (Array.isArray(parsed.sessions)) setSessions(parsed.sessions);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem("skill-barter-clock-demo", JSON.stringify({ wallet, sessions }));
  }, [hydrated, wallet, sessions]);

  useEffect(() => {
    if (!clockRunning) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [clockRunning]);

  useEffect(() => {
    if (myConfirmed && partnerConfirmed && !settled) {
      setSettled(true);
      setWallet((value) => ({ ...value, pending: Math.max(0, value.pending - 1.5) }));
      setSessions((value) => value.map((session) => session.id === 1 ? { ...session, status: "Completed" } : session));
      setToast("Session verified. Credits released to Amaka.");
    }
  }, [myConfirmed, partnerConfirmed, settled]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const formatTime = `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const startBooking = (teacher = people[0]) => {
    setBookingTeacher(teacher);
    setBookingSkill(teacher.skill.split(" · ")[0]);
    setBookingOpen(true);
    setBookingDone(false);
  };

  const createBooking = () => {
    if (wallet.balance < bookingDuration) {
      setToast("You need more credits to book this session.");
      return;
    }
    setWallet((value) => ({ balance: value.balance - bookingDuration, pending: value.pending + bookingDuration }));
    setSessions((value) => [{ id: Date.now(), name: bookingTeacher.name, skill: bookingSkill, date: "Thu, Oct 23", time: "4:30 PM", duration: bookingDuration, status: "Confirmed", image: bookingTeacher.image }, ...value]);
    setBookingDone(true);
  };

  const completeSession = () => {
    setMyConfirmed(true);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("home")} aria-label="Skill Barter Clock home">
          <span className="brand-mark"><span /><i /></span><span className="brand-name">skill barter<span>clock</span></span>
        </button>
        <div className="side-label">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {([["home", "grid", "Overview"], ["explore", "search", "Explore skills"], ["sessions", "calendar", "My sessions"], ["wallet", "wallet", "Time wallet"], ["profile", "message", "Messages"]] as [View, string, string][]).map(([key, icon, label]) => (
            <button key={key} className={`nav-item ${view === key ? "active" : ""}`} onClick={() => setView(key)}><Icon name={icon} /><span>{label}</span>{key === "profile" && <span className="nav-count">2</span>}</button>
          ))}
        </nav>
        <div className="side-note">
          <div className="note-icon"><Icon name="shield" size={17} /></div>
          <strong>Time is the only currency here.</strong>
          <p>No money changes hands. Every hour is worth the same.</p>
          <button className="text-link" onClick={() => setToast("Every teaching hour earns one time credit. Credits are never money.")}>How fairness works <Icon name="arrow" size={14} /></button>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setToast("Settings are coming soon.")}><Icon name="settings" /><span>Settings</span></button>
          <button className="user-mini" onClick={() => setView("profile")}><span className="avatar avatar-sm initials">MC</span><span><b>Maya Collins</b><small>Community member</small></span><span className="dots">···</span></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><span /><i /></span><span className="brand-name">skill barter<span>clock</span></span></div>
          <div className="breadcrumb"><span>My space</span><b>/</b><strong>{view === "home" ? "Overview" : view === "room" ? "Session room" : view[0].toUpperCase() + view.slice(1)}</strong></div>
          <div className="top-actions"><span className="top-time"><Icon name="clock" size={16} /> Lagos, 3:42 PM</span><button className="icon-button notification" aria-label="Notifications" onClick={() => setToast("You’re all caught up.")}><Icon name="bell" /><i /></button><span className="avatar avatar-sm initials top-avatar">MC</span></div>
        </header>

        <div className="content-wrap">
          {view === "home" && <>
            <div className="welcome-row"><div><div className="eyebrow">TUESDAY, OCTOBER 20, 2026 <span className="eyebrow-dot" /></div><h1>Good afternoon, Maya<span className="wave">.</span></h1><p className="lead">A little time shared goes a long way.</p></div><button className="button button-primary" onClick={() => startBooking()}><Icon name="plus" size={17} /> Book a session</button></div>

            <section className="hero-panel">
              <div className="hero-copy"><div className="hero-kicker"><span className="live-dot" /> YOUR NEXT HOUR STARTS HERE</div><h2>Teach what you know.<br /><em>Learn what you love.</em></h2><p>Every hour you share brings another skill within reach. No money. Just time, exchanged fairly.</p><button className="hero-button" onClick={() => setView("explore")}>Find your next skill <Icon name="arrow" size={17} /></button><div className="hero-people"><div className="avatar-stack"><Avatar image={people[0].image} name={people[0].name} size="sm" /><Avatar image={people[1].image} name={people[1].name} size="sm" /><Avatar image={people[2].image} name={people[2].name} size="sm" /></div><span><b>2,400+</b> neighbors learning together</span></div></div>
              <div className="hero-art" aria-label="Example skill swap"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="swap-note note-top"><span className="note-avatar avatar-photo"><img src={`https://images.unsplash.com/${people[1].image}?auto=format&fit=crop&w=96&q=75`} alt="" /></span><span><small>YOU TEACH</small><b>Excel · 2 hours</b></span><span className="note-check"><Icon name="check" size={13} /></span></div><div className="clock-illustration"><span className="dial-tick tick-a" /><span className="dial-tick tick-b" /><span className="dial-tick tick-c" /><span className="dial-tick tick-d" /><span className="clock-hand" /><span className="clock-hand hand-short" /><span className="clock-pin" /><span className="clock-label">01<span>:</span>00</span></div><div className="swap-note note-bottom"><span className="note-avatar avatar-photo"><img src={`https://images.unsplash.com/${people[0].image}?auto=format&fit=crop&w=96&q=75`} alt="" /></span><span><small>YOU LEARN</small><b>Yoruba · 2 hours</b></span><span className="swap-arrows">⇄</span></div><div className="floating-star">✳</div><div className="art-caption">ONE HOUR, SHARED FAIRLY</div></div>
            </section>

            <section className="stat-strip" aria-label="Community activity"><div><span className="stat-icon stat-teal"><Icon name="clock" size={17} /></span><span><b>18,420</b><small>hours exchanged</small></span></div><div><span className="stat-icon stat-peach">♧</span><span><b>2,406</b><small>active members</small></span></div><div><span className="stat-icon stat-gold">✳</span><span><b>318</b><small>skills to explore</small></span></div><div><span className="stat-icon stat-green"><Icon name="check" size={17} /></span><span><b>96%</b><small>sessions verified</small></span></div></section>

            <div className="dashboard-grid"><section className="section-block upcoming-block"><div className="section-heading"><div><div className="eyebrow">MAKE TIME FOR YOU</div><h3>Coming up</h3></div><button className="text-link" onClick={() => setView("sessions")}>All sessions <Icon name="arrow" size={14} /></button></div><div className="session-list">{sessions.slice(0, 2).map((session) => <article className="session-row" key={session.id}><Avatar image={session.image} name={session.name} /><div className="session-main"><strong>{session.skill}</strong><span>with {session.name} <i>·</i> {session.duration} hr{session.duration > 1 ? "s" : ""}</span></div><div className="session-date"><b>{session.date}</b><span>{session.time}</span></div><button className="row-arrow" aria-label={`Open ${session.skill} session`} onClick={() => { setView("room"); setEnded(false); }}><Icon name="arrow" size={17} /></button></article>)}</div></section>

            <section className="wallet-card"><div className="wallet-card-top"><span>YOUR TIME WALLET</span><span className="wallet-spark">✳</span></div><div className="wallet-balance"><strong>{wallet.balance.toFixed(2)}</strong><span>TC</span></div><p>time credits available</p><div className="wallet-pending"><span><i /> Held safely for a session</span><b>{wallet.pending.toFixed(2)} TC</b></div><button className="wallet-link" onClick={() => setView("wallet")}>View wallet <Icon name="arrow" size={15} /></button><span className="wallet-watermark">◷</span></section></div>

            <section className="section-block match-block"><div className="section-heading"><div><div className="eyebrow">GOOD PEOPLE, GOOD EXCHANGE</div><h3>People you might click with</h3></div><button className="text-link" onClick={() => setView("explore")}>Explore everyone <Icon name="arrow" size={14} /></button></div><div className="teacher-grid">{people.map((person) => <TeacherCard key={person.name} person={person} onBook={() => { setBookingOpen(true); setBookingDone(false); setBookingSkill(person.skill.split(" · ")[0]); }} onProfile={() => setView("profile")} />)}</div></section>

            <section className="trust-strip"><div className="trust-mark"><Icon name="shield" size={20} /></div><div><strong>Both say it happened. Then credits move.</strong><span>Your credits stay safely held until you and your partner confirm the session.</span></div><button className="text-link" onClick={() => setToast("You’ll both confirm the session and share a rating before credits move.")}>How verification works <Icon name="arrow" size={14} /></button></section>
          </>}

          {view === "explore" && <><div className="page-heading"><div className="eyebrow">FIND YOUR NEXT THING</div><h1>Good skills, good people.</h1><p className="lead">Learn from someone nearby. Share a little of what you know.</p></div><div className="explore-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “Yoruba”, “Excel”, or “guitar”" aria-label="Search skills" /><button className="button button-primary" onClick={() => setQuery(query.trim())}><Icon name="filter" size={17} /> Filters</button></div><div className="filter-row">{["All skills", "Tech & office", "Languages", "Creative", "Business", "Life skills"].map((item, index) => <button className={`filter-chip ${index === 0 ? "selected" : ""}`} key={item} onClick={() => setQuery(index === 0 ? "" : item)}>{item}</button>)}</div><div className="section-heading explore-title"><div><div className="eyebrow">A FEW GOOD MATCHES</div><h3>Teachers worth your time</h3></div><span className="result-count">Showing 24 people</span></div><div className="teacher-grid explore-grid">{people.filter((person) => `${person.name} ${person.skill} ${person.swap}`.toLowerCase().includes(query.toLowerCase()) || ["all skills", "tech & office", "languages", "creative", "business", "life skills"].includes(query.toLowerCase())).map((person) => <TeacherCard key={person.name} person={person} onBook={() => { setBookingOpen(true); setBookingDone(false); setBookingSkill(person.skill.split(" · ")[0]); }} onProfile={() => setView("profile")} />)}</div><div className="fairness-note"><Icon name="shield" /><span><b>Same time, same worth.</b> One hour of any skill is always one time credit.</span></div></>}

          {view === "sessions" && <><div className="page-heading sessions-heading"><div><div className="eyebrow">YOUR TIME, WELL SPENT</div><h1>My sessions</h1><p className="lead">Every good exchange starts with showing up.</p></div><button className="button button-primary" onClick={() => { setBookingOpen(true); setBookingDone(false); }}><Icon name="plus" size={17} /> Book a session</button></div><div className="session-tabs"><button className="selected">Upcoming <span>2</span></button><button onClick={() => setToast("Your past sessions will appear here.")}>Past sessions</button><button onClick={() => setToast("No pending requests right now.")}>Requests <span className="tab-count">1</span></button></div><div className="session-page-list">{sessions.map((session) => <article className="session-card" key={session.id}><div className="date-tile"><b>{session.date.split(" ")[1]?.replace(",", "") ?? "20"}</b><span>{session.date.split(" ")[0]}</span></div><Avatar image={session.image} name={session.name} /><div className="session-main"><strong>{session.skill}</strong><span>{session.name} <i>·</i> {session.date} at {session.time}</span><small><Icon name="clock" size={14} /> {session.duration} hour{session.duration > 1 ? "s" : ""} <i>·</i> Video call</small></div><span className={`status-pill ${session.status === "Completed" ? "status-done" : session.status === "Awaiting confirmation" ? "status-wait" : ""}`}><i />{session.status}</span><button className="button button-secondary small-button" onClick={() => { setView("room"); setEnded(session.status === "Awaiting confirmation"); }}>Open session</button></article>)}</div><div className="empty-hint"><Icon name="calendar" /><span>Plans change. You can reschedule up to 12 hours before a session.</span></div></>}

          {view === "wallet" && <><div className="page-heading"><div className="eyebrow">TIME, KEPT FAIR</div><h1>Your time wallet</h1><p className="lead">Not money. Just hours, earned and shared.</p></div><div className="wallet-overview"><div className="wallet-large"><span className="wallet-card-top">AVAILABLE TO LEARN</span><strong>{wallet.balance.toFixed(2)} <small>TC</small></strong><span>1 TC = 1 hour of teaching</span><div className="wallet-large-bottom"><span>Held for upcoming sessions</span><b>{wallet.pending.toFixed(2)} TC</b></div></div><div className="wallet-info"><div className="eyebrow">HOW YOUR CREDITS WORK</div><div className="credit-rule"><span className="rule-icon earned"><Icon name="plus" size={17} /></span><div><b>Teach an hour, earn 1 TC</b><span>Every verified teaching hour adds to your available balance.</span></div></div><div className="credit-rule"><span className="rule-icon spent"><Icon name="clock" size={17} /></span><div><b>Learn an hour, spend 1 TC</b><span>Credits are held when you book, then sent after you both confirm.</span></div></div><div className="credit-rule"><span className="rule-icon safe"><Icon name="shield" size={17} /></span><div><b>Credits are never money</b><span>They can’t be bought, sold, or exchanged outside the community.</span></div></div></div></div><div className="ledger-heading"><div><div className="eyebrow">EVERY HOUR, ACCOUNTED FOR</div><h3>Wallet activity</h3></div><button className="button button-quiet" onClick={() => setToast("Your wallet statement is ready to export.")}>Export statement <Icon name="arrow" size={15} /></button></div><div className="ledger-table"><div className="ledger-head"><span>ACTIVITY</span><span>DATE</span><span>AMOUNT</span></div>{ledger.map((item) => <div className="ledger-row" key={item.title}><span className={`ledger-icon ${item.kind}`}><Icon name={item.kind === "plus" ? "plus" : "clock"} size={16} /></span><div className="ledger-name"><b>{item.title}</b><small>{item.detail}</small></div><span className="ledger-date">{item.date}</span><b className={`ledger-amount ${item.kind}`}>{item.amount} <small>TC</small></b></div>)}</div></>}

          {view === "room" && <><button className="back-link" onClick={() => setView("sessions")}>← Back to sessions</button><div className="room-heading"><div><div className="eyebrow">SESSION ROOM <span className="eyebrow-dot" /></div><h1>Yoruba conversation</h1><p className="lead">You and Amaka · Today at 4:30 PM · 1.5 hours</p></div><span className="room-status"><i /> {ended ? "Awaiting confirmation" : clockRunning ? "In progress" : "Ready when you are"}</span></div><div className="room-layout"><section className="clock-panel"><div className="clock-panel-top"><span>SESSION CLOCK</span><span className="stake"><i /> 1.5 TC held safely</span></div><div className={`timer-dial ${clockRunning ? "timer-running" : ""}`}><div className="timer-face"><span className="timer-live">{clockRunning && <i />} {clockRunning ? "SESSION LIVE" : ended ? "SESSION ENDED" : "READY TO BEGIN"}</span><strong>{formatTime}</strong><span className="timer-sub">{clockRunning ? "Time shared, together" : "Both partners start the clock"}</span></div><span className="dial-number n12">12</span><span className="dial-number n3">03</span><span className="dial-number n6">06</span><span className="dial-number n9">09</span></div><div className="clock-partners"><div><Avatar image={people[0].image} name="Maya Collins" /><span><b>Maya Collins</b><small>{clockRunning ? "Clock running" : "You"}</small></span><i className="ready-check"><Icon name="check" size={12} /></i></div><span className="partner-plus">+</span><div><Avatar image={people[0].image} name="Amaka Okafor" /><span><b>Amaka Okafor</b><small>{clockRunning ? "Clock running" : "Ready to start"}</small></span><i className={`ready-check ${clockRunning ? "" : "waiting-check"}`}><Icon name={clockRunning ? "check" : "clock"} size={12} /></i></div></div>{!ended ? <div className="clock-controls"><button className="button button-primary clock-action" onClick={() => setClockRunning((value) => !value)}>{clockRunning ? "Pause session" : "Start session"}</button><button className="button button-secondary" onClick={() => { setClockRunning(false); setEnded(true); }}>End session</button></div> : <div className="ended-callout"><Icon name="check" /><span>Nice work showing up. Confirm the session together to release the held credits.</span></div>}<p className="clock-footnote"><Icon name="shield" size={15} /> Both partners need to start and end the clock. Your credits stay held until you both confirm.</p></section><aside className="room-aside"><div className="room-side-card"><div className="eyebrow">TODAY’S PLAN</div><h3>Let’s get talking</h3><p>Practice greetings, everyday phrases, and the little things that make conversation feel natural.</p><div className="agenda-item"><span>01</span><div><b>Warm-up & greetings</b><small>15 minutes</small></div></div><div className="agenda-item"><span>02</span><div><b>Everyday conversation</b><small>45 minutes</small></div></div><div className="agenda-item"><span>03</span><div><b>New phrases to keep</b><small>30 minutes</small></div></div><button className="room-note-button" onClick={() => setToast("Shared session notes opened.")}>＋ Add a note</button></div><div className="room-side-card room-help"><Icon name="shield" /><div><b>Need a hand?</b><span>Report a concern or ask for help with this session.</span><button className="text-link" onClick={() => setToast("A support request has been started.")}>Get support <Icon name="arrow" size={13} /></button></div></div></aside></div>{ended && <section className="confirmation-panel"><div><div className="eyebrow">THE LAST LITTLE STEP</div><h3>Did it go as planned?</h3><p>Confirm the session and leave a note for Amaka.</p></div><div className="confirm-actions"><button className={`confirm-button ${myConfirmed ? "confirmed" : ""}`} onClick={completeSession}>{myConfirmed ? <><Icon name="check" size={17} /> You confirmed</> : "Yes, session completed"}</button><button className={`confirm-button ${partnerConfirmed ? "confirmed" : ""}`} onClick={() => setPartnerConfirmed((value) => !value)}>{partnerConfirmed ? <><Icon name="check" size={17} /> Amaka confirmed</> : "Simulate Amaka’s confirmation"}</button></div><button className="dispute-link" onClick={() => setToast("A moderator will review the session within 5 days.")}>Something went wrong? Open a dispute</button>{myConfirmed && !partnerConfirmed && <div className="waiting-message">Waiting for Amaka to confirm. Credits are safely held.</div>}</section>}</>}

          {view === "profile" && <><div className="profile-banner"><div className="profile-portrait"><Avatar image={people[0].image} name="Maya Collins" size="lg" /></div><div><div className="eyebrow">YOUR COMMUNITY PROFILE</div><h1>Maya Collins</h1><p className="lead">Curious by nature. Sharing what I know, learning what I don’t.</p><span className="profile-meta">Lagos, Nigeria <i>·</i> Joined October 2026 <i>·</i> <Icon name="shield" size={14} /> Email verified</span></div><button className="button button-secondary" onClick={() => setToast("Profile editor opened.")}>Edit profile</button></div><div className="profile-stats"><div><b>4.9 <span>★</span></b><small>Trust score</small></div><div><b>5.5</b><small>Hours taught</small></div><div><b>4</b><small>Sessions done</small></div><div><b>100%</b><small>Response rate</small></div></div><div className="profile-columns"><section><div className="section-heading"><div><div className="eyebrow">WHAT I CAN SHARE</div><h3>Skills I teach</h3></div><button className="text-link" onClick={() => setToast("Add a skill to your profile.")}>+ Add skill</button></div><div className="skill-box"><b>Canva & visual design</b><span>Intermediate <i>·</i> 5.5 hours shared</span></div><div className="section-heading profile-learn-heading"><div><div className="eyebrow">WHAT I’M HERE TO LEARN</div><h3>Skills I’m curious about</h3></div></div><div className="profile-tags"><span>Yoruba</span><span>Guitar</span><span>Public speaking</span></div></section><section className="profile-about"><div className="eyebrow">A LITTLE ABOUT ME</div><p>I’m a Lagos-based creative who loves turning a blank page into something useful. Happy to help with Canva, brand basics, and getting your ideas out of your head and onto the screen.</p><div className="profile-languages"><b>Languages</b><span>English <i>·</i> Yoruba (learning)</span></div></section></div></>}
        </div>
        <footer className="footer-line"><span>TIME IS THE ONLY CURRENCY HERE.</span><span>Made for people who love to learn <i>✳</i></span></footer>
      </main>

      {bookingOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBookingOpen(false); }}><section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title"><button className="modal-close" onClick={() => setBookingOpen(false)} aria-label="Close booking"><Icon name="close" /></button>{bookingDone ? <div className="booking-success"><span className="success-mark"><Icon name="check" size={26} /></span><div className="eyebrow">A GOOD THING IS IN MOTION</div><h2>Time set aside.</h2><p>Your {bookingDuration} TC is safely held for this session. Amaka will meet you here on Thursday.</p><button className="button button-primary" onClick={() => { setBookingOpen(false); setView("sessions"); }}>See my sessions <Icon name="arrow" size={16} /></button></div> : <><div className="eyebrow">MAKE A LITTLE TIME</div><h2 id="booking-title">Book a session</h2><p className="modal-intro">Pick what you’d like to learn. Your credits stay held until you both confirm.</p><label className="field-label" htmlFor="skill-select">I’d love to learn</label><select id="skill-select" value={bookingSkill} onChange={(event) => setBookingSkill(event.target.value)}><option>Yoruba conversation</option><option>Excel · Advanced</option><option>Brand design · Advanced</option><option>Public speaking</option><option>French conversation</option></select><label className="field-label" htmlFor="duration-select">How much time?</label><select id="duration-select" value={bookingDuration} onChange={(event) => setBookingDuration(Number(event.target.value))}><option value={0.5}>30 minutes · 0.5 TC</option><option value={1}>1 hour · 1 TC</option><option value={1.5}>1.5 hours · 1.5 TC</option><option value={2}>2 hours · 2 TC</option></select><label className="field-label" htmlFor="time-select">A time that works</label><select id="time-select"><option>Thursday, October 23 · 4:30 PM</option><option>Friday, October 24 · 11:00 AM</option><option>Saturday, October 25 · 2:00 PM</option></select><div className="booking-hold"><Icon name="shield" size={17} /><span><b>{bookingDuration.toFixed(2)} TC held safely</b><small>Only released when you both confirm.</small></span><span className="hold-balance">{Math.max(0, wallet.balance - bookingDuration).toFixed(2)} left</span></div><button className="button button-primary booking-submit" onClick={createBooking}>Request this session <Icon name="arrow" size={16} /></button><p className="modal-footnote">No money involved. Ever.</p></>}</section></div>}
      {toast && <div className="toast" role="status"><span><Icon name="check" size={16} /></span>{toast}<button onClick={() => setToast("")} aria-label="Dismiss notification"><Icon name="close" size={15} /></button></div>}
      <nav className="mobile-nav" aria-label="Mobile navigation">{([["home", "grid", "Home"], ["explore", "search", "Explore"], ["sessions", "calendar", "Sessions"], ["wallet", "wallet", "Wallet"]] as [View, string, string][]).map(([key, icon, label]) => <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}><Icon name={icon} size={20} /><span>{label}</span></button>)}</nav>
    </div>
  );
}

function TeacherCard({ person, onBook, onProfile }: { person: (typeof people)[number]; onBook: () => void; onProfile: () => void }) {
  return <article className="teacher-card"><div className="teacher-top"><Avatar image={person.image} name={person.name} size="lg" /><span className="teacher-rating">★ {person.rating}</span></div><button className="teacher-name" onClick={onProfile}>{person.name}<span className="verified-dot"><Icon name="check" size={10} /></span></button><span className="teacher-skill">{person.skill}</span><div className="teacher-divider" /><div className="teacher-detail"><span className="teacher-hours"><Icon name="clock" size={14} /> {person.hours}</span><span className="teacher-location">Online</span></div><div className="swap-tags"><small>OPEN TO SWAP FOR</small><div>{person.swap.split(", ").map((skill) => <span key={skill}>{skill}</span>)}</div></div><button className="button button-secondary card-book" onClick={onBook}>Request a session <Icon name="arrow" size={15} /></button></article>;
}
