import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable } from "react-native";
import { useTheme } from "./theme";
import { TourAnchor } from "./TourLayer";

/** Opens pay-stub scan. Sits on the top left, opposite the tip jar. */
export function ScanButton() {
  const { palette } = useTheme();
  return (
    <TourAnchor id="scan-stub">
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Scan pay stub"
      onPress={() => router.push("/stub/scan")}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.line,
      }}
    >
      <Ionicons name="camera-outline" size={22} color={palette.text} />
    </Pressable>
    </TourAnchor>
  );
}
