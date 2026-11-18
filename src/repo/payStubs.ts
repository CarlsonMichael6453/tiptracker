import type { PayStub } from "../domain/types";
import { nowIso } from "../db/time";
import { isWebDatabase, type AppDatabase } from "../db/types";
import { newId } from "./ids";

export type PayStubWrite = Omit<PayStub, "id" | "createdAt">;

export async function listPayStubs(db: AppDatabase, profileId: string): Promise<PayStub[]> {
  if (isWebDatabase(db)) {
    return db.read((state) =>
      (state.payStubs ?? [])
        .filter((stub) => stub.profileId === profileId)
        .slice()
        .sort((a, b) => (a.payDate ?? a.periodEnd) < (b.payDate ?? b.periodEnd) ? 1 : -1),
    );
  }
  const rows = await db.getAllAsync<StubRow>(
    "SELECT * FROM pay_stub WHERE profile_id = ? ORDER BY COALESCE(pay_date, period_end) DESC",
    profileId,
  );
  return rows.map(mapStub);
}

export async function getPayStub(db: AppDatabase, id: string): Promise<PayStub | null> {
  if (isWebDatabase(db)) return db.read((state) => (state.payStubs ?? []).find((stub) => stub.id === id) ?? null);
  const row = await db.getFirstAsync<StubRow>("SELECT * FROM pay_stub WHERE id = ?", id);
  return row ? mapStub(row) : null;
}

export async function createPayStub(db: AppDatabase, input: PayStubWrite): Promise<string> {
  const stub: PayStub = { ...input, id: newId(), createdAt: nowIso() };
  if (isWebDatabase(db)) {
    await db.update((state) => {
      state.payStubs = state.payStubs ?? [];
      state.payStubs.push(stub);
    });
    return stub.id;
  }
  await db.runAsync(
    `INSERT INTO pay_stub (id, profile_id, period_start, period_end, pay_date, regular_minutes, overtime_minutes, hourly_rate_cents, gross_wages_cents, cash_tips_cents, card_tips_cents, gross_pay_cents, other_deductions_cents, net_pay_cents, taxes_json, confidence_json, photo_data_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    stub.id,
    stub.profileId,
    stub.periodStart,
    stub.periodEnd,
    stub.payDate,
    stub.regularMinutes,
    stub.overtimeMinutes,
    stub.hourlyRateCents,
    stub.grossWagesCents,
    stub.cashTipsCents,
    stub.cardTipsCents,
    stub.grossPayCents,
    stub.otherDeductionsCents,
    stub.netPayCents,
    JSON.stringify(stub.taxes),
    JSON.stringify(stub.confidence),
    stub.photoDataUrl,
    stub.createdAt,
  );
  return stub.id;
}

export async function deletePayStub(db: AppDatabase, id: string): Promise<void> {
  if (isWebDatabase(db)) {
    await db.update((state) => {
      state.payStubs = (state.payStubs ?? []).filter((stub) => stub.id !== id);
    });
    return;
  }
  await db.runAsync("DELETE FROM pay_stub WHERE id = ?", id);
}

type StubRow = {
  id: string;
  profile_id: string;
  period_start: string;
  period_end: string;
  pay_date: string | null;
  regular_minutes: number;
  overtime_minutes: number;
  hourly_rate_cents: number;
  gross_wages_cents: number;
  cash_tips_cents: number;
  card_tips_cents: number;
  gross_pay_cents: number;
  other_deductions_cents: number;
  net_pay_cents: number;
  taxes_json: string;
  confidence_json: string;
  photo_data_url: string | null;
  created_at: string;
};

function mapStub(row: StubRow): PayStub {
  return {
    id: row.id,
    profileId: row.profile_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    payDate: row.pay_date,
    regularMinutes: row.regular_minutes,
    overtimeMinutes: row.overtime_minutes,
    hourlyRateCents: row.hourly_rate_cents,
    grossWagesCents: row.gross_wages_cents,
    cashTipsCents: row.cash_tips_cents,
    cardTipsCents: row.card_tips_cents,
    grossPayCents: row.gross_pay_cents,
    otherDeductionsCents: row.other_deductions_cents,
    netPayCents: row.net_pay_cents,
    taxes: JSON.parse(row.taxes_json),
    confidence: JSON.parse(row.confidence_json),
    photoDataUrl: row.photo_data_url,
    createdAt: row.created_at,
  };
}
