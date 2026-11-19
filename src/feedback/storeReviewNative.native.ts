import * as StoreReview from "expo-store-review";

export async function requestStoreReview(): Promise<boolean> {
  if (!(await StoreReview.isAvailableAsync())) return false;
  await StoreReview.requestReview();
  return true;
}
