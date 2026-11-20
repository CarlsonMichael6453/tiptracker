import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { compareStubToShifts, formatHours, hoursToMinutes, isLowConfidence, parsePayStub, taxTotalCents, type StubDraft } from "../../src/calc/payStub";
import { speakMoney } from "../../src/calc/tipJar";
import { parseMoney } from "../../src/calc/money";
import { listShifts } from "../../src/repo/repository";
import { requestReviewMoment } from "../../src/feedback/reviewBus";
import { shouldAskAfterCleanStub } from "../../src/feedback/message";
import { createPayStub } from "../../src/repo/payStubs";
import { peekPendingScan } from "../../src/scan/pending";
import { useApp } from "../../src/state/AppState";
import { Screen } from "../../src/ui/components";
import { useTheme } from "../../src/ui/theme";
import { useEffect } from "react";
import type { LoggedSlice } from "../../src/calc/payStub";
import { Text, TextInput } from "../../src/ui/text";

export default function ReviewStub() {
  const pending = peekPendingScan();
  const initial = useMemo(() => parsePayStub(pending?.text ?? ""), [pending?.text]);
  const [draft, setDraft] = useState<StubDraft>(initial);
  const [keepPhoto, setKeepPhoto] = useState(false);
  const [shifts, setShifts] = useState<LoggedSlice[]>([]);
  const [error, setError] = useState("");
  const { db, activeProfile } = useApp();
  const { palette } = useTheme();

  useEffect(() => {
    if (!db || !activeProfile) return;
    void listShifts(db, activeProfile.id).then((rows) =>
      setShifts(
        rows.map((shift) => ({
          shiftDate: shift.shiftDate,
          durationMinutes: shift.durationMinutes,
          wageEarningsCents: shift.wageEarningsCents,
          cashTipsCents: shift.cashTipsCents,
          cardTipsCents: shift.cardTipsCents,
        })),
      ),
    );
  }, [db, activeProfile]);

  const compared = compareStubToShifts({ draft, shifts });
  const taxes = taxTotalCents(draft);

  const save = async () => {
    if (!db || !activeProfile) return;
    if (!draft.periodStart || !draft.periodEnd) {
      setError("Enter the pay period start and end before saving.");
      return;
    }
    const id = await createPayStub(db, {
      profileId: activeProfile.id,
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
      payDate: draft.payDate,
      regularMinutes: hoursToMinutes(draft.regularHours ?? 0),
      overtimeMinutes: hoursToMinutes(draft.overtimeHours ?? 0),
      hourlyRateCents: draft.hourlyRateCents ?? 0,
      grossWagesCents: draft.grossWagesCents ?? 0,
      cashTipsCents: draft.cashTipsCents ?? 0,
      cardTipsCents: draft.cardTipsCents ?? 0,
      grossPayCents: draft.grossPayCents ?? 0,
      otherDeductionsCents: draft.otherDeductionsCents ?? 0,
      netPayCents: draft.netPayCents ?? 0,
      taxes: draft.taxes,
      confidence: draft.confidence,
      photoDataUrl: keepPhoto ? pending?.photoDataUrl ?? null : null,
    });
    router.replace(`/stub/${id}`);
    if (shouldAskAfterCleanStub(compared.mismatches.length)) requestReviewMoment("stub");
  };

  if (!pending) {
    return (
      <Screen withHeader>
        <Text style={{ color: palette.text }}>Nothing is waiting to review.</Text>
      </Screen>
    );
  }

  return (
    <Screen withHeader>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}>Check this stub</Text>
      <Text style={{ color: palette.muted }}>Highlighted fields were a weak read. Correct anything that looks wrong. Nothing is saved until you confirm.</Text>
      <Edit label="Pay period start" field="periodStart" value={draft.periodStart ?? ""} draft={draft} onChange={(value) => setDraft({ ...draft, periodStart: value || null })} />
      <Edit label="Pay period end" field="periodEnd" value={draft.periodEnd ?? ""} draft={draft} onChange={(value) => setDraft({ ...draft, periodEnd: value || null })} />
      <Edit label="Pay date" field="payDate" value={draft.payDate ?? ""} draft={draft} onChange={(value) => setDraft({ ...draft, payDate: value || null })} />
      <Edit label="Regular hours" field="regularHours" value={draft.regularHours == null ? "" : String(draft.regularHours)} draft={draft} onChange={(value) => setDraft({ ...draft, regularHours: numberOrNull(value) })} />
      <Edit label="Overtime hours" field="overtimeHours" value={draft.overtimeHours == null ? "" : String(draft.overtimeHours)} draft={draft} onChange={(value) => setDraft({ ...draft, overtimeHours: numberOrNull(value) })} />
      <MoneyEdit label="Hourly rate" field="hourlyRateCents" cents={draft.hourlyRateCents} draft={draft} onChange={(cents) => setDraft({ ...draft, hourlyRateCents: cents })} />
      <MoneyEdit label="Gross wages" field="grossWagesCents" cents={draft.grossWagesCents} draft={draft} onChange={(cents) => setDraft({ ...draft, grossWagesCents: cents })} />
      <MoneyEdit label="Cash tips declared" field="cashTipsCents" cents={draft.cashTipsCents} draft={draft} onChange={(cents) => setDraft({ ...draft, cashTipsCents: cents })} />
      <MoneyEdit label="Card tips" field="cardTipsCents" cents={draft.cardTipsCents} draft={draft} onChange={(cents) => setDraft({ ...draft, cardTipsCents: cents })} />
      <MoneyEdit label="Gross pay" field="grossPayCents" cents={draft.grossPayCents} draft={draft} onChange={(cents) => setDraft({ ...draft, grossPayCents: cents })} />
      {draft.taxes.map((line, index) => (
        <MoneyEdit
          key={line.name}
          label={line.name}
          field={`tax:${line.name}`}
          cents={line.cents}
          draft={draft}
          onChange={(cents) => {
            const taxes = draft.taxes.slice();
            taxes[index] = { name: line.name, cents: cents ?? 0 };
            setDraft({ ...draft, taxes });
          }}
        />
      ))}
      <MoneyEdit label="Other deductions" field="otherDeductionsCents" cents={draft.otherDeductionsCents} draft={draft} onChange={(cents) => setDraft({ ...draft, otherDeductionsCents: cents })} />
      <MoneyEdit label="Net pay" field="netPayCents" cents={draft.netPayCents} draft={draft} onChange={(cents) => setDraft({ ...draft, netPayCents: cents })} />

      <Text style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}>What was taken out</Text>
      <Text style={{ color: palette.text }}>Taxes {speakMoney(taxes)}{compared.taxPercent != null ? ` · ${compared.taxPercent}% of gross` : ""}</Text>
      {draft.taxes.map((line) => (
        <Text key={line.name} style={{ color: palette.muted }}>{line.name} {speakMoney(line.cents)}</Text>
      ))}
      <Text style={{ color: palette.text }}>Other deductions {speakMoney(draft.otherDeductionsCents ?? 0)}</Text>
      <Text style={{ color: palette.text, fontWeight: "700" }}>Net {speakMoney(draft.netPayCents ?? 0)}</Text>
      <Text style={{ color: palette.muted }}>Net pay is what’s left after taxes and other deductions. Cash tips you already kept are not in the deposit.</Text>

      <Text style={{ color: palette.text, fontSize: 18, fontWeight: "800" }}>Against your shifts</Text>
      <Text style={{ color: palette.muted }}>Stub hours {formatHours(compared.stubHours)} · logged {formatHours(compared.loggedHours)}</Text>
      {compared.mismatches.length === 0 ? <Text style={{ color: palette.text }}>Nothing is outside the small tolerance.</Text> : compared.mismatches.map((item) => (
        <Text key={item.id} style={{ color: palette.text }}>{item.message}</Text>
      ))}
      <Text style={{ color: palette.faint, fontSize: 13 }}>This is a personal record, not tax or legal advice. If something looks off, ask your manager or payroll.</Text>
      {pending.photoDataUrl ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Keep the photo on this device" onPress={() => setKeepPhoto((value) => !value)} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: palette.text }}>{keepPhoto ? "Photo will be kept on this device" : "Don’t keep the photo"}</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Save stub" onPress={() => void save()} style={{ minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.primary }}>
        <Text style={{ color: palette.onPrimary, fontWeight: "700", fontSize: 17 }}>Save stub</Text>
      </Pressable>
    </Screen>
  );
}

