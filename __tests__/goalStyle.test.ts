import { goalAccessLabel, goalPercent, resolveGoalStyle } from "../src/calc/goalStyle";
import { createMemoryWebDatabase } from "../src/db/webStore";
import { createProfile, getProfile, updateProfile } from "../src/repo/webRepository";

describe("weekly goal styles", () => {
  test("percent stays between 0 and 100, and an unset goal has no percent", () => {
    expect(goalPercent(0, 80000)).toBe(0);
    expect(goalPercent(-500, 80000)).toBe(0);
    expect(goalPercent(49600, 80000)).toBe(62);
    expect(goalPercent(120000, 80000)).toBe(100);
    expect(goalPercent(5000, null)).toBeNull();
    expect(goalPercent(5000, 0)).toBeNull();
    expect(goalAccessLabel(null)).toBe("Weekly goal, not set");
    expect(goalAccessLabel(62)).toBe("62% of weekly goal");
    expect(goalAccessLabel(0)).toBe("0% of weekly goal");
  });

  test("the chosen mark is saved on the profile and remembered after reload", async () => {
    const db = createMemoryWebDatabase();
    const id = await createProfile(db, { name: "Home", wageCents: 1500, weekStartsOn: 3, usualRoleName: "Other" });
    expect((await getProfile(db, id))?.goalIndicator).toBe("jar");
    await updateProfile(db, id, { goalIndicator: "ring" });
    const stored = await db.read((state) => state);
    const reloaded = createMemoryWebDatabase(structuredClone(stored));
    expect((await getProfile(reloaded, id))?.goalIndicator).toBe("ring");
    expect((await getProfile(reloaded, id))?.showTipJar).toBe(true);
    await updateProfile(db, id, { goalIndicator: "off" });
    expect((await getProfile(db, id))?.goalIndicator).toBe("off");
    expect((await getProfile(db, id))?.showTipJar).toBe(false);
    expect(resolveGoalStyle(undefined, false)).toBe("off");
    expect(resolveGoalStyle(undefined, true)).toBe("jar");
    expect(resolveGoalStyle("nope", true)).toBe("jar");
  });
});
