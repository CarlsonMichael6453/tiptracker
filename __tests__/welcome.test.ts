import { createMemoryWebDatabase } from "../src/db/webStore";
import { readWelcomeSeen, markWelcomeSeen } from "../src/repo/welcomeState";
import { deleteAllData } from "../src/repo/webRepository";
import {
  APPEARANCE_STEP_COPY,
  APPEARANCE_TOUR_MS,
  APPEARANCE_TOUR_PAIRS,
  appearanceTourIndex,
  appearanceTourScrollAnimated,
  clampTourRect,
  REPLAY_TOUR_LABEL,
  scrollYToWindowTarget,
} from "../src/welcome/appearanceTour";
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
    expect(appearance?.body).toBe("This is Settings, where you can change the layout, colors, fonts, and more.");
    expect(appearance?.href).toBe("/(tabs)/settings");
    expect(appearance?.target).toBe("appearance");
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
    expect(APPEARANCE_TOUR_MS).toBe(1100);
    expect(APPEARANCE_TOUR_PAIRS.map((pair) => [pair.colorTheme, pair.font])).toEqual([
      ["sunset", "fredoka"],
      ["mint", "nunito"],
      ["neon", "comic-neue"],
      ["bubblegum", "source-serif"],
    ]);
    expect(appearanceTourIndex(0, false)).toBe(0);
    expect(appearanceTourIndex(APPEARANCE_TOUR_MS - 1, false)).toBe(0);
    expect(appearanceTourIndex(APPEARANCE_TOUR_MS, false)).toBe(1);
    expect(appearanceTourIndex(APPEARANCE_TOUR_MS * 2, false)).toBe(2);
    expect(appearanceTourIndex(APPEARANCE_TOUR_MS * 3, false)).toBe(3);
    expect(appearanceTourIndex(APPEARANCE_TOUR_MS * 4, false)).toBe(null);
    expect(appearanceTourIndex(0, true)).toBe(null);
  });

  test("the last tour step scrolls to fonts and colors, and jumps when motion is reduced", () => {
    expect(appearanceTourScrollAnimated(false)).toBe(true);
    expect(appearanceTourScrollAnimated(true)).toBe(false);
    expect(scrollYToWindowTarget(0, 800, 72)).toBe(728);
    expect(scrollYToWindowTarget(400, 72, 72)).toBe(400);
    expect(scrollYToWindowTarget(40, 10, 72)).toBe(0);
    const hole = clampTourRect({ x: 16, y: -80, width: 300, height: 900 }, 390, 700);
    expect(hole).toEqual({ x: 8, y: 0, w: 316, h: 700 });
    expect(clampTourRect({ x: 20, y: 800, width: 100, height: 40 }, 390, 700)).toBeNull();
  });
});
