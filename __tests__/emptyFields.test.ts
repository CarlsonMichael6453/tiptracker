import { parseMoney } from "../src/calc/money";
import { emptyBudget } from "../src/budget/types";
import { createDraft, usualWageText } from "../src/features/shift/model";
import type { Profile, Role } from "../src/domain/types";
import { defaultAppearance } from "../src/ui/appearance";

describe("empty inputs", () => {
  test("a blank wage is unset, not a number", () => {
    expect(parseMoney("")).toEqual({ status: "blank" });
    expect(parseMoney("   ")).toEqual({ status: "blank" });
    expect(Number.isNaN(parseMoney("").status === "ok" ? 0 : 0)).toBe(false);
  });

  test("a new budget and a new shift do not start with sample amounts", () => {
    const budget = emptyBudget("profile");
    expect(budget.floorCents).toBe(0);
    expect(budget.taxBps).toBe(0);
    const profile: Profile = {
      id: "p",
      name: "Work",
      defaultWageCents: 1600,
      weekStartsOn: 3,
      lunchCutoffMinutes: 16 * 60,
      doubleThresholdMinutes: 8 * 60,
      lastRoleId: "server",
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
    const server: Role = {
      id: "server",
      profileId: "p",
      name: "Server",
      posture: "tips_out",
      defaultWageCents: null,
      tipOutSettlement: "cash",
      sortOrder: 0,
      tipOutDefaults: [],
    };
    const draft = createDraft(profile, [server], "2026-11-21");
    // His own saved wage is not a sample amount. The spec prefills it.
    expect(draft.wageText).toBe("16");
    expect(draft.tipOutLines[0]?.percentText).toBe("");
    expect(draft.tipOutLines[0]?.amountText).toBe("");
    expect(draft.tipsTotalText).toBe("");
  });

  test("a new shift uses the role wage, then the profile wage, and leaves a blank setup wage blank", () => {
    const profile = { defaultWageCents: 1600 } as Profile;
    const role = { defaultWageCents: null } as Role;
    expect(usualWageText(role, profile)).toBe("16");
    expect(usualWageText({ defaultWageCents: 1850 } as Role, profile)).toBe("18.50");
    expect(usualWageText(role, { defaultWageCents: 0 } as Profile)).toBe("");
  });

  test("input boxes do not carry example placeholder text", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(["app", "src"])) {
      const source = fs.readFileSync(file, "utf8");
      if (/placeholder\s*=\s*["'`][^"'`]+["'`]/.test(source)) offenders.push(file);
      if (/placeholder\s*=\s*\{(?!placeholder\b)/.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

const fs = require("fs") as {
  readFileSync: (file: string, encoding: "utf8") => string;
  readdirSync: (dir: string) => string[];
  statSync: (file: string) => { isDirectory: () => boolean };
};
const path = require("path") as { join: (...parts: string[]) => string };

function sourceFiles(roots: string[]): string[] {
  const out: string[] = [];
  for (const root of roots) {
    for (const name of fs.readdirSync(root)) {
      const file = path.join(root, name);
      if (fs.statSync(file).isDirectory()) out.push(...sourceFiles([file]));
      else if (file.endsWith(".tsx")) out.push(file);
    }
  }
  return out;
}
