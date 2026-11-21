import { DEFAULT_WEEK_STARTS_ON } from "../../calc/classify";
import { parseMoney } from "../../calc/money";

export const INTRO_JOBS = ["Server", "Bartender", "Busser", "Host", "Other"] as const;

export type IntroDraft = { name: string; job: string; wage: string };

/** The first profile page starts blank. Wage and the week can wait. */
export const EMPTY_INTRO: IntroDraft = { name: "", job: "", wage: "" };

export type IntroResult =
  | { ok: true; name: string; wageCents: number; weekStartsOn: number; usualRoleName: string }
  | { ok: false; errors: string[] };

/** A name or a job is enough. A blank wage is stored as zero and can be set later. */
export function introProfile(draft: IntroDraft): IntroResult {
  const name = draft.name.trim();
  const job = draft.job.trim();
  const errors: string[] = [];
  if (name.length > 40) errors.push("Keep the name to 40 characters.");
  if (job !== "" && !(INTRO_JOBS as readonly string[]).includes(job)) errors.push("Pick a job from the list.");
  const wage = draft.wage.trim();
  let wageCents = 0;
  if (wage !== "") {
    const parsed = parseMoney(wage);
    if (parsed.status !== "ok") errors.push("Leave the wage blank, or enter a number.");
    else wageCents = parsed.cents;
  }
  if (name.length < 1 && job.length < 1) errors.push("Add a name or a job. Either one is enough.");
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    name: name.length > 0 ? name : job,
    wageCents,
    weekStartsOn: DEFAULT_WEEK_STARTS_ON,
    usualRoleName: job.length > 0 ? job : "Other",
  };
}
