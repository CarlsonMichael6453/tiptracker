import { createMemoryWebDatabase } from "../src/db/webStore";
import { readWelcomeSeen, markWelcomeSeen } from "../src/repo/welcomeState";
import { deleteAllData } from "../src/repo/webRepository";
import { TOUR_STEPS, appEntry, shouldShowWelcome, stepAfter, tourControls } from "../src/welcome/tour";

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

  test("next advances, and the last step offers Get started and Replay tutorial", () => {
    expect(TOUR_STEPS.map((step) => step.id)).toEqual(["shift", "mark", "camera", "pace", "budget", "appearance"]);
    expect(tourControls(0, TOUR_STEPS.length)).toEqual({ next: true, getStarted: false, replay: false });
    expect(tourControls(4, TOUR_STEPS.length)).toEqual({ next: true, getStarted: false, replay: false });
    expect(tourControls(TOUR_STEPS.length - 1, TOUR_STEPS.length)).toEqual({ next: false, getStarted: true, replay: true });
    expect(stepAfter(0, TOUR_STEPS.length, "next")).toEqual({ index: 1, finished: false });
    expect(stepAfter(4, TOUR_STEPS.length, "next")).toEqual({ index: 5, finished: false });
    expect(stepAfter(TOUR_STEPS.length - 1, TOUR_STEPS.length, "next")).toEqual({ index: TOUR_STEPS.length - 1, finished: false });
    expect(stepAfter(5, TOUR_STEPS.length, "get-started")).toEqual({ index: 5, finished: true });
    expect(stepAfter(5, TOUR_STEPS.length, "replay")).toEqual({ index: 0, finished: false });
    expect(stepAfter(2, TOUR_STEPS.length, "replay")).toEqual({ index: 0, finished: false });
    expect(appEntry(false)).toBe("/onboarding");
    expect(appEntry(true)).toBe("/(tabs)");
  });
});
