import { createMemoryWebDatabase } from "../src/db/webStore";
import { readWelcomeSeen, markWelcomeSeen } from "../src/repo/welcomeState";
import { deleteAllData } from "../src/repo/webRepository";
import { APPEARANCE_STEP_COPY, APPEARANCE_TOUR_PAIRS, appearanceTourIndex, REPLAY_TOUR_LABEL } from "../src/welcome/appearanceTour";
import { TOUR_STEPS, appEntry, firstLaunch, shouldShowWelcome, stepAfter, tourControls } from "../src/welcome/tour";

describe("welcome and tour", () => {
  test("the welcome page shows until it is marked seen, and it survives a reload", async () => {
    const db = createMemoryWebDatabase();
    expect(await readWelcomeSeen(db)).toBe(false);
    expect(shouldShowWelcome(false)).toBe(true);
    await markWelcomeSeen(db);
    expect(await readWelcomeSeen(db)).toBe(true);
    expect(shouldShowWelcome(true)).toBe(false);
    const stored = await db.read((state) => state);
    const reloaded = createMemoryWebDatabase(structuredClone(stored));
    expect(await readWelcomeSeen(reloaded)).toBe(true);
  });

  test("deleting everything shows the welcome page again", async () => {
    const db = createMemoryWebDatabase();
    await markWelcomeSeen(db);
    await deleteAllData(db);
    expect(await readWelcomeSeen(db)).toBe(false);
    expect(shouldShowWelcome(false)).toBe(true);
  });

  test("next advances, and the last step offers Get started and Replay tour", () => {
    expect(TOUR_STEPS.map((step) => step.id)).toEqual(["shift", "mark", "camera", "stub-demo", "pace", "budget", "appearance"]);
    const appearance = TOUR_STEPS[TOUR_STEPS.length - 1];
    expect(appearance?.title).toBe(APPEARANCE_STEP_COPY.title);
    expect(appearance?.body).toBe(APPEARANCE_STEP_COPY.body);
    expect(appearance?.body).not.toContain("goal");
    expect(REPLAY_TOUR_LABEL).toBe("Replay tour");
    expect(tourControls(0, TOUR_STEPS.length)).toEqual({ next: true, getStarted: false, replay: false });
    expect(tourControls(4, TOUR_STEPS.length)).toEqual({ next: true, getStarted: false, replay: false });
    expect(tourControls(TOUR_STEPS.length - 1, TOUR_STEPS.length)).toEqual({ next: false, getStarted: true, replay: true });
    expect(stepAfter(0, TOUR_STEPS.length, "next")).toEqual({ index: 1, finished: false });
    expect(stepAfter(2, TOUR_STEPS.length, "next").index).toBe(TOUR_STEPS.findIndex((step) => step.id === "stub-demo"));
    expect(stepAfter(TOUR_STEPS.length - 1, TOUR_STEPS.length, "next")).toEqual({ index: TOUR_STEPS.length - 1, finished: false });
    const last = TOUR_STEPS.length - 1;
    expect(stepAfter(last, TOUR_STEPS.length, "get-started")).toEqual({ index: last, finished: true });
    expect(stepAfter(last, TOUR_STEPS.length, "replay")).toEqual({ index: 0, finished: false });
    expect(stepAfter(2, TOUR_STEPS.length, "replay")).toEqual({ index: 0, finished: false });
    expect(appEntry(false)).toBe("/onboarding");
    expect(appEntry(true)).toBe("/(tabs)");
  });

  test("first launch is welcome, then the tour or skip, then profile setup", () => {
    expect(firstLaunch(false, false)).toBe("/welcome");
    expect(firstLaunch(false, true)).toBe("/welcome");
    expect(firstLaunch(true, false)).toBe("/onboarding");
    expect(firstLaunch(true, true)).toBe("/(tabs)");
    expect(appEntry(false)).toBe("/onboarding");
    expect(appEntry(true)).toBe("/(tabs)");
  });

  test("the appearance preview cycles four looks once, then stops", () => {
    expect(APPEARANCE_TOUR_PAIRS.map((pair) => [pair.colorTheme, pair.font])).toEqual([
      ["sunset", "fredoka"],
      ["mint", "nunito"],
      ["neon", "comic-neue"],
      ["bubblegum", "source-serif"],
    ]);
    expect(appearanceTourIndex(0, false)).toBe(0);
    expect(appearanceTourIndex(600, false)).toBe(1);
    expect(appearanceTourIndex(1200, false)).toBe(2);
    expect(appearanceTourIndex(1800, false)).toBe(3);
    expect(appearanceTourIndex(2400, false)).toBe(null);
    expect(appearanceTourIndex(0, true)).toBe(null);
  });
});
