// Weekly availability shared by the editor, teacher profile, and booking form.
// The database enforces the same rules in set_my_availability and request_session.

export type AvailabilityWindow = {
  weekday: number; // 0 = Sunday, matching Date.getDay() and Postgres extract(dow)
  startMinute: number;
  endMinute: number;
};

export type Availability = {
  timeZone: string | null;
  windows: AvailabilityWindow[];
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const SLOT_MINUTES = 30;

/** "6:00 PM" for 1080; "12:00 AM" for 0 and 1440 (midnight). */
export function minutesLabel(minutes: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
    .format(new Date(Date.UTC(2000, 0, 1, 0, minutes)));
}

/** Problems with a set of windows, or an empty string when they're valid. */
export function validateWindows(windows: AvailabilityWindow[]) {
  for (const window of windows) {
    if (window.startMinute >= window.endMinute) {
      return `${WEEKDAYS[window.weekday]}: each time range must end after it starts.`;
    }
  }
  for (const a of windows) {
    for (const b of windows) {
      if (a !== b && a.weekday === b.weekday && a.startMinute < b.endMinute && b.startMinute < a.endMinute) {
        return `${WEEKDAYS[a.weekday]}: time ranges can’t overlap.`;
      }
    }
  }
  return "";
}

/** Whether a session of `hours` starting at `start` fits in consecutive free slots. */
export function fitsInSlots(freeSlotTimes: Set<number>, start: number, hours: number) {
  const steps = Math.round((hours * 60) / SLOT_MINUTES);
  for (let step = 0; step < steps; step += 1) {
    if (!freeSlotTimes.has(start + step * SLOT_MINUTES * 60_000)) return false;
  }
  return true;
}
