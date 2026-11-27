import { APPEARANCE_STEP_COPY } from "./appearanceTour";

export type TourStep = {
  id: string;
  target: string;
  href: string;
  title: string;
  body: string;
};

/** Coach marks on the real screens, in the order Michael walks them. */
export const TOUR_STEPS: TourStep[] = [
  {
    id: "shift",
    target: "log-shift",
    href: "/(tabs)",
    title: "Log a shift",
    body: "This is where a shift starts. Hours, wage, tips, and tip-out. Take-home updates while you type.",
  },
  {
    id: "mark",
    target: "goal-mark",
    href: "/(tabs)",
    title: "Weekly goal",
    body: "The mark in the top right fills toward this week’s goal. Tap it to set the amount. The style is chosen in Settings.",
  },
  {
    id: "camera",
    target: "scan-stub",
    href: "/(tabs)",
    title: "Pay stub camera",
    body: "The camera at the top left is where a pay stub scan starts. Next is a sample snap. The real camera stays off, and nothing is saved.",
  },
  {
    id: "stub-demo",
    target: "stub-demo",
    href: "/(tabs)",
    title: "A sample scan",
    body: "A made-up stub, a quick scan, then the fields. Example only.",
  },
  {
    id: "pace",
    target: "pace-line",
    href: "/(tabs)",
    title: "Pace line",
    body: "This line compares the week so far with a usual week at the same point. It needs a couple of earlier weeks before it has a pace.",
  },
  {
    id: "budget",
    target: "budget-tab",
    href: "/(tabs)/budget",
    title: "Budget",
    body: "Bills, spending, and what’s left after a slow week. It works even if you never log a tip.",
  },
  {
    id: "appearance",
    target: "appearance",
    href: "/(tabs)/settings",
    title: APPEARANCE_STEP_COPY.title,
    body: APPEARANCE_STEP_COPY.body,
  },
];

export type TourAction = "next" | "get-started" | "replay";

export function shouldShowWelcome(seen: boolean): boolean {
  return !seen;
}

/**
 * First launch is Welcome, then the tour or Skip, then profile setup.
 * A later visit with a profile opens the tabs. A later visit with no profile opens setup.
 */
export function firstLaunch(welcomeSeen: boolean, hasProfile: boolean): "/welcome" | "/onboarding" | "/(tabs)" {
  if (!welcomeSeen) return "/welcome";
  if (!hasProfile) return "/onboarding";
  return "/(tabs)";
}

/** Where Skip, and Get started at the end of the tour, go. Profile setup is after the tour. */
export function appEntry(hasProfile: boolean): "/(tabs)" | "/onboarding" {
  return hasProfile ? "/(tabs)" : "/onboarding";
}

/** Steps before the last show only Next. The last step ends or restarts. */
export function tourControls(index: number, stepCount: number): { next: boolean; getStarted: boolean; replay: boolean } {
  const last = index >= stepCount - 1;
  return { next: !last, getStarted: last, replay: last };
}

export function stepAfter(index: number, stepCount: number, action: TourAction): { index: number; finished: boolean } {
  if (action === "get-started") return { index, finished: true };
  if (action === "replay") return { index: 0, finished: false };
  const next = index + 1;
  if (next >= stepCount) return { index, finished: false };
  return { index: next, finished: false };
}
