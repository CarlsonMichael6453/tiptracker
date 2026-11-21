export type TourStep = {
  id: string;
  title: string;
  body: string;
};

/** Short walkthrough. Plain words, no artwork. */
export const TOUR_STEPS: TourStep[] = [
  {
    id: "shift",
    title: "Log a shift",
    body: "On Home, Log shift is the main button. Enter the hours, the wage, the tips, and who you tipped out. Take-home updates while you type.",
  },
  {
    id: "jar",
    title: "Tip jar",
    body: "The jar in the top right fills toward a weekly take-home goal. Tap it to set the goal or turn the jar off. The goal is separate from what you already logged.",
  },
  {
    id: "pace",
    title: "Pace line",
    body: "Under this week’s card, one line compares how you’re doing with a usual week at the same point. It needs a couple of earlier weeks before it has a pace to show.",
  },
  {
    id: "camera",
    title: "Pay stub camera",
    body: "The camera at the top left scans a pay stub and lines it up with the shifts you logged. You review it before anything is saved. The scanner stays free.",
  },
  {
    id: "budget",
    title: "Budget",
    body: "The Budget tab is for weeks that aren’t the same size. It keeps a slow-week baseline, the bills due this pay period, a tax jar, and what’s left after those bills.",
  },
  {
    id: "appearance",
    title: "Appearance",
    body: "Settings, then Appearance. Pick a font and a color theme. The choice is saved on this profile and used on every screen.",
  },
];

export type TourMove = "next" | "back" | "skip" | "done";

export function shouldShowWelcome(seen: boolean): boolean {
  return !seen;
}

/** Where Skip on the welcome page goes. A profile already on the device opens the tabs. */
export function appEntry(hasProfile: boolean): "/(tabs)" | "/onboarding" {
  return hasProfile ? "/(tabs)" : "/onboarding";
}

export function stepAfter(index: number, stepCount: number, move: TourMove): { index: number; finished: boolean } {
  if (move === "skip" || move === "done") return { index, finished: true };
  if (move === "back") return { index: Math.max(0, index - 1), finished: false };
  if (index + 1 >= stepCount) return { index, finished: true };
  return { index: index + 1, finished: false };
}
