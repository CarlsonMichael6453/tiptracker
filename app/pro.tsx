import { View } from "react-native";
import { FREE_FEATURES, PRO_FEATURES, PRO_PRICES, PRO_UNLOCKED_FOR_TESTING } from "../src/config/pro";
import { Screen } from "../src/ui/components";
import { useTheme } from "../src/ui/theme";
import { Text } from "../src/ui/text";

export default function ProScreen() {
  const { palette } = useTheme();
  return (
    <Screen withHeader>
      <Text style={{ color: palette.text, fontSize: 28, fontWeight: "800" }}>Pro</Text>
      <Text style={{ color: palette.muted, fontSize: 16, lineHeight: 22 }}>
        Free keeps the ledger. Pro adds the planning tools for weeks that change size.
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Column title="Free" lines={FREE_FEATURES} />
        <Column title="Pro" lines={PRO_FEATURES.map((item) => item.name)} accent />
      </View>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}>What Pro adds</Text>
      {PRO_FEATURES.map((item) => (
        <View key={item.name} style={{ gap: 2 }}>
          <Text style={{ color: palette.text, fontWeight: "700" }}>{item.name}</Text>
          <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 21 }}>{item.detail}</Text>
        </View>
      ))}
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}>Price</Text>
      <Text style={{ color: palette.text, fontSize: 17, fontWeight: "700" }}>{PRO_PRICES.month}</Text>
      <Text style={{ color: palette.text, fontSize: 17, fontWeight: "700" }}>{PRO_PRICES.year}</Text>
      <Text style={{ color: palette.text, fontSize: 17, fontWeight: "700" }}>{PRO_PRICES.lifetime}</Text>
      <Text style={{ color: palette.muted, fontSize: 16 }}>
        {PRO_UNLOCKED_FOR_TESTING ? "Pro is unlocked during testing." : "Purchases are not turned on yet."}
      </Text>
      <Text style={{ color: palette.faint, fontSize: 13 }}>No account and no ads. The pay stub scanner stays free.</Text>
    </Screen>
  );
}

function Column({ title, lines, accent = false }: { title: string; lines: string[]; accent?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1, gap: 6, backgroundColor: palette.card, borderRadius: 14, borderWidth: 1, borderColor: accent ? palette.accent : palette.line, padding: 12 }}>
      <Text style={{ color: accent ? palette.accent : palette.text, fontWeight: "800", fontSize: 16 }}>{title}</Text>
      {lines.map((line) => (
        <Text key={line} style={{ color: palette.text, fontSize: 13, lineHeight: 18 }}>
          {line}
        </Text>
      ))}
    </View>
  );
}
