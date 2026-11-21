import { useState } from "react";
import { Alert, View } from "react-native";
import { formatPercentInput } from "../../calc/format";
import { formatMoneyInput } from "../../calc/format";
import { parseMoney, parsePercent } from "../../calc/money";
import type { TipOutKind } from "../../calc/shift";
import type { Posture, Role } from "../../domain/types";
import type { RoleTipOutWrite } from "../../repo/repository";
import { Button, Chips, ErrorList, Field, Screen, Segment } from "../../ui/components";
import { useTheme } from "../../ui/theme";
import { Text } from "../../ui/text";

type Line = { key: string; label: string; amountText: string; percentText: string };

let key = 0;
function lineKey() {
  key += 1;
  return `role-line-${key}`;
}

export function RoleEditor({
  role,
  profileWageCents,
  onSave,
  onDelete,
}: {
  role?: Role;
  profileWageCents: number;
  onSave: (value: {
    name: string;
    posture: Posture;
    defaultWageCents: number | null;
    tipOutSettlement: "cash" | "paycheck";
    tipOutDefaults: RoleTipOutWrite[];
  }) => Promise<void>;
  onDelete?: () => void;
}) {
  const { palette } = useTheme();
  const [name, setName] = useState(role?.name ?? "");
  const [posture, setPosture] = useState<Posture>(role?.posture ?? "tips_out");
  const [wage, setWage] = useState(role?.defaultWageCents == null ? "" : formatMoneyInput(role.defaultWageCents));
  const [settlement, setSettlement] = useState<"cash" | "paycheck">(role?.tipOutSettlement ?? "cash");
  const [kind, setKind] = useState<TipOutKind>(role?.tipOutDefaults[0]?.kind ?? "percent_of_sales");
  const [lines, setLines] = useState<Line[]>(
    role && role.tipOutDefaults.length > 0
      ? role.tipOutDefaults.map((line) => ({
          key: lineKey(),
          label: line.label ?? "",
          amountText: line.amountCents == null ? "" : formatMoneyInput(line.amountCents),
          percentText: line.basisPoints == null ? "" : formatPercentInput(line.basisPoints),
        }))
      : [{ key: lineKey(), label: "", amountText: "", percentText: "" }],
  );
  const [errors, setErrors] = useState<string[]>([]);

  async function save() {
    const nextErrors: string[] = [];
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 24) nextErrors.push("Enter a role name, up to 24 characters.");
    let wageCents: number | null = null;
    if (wage.trim() !== "") {
      const parsed = parseMoney(wage);
      if (parsed.status !== "ok") nextErrors.push("Enter a wage, or leave it blank to use the profile wage.");
      else wageCents = parsed.cents;
    }
    const written: RoleTipOutWrite[] = [];
    const meaningful = lines.filter((line) => line.label.trim() || line.amountText.trim() || line.percentText.trim());
    for (const line of meaningful) {
      const label = line.label.trim() ? line.label.trim() : null;
      if (label && label.length > 30) nextErrors.push("A name can’t be longer than 30 characters.");
      if (kind === "flat") {
        const amount = parseMoney(line.amountText);
        if (amount.status === "negative") nextErrors.push("Amount can’t be negative.");
        else if (amount.status !== "ok" || amount.cents === 0) nextErrors.push("Enter the amount.");
        else written.push({ label, kind, amountCents: amount.cents, basisPoints: null });
      } else {
        const percent = parsePercent(line.percentText);
        if (percent.status === "negative") nextErrors.push("Amount can’t be negative.");
        else if (percent.status !== "ok") nextErrors.push("Enter the amount.");
        else if (percent.basisPoints > 10000) nextErrors.push("Tip-out percent can’t be over 100%.");
        else written.push({ label, kind, amountCents: null, basisPoints: percent.basisPoints });
      }
    }
    if (written.length > 1 && written.some((line) => !line.label)) nextErrors.push("Who was this for?");
    const unique = [...new Set(nextErrors)];
    setErrors(unique);
    if (unique.length > 0) return;
    const high = written.some((line) => (line.basisPoints ?? 0) > 2000);
    if (high) {
      const accepted = await new Promise<boolean>((resolve) => {
        Alert.alert("That’s a high tip-out percent. Save it if it’s right.", undefined, [
          { text: "Go back", style: "cancel", onPress: () => resolve(false) },
          { text: "Save it", onPress: () => resolve(true) },
        ]);
      });
      if (!accepted) return;
    }
    try {
      await onSave({
        name: trimmed,
        posture,
        defaultWageCents: wageCents,
        tipOutSettlement: settlement,
        tipOutDefaults: written,
      });
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Could not save the role."]);
    }
  }

  return (
    <Screen withHeader>
      <Field label="Name" value={name} keyboard="default" onChangeText={setName} />
      <Text style={{ color: palette.muted, fontWeight: "600" }}>What this role usually does</Text>
      <Segment
        value={posture}
        onChange={setPosture}
        options={[
          { value: "tips_out", label: "I tip out" },
          { value: "receives_share", label: "I receive tip share" },
          { value: "both", label: "Both" },
        ]}
      />
      <Field
        label="Usual wage"
        value={wage}
        hint="Blank uses the profile wage. It does not change shifts already saved."
        onChangeText={setWage}
      />
      <Text style={{ color: palette.muted, fontWeight: "600" }}>Tip-out settlement</Text>
      <Chips
        value={settlement}
        onChange={(value) => setSettlement(value as "cash" | "paycheck")}
        options={[
          { value: "cash", label: "Paid in cash" },
          { value: "paycheck", label: "Taken from paycheck" },
        ]}
      />
      <Text style={{ color: palette.faint, fontSize: 13 }}>A shift can still override this. It changes the cash-tonight split, not take-home.</Text>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>Usual tip-out</Text>
      <Segment
        value={kind}
        onChange={(next) => {
          setKind(next);
          setLines((current) => current.map((line) => ({ ...line, amountText: "", percentText: "" })));
        }}
        options={[
          { value: "percent_of_sales", label: "Sales" },
          { value: "percent_of_tips", label: "Tips" },
          { value: "flat", label: "Dollars" },
        ]}
      />
      {kind === "percent_of_tips" ? <Text style={{ color: palette.faint }}>Percent of tips uses guest tips only.</Text> : null}
      {lines.map((line, index) => (
        <View key={line.key} style={{ gap: 8 }}>
          <Field
            label={lines.length > 1 ? `Person ${index + 1}` : "Person (optional)"}
            value={line.label}
            keyboard="default"
            onChangeText={(label) => setLines((current) => current.map((item, i) => (i === index ? { ...item, label } : item)))}
          />
          {kind === "flat" ? (
            <Field
              label="Amount"
              value={line.amountText}
              onChangeText={(amountText) => setLines((current) => current.map((item, i) => (i === index ? { ...item, amountText } : item)))}
            />
          ) : (
            <Field
              label="Percent"
              value={line.percentText}
              onChangeText={(percentText) => setLines((current) => current.map((item, i) => (i === index ? { ...item, percentText } : item)))}
            />
          )}
          {lines.length > 1 ? (
            <Button label="Remove" kind="ghost" onPress={() => setLines((current) => current.filter((_, i) => i !== index))} />
          ) : null}
        </View>
      ))}
      <Button label="Add a person" kind="secondary" onPress={() => setLines((current) => [...current, { key: lineKey(), label: "", amountText: "", percentText: "" }])} />
      <Text style={{ color: palette.faint, fontSize: 13 }}>
        Every line on a role shares one base: all dollars, all percent of sales, or all percent of tips. People can still have different numbers.
      </Text>
      <ErrorList errors={errors} />
      <Button label="Save role" onPress={() => void save()} />
      {onDelete ? <Button label="Delete role" kind="danger" onPress={onDelete} /> : null}
    </Screen>
  );
}
