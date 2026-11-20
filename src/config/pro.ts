/**
 * Pro is unlocked while Michael is testing.
 * TODO: RevenueCat / StoreKit / Play Billing. There is no purchase code yet.
 */
export const PRO_UNLOCKED_FOR_TESTING = true;

export const PRO_PRICES = {
  month: "$2.99/month",
  year: "$19.99/year",
  lifetime: "$39.99 lifetime",
};

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
