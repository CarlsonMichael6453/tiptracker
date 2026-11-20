import type { BaselineMode, BudgetBill } from "../calc/budget";

export type BudgetEnvelope = { id: string; name: string; weeklyCents: number };

export type BudgetSpend = {
  id: string;
  envelopeId: string | null;
  name: string;
  cents: number;
  date: string;
  work: boolean;
  category: string;
};

export type CashChip = {
  id: string;
  shiftId: string | null;
  cents: number;
  deposited: boolean;
  date: string;
};

export type TaxSetAside = { id: string; weekStart: string; cents: number };

export type BudgetLedger = {
  profileId: string;
  baselineMode: BaselineMode;
  floorCents: number;
  taxBps: number;
  bufferCents: number;
  reminders: boolean;
  bills: BudgetBill[];
  envelopes: BudgetEnvelope[];
  spends: BudgetSpend[];
  cash: CashChip[];
  taxEntries: TaxSetAside[];
};

export function emptyBudget(profileId: string): BudgetLedger {
  return {
    profileId,
    baselineMode: "percentile",
    floorCents: 40000,
    taxBps: 1500,
    bufferCents: 0,
    reminders: false,
    bills: [],
    envelopes: [],
    spends: [],
    cash: [],
    taxEntries: [],
  };
}
