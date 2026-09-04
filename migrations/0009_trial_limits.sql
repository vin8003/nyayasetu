-- Trial is 1 month or N live CNR fetches, whichever comes first.
-- One statement: Neon pooled connections reject multi-command queries.
alter table entitlements
  add column if not exists cnr_fetches_used integer not null default 0,
  add column if not exists cnr_fetch_limit integer;
