-- Chamber-wide trial defaults. Self-contained if 0008 has not run yet.
create table if not exists app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
