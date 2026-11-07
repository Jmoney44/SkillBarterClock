"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell, Icon } from "../../site";
import {
  SLOT_MINUTES,
  WEEKDAYS,
  minutesLabel,
  validateWindows,
  type Availability,
  type AvailabilityWindow,
} from "@/lib/availability";

// Monday first, as most weekly planners show it.
const dayOrder = [1, 2, 3, 4, 5, 6, 0];
const startOptions = Array.from({ length: 48 }, (_, index) => index * SLOT_MINUTES);
const endOptions = Array.from({ length: 48 }, (_, index) => (index + 1) * SLOT_MINUTES);

function endLabel(minutes: number) {
  return minutes === 1440 ? "Midnight" : minutesLabel(minutes);
}

export default function AvailabilityPage() {
  const router = useRouter();
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [timeZone, setTimeZone] = useState("");
  const [timeZones, setTimeZones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/availability", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as Availability & { error?: string };
        if (!active) return;
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) throw new Error(data.error || "Could not load your availability.");
        const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [browserZone];
        const current = data.timeZone || browserZone;
        setTimeZones(zones.includes(current) ? zones : [current, ...zones]);
        setTimeZone(current);
        setWindows(data.windows ?? []);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load your availability.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [router]);

  function update(next: AvailabilityWindow[]) {
    setWindows(next);
    setSaved(false);
    setError("");
  }

  function addRange(weekday: number) {
    const sameDay = windows.filter((window) => window.weekday === weekday);
    const latestEnd = Math.max(0, ...sameDay.map((window) => window.endMinute));
    const startMinute = sameDay.length ? Math.min(latestEnd, 1410) : 18 * 60;
    update([...windows, { weekday, startMinute, endMinute: Math.min(startMinute + 120, 1440) }]);
  }

  async function save() {
    const problem = validateWindows(windows);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeZone, windows }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not save your availability.");
        return;
      }
      setSaved(true);
    } catch {
      setError("We couldn’t reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Teaching">
      <Link className="back-link" href="/teacher">← Back to teaching</Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WEEKLY HOURS</div>
          <h1>When can you teach?</h1>
          <p className="lead">Learners can only request times inside these hours. Leave every day empty to accept requests at any time.</p>
        </div>
      </div>

      {loading ? (
        <p className="lead" role="status">Loading your availability…</p>
      ) : (
        <section className="availability-editor">
          <label className="field-wrap availability-zone">
            <span>Your time zone</span>
            <select value={timeZone} onChange={(event) => { setTimeZone(event.target.value); setSaved(false); }}>
              {timeZones.map((zone) => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}
            </select>
          </label>

          <div className="availability-days">
            {dayOrder.map((weekday) => {
              const dayWindows = windows
                .map((window, index) => ({ window, index }))
                .filter(({ window }) => window.weekday === weekday)
                .sort((a, b) => a.window.startMinute - b.window.startMinute);
              return (
                <div className="availability-day" key={weekday}>
                  <b>{WEEKDAYS[weekday]}</b>
                  <div className="availability-ranges">
                    {dayWindows.length === 0 && <span className="availability-off">Not available</span>}
                    {dayWindows.map(({ window, index }) => (
                      <div className="availability-range" key={index}>
                        <select
                          aria-label={`${WEEKDAYS[weekday]} start time`}
                          value={window.startMinute}
                          onChange={(event) => update(windows.map((item, i) => (i === index ? { ...item, startMinute: Number(event.target.value) } : item)))}
                        >
                          {startOptions.map((minutes) => <option key={minutes} value={minutes}>{minutesLabel(minutes)}</option>)}
                        </select>
                        <span aria-hidden="true">–</span>
                        <select
                          aria-label={`${WEEKDAYS[weekday]} end time`}
                          value={window.endMinute}
                          onChange={(event) => update(windows.map((item, i) => (i === index ? { ...item, endMinute: Number(event.target.value) } : item)))}
                        >
                          {endOptions.map((minutes) => <option key={minutes} value={minutes}>{endLabel(minutes)}</option>)}
                        </select>
                        <button
                          className="icon-button availability-remove"
                          type="button"
                          aria-label={`Remove ${WEEKDAYS[weekday]} ${minutesLabel(window.startMinute)} to ${endLabel(window.endMinute)}`}
                          onClick={() => update(windows.filter((_, i) => i !== index))}
                        >
                          <Icon name="close" size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="text-link" type="button" onClick={() => addRange(weekday)}>
                    <Icon name="plus" size={14} /> Add time
                  </button>
                </div>
              );
            })}
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          {saved && <p className="form-success" role="status">Your availability is saved. Learners will see open times in their own time zone.</p>}

          <div className="availability-actions">
            <button className="button button-primary" type="button" disabled={saving || !timeZone} onClick={() => void save()}>
              {saving ? "Saving…" : "Save availability"}
            </button>
            {windows.length > 0 && (
              <button className="button button-quiet" type="button" disabled={saving} onClick={() => update([])}>Clear all</button>
            )}
          </div>
        </section>
      )}
    </AppShell>
  );
}
