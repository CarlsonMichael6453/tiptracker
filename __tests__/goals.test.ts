jest.mock("expo-crypto", () => ({
  randomUUID: () => `goal-${Math.random().toString(16).slice(2)}`,
}));

import { addDays } from "../src/calc/dates";
import { goalPace } from "../src/calc/goals";
import { createMemoryWebDatabase } from "../src/db/webStore";
import { addGoalEntry, createGoal, getGoal, listGoalEntries, updateGoal } from "../src/repo/goals";
import * as web from "../src/repo/webRepository";
import {
  goalFill,
  nextBalance,
  setAsidePending,
  suggestHorizon,
  weeksUntil,
} from "../src/calc/goals";

const today = "2026-11-18";
const weekStartsOn = 3;

describe("savings goal progress", () => {
  test("half saved is 50 percent with the rest still to go", () => {
    const progress = goalFill(5000, 10000);
    expect(progress.fill).toBeCloseTo(0.5);
    expect(progress.percent).toBe(50);
    expect(progress.remainingCents).toBe(5000);
    expect(progress.met).toBe(false);
  });

  test("reaching the target fills the bar and does not pass 100 percent", () => {
    const progress = goalFill(12000, 10000);
    expect(progress.fill).toBe(1);
    expect(progress.percent).toBe(100);
    expect(progress.remainingCents).toBe(0);
    expect(progress.met).toBe(true);
  });
});

describe("horizon suggestion", () => {
  test("a date inside about three months suggests short-term", () => {
    expect(suggestHorizon(addDays(today, 30), today)).toBe("short");
    expect(suggestHorizon(today, today)).toBe("short");
  });

  test("a later date suggests long-term, and no date suggests nothing", () => {
    expect(suggestHorizon(addDays(today, 200), today)).toBe("long");
    expect(suggestHorizon(null, today)).toBeNull();
  });
});

describe("pace needed", () => {
  test("about $95 a week across ten weeks, and the set-aside is on track", () => {
    const target = addDays(today, 63);
    expect(weeksUntil(today, target, weekStartsOn)).toBe(10);
    const pace = goalPace({
      savedCents: 0,
      targetCents: 95000,
      targetDate: target,
      today,
      weekStartsOn,
      weeklySetAsideCents: 10000,
    });
    expect(pace.weeklyNeededCents).toBe(9500);
    expect(pace.paceLine).toContain("About $95/week to hit it by");
    expect(pace.onTrack).toBe(true);
    expect(pace.trackLine).toBe("This week’s set-aside is on track");
  });

  test("a smaller set-aside is short of the pace", () => {
    const pace = goalPace({
      savedCents: 0,
      targetCents: 95000,
      targetDate: addDays(today, 63),
      today,
      weekStartsOn,
      weeklySetAsideCents: 5000,
    });
    expect(pace.onTrack).toBe(false);
    expect(pace.trackLine).toBe("Set-aside is short of that pace");
  });

  test("raising the target asks for more per week right away", () => {
    const low = goalPace({
      savedCents: 0,
      targetCents: 95000,
      targetDate: addDays(today, 63),
      today,
      weekStartsOn,
      weeklySetAsideCents: 10000,
    });
    const high = goalPace({
      savedCents: 0,
      targetCents: 190000,
      targetDate: addDays(today, 63),
      today,
      weekStartsOn,
      weeklySetAsideCents: 10000,
    });
    expect(high.weeklyNeededCents).toBe(19000);
    expect(low.onTrack).toBe(true);
    expect(high.onTrack).toBe(false);
  });

  test("no date has no pace, and a reached goal says so", () => {
    expect(
      goalPace({
        savedCents: 1000,
        targetCents: 5000,
        targetDate: null,
        today,
        weekStartsOn,
        weeklySetAsideCents: 500,
      }).paceLine,
    ).toBeNull();
    expect(
      goalPace({
        savedCents: 5000,
        targetCents: 5000,
        targetDate: addDays(today, 63),
        today,
        weekStartsOn,
        weeklySetAsideCents: 0,
      }).paceLine,
    ).toBe("Goal reached");
  });

  test("a passed date says so", () => {
    const pace = goalPace({
      savedCents: 1000,
      targetCents: 5000,
      targetDate: addDays(today, -3),
      today,
      weekStartsOn,
      weeklySetAsideCents: 5000,
    });
    expect(pace.paceLine).toContain("The date has passed");
    expect(pace.onTrack).toBe(false);
  });
});

describe("weekly set-aside", () => {
  const week = "2026-11-18";

  test("an active goal with no answer this week is waiting", () => {
    expect(setAsidePending([], week, 4000, "active")).toBe(true);
  });

  test("confirming or skipping this week clears the prompt", () => {
    expect(setAsidePending([{ kind: "set_aside", amountCents: 4000, weekStart: week }], week, 4000, "active")).toBe(false);
    expect(setAsidePending([{ kind: "skip", amountCents: 0, weekStart: week }], week, 4000, "active")).toBe(false);
  });

  test("a completed goal and a zero set-aside are not prompted", () => {
    expect(setAsidePending([], week, 4000, "complete")).toBe(false);
    expect(setAsidePending([], week, 0, "active")).toBe(false);
  });

  test("money only moves when an entry is applied", () => {
    expect(nextBalance(1000, "set_aside", 4000)).toBe(5000);
    expect(nextBalance(1000, "add", 2500)).toBe(3500);
    expect(nextBalance(1000, "withdraw", 400)).toBe(600);
    expect(nextBalance(1000, "withdraw", 5000)).toBe(0);
    expect(nextBalance(1000, "adjust", -300)).toBe(700);
    expect(nextBalance(1000, "adjust", -5000)).toBe(0);
    expect(nextBalance(1000, "skip", 0)).toBe(1000);
  });

  test("confirming a set-aside stores history, and editing the target recalculates the pace", async () => {
    const db = createMemoryWebDatabase();
    const profileId = await web.createProfile(db, {
      name: "Olive Garden",
      wageCents: 1650,
      weekStartsOn: 3,
      usualRoleName: "Server",
    });
    const id = await createGoal(db, {
      profileId,
      name: "New phone",
      targetCents: 20000,
      targetDate: addDays(today, 63),
      horizon: "short",
      weeklySetAsideCents: 4000,
    });
    const saved = await addGoalEntry(db, id, { kind: "set_aside", amountCents: 4000, weekStart: today });
    expect(saved?.savedCents).toBe(4000);
    expect((await listGoalEntries(db, id)).map((entry) => entry.kind)).toEqual(["set_aside"]);
    const edited = await updateGoal(db, id, { targetCents: 80000, weeklySetAsideCents: 2000 });
    const pace = goalPace({
      savedCents: edited?.savedCents ?? 0,
      targetCents: edited?.targetCents ?? 0,
      targetDate: edited?.targetDate ?? null,
      today,
      weekStartsOn,
      weeklySetAsideCents: edited?.weeklySetAsideCents ?? 0,
    });
    expect((await getGoal(db, id))?.targetCents).toBe(80000);
    expect(pace.onTrack).toBe(false);
    expect(pace.paceLine).toContain("/week");
    await web.deleteAllData(db);
    expect(await getGoal(db, id)).toBeNull();
  });
});
