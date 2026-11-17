import { useEffect, useState } from "react";
import { AccessibilityInfo, AppState, Platform } from "react-native";

/** True when the OS asks for less motion, or this app/tab is not on screen. */
export function useBackgroundMotion(): { reduceMotion: boolean; appVisible: boolean } {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [appVisible, setAppVisible] = useState(true);

  useEffect(() => {
    if (Platform.OS === "web") {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      const applyMedia = () => setReduceMotion(media.matches);
      applyMedia();
      media.addEventListener("change", applyMedia);
      const applyVisibility = () => setAppVisible(document.visibilityState !== "hidden");
      applyVisibility();
      document.addEventListener("visibilitychange", applyVisibility);
      return () => {
        media.removeEventListener("change", applyMedia);
        document.removeEventListener("visibilitychange", applyVisibility);
      };
    }

    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setReduceMotion(enabled);
      })
      .catch(() => undefined);
    const reduceSub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const appSub = AppState.addEventListener("change", (state) => setAppVisible(state === "active"));
    return () => {
      cancelled = true;
      reduceSub.remove();
      appSub.remove();
    };
  }, []);

  return { reduceMotion, appVisible };
}
