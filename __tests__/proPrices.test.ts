import { FREE_FEATURES, PRO_FEATURES, PRO_PRICES } from "../src/config/pro";

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
