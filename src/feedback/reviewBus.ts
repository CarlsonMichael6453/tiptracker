export type ReviewMoment = "jar" | "shift" | "stub";

type Listener = (moment: ReviewMoment) => void;

let listener: Listener | null = null;

export function onReviewMoment(next: Listener): () => void {
  listener = next;
  return () => {
    if (listener === next) listener = null;
  };
}

export function requestReviewMoment(moment: ReviewMoment): void {
  listener?.(moment);
}
