import type { Meal } from "../calc/classify";
import type { HoursMode, Settlement, TipOutKind, TipShareMode, TipsMode } from "../calc/shift";

export type Posture = "tips_out" | "receives_share" | "both";
export type Appearance = "system" | "light" | "dark";

export type TipOutDefault = {
  id: string;
  label: string | null;
  kind: TipOutKind;
  amountCents: number | null;
  basisPoints: number | null;
  sortOrder: number;
};

export type Role = {
  id: string;
  profileId: string;
  name: string;
  posture: Posture;
  defaultWageCents: number | null;
  tipOutSettlement: Settlement;
  sortOrder: number;
  tipOutDefaults: TipOutDefault[];
};

export type Profile = {
  id: string;
  name: string;
  defaultWageCents: number;
  weekStartsOn: number;
  lunchCutoffMinutes: number;
  doubleThresholdMinutes: number;
  lastRoleId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TipOutLineRecord = {
  id: string;
  label: string | null;
  kind: TipOutKind;
  basisPoints: number | null;
  amountCents: number;
  sortOrder: number;
};

export type TipShareLineRecord = {
  id: string;
  label: string | null;
  amountCents: number;
  sortOrder: number;
};

export type ShiftRecord = {
  id: string;
  profileId: string;
  roleId: string | null;
  roleName: string;
  shiftDate: string;
  hoursMode: HoursMode;
  startMinutes: number | null;
  endMinutes: number | null;
  durationMinutes: number;
  wageCents: number;
  tipsMode: TipsMode;
  tipsTotalCents: number | null;
  cashTipsCents: number | null;
  cardTipsCents: number | null;
  salesCents: number | null;
  tipShareMode: TipShareMode;
  mealOverride: Meal | null;
  doubleOverride: 0 | 1 | null;
  tipOutSettlement: Settlement;
  notes: string | null;
  guestTipsCents: number;
  tipShareCents: number;
  grossTipsCents: number;
  tipOutTotalCents: number;
  wageEarningsCents: number;
  netTipsCents: number;
  takeHomeCents: number;
  createdAt: string;
  updatedAt: string;
  tipOutLines: TipOutLineRecord[];
  tipShareLines: TipShareLineRecord[];
};

export type { HoursMode, Meal, Settlement, TipOutKind, TipShareMode, TipsMode };
