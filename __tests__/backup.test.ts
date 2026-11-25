jest.mock("expo-crypto", () => ({
  randomUUID: () => `id-${Math.random().toString(16).slice(2)}`,
}));

import { emptyBudget } from "../src/budget/types";
import { backupFilename, parseBackup, shiftTotals } from "../src/calc/backup";
import { computeShift } from "../src/calc/shift";
import { createMemoryWebDatabase } from "../src/db/webStore";
import { exportBackup, importBackup } from "../src/repo/backup";
import { createGoal, listGoalEntries, listGoals, addGoalEntry } from "../src/repo/goals";
import { saveBudget, getBudget } from "../src/repo/budget";
import { createPayStub, listPayStubs } from "../src/repo/payStubs";
import {
  countAll,
  createProfile,
  deleteAllData,
  getActiveProfileId,
  getAppearance,
  listRoles,
  listShifts,
  saveNewShift,
  setAppearance,
  type ShiftWrite,
} from "../src/repo/repository";

function shiftWrite(profileId: string, roleId: string, over: Partial<ShiftWrite> & { shiftDate: string; snapshotTips: number; salesCents: number }): ShiftWrite {
  const snapshot = computeShift({
    durationMinutes: 390,
    wageCents: 1650,
    tipsMode: "total",
    tipsTotalCents: over.snapshotTips,
    cashTipsCents: null,
    cardTipsCents: null,
    salesCents: over.salesCents,
    tipShareMode: "none",
    tipShareTotalCents: null,
    tipShareLines: [],
    tipOutLines: [{ label: null, kind: "percent_of_sales", basisPoints: 400, amountCents: null }],
    settlement: "cash",
  });
  return {
    profileId,
    roleId,
    roleName: "Server",
    shiftDate: over.shiftDate,
    hoursMode: "clock",
    startMinutes: 16 * 60,
    endMinutes: 22 * 60 + 30,
    wageCents: 1650,
    saveUsualWage: false,
    tipsMode: "total",
    tipsTotalCents: over.snapshotTips,
    cashTipsCents: null,
    cardTipsCents: null,
    salesCents: over.salesCents,
    tipShareMode: "none",
    mealOverride: null,
    doubleOverride: null,
    tipOutSettlement: "cash",
    notes: over.notes ?? null,
    saveUsualTipOut: false,
    usualTipOut: [],
    snapshot,
    tipShareLines: [],
  };
}

async function seed() {
  const db = createMemoryWebDatabase();
  const profileId = await createProfile(db, {
    name: "Olive Garden",
    wageCents: 1650,
    weekStartsOn: 3,
    usualRoleName: "Server",
  });
  const extraId = await createProfile(db, {
    name: "Side gig",
    wageCents: 2000,
    weekStartsOn: 0,
    usualRoleName: "Bartender",
  });
  await setAppearance(db, "dark");
  const server = (await listRoles(db, profileId)).find((role) => role.name === "Server");
  if (!server) throw new Error("missing server role");
  const bartender = (await listRoles(db, extraId)).find((role) => role.name === "Bartender");
  if (!bartender) throw new Error("missing bartender role");

  await saveNewShift(db, shiftWrite(profileId, server.id, { shiftDate: "2026-11-20", snapshotTips: 18000, salesCents: 110000, notes: "Busy Friday" }));
  await saveNewShift(db, shiftWrite(profileId, server.id, { shiftDate: "2026-11-21", snapshotTips: 9000, salesCents: 60000, notes: "=SUM(A1)" }));
  await saveNewShift(db, {
    ...shiftWrite(extraId, bartender.id, { shiftDate: "2026-11-22", snapshotTips: 4000, salesCents: 20000 }),
    roleName: "Bartender",
    hoursMode: "duration",
    startMinutes: null,
    endMinutes: null,
  });

  const goalId = await createGoal(db, {
    profileId,
    name: "New shoes",
    targetCents: 8000,
    targetDate: "2026-12-20",
    horizon: "short",
    weeklySetAsideCents: 2000,
  });
  await addGoalEntry(db, goalId, { kind: "add", amountCents: 2500, weekStart: "2026-11-19" });

  await saveBudget(db, {
    ...emptyBudget(profileId),
    floorCents: 40000,
    taxBps: 1500,
    reminders: true,
    bills: [{ id: "bill-rent", name: "Rent", amountCents: 90000, frequency: "monthly", dueDay: 1, dueMonth: null, sinking: false }],
    envelopes: [{ id: "env-gas", name: "Gas", weeklyCents: 4000 }],
    spends: [{ id: "sp-1", envelopeId: "env-gas", name: "Shell", cents: 3200, date: "2026-11-21", work: true, category: "gas" }],
    cash: [{ id: "cash-1", shiftId: null, cents: 4500, deposited: false, date: "2026-11-21" }],
    taxEntries: [{ id: "tax-1", weekStart: "2026-11-19", cents: 1500 }],
  });

  await createPayStub(db, {
    profileId,
    periodStart: "2026-11-07",
    periodEnd: "2026-11-20",
    payDate: "2026-11-21",
    regularMinutes: 2400,
    overtimeMinutes: 0,
    hourlyRateCents: 1650,
    grossWagesCents: 66000,
    cashTipsCents: 8000,
    cardTipsCents: 19000,
    grossPayCents: 93000,
    otherDeductionsCents: 2000,
    netPayCents: 72000,
    taxes: [{ name: "FIT", cents: 8000 }],
    confidence: { net: 0.9 },
    photoDataUrl: null,
  });

  const shifts = [
    ...(await listShifts(db, profileId)),
    ...(await listShifts(db, extraId)),
  ];
  return { db, profileId, extraId, shifts, totals: shiftTotals(shifts) };
}