function Edit({ label, field, value, draft, onChange }: { label: string; field: string; value: string; draft: StubDraft; onChange: (value: string) => void }) {
  const { palette } = useTheme();
  const low = isLowConfidence(draft, field);
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: low ? palette.warning : palette.muted, fontWeight: "600" }}>{label}{low ? " · check this" : ""}</Text>
      <TextInput value={value} onChangeText={onChange} accessibilityLabel={label} autoCapitalize="none" style={{ minHeight: 48, borderWidth: low ? 2 : 1, borderColor: low ? palette.warning : palette.line, borderRadius: 12, paddingHorizontal: 12, color: palette.text, backgroundColor: palette.input, fontSize: 18 }} />
    </View>
  );
}

function MoneyEdit({ label, field, cents, draft, onChange }: { label: string; field: string; cents: number | null; draft: StubDraft; onChange: (cents: number | null) => void }) {
  const [text, setText] = useState(cents == null ? "" : (cents / 100).toFixed(2));
  return (
    <Edit
      label={label}
      field={field}
      value={text}
      draft={draft}
      onChange={(value) => {
        setText(value);
        if (value.trim() === "") {
          onChange(null);
          return;
        }
        const parsed = parseMoney(value);
        if (parsed.status === "ok") onChange(parsed.cents);
      }}
    />
  );
}

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
