export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** A new shift opened before 4:00am local time belongs to yesterday. */
export const NEW_SHIFT_DATE_CUTOFF_MINUTES = 4 * 60;

export function isCivilDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function weekdayIndex(iso: string): number {
  if (!isCivilDate(iso)) throw new Error(`Not a civil date: ${iso}`);
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(iso: string, days: number): string {
  if (!isCivilDate(iso)) throw new Error(`Not a civil date: ${iso}`);
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function compareCivil(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function todayCivil(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function defaultShiftDate(now = new Date()): string {
  const today = todayCivil(now);
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < NEW_SHIFT_DATE_CUTOFF_MINUTES) return addDays(today, -1);
  return today;
}

export function weekRange(today: string, weekStartsOn: number): { start: string; end: string } {
  const wd = weekdayIndex(today);
  const delta = (wd - weekStartsOn + 7) % 7;
  const start = addDays(today, -delta);
  return { start, end: addDays(start, 6) };
}

export function monthRange(today: string): { start: string; end: string } {
  const [y, m] = today.split("-").map(Number);
  const start = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

export function previousMonthRange(today: string): { start: string; end: string } {
  const [y, m] = today.split("-").map(Number);
  const prevYear = m === 1 ? y - 1 : y;
  const prevMonth = m === 1 ? 12 : m - 1;
  const anchor = `${String(prevYear).padStart(4, "0")}-${String(prevMonth).padStart(2, "0")}-01`;
  return monthRange(anchor);
}

/** Inclusive day count. */
export function daysInclusive(start: string, end: string): number {
  const [y1, m1, d1] = start.split("-").map(Number);
  const [y2, m2, d2] = end.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000) + 1;
}

/** Latest 28 civil days ending today, and the 28 days before that. */
export function trailing28(today: string): {
  latest: { start: string; end: string };
  prior: { start: string; end: string };
} {
  return {
    latest: { start: addDays(today, -27), end: today },
    prior: { start: addDays(today, -55), end: addDays(today, -28) },
  };
}

export function weekdayOrder(weekStartsOn: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7);
}

export function formatWeekdayDate(iso: string): string {
  const wd = weekdayIndex(iso);
  const [, m, d] = iso.split("-").map(Number);
  return `${WEEKDAY_SHORT[wd]}, ${MONTH_SHORT[m - 1]} ${d}`;
}

export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}, ${y}`;
}

export function formatMonthYear(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTH_LONG[m - 1]} ${y}`;
}

export function inRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}
