import { Tabs } from "expo-router";
import { Text } from "../../src/ui/text";
import { useTheme } from "../../src/ui/theme";

export default function TabsLayout() {
  const { palette, fontFamily, boldFontFamily } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
        tabBarStyle: { backgroundColor: palette.card, borderTopColor: palette.line, minHeight: 56 },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.faint,
        tabBarLabelStyle: { fontSize: 13, fontWeight: "700", fontFamily: boldFontFamily ?? fontFamily },
        tabBarLabel: ({ color, children }) => (
          <Text style={{ color, fontSize: 13, fontWeight: "700" }}>{children}</Text>
        ),
        tabBarIcon: () => null,
        tabBarIconStyle: { display: "none", width: 0, height: 0 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="summary" options={{ title: "Summary" }} />
      <Tabs.Screen name="budget" options={{ title: "Budget" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
