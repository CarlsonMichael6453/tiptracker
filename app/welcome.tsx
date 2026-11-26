import { router } from "expo-router";
import { appEntry } from "../src/welcome/tour";
import { useApp } from "../src/state/AppState";
import { Button, Screen, Title } from "../src/ui/components";
import { useTheme } from "../src/ui/theme";
import { Text } from "../src/ui/text";

export default function Welcome() {
  const { activeProfile, markWelcomeSeen } = useApp();
  const { palette } = useTheme();

  async function skip() {
    await markWelcomeSeen();
    router.replace(appEntry(Boolean(activeProfile)));
  }

  return (
    <Screen>
      <Title>Welcome</Title>
      <Text style={{ color: palette.text, fontSize: 18, lineHeight: 26 }}>
        Tip Tracker is a private record of your shifts, tips, and take-home. It stays on this device.
      </Text>
      <Text style={{ color: palette.text, fontSize: 18, lineHeight: 26 }}>
        No tips to track? The Budget tab works on its own.
      </Text>
      <Button label="Take a quick tour" onPress={() => router.push("/tour")} />
      <Button label="Skip" kind="secondary" onPress={() => void skip()} />
    </Screen>
  );
}
