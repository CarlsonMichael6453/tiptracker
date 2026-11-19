import { Platform } from "react-native";

/** Web never asks. iOS and Android use the system review sheet when it is available. */
export async function requestStoreReview(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const native = await import("./storeReviewNative");
  return native.requestStoreReview();
}
