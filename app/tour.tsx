import { useEffect, useRef } from "react";
import { useTour } from "../src/ui/TourLayer";

/** Opens the coach-mark tour on the real screens. Welcome and Settings both land here. */
export default function TourScreen() {
  const { start } = useTour();
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    start();
  }, [start]);
  return null;
}
