import { createMemoryWebDatabase } from "../src/db/webStore";
import { readWelcomeSeen, markWelcomeSeen } from "../src/repo/welcomeState";
import { deleteAllData } from "../src/repo/webRepository";
import { TOUR_STEPS, appEntry, shouldShowWelcome, stepAfter } from "../src/welcome/tour";

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

  test("skip and done leave the tour from any step, and next walks to the end", () => {
    expect(TOUR_STEPS.map((step) => step.id)).toEqual(["shift", "jar", "pace", "camera", "budget", "appearance"]);
    expect(stepAfter(2, TOUR_STEPS.length, "skip")).toEqual({ index: 2, finished: true });
    expect(stepAfter(0, TOUR_STEPS.length, "done")).toEqual({ index: 0, finished: true });
    expect(stepAfter(4, TOUR_STEPS.length, "done")).toEqual({ index: 4, finished: true });
    expect(stepAfter(0, TOUR_STEPS.length, "next")).toEqual({ index: 1, finished: false });
    expect(stepAfter(TOUR_STEPS.length - 1, TOUR_STEPS.length, "next")).toEqual({ index: TOUR_STEPS.length - 1, finished: true });
    expect(stepAfter(0, TOUR_STEPS.length, "back")).toEqual({ index: 0, finished: false });
    expect(stepAfter(3, TOUR_STEPS.length, "back")).toEqual({ index: 2, finished: false });
    expect(appEntry(false)).toBe("/onboarding");
    expect(appEntry(true)).toBe("/(tabs)");
  });
});
