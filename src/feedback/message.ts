export type DeviceContext = {
  version: string;
  platform: string;
  device: string;
  os: string;
};

export function includedLine(info: DeviceContext): string {
  return `Tip Tracker ${info.version} · ${info.platform} · ${info.device} · ${info.os}`;
}

export type FeedbackKind = "feedback" | "bug";

export type FeedbackDraft = {
  kind: FeedbackKind;
  rating: number;
  message: string;
  replyTo: string;
  included: string;
  version: string;
};

export type FeedbackMail = {
  to: string;
  subject: string;
  body: string;
  url: string;
};

const KIND_LABEL: Record<FeedbackKind, string> = {
  feedback: "Feedback",
  bug: "Bug",
};

export function feedbackPlaceholder(kind: FeedbackKind): string {
  if (kind === "bug") return "What happened? What did you expect?";
  return "What’s working, or what would help?";
}

/** Mail body is only what he typed, plus version and device. Never shifts or earnings. */
export function buildFeedbackMail(to: string, draft: FeedbackDraft): FeedbackMail {
  const kind = KIND_LABEL[draft.kind];
  const subject = `Tip Tracker ${draft.kind === "bug" ? "bug" : "feedback"} (${draft.version})`;
  const reply = draft.replyTo.trim();
  const body = [
    `Type: ${kind}`,
    `Rating: ${draft.rating}/5`,
    reply ? `Reply-to: ${reply}` : "Reply-to: not given",
    "",
    draft.message.trim(),
    "",
    "---",
    `Included: ${draft.included}`,
  ].join("\n");
  const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { to, subject, body, url };
}

export type ReviewRecord = {
  lastAsked: string | null;
  askCount: number;
};

export const REVIEW_MIN_DAYS = 90;
export const REVIEW_MAX_ASKS = 3;
export const REVIEW_SHIFT_MILESTONE = 10;

export function daysSince(lastAsked: string, today: string): number {
  const [y1, m1, d1] = lastAsked.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  const a = Date.UTC(y1 ?? 0, (m1 ?? 1) - 1, d1 ?? 1);
  const b = Date.UTC(y2 ?? 0, (m2 ?? 1) - 1, d2 ?? 1);
  return Math.round((b - a) / 86400000);
}

/** True only when we have not asked too recently and have not asked too many times. */
export function canAskForReview(record: ReviewRecord, today: string): boolean {
  if (record.askCount >= REVIEW_MAX_ASKS) return false;
  if (!record.lastAsked) return true;
  return daysSince(record.lastAsked, today) >= REVIEW_MIN_DAYS;
}

export function shouldAskAfterShiftCount(count: number): boolean {
  return count === REVIEW_SHIFT_MILESTONE;
}

export function shouldAskAfterCleanStub(mismatchCount: number): boolean {
  return mismatchCount === 0;
}

export function nextReviewRecord(record: ReviewRecord, today: string): ReviewRecord {
  return { lastAsked: today, askCount: record.askCount + 1 };
}
