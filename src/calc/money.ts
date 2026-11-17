/**
 * Integer division for a non-negative numerator. Half away from zero.
 * `d/2` is integer division, matching the spec.
 */
export function roundDiv(n: number, d: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(d)) {
    throw new Error("roundDiv requires integers");
  }
  if (d <= 0) {
    throw new Error("roundDiv denominator must be positive");
  }
  if (n < 0) {
    throw new Error("roundDiv numerator must be non-negative");
  }
  return Math.floor((n + Math.floor(d / 2)) / d);
}

/** Half away from zero, for rates that can be negative. */
export function roundDivSigned(n: number, d: number): number {
  if (n < 0) return -roundDiv(-n, d);
  return roundDiv(n, d);
}

/** Cents per hour. Blank when the shift length is 0 minutes. */
export function centsPerHour(cents: number, minutes: number): number | null {
  if (minutes === 0) return null;
  return roundDivSigned(cents * 60, minutes);
}

export type MoneyParse =
  | { status: "blank" }
  | { status: "ok"; cents: number }
  | { status: "negative" }
  | { status: "invalid" };

export function parseMoney(text: string): MoneyParse {
  const t = text.trim().replace(/\$/g, "").replace(/,/g, "");
  if (t === "") return { status: "blank" };
  if (t.startsWith("-")) return { status: "negative" };
  if (!/^\d+(\.\d{0,2})?$/.test(t) || t.endsWith(".")) return { status: "invalid" };
  const [whole, frac = ""] = t.split(".");
  const padded = (frac + "00").slice(0, 2);
  const cents = Number(whole) * 100 + Number(padded);
  if (!Number.isSafeInteger(cents)) return { status: "invalid" };
  return { status: "ok", cents };
}

export type PercentParse =
  | { status: "blank" }
  | { status: "ok"; basisPoints: number }
  | { status: "negative" }
  | { status: "invalid" };

/** "4" → 400, "2.5" → 250, "4.25" → 425. Does not cap at 100%. */
export function parsePercent(text: string): PercentParse {
  const t = text.trim().replace(/%$/, "");
  if (t === "") return { status: "blank" };
  if (t.startsWith("-")) return { status: "negative" };
  if (!/^\d+(\.\d{0,2})?$/.test(t) || t.endsWith(".")) return { status: "invalid" };
  const [whole, frac = ""] = t.split(".");
  const padded = (frac + "00").slice(0, 2);
  const basisPoints = Number(whole) * 100 + Number(padded);
  if (!Number.isSafeInteger(basisPoints)) return { status: "invalid" };
  return { status: "ok", basisPoints };
}
