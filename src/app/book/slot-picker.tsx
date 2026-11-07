"use client";

import { useEffect, useMemo, useState } from "react";
import { fitsInSlots } from "@/lib/availability";

const DAY_MS = 86_400_000;
const PAGE_DAYS = 14;
const MAX_PAGES = 6; // About 90 days, the booking limit.

function localDayKey(time: number) {
  const date = new Date(time);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Lets a learner pick a start time from a teacher's open half-hour slots,
 * shown in the learner's own time zone. Only starts where the chosen length
 * fits in consecutive free slots are offered.
 */
export default function SlotPicker({
  teacherId,
  durationHours,
  value,
  onChange,
}: {
  teacherId: string;
  durationHours: number;
  value: string;
  onChange: (isoStart: string) => void;
}) {
  const [page, setPage] = useState(0);
  const [range, setRange] = useState<{ from: number; to: number } | null>(null);
  const [slots, setSlots] = useState<number[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewerZone, setViewerZone] = useState("");

  useEffect(() => {
    let active = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = today.getTime() + page * PAGE_DAYS * DAY_MS;
    const to = from + PAGE_DAYS * DAY_MS;
    const params = new URLSearchParams({ teacherId, from: new Date(from).toISOString(), to: new Date(to).toISOString() });
    fetch(`/api/availability/slots?${params}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!active) return;
        if (!response.ok) throw new Error(data.error || "Could not load open times.");
        setViewerZone(Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll("_", " "));
        setRange({ from, to });
        setSlots((data.slots as string[]).map((slot) => new Date(slot).getTime()));
        setError("");
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load open times.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [teacherId, page]);

  const freeSet = useMemo(() => new Set(slots), [slots]);
  const startsByDay = useMemo(() => {
    const byDay = new Map<string, number[]>();
    for (const start of slots) {
      if (!fitsInSlots(freeSet, start, durationHours)) continue;
      const key = localDayKey(start);
      byDay.set(key, [...(byDay.get(key) ?? []), start]);
    }
    return byDay;
  }, [slots, freeSet, durationHours]);

  const days = useMemo(() => {
    if (!range) return [];
    return Array.from({ length: PAGE_DAYS }, (_, index) => {
      const date = new Date(range.from);
      date.setDate(date.getDate() + index);
      return date;
    });
  }, [range]);

  const firstOpenDay = days.find((day) => startsByDay.has(localDayKey(day.getTime())));
  const activeDay = selectedDay && startsByDay.has(selectedDay)
    ? selectedDay
    : firstOpenDay ? localDayKey(firstOpenDay.getTime()) : "";
  const times = startsByDay.get(activeDay) ?? [];
  const selectedTime = value ? new Date(value).getTime() : null;

  // Drop a chosen time that no longer fits (for example, after a longer length is picked).
  useEffect(() => {
    if (selectedTime !== null && slots.length && !fitsInSlots(freeSet, selectedTime, durationHours)) onChange("");
  }, [selectedTime, slots, freeSet, durationHours, onChange]);

  const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div className="slot-picker">
      <div className="slot-nav">
        <button className="text-link" type="button" disabled={page === 0 || loading} onClick={() => { setLoading(true); setPage(page - 1); }}>← Earlier dates</button>
        {viewerZone && <small className="availability-off">Times in your time zone ({viewerZone})</small>}
        <button className="text-link" type="button" disabled={page >= MAX_PAGES - 1 || loading} onClick={() => { setLoading(true); setPage(page + 1); }}>Later dates →</button>
      </div>

      {error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : loading && !range ? (
        <p className="lead" role="status">Loading open times…</p>
      ) : (
        <>
          <div className="slot-days" role="group" aria-label="Choose a day">
            {days.map((day) => {
              const key = localDayKey(day.getTime());
              const open = startsByDay.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  className="slot-day"
                  disabled={!open}
                  aria-pressed={key === activeDay}
                  onClick={() => setSelectedDay(key)}
                >
                  <small>{new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day)}</small>
                  <b>{day.getDate()}</b>
                  <small>{new Intl.DateTimeFormat(undefined, { month: "short" }).format(day)}</small>
                </button>
              );
            })}
          </div>
          {times.length ? (
            <div className="slot-times" role="group" aria-label="Choose a start time">
              {times.map((time) => (
                <button
                  key={time}
                  type="button"
                  className="slot-time"
                  aria-pressed={time === selectedTime}
                  onClick={() => onChange(new Date(time).toISOString())}
                >
                  {timeFormat.format(time)}
                </button>
              ))}
            </div>
          ) : (
            <p className="availability-off">
              No open times for a {durationHours}-hour session in these two weeks. Try a shorter length or later dates.
            </p>
          )}
        </>
      )}
    </div>
  );
}
