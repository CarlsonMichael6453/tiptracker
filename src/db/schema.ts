/** First release. user_version 1. Money is cents, percents are basis points, durations are minutes. */
export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profile (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  default_wage_cents INTEGER NOT NULL CHECK (default_wage_cents >= 0),
  week_starts_on INTEGER NOT NULL CHECK (week_starts_on BETWEEN 0 AND 6),
  lunch_cutoff_minutes INTEGER NOT NULL CHECK (lunch_cutoff_minutes BETWEEN 0 AND 1439),
  double_threshold_minutes INTEGER NOT NULL CHECK (double_threshold_minutes BETWEEN 360 AND 720),
  last_role_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  posture TEXT NOT NULL CHECK (posture IN ('tips_out', 'receives_share', 'both')),
  default_wage_cents INTEGER CHECK (default_wage_cents IS NULL OR default_wage_cents >= 0),
  tip_out_settlement TEXT NOT NULL CHECK (tip_out_settlement IN ('cash', 'paycheck')),
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS role_name_unique ON role (profile_id, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS role_tip_out_default (
  id TEXT PRIMARY KEY NOT NULL,
  role_id TEXT NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  label TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('flat', 'percent_of_sales', 'percent_of_tips')),
  amount_cents INTEGER,
  basis_points INTEGER,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shift (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  role_id TEXT REFERENCES role(id) ON DELETE SET NULL,
  role_name TEXT NOT NULL,
  shift_date TEXT NOT NULL,
  hours_mode TEXT NOT NULL CHECK (hours_mode IN ('clock', 'duration')),
  start_minutes INTEGER,
  end_minutes INTEGER,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 1440),
  wage_cents INTEGER NOT NULL CHECK (wage_cents >= 0),
  tips_mode TEXT NOT NULL CHECK (tips_mode IN ('total', 'split')),
  tips_total_cents INTEGER,
  cash_tips_cents INTEGER,
  card_tips_cents INTEGER,
  sales_cents INTEGER,
  tip_share_mode TEXT NOT NULL CHECK (tip_share_mode IN ('none', 'total', 'itemized')),
  meal_override TEXT CHECK (meal_override IS NULL OR meal_override IN ('lunch', 'dinner')),
  double_override INTEGER CHECK (double_override IS NULL OR double_override IN (0, 1)),
  tip_out_settlement TEXT NOT NULL CHECK (tip_out_settlement IN ('cash', 'paycheck')),
  notes TEXT,
  guest_tips_cents INTEGER NOT NULL,
  tip_share_cents INTEGER NOT NULL CHECK (tip_share_cents >= 0),
  gross_tips_cents INTEGER NOT NULL,
  tip_out_total_cents INTEGER NOT NULL CHECK (tip_out_total_cents >= 0),
  wage_earnings_cents INTEGER NOT NULL,
  net_tips_cents INTEGER NOT NULL,
  take_home_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (hours_mode = 'clock' AND start_minutes IS NOT NULL AND end_minutes IS NOT NULL AND start_minutes != end_minutes AND duration_minutes BETWEEN 1 AND 1439)
    OR
    (hours_mode = 'duration' AND start_minutes IS NULL AND end_minutes IS NULL)
  ),
  CHECK (
    (tips_mode = 'total' AND tips_total_cents IS NOT NULL AND cash_tips_cents IS NULL AND card_tips_cents IS NULL)
    OR
    (tips_mode = 'split' AND tips_total_cents IS NULL AND cash_tips_cents IS NOT NULL AND card_tips_cents IS NOT NULL)
  ),
  CHECK (tip_share_mode != 'none' OR tip_share_cents = 0),
  CHECK (notes IS NULL OR length(notes) <= 500)
);

CREATE INDEX IF NOT EXISTS shift_profile_date ON shift (profile_id, shift_date);

CREATE TABLE IF NOT EXISTS tip_out_line (
  id TEXT PRIMARY KEY NOT NULL,
  shift_id TEXT NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
  label TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('flat', 'percent_of_sales', 'percent_of_tips')),
  basis_points INTEGER,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tip_share_line (
  id TEXT PRIMARY KEY NOT NULL,
  shift_id TEXT NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
  label TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;
