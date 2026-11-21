export const GOAL_STYLES = ["off", "jar", "ring", "gauge", "thermometer", "cash", "bar", "cup", "battery"] as const;

export type GoalStyle = (typeof GOAL_STYLES)[number];

export const GOAL_STYLE_LABELS: Record<GoalStyle, string> = {
  off: "Off",
  jar: "Tip jar",
  ring: "Ring",
  gauge: "Fuel gauge",
  thermometer: "Thermometer",
  cash: "Stack of cash",
  bar: "Plain bar",
  cup: "Coffee cup",
  battery: "Battery",
};

/** A stored choice wins. Older profiles only had the tip jar on or off. */
export function resolveGoalStyle(stored: unknown, showTipJar: boolean): GoalStyle {
  if (typeof stored === "string" && (GOAL_STYLES as readonly string[]).includes(stored)) return stored as GoalStyle;
  return showTipJar ? "jar" : "off";
}

/** 0–100 when a goal is set. Null when there is no goal. Never past 100. */
export function goalPercent(takeHomeCents: number, goalCents: number | null): number | null {
  if (goalCents == null || goalCents <= 0) return null;
  if (!Number.isFinite(takeHomeCents) || takeHomeCents <= 0) return 0;
  return Math.round(Math.min(1, takeHomeCents / goalCents) * 100);
}

export function goalAccessLabel(percent: number | null): string {
  if (percent == null) return "Weekly goal, not set";
  return `${percent}% of weekly goal`;
}
