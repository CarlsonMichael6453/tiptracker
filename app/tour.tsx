import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";
import { useApp } from "../src/state/AppState";
import { Button, Card, Muted, Screen, Title } from "../src/ui/components";
import { useTheme } from "../src/ui/theme";
import { Text } from "../src/ui/text";
import { TOUR_STEPS, appEntry, stepAfter, type TourMove } from "../src/welcome/tour";

export default function TourScreen() {
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const { activeProfile, markWelcomeSeen } = useApp();
  const { palette } = useTheme();
  const [index, setIndex] = useState(0);
  const touchX = useRef(0);
  const step = TOUR_STEPS[index] ?? TOUR_STEPS[0]!;

  async function finish() {
    await markWelcomeSeen();
    if (replay === "1") {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/settings");
      return;
    }
    router.replace(appEntry(Boolean(activeProfile)));
  }

  function go(move: TourMove) {
    const next = stepAfter(index, TOUR_STEPS.length, move);
    if (next.finished) {
      void finish();
      return;
    }
    setIndex(next.index);
  }

  return (
    <Screen>
      <Title>A quick tour</Title>
      <Muted>
        Step {index + 1} of {TOUR_STEPS.length}
      </Muted>
      <View
        onTouchStart={(event) => {
          touchX.current = event.nativeEvent.pageX;
        }}
        onTouchEnd={(event) => {
          const delta = event.nativeEvent.pageX - touchX.current;
          if (delta <= -48) go("next");
          else if (delta >= 48) go("back");
        }}
      >
        <Card>
          <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 24, fontWeight: "800" }}>
            {step.title}
          </Text>
          <Text style={{ color: palette.text, fontSize: 17, lineHeight: 24 }}>{step.body}</Text>
        </Card>
      </View>
      <Button label="Next" onPress={() => go("next")} />
      {index > 0 ? <Button label="Back" kind="secondary" onPress={() => go("back")} /> : null}
      <Button label="Done" kind="secondary" onPress={() => go("done")} />
      <Button label="Skip" kind="secondary" onPress={() => go("skip")} />
    </Screen>
  );
}
