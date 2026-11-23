import { addDays, MONTH_SHORT } from "../calc/dates";

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

/** Monthly and yearly start with this many free days. Lifetime does not. */
export const TRIAL_DAYS = 7;

export const TRIAL_CANCEL_NOTE = "You can cancel in your phone’s subscription settings.";

export const PURCHASE_COMING_SOON = "Purchases coming soon, Pro is unlocked for testing";

export type ProPlan = "month" | "year" | "lifetime";

export function planHasTrial(plan: ProPlan): plan is "month" | "year" {
  return plan === "month" || plan === "year";
}

/** “Nov 30”, with no year. */
export function formatTrialDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  const name = MONTH_SHORT[(month ?? 0) - 1];
  if (!name || !day) throw new Error(`Not a civil date: ${iso}`);
  return `${name} ${day}`;
}

export function trialChargeDate(today: string, days = TRIAL_DAYS): string {
  return addDays(today, days);
}

export function trialOffer(plan: "month" | "year", today: string): string {
  const when = formatTrialDate(trialChargeDate(today));
  return `Free for ${TRIAL_DAYS} days, then ${PRO_PRICES[plan]}. Cancel anytime before ${when} and you won’t be charged.`;
}

export function planButtonLabel(plan: ProPlan): string {
  if (plan === "lifetime") return `Buy ${PRO_PRICES.lifetime}`;
  return `Try ${TRIAL_DAYS} days free`;
}

export function lifetimePurchaseNote(): string {
  return `One payment, ${PRO_PRICES.lifetime}. No trial on a one-time purchase.`;
}

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
