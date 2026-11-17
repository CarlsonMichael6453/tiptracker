import type { AppearanceStyle } from "../domain/types";

export type WebPaint = {
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  twinkle?: string;
};

export type Motif = { x: number; y: number; w: number; h: number; round?: boolean; color: 0 | 1; soft?: boolean };

export type MotifGroup = { spin?: string; drift: number; shapes: Motif[]; twinkle: Motif[] };

export type PatternMotion = { name: string; duration: string; oversized: boolean };

const NEW_PATTERNS = ["stripes", "waves", "checker", "confetti", "radial", "stars", "bokeh", "plaid", "mesh"] as const;
export type PatternStyle = (typeof NEW_PATTERNS)[number];

export function isPatternStyle(style: AppearanceStyle): style is PatternStyle {
  return (NEW_PATTERNS as readonly string[]).includes(style);
}

/** Slow CSS motion for a backdrop. Light and Dark stay still. Cycles are 16s or longer. */
export function patternMotion(style: AppearanceStyle): PatternMotion | null {
  switch (style) {
    case "light":
    case "dark":
      return null;
    case "polka":
      return { name: "tiptracker-polka", duration: "18s", oversized: false };
    case "gradient":
      return { name: "tiptracker-gradient", duration: "18s", oversized: true };
    case "twotone":
      return { name: "tiptracker-sway", duration: "16s", oversized: true };
    case "stripes":
    case "waves":
    case "plaid":
      return { name: "tiptracker-pan", duration: "18s", oversized: false };
    case "radial":
      return { name: "tiptracker-glow", duration: "18s", oversized: true };
    case "stars":
      return { name: "tiptracker-twinkle", duration: "20s", oversized: false };
    default:
      return { name: "tiptracker-drift", duration: "18s", oversized: true };
  }
}

export function webPaint(style: PatternStyle, a: string, b: string): WebPaint {
  switch (style) {
    case "stripes":
      return {
        backgroundColor: a,
        backgroundImage: `repeating-linear-gradient(135deg, ${b} 0 7px, ${a} 7px 14px)`,
        backgroundSize: "14px 14px",
      };
    case "waves":
      return {
        backgroundColor: a,
        backgroundImage: waveImage(a, b),
        backgroundSize: "88px 32px",
      };
    case "checker":
      return {
        backgroundColor: a,
        backgroundImage: `linear-gradient(45deg, ${b} 25%, transparent 25%), linear-gradient(-45deg, ${b} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${b} 75%), linear-gradient(-45deg, transparent 75%, ${b} 75%)`,
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
      };
    case "confetti":
      return {
        backgroundColor: a,
        backgroundImage: flecks(b).join(", "),
      };
    case "radial":
      return {
        backgroundColor: a,
        backgroundImage: `radial-gradient(circle at 40% 42%, ${b}, ${a} 58%)`,
      };
    case "stars":
      return {
        backgroundColor: a,
        backgroundImage: starDots(b, 0),
        twinkle: starDots(b, 1),
      };
    case "bokeh":
      return {
        backgroundColor: a,
        backgroundImage: [
          `radial-gradient(circle at 18% 28%, ${b} 0%, transparent 18%)`,
          `radial-gradient(circle at 72% 34%, ${b} 0%, transparent 22%)`,
          `radial-gradient(circle at 42% 76%, ${b} 0%, transparent 16%)`,
          `radial-gradient(circle at 84% 74%, ${b} 0%, transparent 12%)`,
        ].join(", "),
      };
    case "plaid":
      return {
        backgroundColor: a,
        backgroundImage: `repeating-linear-gradient(0deg, transparent 0 11px, ${b} 11px 15px), repeating-linear-gradient(90deg, transparent 0 13px, ${b} 13px 17px)`,
      };
    case "mesh":
      return {
        backgroundColor: a,
        backgroundImage: [
          `radial-gradient(circle at 16% 22%, ${b} 0%, transparent 42%)`,
          `radial-gradient(circle at 84% 16%, ${b} 0%, transparent 36%)`,
          `radial-gradient(circle at 48% 80%, ${b} 0%, transparent 40%)`,
        ].join(", "),
      };
  }
}

function waveImage(ground: string, crest: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='88' height='32' viewBox='0 0 88 32'><rect width='88' height='32' fill='${ground}'/><path d='M0 18 Q11 6 22 18 T44 18 T66 18 T88 18 V32 H0 Z' fill='${crest}'/></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/#/g, "%23")}")`;
}

