export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  const withCommas = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${withCommas}.${rem.toString().padStart(2, "0")}`;
}

/** Value for a money text field. Whole dollars drop the decimals. */
export function formatMoneyInput(cents: number): string {
  const dollars = Math.floor(Math.abs(cents) / 100);
  const rem = Math.abs(cents) % 100;
  if (rem === 0) return String(dollars);
  return `${dollars}.${rem.toString().padStart(2, "0")}`;
}

export function formatPercent(basisPoints: number): string {
  const whole = Math.floor(basisPoints / 100);
  const frac = basisPoints % 100;
  if (frac === 0) return `${whole}%`;
  if (frac % 10 === 0) return `${whole}.${frac / 10}%`;
  return `${whole}.${frac.toString().padStart(2, "0")}%`;
}

export function formatPercentInput(basisPoints: number): string {
  const whole = Math.floor(basisPoints / 100);
  const frac = basisPoints % 100;
  if (frac === 0) return String(whole);
  if (frac % 10 === 0) return `${whole}.${frac / 10}`;
  return `${whole}.${frac.toString().padStart(2, "0")}`;
}

/** One decimal percent. `tenths` of 150 is 15.0%. */
export function formatTipPercent(tenths: number): string {
  const sign = tenths < 0 ? "-" : "";
  const abs = Math.abs(tenths);
  return `${sign}${Math.floor(abs / 10)}.${abs % 10}%`;
}

export function formatHoursPhrase(minutes: number): string {
  const neg = minutes < 0;
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  let body: string;
  if (m === 0) body = `${h} ${h === 1 ? "hour" : "hours"}`;
  else if (m % 6 === 0) body = `${h}.${m / 6} hours`;
  else if (h === 0) body = `${m} ${m === 1 ? "minute" : "minutes"}`;
  else body = `${h}h ${m}m`;
  return neg ? `-${body}` : body;
}

export function formatHoursCompact(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  if (m % 6 === 0) return `${h}.${m / 6}h`;
  return `${h}h ${m}m`;
}

export function formatClock(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h24 >= 12 ? "pm" : "am";
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")}${ampm}`;
}

export function formatRate(cents: number | null): string {
  if (cents == null) return "—";
  return `${formatMoney(cents)}/hr`;
}