describe("JSON backup parse", () => {
  test("rejects empty text, plain JSON, and a CSV export", () => {
    expect(parseBackup("").ok).toBe(false);
    const invalid = parseBackup("{");
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error).toMatch(/not a Tip Tracker backup/i);
    expect(parseBackup('{"hello":"world"}').ok).toBe(false);
    expect(parseBackup("date,role,start\n2026-11-20,Server,5:00pm").ok).toBe(false);
  });

  test("rejects a newer version and a shift with no matching profile", async () => {
    const { db } = await seed();
    const json = await exportBackup(db);
    const newer = JSON.parse(json) as { version: number };
    newer.version = 2;
    const newerResult = parseBackup(JSON.stringify(newer));
    expect(newerResult.ok).toBe(false);
    if (!newerResult.ok) expect(newerResult.error).toMatch(/newer/i);

    const broken = JSON.parse(json) as { shifts: { profileId: string }[] };
    broken.shifts[0]!.profileId = "missing-profile";
    const brokenResult = parseBackup(JSON.stringify(broken));
    expect(brokenResult.ok).toBe(false);
    if (!brokenResult.ok) expect(brokenResult.error).toMatch(/shift/i);
  });

  test("names a backup file with the local date", () => {
    expect(backupFilename(new Date(2026, 10, 25))).toBe("tip-tracker-backup-2026-11-25.json");
  });
});

describe("JSON backup restore", () => {
  test("export, wipe everything, then import gives identical shift totals", async () => {
    const { db, profileId, extraId, totals } = await seed();
    const json = await exportBackup(db);
    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.format).toBe("tiptracker-backup");
    expect(parsed.backup.version).toBe(1);
    expect(parsed.backup.profiles).toHaveLength(2);
    expect(parsed.backup.budgets[0]?.bills).toHaveLength(1);
    expect(parsed.backup.goals).toHaveLength(1);

    await deleteAllData(db);
    expect(await countAll(db)).toEqual({ profiles: 0, shifts: 0 });

    const imported = await importBackup(db, json);
    expect(imported.ok).toBe(true);

    const restored = [
      ...(await listShifts(db, profileId)),
      ...(await listShifts(db, extraId)),
    ];
    expect(shiftTotals(restored)).toEqual(totals);
    expect(restored).toHaveLength(3);
    const byDate = restored.slice().sort((a, b) => a.shiftDate.localeCompare(b.shiftDate));
    expect(byDate.map((shift) => shift.shiftDate)).toEqual(["2026-11-20", "2026-11-21", "2026-11-22"]);
    expect(byDate[1]?.notes).toBe("=SUM(A1)");
    expect(await getActiveProfileId(db)).toBe(extraId);
    expect(await getAppearance(db)).toBe("dark");

    const goals = await listGoals(db, profileId);
    expect(goals).toHaveLength(1);
    expect(goals[0]?.name).toBe("New shoes");
    expect(goals[0]?.savedCents).toBe(2500);
    expect(await listGoalEntries(db, goals[0]!.id)).toHaveLength(1);

    const budget = await getBudget(db, profileId);
    expect(budget.floorCents).toBe(40000);
    expect(budget.bills[0]?.name).toBe("Rent");
    expect(budget.envelopes[0]?.name).toBe("Gas");
    expect(budget.spends[0]?.cents).toBe(3200);
    expect(budget.cash[0]?.cents).toBe(4500);
    expect(budget.taxEntries[0]?.cents).toBe(1500);

    const stubs = await listPayStubs(db, profileId);
    expect(stubs).toHaveLength(1);
    expect(stubs[0]?.netPayCents).toBe(72000);

    const friday = restored.find((shift) => shift.shiftDate === "2026-11-20");
    expect(friday?.tipOutLines).toHaveLength(1);
    expect(friday?.tipOutLines[0]?.kind).toBe("percent_of_sales");
  });

  test("an invalid file leaves the current shifts in place", async () => {
    const { db, profileId, totals } = await seed();
    const before = await listShifts(db, profileId);
    const result = await importBackup(db, "not a backup");
    expect(result.ok).toBe(false);
    const after = await listShifts(db, profileId);
    expect(shiftTotals(after)).toEqual(shiftTotals(before));
    expect(shiftTotals(after).count).toBeGreaterThan(0);
    expect(totals.count).toBeGreaterThan(shiftTotals(after).count);
  });
});
