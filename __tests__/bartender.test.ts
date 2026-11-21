import { createMemoryWebDatabase } from "../src/db/webStore";
import { effectivePosture } from "../src/domain/roleDefaults";
import type { Profile, Role } from "../src/domain/types";
import { applyRole, createDraft, prepareShift } from "../src/features/shift/model";
import { createProfile, listRoles, updateRole } from "../src/repo/webRepository";
import { defaultAppearance } from "../src/ui/appearance";

const profile: Profile = {
  id: "p",
  name: "Bar",
  defaultWageCents: 1500,
  weekStartsOn: 3,
  lunchCutoffMinutes: 16 * 60,
  doubleThresholdMinutes: 8 * 60,
  lastRoleId: null,
  appearance: defaultAppearance(),
  weeklyGoalCents: null,
  showTipJar: true,
  goalIndicator: "jar",
  tipJarCelebratedWeek: null,
  payPeriodStartsOn: 5,
  payPeriodWeeks: 1,
  createdAt: "",
  updatedAt: "",
};

function role(partial: Partial<Role> & Pick<Role, "name" | "posture">): Role {
  return {
    id: "r",
    profileId: "p",
    defaultWageCents: null,
    tipOutSettlement: "cash",
    sortOrder: 0,
    tipOutDefaults: [],
    ...partial,
  };
}

describe("bartender tip-out default", () => {
  test("a new profile’s bartender both pays and receives, and the server still only tips out", async () => {
    const db = createMemoryWebDatabase();
    const profileId = await createProfile(db, { name: "Bar", wageCents: 1500, weekStartsOn: 3, usualRoleName: "Bartender" });
    const roles = await listRoles(db, profileId);
    expect(roles.find((item) => item.name === "Bartender")?.posture).toBe("both");
    expect(roles.find((item) => item.name === "Server")?.posture).toBe("tips_out");
    const bartender = roles.find((item) => item.name === "Bartender")!;
    const draft = applyRole(createDraft({ ...profile, id: profileId, lastRoleId: bartender.id }, [bartender], "2026-11-20"), bartender, { ...profile, id: profileId });
    expect(draft.tipOutOpen).toBe(true);
    expect(draft.tipShareOpen).toBe(true);
  });

  test("an untouched bartender opens both fields, and a saved choice is left alone", () => {
    const stock = role({ name: "Bartender", posture: "receives_share" });
    expect(effectivePosture(stock)).toBe("both");
    const opened = applyRole(createDraft(profile, [stock], "2026-11-20"), stock, profile);
    expect(opened.tipOutOpen).toBe(true);
    expect(opened.tipShareOpen).toBe(true);

    const chosen = role({ name: "Bartender", posture: "receives_share", tipOutCustomized: true });
    expect(effectivePosture(chosen)).toBe("receives_share");
    const kept = applyRole(createDraft(profile, [chosen], "2026-11-20"), chosen, profile);
    expect(kept.tipOutOpen).toBe(false);
    expect(kept.tipShareOpen).toBe(true);

    const server = role({ name: "Server", posture: "tips_out" });
    const serverDraft = applyRole(createDraft(profile, [server], "2026-11-20"), server, profile);
    expect(serverDraft.tipOutOpen).toBe(true);
    expect(serverDraft.tipShareOpen).toBe(false);
  });

  test("saving the bartender role keeps the posture the user picked", async () => {
    const db = createMemoryWebDatabase();
    const profileId = await createProfile(db, { name: "Bar", wageCents: 1500, weekStartsOn: 3, usualRoleName: "Server" });
    const bartender = (await listRoles(db, profileId)).find((item) => item.name === "Bartender")!;
    await updateRole(db, bartender.id, {
      name: "Bartender",
      posture: "receives_share",
      defaultWageCents: null,
      tipOutSettlement: "cash",
      tipOutDefaults: [],
    });
    const saved = (await listRoles(db, profileId)).find((item) => item.name === "Bartender")!;
    expect(saved.posture).toBe("receives_share");
    expect(saved.tipOutCustomized).toBe(true);
  });

  test("Other has no tip-out preset, and a percent the user saved is what the next shift reuses", async () => {
    const db = createMemoryWebDatabase();
    const profileId = await createProfile(db, { name: "Bar", wageCents: 1500, weekStartsOn: 3, usualRoleName: "Other" });
    const roles = await listRoles(db, profileId);
    const other = roles.find((item) => item.name === "Other");
    expect(other?.posture).toBe("both");
    expect(other?.tipOutDefaults).toEqual([]);
    const fresh = createDraft({ ...profile, id: profileId, lastRoleId: other!.id }, roles, "2026-11-20");
    expect(fresh.wageText).toBe("");
    expect(fresh.tipOutOpen).toBe(true);
    expect(fresh.tipShareOpen).toBe(true);
    expect(fresh.tipOutLines[0]?.percentText).toBe("");
    expect(fresh.tipOutLines[0]?.amountText).toBe("");
    fresh.hoursText = "8";
    fresh.wageText = "15";
    const prepared = prepareShift(fresh, { ...profile, id: profileId }, roles, "2026-11-20");
    expect(prepared.errors.filter((line) => /tip|sales/i.test(line))).toEqual([]);
    expect(prepared.write).not.toBeNull();

    await updateRole(db, other!.id, {
      name: "Other",
      posture: "both",
      defaultWageCents: null,
      tipOutSettlement: "cash",
      tipOutDefaults: [{ label: null, kind: "percent_of_sales", amountCents: null, basisPoints: 500 }],
    });
    const saved = (await listRoles(db, profileId)).find((item) => item.name === "Other")!;
    const again = createDraft({ ...profile, id: profileId, lastRoleId: saved.id }, [saved], "2026-11-20");
    expect(again.tipOutLines[0]?.percentText).toBe("5");
    expect(again.wageText).toBe("");
  });

  test("busser and host only receive tip-out until that role is edited", async () => {
    const db = createMemoryWebDatabase();
    const profileId = await createProfile(db, { name: "Floor", wageCents: 1500, weekStartsOn: 3, usualRoleName: "Busser" });
    const roles = await listRoles(db, profileId);
    const busser = roles.find((item) => item.name === "Busser")!;
    const host = roles.find((item) => item.name === "Host")!;
    expect(busser.posture).toBe("receives_share");
    expect(host.posture).toBe("receives_share");
    expect(roles.find((item) => item.name === "Bartender")?.posture).toBe("both");
    expect(roles.find((item) => item.name === "Other")?.posture).toBe("both");

    const busserShift = createDraft({ ...profile, id: profileId, lastRoleId: busser.id }, roles, "2026-11-21");
    expect(busserShift.tipOutOpen).toBe(false);
    expect(busserShift.tipShareOpen).toBe(true);
    const hostShift = createDraft({ ...profile, id: profileId, lastRoleId: host.id }, roles, "2026-11-21");
    expect(hostShift.tipOutOpen).toBe(false);
    expect(hostShift.tipShareOpen).toBe(true);

    await updateRole(db, host.id, {
      name: "Host",
      posture: "both",
      defaultWageCents: null,
      tipOutSettlement: "cash",
      tipOutDefaults: [],
    });
    const edited = (await listRoles(db, profileId)).find((item) => item.name === "Host")!;
    expect(edited.posture).toBe("both");
    expect(edited.tipOutCustomized).toBe(true);
    const editedShift = createDraft({ ...profile, id: profileId, lastRoleId: edited.id }, [edited], "2026-11-21");
    expect(editedShift.tipOutOpen).toBe(true);
    expect(editedShift.tipShareOpen).toBe(true);
  });
});
