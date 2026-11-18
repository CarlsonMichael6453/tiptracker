import { paceReport, goalProgress, speakMoney } from "../src/calc/tipJar";

const today = "2026-11-19";
const weekStartsOn = 3;

describe("goal progress", () => {
  test("no goal leaves the jar empty", () => {
    expect(goalProgress(52000, null)).toEqual({
      hasGoal: false,
      takeHomeCents: 52000,
      goalCents: null,
      fill: 0,
      remainingCents: null,
      met: false,
    });
  });

  test("$520 of an $800 goal is 65% with $280 left", () => {
    const progress = goalProgress(52000, 80000);
    expect(progress.fill).toBeCloseTo(0.65);
    expect(progress.remainingCents).toBe(28000);
    expect(progress.met).toBe(false);
    expect(speakMoney(52000)).toBe("$520");
    expect(speakMoney(80000)).toBe("$800");
  });

  test("a goal that is already met fills the jar and does not go past it", () => {
    const progress = goalProgress(90000, 80000);
    expect(progress.fill).toBe(1);
    expect(progress.remainingCents).toBe(0);
    expect(progress.met).toBe(true);
  });

  test("negative take-home does not fill the jar", () => {
    const progress = goalProgress(-1000, 80000);
    expect(progress.fill).toBe(0);
    expect(progress.met).toBe(false);
    expect(progress.remainingCents).toBe(81000);
  });
});

describe("pace", () => {
  test("fewer than two earlier weeks has no pace yet", () => {
    const report = paceReport({
      today,
      weekStartsOn,
      goalCents: null,
      shifts: [
        { shiftDate: "2026-11-18", takeHomeCents: 20000 },
        { shiftDate: "2026-11-11", takeHomeCents: 20000 },
      ],
    });
    expect(report.comparableWeeks).toBe(1);
    expect(report.paceLine).toBe("Log a couple of weeks to see your pace");
    expect(report.goalLine).toBeNull();
  });

  test("$60 ahead of the same point in earlier weeks", () => {
    const report = paceReport({
      today,
      weekStartsOn,
      goalCents: null,
      shifts: [
        { shiftDate: "2026-11-18", takeHomeCents: 20000 },
        { shiftDate: "2026-11-19", takeHomeCents: 16000 },
        { shiftDate: "2026-11-11", takeHomeCents: 15000 },
        { shiftDate: "2026-11-12", takeHomeCents: 15000 },
        { shiftDate: "2026-11-13", takeHomeCents: 40000 },
        { shiftDate: "2026-11-04", takeHomeCents: 15000 },
        { shiftDate: "2026-11-05", takeHomeCents: 15000 },
      ],
    });
    expect(report.offset).toBe(1);
    expect(report.takeHomeCents).toBe(36000);
    expect(report.averageCents).toBe(30000);
    expect(report.deltaCents).toBe(6000);
    expect(report.paceLine).toBe("$60 ahead of your usual week");
  });

  test("a short Thursday says what Friday can do", () => {
    const report = paceReport({
      today,
      weekStartsOn,
      goalCents: null,
      shifts: [
        { shiftDate: "2026-11-19", takeHomeCents: 20000 },
        { shiftDate: "2026-11-12", takeHomeCents: 30000 },
        { shiftDate: "2026-11-05", takeHomeCents: 30000 },
      ],
    });
    expect(report.paceLine).toBe("$100 behind your average Thursday-to-date, a good Friday catches you up");
  });

  test("within $5 of the usual week is right on pace", () => {
    const report = paceReport({
      today,
      weekStartsOn,
      goalCents: null,
      shifts: [
        { shiftDate: "2026-11-19", takeHomeCents: 30500 },
        { shiftDate: "2026-11-12", takeHomeCents: 30000 },
        { shiftDate: "2026-11-05", takeHomeCents: 30000 },
      ],
    });
    expect(report.paceLine).toBe("Right on pace");
  });

  test("beating the last four comparable weeks is the best week in a month", () => {
    const report = paceReport({
      today,
      weekStartsOn,
      goalCents: null,
      shifts: [
        { shiftDate: "2026-11-19", takeHomeCents: 50000 },
        { shiftDate: "2026-11-12", takeHomeCents: 10000 },
        { shiftDate: "2026-11-05", takeHomeCents: 12000 },
        { shiftDate: "2026-10-29", takeHomeCents: 8000 },
        { shiftDate: "2026-10-22", takeHomeCents: 9000 },
      ],
    });
    expect(report.comparableWeeks).toBe(4);
    expect(report.paceLine).toBe("Best week in a month");
  });

  test("a week that only worked after this point does not count", () => {
    const report = paceReport({
      today,
      weekStartsOn,
      goalCents: null,
      shifts: [
        { shiftDate: "2026-11-19", takeHomeCents: 20000 },
        { shiftDate: "2026-11-13", takeHomeCents: 90000 },
        { shiftDate: "2026-11-05", takeHomeCents: 20000 },
        { shiftDate: "2026-10-29", takeHomeCents: 20000 },
      ],
    });
    expect(report.comparableWeeks).toBe(2);
    expect(report.paceLine).toBe("Right on pace");
  });

  test("Thursday at $400 of an $800 goal is on track", () => {
    const report = paceReport({
      today,
      weekStartsOn,
      goalCents: 80000,
      shifts: [{ shiftDate: "2026-11-19", takeHomeCents: 40000 }],
    });
    expect(report.goalLine).toBe("On track to hit $800");
    expect(report.progress.remainingCents).toBe(40000);
  });

  test("a slow start is behind the goal pace", () => {
    const report = paceReport({
      today,
      weekStartsOn,
      goalCents: 80000,
      shifts: [{ shiftDate: "2026-11-19", takeHomeCents: 10000 }],
    });
    expect(report.goalLine).toBe("Behind the pace for $800");
  });

  test("hitting the goal says so", () => {
    const report = paceReport({
      today,
      weekStartsOn,
      goalCents: 80000,
      shifts: [{ shiftDate: "2026-11-19", takeHomeCents: 80000 }],
    });
    expect(report.progress.met).toBe(true);
    expect(report.goalLine).toBe("You hit $800");
  });
});
