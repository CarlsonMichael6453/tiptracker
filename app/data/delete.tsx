import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text } from "react-native";
import { countAll, deleteAllData } from "../../src/repo/repository";
import { useApp } from "../../src/state/AppState";
import { Button, Card, Screen } from "../../src/ui/components";
import { useTheme } from "../../src/ui/theme";

export default function DeleteData() {
  const { db, reload } = useApp();
  const { palette } = useTheme();
  const [counts, setCounts] = useState<{ profiles: number; shifts: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!db) return;
      void countAll(db).then(setCounts);
    }, [db]),
  );

  return (
    <Screen withHeader>
      <Card>
        <Text style={{ color: palette.text, fontSize: 18, lineHeight: 26 }}>
          This removes {counts?.profiles ?? "…"} {counts?.profiles === 1 ? "profile" : "profiles"}, {counts?.shifts ?? "…"}{" "}
          {counts?.shifts === 1 ? "shift" : "shifts"}, and every savings goal from this phone. Tip Tracker does not have a copy.
        </Text>
      </Card>
      <Button
        label="Delete everything"
        kind="danger"
        onPress={() => {
          if (!db) return;
          void deleteAllData(db).then(async () => {
            await reload();
            router.replace("/");
          });
        }}
      />
    </Screen>
  );
}
