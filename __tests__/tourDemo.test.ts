import { createMemoryWebDatabase } from "../src/db/webStore";
import { baselineIncome, billsDueInPeriod, safeToSpend, taxJarCents } from "../src/calc/budget";
import { weekRange } from "../src/calc/dates";
import { paceReport } from "../src/calc/tipJar";
import { getBudget, saveBudget } from "../src/repo/budget";
import { createProfile, getProfile, listShifts } from "../src/repo/webRepository";
import {
  buildTourDemo,
  commitTourSafe,
  EXAMPLE_DATA_LABEL,
  homeSnapshot,
  isTourDemoPayload,
  runningAfter,
  TOUR_DEMO_PREFIX,
  TOUR_GUEST_PROFILE,
  viewWhileTouring,
} from "../src/welcome/tourDemo";

const TODAY = "2026-11-21";

describe("tour example data", () => {
  test("the sample week has shifts, a partial goal, a pace line, and a budget", () => {
    for (const weekStartsOn of [3, 6]) {
      const demo = buildTourDemo({ today: TODAY, weekStartsOn, profileId: "p1" });
      const week = weekRange(TODAY, weekStartsOn);
      const thisWeek = demo.shifts.filter((shift) => shift.shiftDate >= week.start && shift.shiftDate <= week.end);
      expect(thisWeek.length).toBeGreaterThanOrEqual(2);
      for (const shift of thisWeek) {
        expect(shift.roleName).toBe("Server");
        expect(shift.durationMinutes).toBeGreaterThan(0);
        expect(shift.wageCents).toBe(1650);
        expect(shift.guestTipsCents).toBeGreaterThan(0);
        expect(shift.tipOutTotalCents).toBeGreaterThan(0);
        expect(shift.id.startsWith(TOUR_DEMO_PREFIX)).toBe(true);
      }
      const home = homeSnapshot(demo.shifts, TODAY, weekStartsOn, demo.goalCents);
      expect(home.totals).not.toBeNull();
      expect(home.paceLine).toContain("ahead");
      expect(home.paceLine).not.toBe("Log a couple of weeks to see your pace");
      const progress = paceReport({
        today: TODAY,
        weekStartsOn,
        goalCents: demo.goalCents,
        shifts: demo.shifts.map((shift) => ({ shiftDate: shift.shiftDate, takeHomeCents: shift.takeHomeCents })),
      }).progress;
      expect(progress.fill).toBeGreaterThan(0);
      expect(progress.fill).toBeLessThan(1);
      expect(progress.met).toBe(false);

      expect(demo.budget.baselineMode).toBe("floor");
      expect(baselineIncome("floor", demo.budget.floorCents, [])).toBe(42000);
      expect(demo.budget.bills).toHaveLength(2);
      expect(demo.budget.envelopes.length).toBeGreaterThanOrEqual(3);
      expect(demo.budget.taxBps).toBe(1500);
      const due = billsDueInPeriod(demo.budget.bills, week.start, week.end);
      expect(due.length).toBeGreaterThan(0);
      const income = home.totals?.takeHomeCents ?? 0;
      const billCents = due.reduce((sum, bill) => sum + bill.amountCents, 0);
      const tax = taxJarCents(income, demo.budget.taxBps);
      expect(tax).toBeGreaterThan(0);
      const envelopes = demo.budget.envelopes.reduce((sum, envelope) => sum + envelope.weeklyCents, 0);
      const known = new Set(demo.budget.cash.map((chip) => chip.shiftId));
      const heldFromShifts = thisWeek
        .filter((shift) => (shift.cashTipsCents ?? 0) > 0 && !known.has(shift.id))
        .reduce((sum, shift) => sum + (shift.cashTipsCents ?? 0), 0);
      expect(heldFromShifts).toBeGreaterThan(0);
      expect(demo.budget.cash.every((chip) => chip.deposited)).toBe(true);
      const safe = safeToSpend({
        incomeCents: income,
        billsCents: billCents,
        taxCents: tax,
        goalSetAsideCents: 0,
        envelopeRemainingCents: envelopes,
      });
      expect(safe.leftCents).toBeGreaterThan(0);
    }
  });

  test("demo data never persists, and it is gone when the tour is not running", async () => {
    const db = createMemoryWebDatabase();
    const profileId = await createProfile(db, { name: "Home", wageCents: 0, weekStartsOn: 3, usualRoleName: "Server" });
    const demo = buildTourDemo({ today: TODAY, weekStartsOn: 3, profileId });
    const realShifts = await listShifts(db, profileId);
    const realBudget = await getBudget(db, profileId);

    expect(viewWhileTouring(true, realShifts, demo.shifts)).toBe(demo.shifts);
    expect(viewWhileTouring(true, realBudget, demo.budget).bills).toHaveLength(2);
    expect(EXAMPLE_DATA_LABEL).toBe("Example data");

    let writes = 0;
    const trySave = async (running: boolean) => {
      const wrote = await commitTourSafe(running, demo.budget, async () => {
        writes += 1;
        await saveBudget(db, demo.budget);
      });
      expect(wrote).toBe(false);
    };

    expect(runningAfter("replay")).toBe(true);
    expect(runningAfter("settings-replay")).toBe(true);
    await trySave(runningAfter("replay"));
    await trySave(runningAfter("settings-replay"));
    expect(viewWhileTouring(runningAfter("replay"), realShifts, demo.shifts)).toBe(demo.shifts);

    expect(runningAfter("get-started")).toBe(false);
    expect(runningAfter("reload")).toBe(false);
    await trySave(runningAfter("get-started"));
    await trySave(runningAfter("reload"));
    expect(viewWhileTouring(false, realShifts, demo.shifts)).toEqual([]);
    expect(viewWhileTouring(false, realBudget, demo.budget).bills).toEqual([]);

    expect(writes).toBe(0);
    expect(await listShifts(db, profileId)).toEqual([]);
    expect((await getBudget(db, profileId)).bills).toEqual([]);
    expect((await getBudget(db, profileId)).envelopes).toEqual([]);
    expect((await getBudget(db, profileId)).cash).toEqual([]);
    const profile = await getProfile(db, profileId);
    expect(profile?.weeklyGoalCents).toBeNull();
    expect(profile?.tipJarCelebratedWeek).toBeNull();
    const stored = JSON.stringify(await db.read((state) => state));
    expect(stored.includes(TOUR_DEMO_PREFIX)).toBe(false);
    expect(isTourDemoPayload(demo.budget)).toBe(true);
    expect(isTourDemoPayload(demo.shifts)).toBe(true);
    expect(isTourDemoPayload(TOUR_GUEST_PROFILE)).toBe(true);

    const real = { ...realBudget, floorCents: 1000, bills: [{ ...demo.budget.bills[0]!, id: "phone-real" }] };
    expect(isTourDemoPayload(real)).toBe(false);
    const wroteReal = await commitTourSafe(false, real, async () => {
      await saveBudget(db, real);
    });
    expect(wroteReal).toBe(true);
    expect((await getBudget(db, profileId)).floorCents).toBe(1000);
    expect((await getBudget(db, profileId)).bills.map((bill) => bill.id)).toEqual(["phone-real"]);
    expect(JSON.stringify(await db.read((state) => state)).includes(TOUR_DEMO_PREFIX)).toBe(false);
  });
});
