import { formatClock } from "./format";
import type { ShiftRecord } from "../domain/types";

/** Whole cents to "12.34" without going through floating point. */
export function centsToPlain(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)}.${(abs % 100).toString().padStart(2, "0")}`;
}

/**
 * Quotes a cell when needed, and defuses spreadsheet formulas: a note that
 * starts with = + - or @ would otherwise run when the CSV is opened in Excel or Sheets.
 */
export function csvCell(value: string): string {
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export const SHIFT_CSV_HEADER =
  "date,role,start,end,minutes,wage_per_hour,guest_tips,tip_share,tip_out,wage_earnings,take_home,notes";

/** Oldest first, so the file reads like a notebook. All money in dollars. */
export function shiftsToCsv(shifts: ShiftRecord[]): string {
  const sorted = [...shifts].sort((a, b) => a.shiftDate.localeCompare(b.shiftDate) || a.createdAt.localeCompare(b.createdAt));
  const lines = [SHIFT_CSV_HEADER];
  for (const shift of sorted) {
    lines.push(
      [
        shift.shiftDate,
        csvCell(shift.roleName),
        shift.startMinutes === null ? "" : formatClock(shift.startMinutes),
        shift.endMinutes === null ? "" : formatClock(shift.endMinutes),
        String(shift.durationMinutes),
        centsToPlain(shift.wageCents),
        centsToPlain(shift.guestTipsCents),
        centsToPlain(shift.tipShareCents),
        centsToPlain(shift.tipOutTotalCents),
        centsToPlain(shift.wageEarningsCents),
        centsToPlain(shift.takeHomeCents),
        csvCell(shift.notes ?? ""),
      ].join(","),
    );
  }
  return lines.join("\n");
}
