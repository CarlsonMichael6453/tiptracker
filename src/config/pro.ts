/**
 * Pro is unlocked while Michael is testing.
 * TODO: RevenueCat / StoreKit / Play Billing. There is no purchase code yet.
 */
export const PRO_UNLOCKED_FOR_TESTING = true;

/** The only place plan prices are written. Screens read these strings. */
export const PRO_PRICES = {
  month: "$2.99/month",
  year: "$19.99/year",
  lifetime: "$39.99 lifetime",
};

export const FREE_FEATURES = [
  "Shift logging",
  "Wages, tips, and tip-outs",
  "Tip jar and progress styles",
  "Pace line",
  "Pay stub scanner",
  "2 savings goals",
  "Baseline budget",
  "Up to 8 bills",
  "Cash wallet",
  "Tax jar",
  "Up to 6 envelopes",
  "Left after bills",
];

export const PRO_FEATURES: { name: string; detail: string }[] = [
  { name: "Safe to spend", detail: "One number for this week, with each subtraction spelled out." },
  { name: "Cash-flow calendar", detail: "Bills against payday, with a warning when a week may not clear." },
  { name: "Slow-week buffer", detail: "Extra from a good week is kept for a short one." },
  { name: "Sinking funds", detail: "A yearly bill is split into a weekly set-aside." },
  { name: "Work expenses", detail: "Gas, meals, and uniforms come out of real take-home and the hourly rate." },
  { name: "No caps", detail: "Bills, envelopes, and savings goals are not limited." },
  { name: "CSV report", detail: "A copyable list of bills, spends, and cash." },
];

export function isPro(): boolean {
  return PRO_UNLOCKED_FOR_TESTING;
}

export type LimitedKind = "bills" | "envelopes" | "goals";

const FREE_LIMITS: Record<LimitedKind, number> = {
  bills: 8,
  envelopes: 6,
  goals: 2,
};

export function limitFor(kind: LimitedKind, pro = isPro()): number {
  return pro ? Number.POSITIVE_INFINITY : FREE_LIMITS[kind];
}

export function canAdd(kind: LimitedKind, count: number, pro = isPro()): boolean {
  return count < limitFor(kind, pro);
}
