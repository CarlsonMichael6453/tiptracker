import type { Meal } from "../calc/classify";
import type { HoursMode, Settlement, TipOutKind, TipShareMode, TipsMode } from "../calc/shift";

export type Posture = "tips_out" | "receives_share" | "both";
export type Appearance = "system" | "light" | "dark";
export type AppearanceStyle =
  | "light"
  | "dark"
  | "polka"
  | "gradient"
  | "twotone"
  | "stripes"
  | "waves"
  | "checker"
  | "confetti"
  | "radial"
  | "stars"
  | "bokeh"
  | "plaid"
  | "mesh";
export type DecorativeStyle = Exclude<AppearanceStyle, "light" | "dark">;
export type ColorPair = [string, string];
export type AppearanceSettings = {
  style: AppearanceStyle;
  /** Colors this profile picked, newest first. Capped. */
  recent: string[];
  /** Moves only the backdrop. Off until this profile turns it on. */
  animateBackground: boolean;
  /** Open-source font. System is the default. */
  font: string;
  /** Named color theme. System keeps light/dark and the existing backgrounds. */
  colorTheme: string;
} & Record<DecorativeStyle, ColorPair>;

export type GoalHorizon = "short" | "long";
export type GoalStatus = "active" | "complete" | "archived";
export type GoalEntryKind = "set_aside" | "add" | "withdraw" | "adjust" | "skip";

export type SavingsGoal = {
  id: string;
  profileId: string;
  name: string;
  targetCents: number;
  targetDate: string | null;
  horizon: GoalHorizon;
  weeklySetAsideCents: number;
  savedCents: number;
  status: GoalStatus;
  celebrated: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GoalEntry = {
  id: string;
  goalId: string;
  kind: GoalEntryKind;
  amountCents: number;
  weekStart: string | null;
  createdAt: string;
};

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
  appearance: AppearanceSettings;
  /** Weekly take-home goal in cents. Null until they set one. */
  weeklyGoalCents: number | null;
  showTipJar: boolean;
  /** Week-start date of the last 100% celebration, so it plays once per week. */
  tipJarCelebratedWeek: string | null;
  /** Weekday the pay period starts. Separate from the dashboard week. Default Friday. */
  payPeriodStartsOn: number;
  /** 1 = weekly, 2 = every two weeks. */
  payPeriodWeeks: 1 | 2;
  createdAt: string;
  updatedAt: string;
};

export type PayStub = {
  id: string;
  profileId: string;
  periodStart: string;
  periodEnd: string;
  payDate: string | null;
  regularMinutes: number;
  overtimeMinutes: number;
  hourlyRateCents: number;
  grossWagesCents: number;
  cashTipsCents: number;
  cardTipsCents: number;
  grossPayCents: number;
  otherDeductionsCents: number;
  netPayCents: number;
  taxes: { name: string; cents: number }[];
  confidence: Record<string, number>;
  photoDataUrl: string | null;
  createdAt: string;
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
