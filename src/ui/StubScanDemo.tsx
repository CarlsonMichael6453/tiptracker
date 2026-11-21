import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { scanLineProgress, stubDemoFrame, stubDemoLines, stubDemoShows } from "../welcome/stubDemo";
import { useBackgroundMotion } from "./useBackgroundMotion";
import { useTheme } from "./theme";
import { Text } from "./text";

/** Plays a sample snap and review. It does not open the camera or save a stub. */
export function StubScanDemo({ onNext }: { onNext: () => void }) {
  const { palette } = useTheme();
  const { reduceMotion } = useBackgroundMotion();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 50);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  const frame = stubDemoFrame(elapsed, reduceMotion);
  const show = stubDemoShows(frame);
  const lines = stubDemoLines();
  const scan = scanLineProgress(reduceMotion ? 0 : elapsed);

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, backgroundColor: "rgba(16, 18, 14, 0.72)", justifyContent: "center", padding: 18 }}>
      <View style={{ backgroundColor: palette.card, borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: palette.line }}>
        <Text style={{ color: palette.text, fontSize: 20, fontWeight: "800" }}>Sample scan</Text>
        <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 21 }}>A made-up stub. The camera stays off, and nothing is saved.</Text>
        {show.paper ? (
          <View style={{ alignSelf: "center", width: 220, height: 250, borderRadius: 28, borderWidth: 3, borderColor: palette.text, padding: 14, justifyContent: "center" }}>
            <Paper />
            {show.scan ? (
              <View pointerEvents="none" style={{ position: "absolute", left: 18, right: 18, top: 16 + scan * 200, height: 3, backgroundColor: palette.accent }} />
            ) : null}
          </View>
        ) : null}
        {show.review ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: palette.text, fontSize: 17, fontWeight: "800" }}>Check this stub</Text>
            {show.hours ? <ReviewLine label="Hours" value={lines.hours} /> : null}
            {show.gross ? <ReviewLine label="Gross" value={lines.gross} /> : null}
            {show.taxes ? <ReviewLine label="Taxes" value={lines.taxes} /> : null}
            {show.net ? <ReviewLine label="Net" value={lines.net} /> : null}
            {show.match ? (
              <Text accessibilityLabel={lines.check} style={{ color: palette.olive, fontWeight: "800", fontSize: 16 }}>
                ✓ {lines.check}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Next" onPress={onNext} style={{ minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.primary }}>
          <Text style={{ color: palette.onPrimary, fontWeight: "800", fontSize: 18 }}>Next</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Paper() {
  return (
    <View style={{ flex: 1, backgroundColor: "#F6F1E4", borderRadius: 8, padding: 12, gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "#2A2A24", fontWeight: "800" }}>Pay stub</Text>
        <Text accessibilityLabel="Example" style={{ color: "#6A4B16", fontSize: 12, fontWeight: "800" }}>
          Example
        </Text>
      </View>
      <Bar width="100%" />
      <Bar width="78%" />
      <Bar width="64%" />
      <Bar width="88%" />
      <View style={{ height: 10 }} />
      <Bar width="46%" />
    </View>
  );
}

function Bar({ width }: { width: string }) {
  return <View style={{ height: 8, width, borderRadius: 4, backgroundColor: "#DDD4C4" }} />;
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, minHeight: 28, alignItems: "center" }}>
      <Text style={{ color: palette.muted }}>{label}</Text>
      <Text style={{ color: palette.text, fontWeight: "800", fontSize: 18 }}>{value}</Text>
    </View>
  );
}
