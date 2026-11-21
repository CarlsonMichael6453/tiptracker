import { useState } from "react";
import { View } from "react-native";
import { Text } from "../../ui/text";
import { Button, Chips, ErrorList, Field, Screen, Title } from "../../ui/components";
import { useTheme } from "../../ui/theme";
import { EMPTY_INTRO, INTRO_JOBS, introProfile } from "./intro";

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
  const [name, setName] = useState(EMPTY_INTRO.name);
  const [job, setJob] = useState(EMPTY_INTRO.job);
  const [wage, setWage] = useState(EMPTY_INTRO.wage);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const result = introProfile({ name, job, wage });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setBusy(true);
    try {
      await onSubmit({
        name: result.name,
        wageCents: result.wageCents,
        weekStartsOn: result.weekStartsOn,
        usualRoleName: result.usualRoleName,
      });
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Could not save the profile."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen withHeader={withHeader}>
      <Title>Quick intro?</Title>
      <Text style={{ color: palette.text, fontSize: 17, lineHeight: 24 }}>
        Just add your name or your job so we know whose tips these are. Or tell us a little about yourself, no pressure.
      </Text>
      <Field label="Name" value={name} keyboard="default" onChangeText={setName} />
      <View style={{ gap: 6 }}>
        <Text style={{ color: palette.muted, fontWeight: "600" }}>Job</Text>
        <Chips value={job} onChange={setJob} options={INTRO_JOBS.map((item) => ({ value: item, label: item }))} />
      </View>
      <Field label="Hourly wage, if you want" value={wage} onChangeText={setWage} hint="You can add this later." />
      <ErrorList errors={errors} />
      <Button label={busy ? "Saving…" : submitLabel} onPress={() => void submit()} disabled={busy} />
    </Screen>
  );
}
