export type PendingScan = {
  text: string;
  photoDataUrl: string | null;
  source: "photo" | "pdf" | "sample";
};

let pending: PendingScan | null = null;

export function setPendingScan(value: PendingScan): void {
  pending = value;
}

export function peekPendingScan(): PendingScan | null {
  return pending;
}
