-- Per-user trial + chamber subscription. Status is stored, access is computed
-- from trial_ends_at / period_end so a cancelled plan still works until it lapses.
create table if not exists entitlements (
  user_id text primary key,
  status text not null default 'trial',
  plan text not null default 'chamber_monthly',
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null,
  subscribed_at timestamptz,
  period_end timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now()
);
