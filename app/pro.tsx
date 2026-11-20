import { Text } from "../src/ui/text";

import { PRO_PRICES, PRO_UNLOCKED_FOR_TESTING } from "../src/config/pro";
import { Screen } from "../src/ui/components";
import { useTheme } from "../src/ui/theme";

export default function ProScreen() {
  const { palette } = useTheme();
  return (
    <Screen withHeader>
      <Text style={{ color: palette.text, fontSize: 28, fontWeight: "800" }}>Pro</Text>
      <Text style={{ color: palette.muted, fontSize: 16 }}>
        Safe to spend, a cash-flow calendar, a slow-week buffer, sinking funds, work expenses, and no caps on bills, envelopes, or savings goals.
      </Text>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>{PRO_PRICES.month}</Text>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>{PRO_PRICES.year}</Text>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>{PRO_PRICES.lifetime}</Text>
      <Text style={{ color: palette.muted }}>
        {PRO_UNLOCKED_FOR_TESTING ? "Pro is unlocked during testing." : "Purchases are not turned on yet."}
      </Text>
      <Text style={{ color: palette.faint, fontSize: 13 }}>The pay stub scanner and the rest of the ledger stay free. No account and no ads.</Text>
    </Screen>
  );
}
