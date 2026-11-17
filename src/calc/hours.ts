import { roundDiv } from "./money";

export type DurationProblem = "blank" | "zero" | "over24" | "invalid" | "both";

export type DurationParse =
  | { ok: true; minutes: number }
  | { ok: false; problem: DurationProblem };

/**
 * Decimal hours or hours-and-minutes.
 * "6.5" → 390. "6" + "30" → 390. "24" → 1440. "0" is a zero, not a blank.
 */
export function parseDurationInput(hoursText: string, minutesText: string): DurationParse {
  const hours = hoursText.trim();
  const minutes = minutesText.trim();
  if (hours === "" && minutes === "") return { ok: false, problem: "blank" };

  const hoursHasDecimal = hours.includes(".");
  if (hoursHasDecimal && minutes !== "" && Number(minutes) !== 0) {
    return { ok: false, problem: "both" };
  }

  let total = 0;
  if (hours !== "") {
    if (!/^\d+(\.\d{1,4})?$/.test(hours)) return { ok: false, problem: "invalid" };
    const [whole, frac = ""] = hours.split(".");
    if (frac.length === 0) {
      total += Number(whole) * 60;
    } else {
      const scale = 10 ** frac.length;
      const n = Number(whole + frac);
      total += roundDiv(n * 60, scale);
    }
  }

  if (!hoursHasDecimal && minutes !== "") {
    if (!/^\d{1,2}$/.test(minutes)) return { ok: false, problem: "invalid" };
    const m = Number(minutes);
    if (m > 59) return { ok: false, problem: "invalid" };
    total += m;
  }

  if (total === 0) return { ok: false, problem: "zero" };
  if (total > 1440) return { ok: false, problem: "over24" };
  return { ok: true, minutes: total };
}

/** Clock difference. Equal times are invalid. End before start crosses midnight. */
export function clockDurationMinutes(start: number, end: number): number | null {
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (start < 0 || start > 1439 || end < 0 || end > 1439) return null;
  if (start === end) return null;
  if (end > start) return end - start;
  return end + 1440 - start;
}

export function clockToMinutes(
  hourText: string,
  minuteText: string,
  ampm: "am" | "pm",
): number | null {
  if (!/^\d{1,2}$/.test(hourText.trim()) || !/^\d{1,2}$/.test(minuteText.trim())) return null;
  let h = Number(hourText.trim());
  const m = Number(minuteText.trim());
  if (h < 1 || h > 12 || m < 0 || m > 59) return null;
  if (ampm === "am") {
    if (h === 12) h = 0;
  } else if (h !== 12) {
    h += 12;
  }
  return h * 60 + m;
}

export function minutesToClock(mins: number): { hour: string; minute: string; ampm: "am" | "pm" } {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm: "am" | "pm" = h24 >= 12 ? "pm" : "am";
  let h = h24 % 12;
  if (h === 0) h = 12;
  return { hour: String(h), minute: m.toString().padStart(2, "0"), ampm };
}
