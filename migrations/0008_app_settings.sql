-- Global app settings (admin-controlled). Active court-data provider is one row.
create table if not exists app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

insert into app_settings (key, value)
values ('court_data_provider', 'eci_partner')
on conflict (key) do nothing;
