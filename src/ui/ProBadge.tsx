import { router } from "expo-router";
import { Pressable } from "react-native";
import { useTheme } from "./theme";
import { Text } from "./text";

/** A Pro label that opens the plan screen. There is no ad and no purchase button. */
export function ProBadge({ label }: { label: string }) {
  const { palette } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push("/pro")} style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={{ color: palette.accent, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}
