import {
  buildFeedbackMail,
  canAskForReview,
  feedbackPlaceholder,
  nextReviewRecord,
  shouldAskAfterCleanStub,
  shouldAskAfterShiftCount,
} from "../src/feedback/message";
import { includedLine } from "../src/feedback/message";
import { FEEDBACK_EMAIL } from "../src/config/feedback";

describe("feedback mail", () => {
  const included = includedLine({
    version: "v1.0.0",
    platform: "ios",
    device: "iPhone",
    os: "iOS 17.5",
  });

  test("builds a versioned subject and a body with no earnings", () => {
    const mail = buildFeedbackMail(FEEDBACK_EMAIL, {
      kind: "feedback",
      rating: 4,
      message: "The jar is easy to find.",
      replyTo: "ada@example.com",
      included,
      version: "v1.0.0",
    });
    expect(mail.subject).toBe("Tip Tracker feedback (v1.0.0)");
    expect(mail.body).toContain("Type: Feedback");
    expect(mail.body).toContain("Rating: 4/5");
    expect(mail.body).toContain("Reply-to: ada@example.com");
    expect(mail.body).toContain("The jar is easy to find.");
    expect(mail.body).toContain("Included: Tip Tracker v1.0.0 · ios · iPhone · iOS 17.5");
    expect(mail.body).not.toContain("take-home");
    expect(mail.body).not.toContain("$");
    expect(mail.url.startsWith(`mailto:${FEEDBACK_EMAIL}?`)).toBe(true);
    expect(FEEDBACK_EMAIL).toBe("bykeh1sy@mail.grokbot.com");
    expect(decodeURIComponent(mail.url)).toContain(mail.subject);
  });

  test("a bug report changes the subject and the prompt", () => {
    expect(feedbackPlaceholder("bug")).toBe("What happened? What did you expect?");
    expect(feedbackPlaceholder("feedback")).not.toBe(feedbackPlaceholder("bug"));
    const mail = buildFeedbackMail(FEEDBACK_EMAIL, {
      kind: "bug",
      rating: 2,
      message: "The save button did nothing.",
      replyTo: "",
      included,
      version: "v1.0.0",
    });
    expect(mail.subject).toBe("Tip Tracker bug (v1.0.0)");
    expect(mail.body).toContain("Type: Bug");
    expect(mail.body).toContain("Reply-to: not given");
  });
});

describe("store review eligibility", () => {
  test("asks at most three times, and not again for 90 days", () => {
    expect(canAskForReview({ lastAsked: null, askCount: 0 }, "2026-11-18")).toBe(true);
    expect(canAskForReview({ lastAsked: "2026-11-17", askCount: 1 }, "2026-11-18")).toBe(false);
    expect(canAskForReview({ lastAsked: "2026-08-20", askCount: 1 }, "2026-11-18")).toBe(true);
    expect(canAskForReview({ lastAsked: "2026-08-21", askCount: 1 }, "2026-11-18")).toBe(false);
    expect(canAskForReview({ lastAsked: "2025-01-01", askCount: 3 }, "2026-11-18")).toBe(false);
  });

  test("only the 10th shift and a clean stub are positive moments", () => {
    expect(shouldAskAfterShiftCount(9)).toBe(false);
    expect(shouldAskAfterShiftCount(10)).toBe(true);
    expect(shouldAskAfterShiftCount(11)).toBe(false);
    expect(shouldAskAfterCleanStub(0)).toBe(true);
    expect(shouldAskAfterCleanStub(1)).toBe(false);
  });

  test("recording an ask stores today and increments the count", () => {
    expect(nextReviewRecord({ lastAsked: null, askCount: 1 }, "2026-11-18")).toEqual({
      lastAsked: "2026-11-18",
      askCount: 2,
    });
  });
});
