import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, SectionList, Text, View } from "react-native";
import { formatHoursCompact, formatMoney } from "../../src/calc/format";
import { formatMonthYear, formatWeekdayDate } from "../../src/calc/dates";
import type { ShiftRecord } from "../../src/domain/types";
import { listShifts } from "../../src/repo/repository";
import { useApp } from "../../src/state/AppState";
import { Muted, Screen } from "../../src/ui/components";
import { useTheme } from "../../src/ui/theme";

export default function History() {
  const { db, activeProfile } = useApp();
  const { palette } = useTheme();
  const [sections, setSections] = useState<{ title: string; data: ShiftRecord[] }[]>([]);

  const load = useCallback(async () => {
    if (!db || !activeProfile) return;
    const shifts = await listShifts(db, activeProfile.id);
    const grouped: { title: string; data: ShiftRecord[] }[] = [];
    for (const shift of shifts) {
      const title = formatMonthYear(shift.shiftDate);
      const last = grouped[grouped.length - 1];
      if (!last || last.title !== title) grouped.push({ title, data: [shift] });
      else last.data.push(shift);
    }
    setSections(grouped);
  }, [db, activeProfile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen scroll={false} tipJar>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        ListEmptyComponent={<Muted>No shifts yet.</Muted>}
        renderSectionHeader={({ section }) => (
          <Text style={{ color: palette.text, backgroundColor: palette.card, alignSelf: "flex-start", overflow: "hidden", fontSize: 13, fontWeight: "700", marginTop: 8, marginBottom: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${formatWeekdayDate(item.shiftDate)} ${item.roleName}`}
            onPress={() => router.push(`/shift/${item.id}`)}
            style={{ minHeight: 64, padding: 12, marginBottom: 8, borderRadius: 14, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.line, justifyContent: "center" }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <Text style={{ color: palette.text, fontSize: 16, fontWeight: "700", flex: 1 }}>
                {formatWeekdayDate(item.shiftDate)} · {item.roleName}
              </Text>
              <Text style={{ color: palette.accent, fontSize: 16, fontWeight: "800" }}>{formatMoney(item.takeHomeCents)}</Text>
            </View>
            <Text style={{ color: palette.muted, marginTop: 2 }}>
              {formatHoursCompact(item.durationMinutes)} · net {formatMoney(item.netTipsCents)}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
