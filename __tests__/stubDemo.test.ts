import { STUB_DEMO_NUMBERS, stubDemoFrame, stubDemoLines, stubDemoShows } from "../src/welcome/stubDemo";

const fs = require("fs") as { readFileSync: (file: string, encoding: "utf8") => string };

describe("pay stub tour demo", () => {
  test("the sample snap fills hours, gross, taxes, and net, then matches the shifts", () => {
    expect(STUB_DEMO_NUMBERS.hours * STUB_DEMO_NUMBERS.wageCents).toBe(STUB_DEMO_NUMBERS.grossCents);
    expect(STUB_DEMO_NUMBERS.grossCents - STUB_DEMO_NUMBERS.taxCents).toBe(STUB_DEMO_NUMBERS.netCents);
    expect(stubDemoFrame(0, false)).toBe("snap");
    expect(stubDemoFrame(500, false)).toBe("scan");
    expect(stubDemoFrame(1200, false)).toBe("hours");
    expect(stubDemoShows("hours")).toMatchObject({ review: true, hours: true, gross: false, match: false });
    expect(stubDemoFrame(0, true)).toBe("match");
    expect(stubDemoShows("match").match).toBe(true);
    expect(stubDemoLines()).toEqual({
      hours: "32.0",
      gross: "$528.00",
      taxes: "$79.20",
      net: "$448.80",
      check: "Matches your shifts",
    });
  });

  test("the demo screen does not open a camera or save a stub", () => {
    const screen = fs.readFileSync("src/ui/StubScanDemo.tsx", "utf8");
    const script = fs.readFileSync("src/welcome/stubDemo.ts", "utf8");
    expect(screen).toContain("Example");
    expect(script).toContain("Matches your shifts");
    expect(screen + script).not.toMatch(/expo-camera|ImagePicker|createPayStub|launchCamera|getUserMedia|mediaDevices|saveBudget/);
  });
});