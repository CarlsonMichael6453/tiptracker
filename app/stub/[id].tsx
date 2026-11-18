import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text } from "react-native";
import { formatHours } from "../../src/calc/payStub";
import { speakMoney } from "../../src/calc/tipJar";
import type { PayStub } from "../../src/domain/types";
import { deletePayStub, getPayStub } from "../../src/repo/payStubs";
import { useApp } from "../../src/state/AppState";
import { Screen } from "../../src/ui/components";
import { useTheme } from "../../src/ui/theme";

export default function PayStubDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useApp();
  const { palette } = useTheme();
  const [stub, setStub] = useState<PayStub | null>(null);

  useEffect(() => {
    if (!db || !id) return;
    void getPayStub(db, id).then(setStub);
  }, [db, id]);

  if (!stub || !db) return null;
  const taxes = stub.taxes.reduce((sum, line) => sum + line.cents, 0);
  return (
    <Screen withHeader>
      <Text style={{ color: palette.text, fontSize: 20, fontWeight: "800" }}>{stub.periodStart} – {stub.periodEnd}</Text>
      <Text style={{ color: palette.muted }}>Pay date {stub.payDate ?? "not listed"}</Text>
      <Text style={{ color: palette.text }}>Regular {formatHours(stub.regularMinutes / 60)} hrs · overtime {formatHours(stub.overtimeMinutes / 60)}</Text>
      <Text style={{ color: palette.text }}>Rate {speakMoney(stub.hourlyRateCents)} · gross wages {speakMoney(stub.grossWagesCents)}</Text>
      <Text style={{ color: palette.text }}>Cash tips declared {speakMoney(stub.cashTipsCents)} · card tips {speakMoney(stub.cardTipsCents)}</Text>
      <Text style={{ color: palette.text, fontWeight: "700" }}>Taxes {speakMoney(taxes)}</Text>
      {stub.taxes.map((line) => (
        <Text key={line.name} style={{ color: palette.muted }}>{line.name} {speakMoney(line.cents)}</Text>
      ))}
      <Text style={{ color: palette.text }}>Other deductions {speakMoney(stub.otherDeductionsCents)}</Text>
      <Text style={{ color: palette.text, fontWeight: "800", fontSize: 22 }}>Net {speakMoney(stub.netPayCents)}</Text>
      <Text style={{ color: palette.muted }}>Net pay is what’s left after taxes and other deductions. Cash tips you already kept are not in the deposit.</Text>
      <Text style={{ color: palette.faint, fontSize: 13 }}>This is a personal record, not tax or legal advice. If something looks off, ask your manager or payroll.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete pay stub"
        onPress={() =>
          Alert.alert("Delete this pay stub?", "The saved numbers go with it.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete stub",
              style: "destructive",
              onPress: () => {
                void deletePayStub(db, stub.id).then(() => router.back());
              },
            },
          ])
        }
        style={{ minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.danger }}
      >
        <Text style={{ color: palette.danger, fontWeight: "700" }}>Delete stub</Text>
      </Pressable>
    </Screen>
  );
}