function flecks(color: string): string[] {
  const spots: [number, number, number][] = [
    [8, 16, 3],
    [22, 62, 2],
    [36, 28, 3],
    [48, 78, 2],
    [61, 18, 2],
    [74, 48, 3],
    [86, 72, 2],
    [16, 84, 2],
    [54, 44, 3],
    [92, 30, 2],
    [30, 12, 2],
    [68, 90, 3],
  ];
  return spots.map(
    ([x, y, r]) => `radial-gradient(circle at ${x}% ${y}%, ${color} ${r}px, transparent ${r + 1}px)`,
  );
}

function starDots(color: string, set: number): string {
  const spots =
    set === 0
      ? [
          [12, 18],
          [28, 42],
          [46, 16],
          [63, 38],
          [78, 14],
          [88, 52],
          [18, 72],
          [40, 66],
          [58, 84],
          [74, 70],
          [34, 90],
          [92, 86],
        ]
      : [
          [20, 28],
          [52, 24],
          [70, 48],
          [14, 54],
          [36, 58],
          [84, 32],
          [48, 78],
          [66, 16],
          [8, 88],
          [90, 64],
        ];
  return spots
    .map(([x, y]) => `radial-gradient(circle at ${x}% ${y}%, ${color} 1.4px, transparent 2px)`)
    .join(", ");
}

export function nativeMotifs(style: PatternStyle, preview: boolean): MotifGroup {
  switch (style) {
    case "stripes":
      return { spin: "135deg", drift: 10, twinkle: [], shapes: bars(preview ? 8 : 16, 1) };
    case "waves":
      return { drift: 12, twinkle: [], shapes: waveBands(preview ? 5 : 8) };
    case "checker":
      return { drift: 8, twinkle: [], shapes: checkerSquares(preview ? 4 : 8) };
    case "confetti":
      return { drift: 14, twinkle: [], shapes: scattered(preview ? 10 : 22, 7, false) };
    case "radial":
      return {
        drift: 6,
        twinkle: [],
        shapes: [{ x: 18, y: 16, w: 70, h: 70, round: true, color: 1, soft: true }],
      };
    case "stars":
      return { drift: 0, twinkle: scattered(preview ? 6 : 14, 3, true), shapes: scattered(preview ? 8 : 18, 2, true) };
    case "bokeh":
      return { drift: 10, twinkle: [], shapes: orbs(preview ? 4 : 7) };
    case "plaid":
      return { drift: 8, twinkle: [], shapes: [...bars(preview ? 5 : 9, 1), ...columns(preview ? 5 : 8)] };
    case "mesh":
      return { drift: 8, twinkle: [], shapes: orbs(3) };
  }
}

function bars(count: number, color: 0 | 1): Motif[] {
  const step = 100 / count;
  return Array.from({ length: count }, (_, index) => ({
    x: -20,
    y: index * step,
    w: 160,
    h: step * 0.42,
    color,
  }));
}

function columns(count: number): Motif[] {
  const step = 100 / count;
  return Array.from({ length: count }, (_, index) => ({
    x: index * step,
    y: -10,
    w: step * 0.28,
    h: 130,
    color: 1 as const,
  }));
}

function waveBands(count: number): Motif[] {
  const step = 110 / count;
  return Array.from({ length: count }, (_, index) => ({
    x: -8,
    y: index * step - 4,
    w: 130,
    h: step * 0.62,
    round: true,
    color: 1 as const,
  }));
}

function checkerSquares(cells: number): Motif[] {
  const step = 100 / cells;
  const shapes: Motif[] = [];
  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      if ((row + col) % 2 === 0) continue;
      shapes.push({ x: col * step, y: row * step, w: step, h: step, color: 1 });
    }
  }
  return shapes;
}

function scattered(count: number, seed: number, round: boolean): Motif[] {
  const values = sequence(count * 2, seed);
  return Array.from({ length: count }, (_, index) => ({
    x: values[index * 2] * 100,
    y: values[index * 2 + 1] * 100,
    w: round ? 1.6 : 2.2 + (index % 3),
    h: round ? 1.6 : 1.4 + (index % 2),
    round,
    color: 1 as const,
  }));
}

function orbs(count: number): Motif[] {
  const spots = [
    [8, 12, 42],
    [52, 8, 36],
    [28, 48, 34],
    [62, 58, 40],
    [4, 70, 28],
    [70, 24, 24],
    [40, 78, 30],
  ];
  return spots.slice(0, count).map(([x, y, w]) => ({ x, y, w, h: w, round: true, color: 1 as const, soft: true }));
}

function sequence(count: number, seed: number): number[] {
  let state = seed + 17;
  const out: number[] = [];
  for (let index = 0; index < count; index += 1) {
    state = (state * 16807) % 2147483647;
    out.push(state / 2147483647);
  }
  return out;
}
