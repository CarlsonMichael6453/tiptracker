import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { speakMoney } from "../../src/calc/tipJar";
import type { PayStub } from "../../src/domain/types";
import { listPayStubs } from "../../src/repo/payStubs";
import { useApp } from "../../src/state/AppState";
import { Screen } from "../../src/ui/components";
import { useTheme } from "../../src/ui/theme";

export default function PayStubList() {
  const { db, activeProfile } = useApp();
  const { palette } = useTheme();
  const [stubs, setStubs] = useState<PayStub[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!db || !activeProfile) return;
      void listPayStubs(db, activeProfile.id).then(setStubs);
    }, [db, activeProfile]),
  );

  return (
    <Screen withHeader>
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: "800" }}>Pay stubs</Text>
      {stubs.length === 0 ? <Text style={{ color: palette.muted }}>None saved yet.</Text> : null}
      {stubs.map((stub) => (
        <Pressable key={stub.id} accessibilityRole="button" accessibilityLabel={`Pay stub ${stub.periodStart}`} onPress={() => router.push(`/stub/${stub.id}`)} style={{ minHeight: 56, justifyContent: "center", borderBottomWidth: 1, borderColor: palette.line }}>
          <Text style={{ color: palette.text, fontWeight: "700" }}>{stub.periodStart} – {stub.periodEnd}</Text>
          <Text style={{ color: palette.muted }}>Net {speakMoney(stub.netPayCents)}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}
