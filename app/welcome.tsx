import { router } from "expo-router";
import { appEntry } from "../src/welcome/tour";
import { useApp } from "../src/state/AppState";
import { Button, Screen, Title } from "../src/ui/components";
import { useTheme } from "../src/ui/theme";
import { Text } from "../src/ui/text";

const POINTS = [
  "Log a shift when you clock out: hours, wage, tips, and tip-out.",
  "See what you actually took home, not just what the guest left.",
  "A tip jar and a pace line show how this week compares with a usual one.",
  "Budget the slow weeks, and check a pay stub when you want to.",
];

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
        Tip Tracker keeps a private record of restaurant work. Shifts, wages, tips, and tip-outs stay on this device, and the take-home number is what’s left after tip-out.
      </Text>
      <Text style={{ color: palette.text, fontSize: 18, lineHeight: 26 }}>
        No tips to track? Use the Budget tab on its own for bills, spending categories, savings goals, and safe to spend.
      </Text>
      {POINTS.map((point) => (
        <Text key={point} style={{ color: palette.text, fontSize: 16, lineHeight: 23 }}>
          {point}
        </Text>
      ))}
      <Button label="Take a quick tour" onPress={() => router.push("/tour")} />
      <Button label="Skip" kind="secondary" onPress={() => void skip()} />
    </Screen>
  );
}
