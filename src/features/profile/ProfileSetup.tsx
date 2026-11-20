import { useState } from "react";
import { View } from "react-native";
import { Text } from "../../ui/text";
import { parseMoney } from "../../calc/money";
import { DEFAULT_WEEK_STARTS_ON } from "../../calc/classify";
import { Button, Chips, ErrorList, Field, Screen, Title, WeekStartPicker } from "../../ui/components";
import { useTheme } from "../../ui/theme";

const ROLES = ["Server", "Bartender", "Busser", "Host"];

export function ProfileSetup({
  submitLabel,
  onSubmit,
  withHeader = false,
}: {
  submitLabel: string;
  onSubmit: (value: { name: string; wageCents: number; weekStartsOn: number; usualRoleName: string }) => Promise<void>;
  withHeader?: boolean;
}) {
  const { palette } = useTheme();
  const [name, setName] = useState("");
  const [role, setRole] = useState("Server");
  const [wage, setWage] = useState("");
  const [weekStartsOn, setWeekStartsOn] = useState(DEFAULT_WEEK_STARTS_ON);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const nextErrors: string[] = [];
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 40) nextErrors.push("Enter a name, up to 40 characters.");
    const parsed = parseMoney(wage);
    if (parsed.status !== "ok") nextErrors.push("Enter your hourly wage.");
    setErrors(nextErrors);
    if (nextErrors.length > 0 || parsed.status !== "ok") return;
    setBusy(true);
    try {
      await onSubmit({ name: trimmed, wageCents: parsed.cents, weekStartsOn, usualRoleName: role });
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Could not save the profile."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen withHeader={withHeader}>
      <Title>Tip Tracker</Title>
      <Text style={{ color: palette.muted, fontSize: 16, lineHeight: 22 }}>
        A profile is one set of books. A job, or a person. Nothing leaves this phone.
      </Text>
      <Field label="Profile name" value={name} keyboard="default" placeholder="Olive Garden" onChangeText={setName} />
      <View style={{ gap: 6 }}>
        <Text style={{ color: palette.muted, fontWeight: "600" }}>Usual role</Text>
        <Chips value={role} onChange={setRole} options={ROLES.map((item) => ({ value: item, label: item }))} />
        <Text style={{ color: palette.faint, fontSize: 14, lineHeight: 20 }}>
          Server tip-out starts at 4% of sales. That’s a guess — change the percent or switch it to tips in Settings if your restaurant does it differently.
        </Text>
      </View>
      <Field label="Default hourly wage" value={wage} placeholder="16.50" onChangeText={setWage} />
      <View style={{ gap: 6 }}>
        <Text style={{ color: palette.muted, fontWeight: "600" }}>Week starts on</Text>
        <WeekStartPicker value={weekStartsOn} onChange={setWeekStartsOn} />
      </View>
      <ErrorList errors={errors} />
      <Button label={busy ? "Saving…" : submitLabel} onPress={() => void submit()} disabled={busy} />
    </Screen>
  );
}
