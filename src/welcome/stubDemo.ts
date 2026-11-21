import { formatMoney } from "../calc/format";

/**
 * A made-up pay stub for the tour. No employer, no logo, and no camera.
 * 32 hours at $16.50 is $528.00 gross. Taxes of $79.20 leave $448.80 net.
 */
export const STUB_DEMO_NUMBERS = {
  hours: 32,
  wageCents: 1650,
  grossCents: 52800,
  taxCents: 7920,
  netCents: 44880,
};

export const STUB_DEMO_FRAMES = ["snap", "scan", "hours", "gross", "taxes", "net", "match"] as const;

export type StubDemoFrame = (typeof STUB_DEMO_FRAMES)[number];

const FRAME_AT: Record<StubDemoFrame, number> = {
  snap: 0,
  scan: 450,
  hours: 1100,
  gross: 1500,
  taxes: 1900,
  net: 2300,
  match: 2700,
};

export function stubDemoLines(): { hours: string; gross: string; taxes: string; net: string; check: string } {
  return {
    hours: STUB_DEMO_NUMBERS.hours.toFixed(1),
    gross: formatMoney(STUB_DEMO_NUMBERS.grossCents),
    taxes: formatMoney(STUB_DEMO_NUMBERS.taxCents),
    net: formatMoney(STUB_DEMO_NUMBERS.netCents),
    check: "Matches your shifts",
  };
}

/** Reduced motion jumps to the filled review. Otherwise the clock walks the frames. */
export function stubDemoFrame(elapsedMs: number, reduceMotion: boolean): StubDemoFrame {
  if (reduceMotion) return "match";
  let frame: StubDemoFrame = "snap";
  for (const name of STUB_DEMO_FRAMES) {
    if (elapsedMs >= FRAME_AT[name]) frame = name;
  }
  return frame;
}

export function stubDemoShows(frame: StubDemoFrame): {
  paper: boolean;
  scan: boolean;
  review: boolean;
  hours: boolean;
  gross: boolean;
  taxes: boolean;
  net: boolean;
  match: boolean;
} {
  const at = STUB_DEMO_FRAMES.indexOf(frame);
  const reached = (name: StubDemoFrame) => STUB_DEMO_FRAMES.indexOf(name) <= at;
  return {
    paper: frame === "snap" || frame === "scan",
    scan: frame === "scan",
    review: reached("hours"),
    hours: reached("hours"),
    gross: reached("gross"),
    taxes: reached("taxes"),
    net: reached("net"),
    match: reached("match"),
  };
}

/** 0 to 1 while the scan line is crossing the paper. */
export function scanLineProgress(elapsedMs: number): number {
  const start = FRAME_AT.scan;
  const end = FRAME_AT.hours;
  if (elapsedMs <= start) return 0;
  if (elapsedMs >= end) return 1;
  return (elapsedMs - start) / (end - start);
}
