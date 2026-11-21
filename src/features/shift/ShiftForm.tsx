import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useNavigation } from "expo-router";
import { formatMoney } from "../../calc/format";
import { todayCivil } from "../../calc/dates";
import type { Profile, Role } from "../../domain/types";
import type { ShiftWrite } from "../../repo/repository";
import {
  Button,
  CheckRow,
  Chips,
  DateStepper,
  ErrorList,
  Field,
  Footer,
  Muted,
  Screen,
  Segment,
  TimeField,
} from "../../ui/components";
import { useTheme } from "../../ui/theme";
import {
  applyRole,
  createDraft,
  draftSignature,
  emptyLine,
  nextLineKey,
  prepareShift,
  roleIsTouched,
  showSalesField,
  tipOutPreview,
  usualTipOutQuestion,
  wageDiffersFromRole,
  type ShiftDraft,
} from "./model";
import { Text } from "../../ui/text";

export function ShiftForm({
  profile,
  roles,
  initial,
  submitLabel,
  onSubmit,
  onDelete,
}: {
  profile: Profile;
  roles: Role[];
  initial?: ShiftDraft;
  submitLabel: string;
  onSubmit: (write: ShiftWrite) => Promise<void>;
  onDelete?: () => void;
}) {
  const { palette } = useTheme();
  const navigation = useNavigation() as {
    addListener: (
      event: "beforeRemove",
      callback: (event: { preventDefault: () => void; data?: { action?: unknown } }) => void,
    ) => () => void;
    dispatch: (action: unknown) => void;
  };
  const [draft, setDraft] = useState<ShiftDraft>(() => initial ?? createDraft(profile, roles, todayCivil()));
  const [submitted, setSubmitted] = useState(false);
  const initialSignature = useRef(draftSignature(draft));
  const saved = useRef(false);
  const today = todayCivil();
  const prepared = useMemo(() => prepareShift(draft, profile, roles, today), [draft, profile, roles, today]);
  const role = roles.find((item) => item.id === draft.roleId);
  const dirty = draftSignature(draft) !== initialSignature.current;

  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (event) => {
      if (saved.current || !dirty) return;
      event.preventDefault();
      Alert.alert("Discard this shift?", undefined, [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => navigation.dispatch(event.data?.action),
        },
      ]);
    });
    return sub;
  }, [dirty, navigation]);

  function patch(partial: Partial<ShiftDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function chooseRole(roleId: string) {
    const next = roles.find((item) => item.id === roleId);
    if (!next || next.id === draft.roleId) return;
    const apply = (copySaved: boolean) => setDraft((current) => applyRole(current, next, profile, { copySaved }));
    if (!roleIsTouched(draft)) {
      apply(true);
      return;
    }
    Alert.alert(usualTipOutQuestion(next), undefined, [
      { text: "Keep mine", style: "cancel", onPress: () => patch({ roleId: next.id, orphanRoleName: null }) },
      { text: "Use that", onPress: () => apply(true) },
    ]);
  }

  async function save() {
    setSubmitted(true);
    const result = prepareShift(draft, profile, roles, todayCivil());
    if (!result.write) return;
    if (result.warnings.length > 0) {
      const accepted = await new Promise<boolean>((resolve) => {
        Alert.alert("Check this shift", result.warnings.join("\n\n"), [
          { text: "Go back", style: "cancel", onPress: () => resolve(false) },
          { text: "Save it", onPress: () => resolve(true) },
        ]);
      });
      if (!accepted || !result.write) return;
    }
    saved.current = true;
    try {
      await onSubmit(result.write);
    } catch (error) {
      saved.current = false;
      Alert.alert("Could not save this shift", error instanceof Error ? error.message : "Nothing was changed.");
    }
  }

  const salesVisible = showSalesField(draft);
  const preview = tipOutPreview(draft);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen withHeader footer={<LiveFooter live={prepared.live} errors={submitted ? prepared.errors : []} label={submitLabel} onSave={() => void save()} />}>
        <DateStepper value={draft.date} max={today} onChange={(date) => patch({ date })} />

        <View style={{ gap: 6 }}>
          <Muted>Role</Muted>
          <Chips
            value={draft.roleId}
            onChange={chooseRole}
            options={[
              ...(draft.orphanRoleName && !draft.roleId ? [{ value: "orphan", label: draft.orphanRoleName }] : []),
              ...roles.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Segment
            value={draft.hoursMode}
            onChange={(hoursMode) => patch({ hoursMode })}
            options={[
              { value: "clock", label: "Start & end" },
              { value: "duration", label: "Total hours" },
            ]}
          />
          {draft.hoursMode === "clock" ? (
            <View style={{ gap: 12 }}>
              <TimeField
                label="Start"
                hour={draft.startHour}
                minute={draft.startMinute}
                ampm={draft.startAmPm}
                onChange={(next) => patch({ startHour: next.hour, startMinute: next.minute, startAmPm: next.ampm })}
              />
              <TimeField
                label="End"
                hour={draft.endHour}
                minute={draft.endMinute}
                ampm={draft.endAmPm}
                onChange={(next) => patch({ endHour: next.hour, endMinute: next.minute, endAmPm: next.ampm })}
              />
              <Muted>If the end is earlier than the start, the shift crossed midnight. The date stays the day you picked.</Muted>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="Hours" value={draft.hoursText} onChangeText={(hoursText) => patch({ hoursText })} />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Minutes"
                  value={draft.minutesText}
                  keyboard="number-pad"
                  onChangeText={(minutesText) => patch({ minutesText })}
                  hint="Or use a decimal, like 6.5"
                />
              </View>
            </View>
          )}
        </View>

        <Field
          label="Hourly wage"
          value={draft.wageText}
          onChangeText={(wageText) => patch({ wageText, wageTouched: true, saveUsualWage: false })}
        />
        {wageDiffersFromRole(draft, role, profile) ? (
          <CheckRow
            label="Save as usual wage"
            checked={draft.saveUsualWage}
            onPress={() => patch({ saveUsualWage: !draft.saveUsualWage })}
          />
        ) : null}

        <View style={{ gap: 8 }}>
          <Segment
            value={draft.tipsMode}
            onChange={(tipsMode) => patch({ tipsMode })}
            options={[
              { value: "total", label: "Total" },
              { value: "split", label: "Cash & card" },
            ]}
          />
          {draft.tipsMode === "total" ? (
            <Field label="Guest tips" value={draft.tipsTotalText} onChangeText={(tipsTotalText) => patch({ tipsTotalText })} hint="Blank saves as $0.00." />
          ) : (
            <View style={{ gap: 12 }}>
              <Field label="Cash tips" value={draft.cashText} onChangeText={(cashText) => patch({ cashText })} />
              <Field label="Card tips" value={draft.cardText} onChangeText={(cardText) => patch({ cardText })} />
            </View>
          )}
        </View>

        {draft.tipOutOpen ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>Tip-out</Text>
            <Segment
              value={draft.tipOutKind}
              onChange={(tipOutKind) =>
                patch({
                  tipOutKind,
                  tipOutTouched: true,
                  salesOpen: tipOutKind === "percent_of_sales" ? true : draft.salesOpen,
                  tipOutLines: draft.tipOutLines.map((line) => ({ ...line, amountText: "", percentText: "" })),
                })
              }
              options={[
                { value: "percent_of_sales", label: "Sales" },
                { value: "percent_of_tips", label: "Tips" },
                { value: "flat", label: "Dollars" },
              ]}
            />
            {draft.tipOutKind === "percent_of_tips" ? (
              <Muted>Percent of tips uses guest tips only, not tip share you received.</Muted>
            ) : null}
            {draft.tipOutLines.map((line, index) => (
              <View key={line.key} style={{ gap: 8 }}>
                <Field
                  label={draft.tipOutLines.length > 1 ? `Person ${index + 1}` : "Person (optional)"}
                  value={line.label}
                  keyboard="default"
                  onChangeText={(label) => updateLine(index, { label })}
                />
                {draft.tipOutKind === "flat" ? (
                  <Field label="Amount" value={line.amountText} onChangeText={(amountText) => updateLine(index, { amountText })} />
                ) : (
                  <Field label="Percent" value={line.percentText} onChangeText={(percentText) => updateLine(index, { percentText })} />
                )}
                {draft.tipOutLines.length > 1 ? (
                  <Button label="Remove" kind="ghost" onPress={() => removeLine(index)} />
                ) : null}
              </View>
            ))}
            <Button
              label="Add a person"
              kind="secondary"
              onPress={() => patch({ tipOutTouched: true, tipOutLines: [...draft.tipOutLines, emptyLine()] })}
            />
            <View style={{ backgroundColor: palette.cardAlt, borderRadius: 12, padding: 12 }}>
              <Text style={{ color: palette.accent, fontSize: 16, fontWeight: "700" }}>{preview}</Text>
            </View>
            <Muted>How was tip-out paid? This splits cash tonight from the paycheck. It doesn’t change take-home.</Muted>
            <Chips
              value={draft.settlement}
              onChange={(settlement) => patch({ settlement: settlement as "cash" | "paycheck", settlementTouched: true })}
              options={[
                { value: "cash", label: "Paid in cash" },
                { value: "paycheck", label: "Taken from paycheck" },
              ]}
            />
            <CheckRow
              label={`Save tip-out as usual for ${role?.name ?? "this role"}`}
              hint="Saves these lines and whether tip-out is cash or paycheck."
              checked={draft.saveUsualTipOut}
              onPress={() => patch({ saveUsualTipOut: !draft.saveUsualTipOut })}
            />
          </View>
        ) : (
          <Button label="I also tipped someone out" kind="secondary" onPress={() => patch({ tipOutOpen: true, tipOutTouched: true })} />
        )}

        {salesVisible ? (
          <Field
            label="Sales"
            value={draft.salesText}
            hint="Blank is not zero. Type 0 if sales were $0."
            onChangeText={(salesText) => patch({ salesText, salesOpen: true })}
          />
        ) : (
          <Button label="Add sales" kind="secondary" onPress={() => patch({ salesOpen: true })} />
        )}

        {draft.tipShareOpen ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: "700" }}>Tip share received</Text>
            {draft.tipShareLines.length === 0 ? (
              <Field
                label="Amount"
                value={draft.tipShareTotalText}
                hint="Blank saves as $0.00."
                onChangeText={(tipShareTotalText) => patch({ tipShareTotalText, tipShareTouched: true })}
              />
            ) : (
              draft.tipShareLines.map((line, index) => (
                <View key={line.key} style={{ gap: 8 }}>
                  <Field
                    label="From whom (optional)"
                    value={line.label}
                    keyboard="default"
                    onChangeText={(label) => updateShare(index, { label })}
                  />
                  <Field label="Amount" value={line.amountText} onChangeText={(amountText) => updateShare(index, { amountText })} />
                  <Button
                    label="Remove"
                    kind="ghost"
                    onPress={() =>
                      patch({
                        tipShareTouched: true,
                        tipShareLines: draft.tipShareLines.filter((_, lineIndex) => lineIndex !== index),
                      })
                    }
                  />
                </View>
              ))
            )}
            <Button
              label="Add who it came from"
              kind="secondary"
              onPress={() =>
                patch({
                  tipShareTouched: true,
                  tipShareLines: [...draft.tipShareLines, { key: nextLineKey(), label: "", amountText: "", percentText: "" }],
                })
              }
            />
            <Muted>If you add people, the tip share total is their sum.</Muted>
          </View>
        ) : (
          <Button label="I also received tip share" kind="secondary" onPress={() => patch({ tipShareOpen: true, tipShareTouched: true })} />
        )}

        <Pressable accessibilityRole="button" onPress={() => patch({ classificationOpen: !draft.classificationOpen })} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: palette.olive, fontSize: 16, fontWeight: "700" }}>
            {draft.classificationOpen ? "Hide how this shift is counted" : "Fix how this shift is counted"}
          </Text>
        </Pressable>
        {draft.classificationOpen ? (
          <View style={{ gap: 10 }}>
            <Muted>{prepared.counted}</Muted>
            <Muted>Meal</Muted>
            <Chips
              value={draft.mealChoice}
              onChange={(mealChoice) => patch({ mealChoice: mealChoice as ShiftDraft["mealChoice"] })}
              options={[
                { value: "lunch", label: "Lunch" },
                { value: "dinner", label: "Dinner" },
                { value: "infer", label: "Leave blank" },
              ]}
            />
            <Muted>Length</Muted>
            <Chips
              value={draft.doubleChoice}
              onChange={(doubleChoice) => patch({ doubleChoice: doubleChoice as ShiftDraft["doubleChoice"] })}
              options={[
                { value: "double", label: "Double / all-day" },
                { value: "single", label: "Single" },
                { value: "infer", label: "Decide from the hours" },
              ]}
            />
          </View>
        ) : (
          <Muted>{prepared.counted}</Muted>
        )}

        {draft.notesOpen ? (
          <Field
            label="Note"
            value={draft.notes}
            keyboard="default"
            multiline
            maxLength={500}
            onChangeText={(notes) => patch({ notes })}
          />
        ) : (
          <Button label="Add a note" kind="secondary" onPress={() => patch({ notesOpen: true })} />
        )}

        {onDelete ? <Button label="Delete shift" kind="danger" onPress={onDelete} /> : null}
      </Screen>
    </KeyboardAvoidingView>
  );

  function updateLine(index: number, partial: Partial<ShiftDraft["tipOutLines"][number]>) {
    setDraft((current) => ({
      ...current,
      tipOutTouched: true,
      tipOutLines: current.tipOutLines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...partial } : line)),
    }));
  }

  function removeLine(index: number) {
    setDraft((current) => ({
      ...current,
      tipOutTouched: true,
      tipOutLines: current.tipOutLines.filter((_, lineIndex) => lineIndex !== index),
    }));
  }

  function updateShare(index: number, partial: Partial<ShiftDraft["tipShareLines"][number]>) {
    setDraft((current) => ({
      ...current,
      tipShareTouched: true,
      tipShareLines: current.tipShareLines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...partial } : line)),
    }));
  }
}

function LiveFooter({
  live,
  errors,
  label,
  onSave,
}: {
  live: { hoursLabel: string; tipOutLabel: string; netLabel: string; takeHomeLabel: string; hourlyLabel: string };
  errors: string[];
  label: string;
  onSave: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Footer>
      <ErrorList errors={errors} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Stat label="Hours" value={live.hoursLabel} />
        <Stat label="Tip-out" value={live.tipOutLabel} />
        <Stat label="Net tips" value={live.netLabel} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View>
          <Text style={{ color: palette.faint, fontSize: 12 }}>Take-home</Text>
          <Text style={{ color: palette.accent, fontSize: 28, fontWeight: "800" }}>{live.takeHomeLabel}</Text>
        </View>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: "700" }}>{live.hourlyLabel}</Text>
      </View>
      <Button label={label} onPress={onSave} />
    </Footer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: palette.faint, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: palette.text, fontSize: 14, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

export function moneyOrDash(cents: number | null): string {
  return cents == null ? "—" : formatMoney(cents);
}
