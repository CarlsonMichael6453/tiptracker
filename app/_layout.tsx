import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Text, View } from "react-native";
import { AppProvider, useApp } from "../src/state/AppState";
import { ThemeProvider, useTheme } from "../src/ui/theme";

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
      {bootError ? <BootError message={bootError} /> : ready ? <Navigation /> : <BootError message="Opening your shifts…" />}
    </ThemeProvider>
  );
}

function Navigation() {
  const { palette, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.card },
          headerTintColor: palette.text,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="shift/new" options={{ title: "Log shift" }} />
        <Stack.Screen name="shift/[id]" options={{ title: "Shift" }} />
        <Stack.Screen name="shift/edit/[id]" options={{ title: "Edit shift" }} />
        <Stack.Screen name="profile/new" options={{ title: "Add profile" }} />
        <Stack.Screen name="role/new" options={{ title: "Add role" }} />
        <Stack.Screen name="role/[id]" options={{ title: "Role" }} />
        <Stack.Screen name="data/delete" options={{ title: "Delete everything" }} />
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
