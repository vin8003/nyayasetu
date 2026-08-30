-- Razorpay customer + subscription ids on the entitlement.
-- Access is still computed from status / period_end — these columns are how
-- we match a webhook to a chamber without trusting the browser.
alter table entitlements
  add column if not exists razorpay_customer_id text,
  add column if not exists razorpay_subscription_id text;

create unique index if not exists entitlements_razorpay_subscription_id_idx
  on entitlements (razorpay_subscription_id)
  where razorpay_subscription_id is not null;

-- One product-level Razorpay plan id, created lazily on first live subscribe.
create table if not exists billing_config (
  id text primary key,
  razorpay_plan_id text,
  updated_at timestamptz not null default now()
);

insert into billing_config (id) values ('default')
  on conflict (id) do nothing;
