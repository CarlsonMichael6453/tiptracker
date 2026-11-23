import {
  FREE_FEATURES,
  lifetimePurchaseNote,
  planButtonLabel,
  planHasTrial,
  PRO_FEATURES,
  PRO_PRICES,
  TRIAL_CANCEL_NOTE,
  TRIAL_DAYS,
  trialOffer,
} from "../src/config/pro";

const fs = require("fs") as {
  readFileSync: (file: string, encoding: "utf8") => string;
  readdirSync: (dir: string) => string[];
  statSync: (file: string) => { isDirectory: () => boolean };
};
const path = require("path") as { join: (...parts: string[]) => string };

describe("Pro prices", () => {
  test("the plan is $2.99, $19.99, and $39.99 lifetime, read from one config", () => {
    expect(PRO_PRICES).toEqual({
      month: "$2.99/month",
      year: "$19.99/year",
      lifetime: "$39.99 lifetime",
    });
    expect(FREE_FEATURES).toContain("Left after bills");
    expect(PRO_FEATURES.map((item) => item.name)).toContain("Safe to spend");
    const screen = fs.readFileSync("app/pro.tsx", "utf8");
    expect(screen).toContain("PRO_PRICES.month");
    expect(screen).toContain("PRO_PRICES.year");
    expect(screen).toContain("PRO_PRICES.lifetime");
    expect(screen).not.toMatch(/\$\d+\.\d{2}/);
    expect(screen).toContain("planButtonLabel");
    expect(screen).toContain("trialOffer");
  });

  test("monthly and yearly offer 7 free days, and the charge date is 7 days out", () => {
    expect(TRIAL_DAYS).toBe(7);
    expect(trialOffer("year", "2026-11-23")).toBe(
      "Free for 7 days, then $19.99/year. Cancel anytime before Nov 30 and you won’t be charged.",
    );
    expect(trialOffer("month", "2026-11-23")).toBe(
      "Free for 7 days, then $2.99/month. Cancel anytime before Nov 30 and you won’t be charged.",
    );
    expect(trialOffer("year", "2026-12-28")).toBe(
      "Free for 7 days, then $19.99/year. Cancel anytime before Jan 4 and you won’t be charged.",
    );
    expect(trialOffer("month", "2026-01-28")).toContain("Feb 4");
    expect(planButtonLabel("year")).toBe("Try 7 days free");
    expect(planButtonLabel("month")).toBe("Try 7 days free");
    expect(planHasTrial("year")).toBe(true);
    expect(planHasTrial("month")).toBe(true);
    expect(planHasTrial("lifetime")).toBe(false);
    expect(planButtonLabel("lifetime")).toBe("Buy $39.99 lifetime");
    expect(lifetimePurchaseNote()).toBe("One payment, $39.99 lifetime. No trial on a one-time purchase.");
    expect(TRIAL_CANCEL_NOTE).toBe("You can cancel in your phone’s subscription settings.");
  });

  test("no source file still says $24.99", () => {
    const hits: string[] = [];
    for (const file of sourceFiles(["app", "src", "__tests__"])) {
      const text = fs.readFileSync(file, "utf8");
      if (file.endsWith("proPrices.test.ts")) continue;
      if (text.includes("24." + "99")) hits.push(file);
    }
    expect(hits).toEqual([]);
  });
});

function sourceFiles(roots: string[]): string[] {
  const out: string[] = [];
  for (const root of roots) {
    for (const name of fs.readdirSync(root)) {
      if (name === "node_modules") continue;
      const file = path.join(root, name);
      if (fs.statSync(file).isDirectory()) out.push(...sourceFiles([file]));
      else if (/\.(ts|tsx)$/.test(file)) out.push(file);
    }
  }
  return out;
}
