import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import { Text } from "../src/ui/text";
import { AppProvider, useApp } from "../src/state/AppState";
import { ReviewPrompt } from "../src/ui/ReviewPrompt";
import { ThemeProvider, useTheme } from "../src/ui/theme";
import { TourProvider } from "../src/ui/TourLayer";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <Gate />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

function Gate() {
  const { ready, bootError } = useApp();
  return (
    <ThemeProvider>
      <TourProvider>{bootError ? <BootError message={bootError} /> : ready ? <Navigation /> : <BootError message="Opening your shifts…" />}</TourProvider>
    </ThemeProvider>
  );
}

function Navigation() {
  const { palette, scheme, fontFamily, boldFontFamily } = useTheme();
  const titleFont = boldFontFamily ?? fontFamily;
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ReviewPrompt />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
          headerTitleStyle: { fontWeight: "700", fontFamily: titleFont },
          headerTitle: ({ children, tintColor }) => (
            <Text style={{ color: tintColor ?? palette.text, fontSize: 17, fontWeight: "700" }}>{children}</Text>
          ),
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="tour" options={{ headerShown: false }} />
        <Stack.Screen name="shift/new" options={{ title: "Log shift" }} />
        <Stack.Screen name="shift/[id]" options={{ title: "Shift" }} />
        <Stack.Screen name="shift/edit/[id]" options={{ title: "Edit shift" }} />
        <Stack.Screen name="profile/new" options={{ title: "Add profile" }} />
        <Stack.Screen name="role/new" options={{ title: "Add role" }} />
        <Stack.Screen name="role/[id]" options={{ title: "Role" }} />
        <Stack.Screen name="data/delete" options={{ title: "Delete everything" }} />
        <Stack.Screen name="goal/new" options={{ title: "New goal" }} />
        <Stack.Screen name="goal/[id]" options={{ title: "Goal" }} />
        <Stack.Screen name="stub/scan" options={{ title: "Scan pay stub" }} />
        <Stack.Screen name="stub/review" options={{ title: "Review stub" }} />
        <Stack.Screen name="stub/index" options={{ title: "Pay stubs" }} />
        <Stack.Screen name="stub/[id]" options={{ title: "Pay stub" }} />
        <Stack.Screen name="feedback" options={{ title: "Send feedback" }} />
        <Stack.Screen name="pro" options={{ title: "Pro" }} />
      </Stack>
    </>
  );
}

function BootError({ message }: { message: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ color: palette.text, fontSize: 18, textAlign: "center" }}>{message}</Text>
    </View>
  );
}
