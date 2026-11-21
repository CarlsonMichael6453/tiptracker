import { computeShift } from "../src/calc/shift";
import { createMemoryWebDatabase } from "../src/db/webStore";
import * as web from "../src/repo/webRepository";
import type { ShiftWrite } from "../src/repo/repository";

describe("browser ledger", () => {
  test("a saved shift is still there after the document is reloaded", async () => {
    const db = createMemoryWebDatabase();
    const profileId = await web.createProfile(db, {
      name: "Olive Garden",
      wageCents: 1650,
      weekStartsOn: 3,
      usualRoleName: "Server",
    });
    const roles = await web.listRoles(db, profileId);
    const server = roles.find((role) => role.name === "Server");
    expect(server?.tipOutDefaults).toEqual([]);
    expect(server?.tipOutSettlement).toBe("cash");
    const profile = await web.getProfile(db, profileId);
    expect(profile?.weekStartsOn).toBe(3);

    const snapshot = computeShift({
      durationMinutes: 390,
      wageCents: 1650,
      tipsMode: "split",
      tipsTotalCents: null,
      cashTipsCents: 4000,
      cardTipsCents: 14000,
      salesCents: 120000,
      tipShareMode: "none",
      tipShareTotalCents: null,
      tipShareLines: [],
      tipOutLines: [{ label: null, kind: "percent_of_sales", basisPoints: 400, amountCents: null }],
      settlement: "cash",
    });
    const write: ShiftWrite = {
      profileId,
      roleId: server!.id,
      roleName: "Server",
      shiftDate: "2025-11-14",
      hoursMode: "clock",
      startMinutes: 16 * 60,
      endMinutes: 22 * 60 + 30,
      wageCents: 1650,
      saveUsualWage: false,
      tipsMode: "split",
      tipsTotalCents: null,
      cashTipsCents: 4000,
      cardTipsCents: 14000,
      salesCents: 120000,
      tipShareMode: "none",
      mealOverride: null,
      doubleOverride: null,
      tipOutSettlement: "cash",
      notes: null,
      saveUsualTipOut: false,
      usualTipOut: [],
      snapshot,
      tipShareLines: [],
    };
    const shiftId = await web.saveNewShift(db, write);
    const stored = await db.read((state) => state);
    const reloaded = createMemoryWebDatabase(structuredClone(stored));
    const shifts = await web.listShifts(reloaded, profileId);
    expect(shifts).toHaveLength(1);
    expect(shifts[0]?.id).toBe(shiftId);
    expect(shifts[0]?.takeHomeCents).toBe(23925);
    expect(shifts[0]?.tipOutTotalCents).toBe(4800);
    expect(await web.getActiveProfileId(reloaded)).toBe(profileId);
  });

  test("deleting a role keeps the name on old shifts", async () => {
    const db = createMemoryWebDatabase();
    const profileId = await web.createProfile(db, {
      name: "Olive Garden",
      wageCents: 1650,
      weekStartsOn: 3,
      usualRoleName: "Server",
    });
    const server = (await web.listRoles(db, profileId)).find((role) => role.name === "Server");
    await web.saveNewShift(db, {
      profileId,
      roleId: server!.id,
      roleName: "Server",
      shiftDate: "2025-11-14",
      hoursMode: "duration",
      startMinutes: null,
      endMinutes: null,
      wageCents: 1650,
      saveUsualWage: false,
      tipsMode: "total",
      tipsTotalCents: 0,
      cashTipsCents: null,
      cardTipsCents: null,
      salesCents: null,
      tipShareMode: "none",
      mealOverride: null,
      doubleOverride: null,
      tipOutSettlement: "cash",
      notes: null,
      saveUsualTipOut: false,
      usualTipOut: [],
      snapshot: computeShift({
        durationMinutes: 60,
        wageCents: 1650,
        tipsMode: "total",
        tipsTotalCents: 0,
        cashTipsCents: null,
        cardTipsCents: null,
        salesCents: null,
        tipShareMode: "none",
        tipShareTotalCents: null,
        tipShareLines: [],
        tipOutLines: [],
        settlement: "cash",
      }),
      tipShareLines: [],
    });
    await web.deleteRole(db, server!.id);
    const [shift] = await web.listShifts(db, profileId);
    expect(shift?.roleId).toBeNull();
    expect(shift?.roleName).toBe("Server");
  });

  test("two roles cannot share a name", async () => {
    const db = createMemoryWebDatabase();
    const profileId = await web.createProfile(db, {
      name: "Olive Garden",
      wageCents: 1650,
      weekStartsOn: 3,
      usualRoleName: "Server",
    });
    await expect(
      web.createRole(db, {
        profileId,
        name: "server",
        posture: "tips_out",
        defaultWageCents: null,
        tipOutSettlement: "cash",
        tipOutDefaults: [],
      }),
    ).rejects.toThrow(/unique/i);
  });
});
