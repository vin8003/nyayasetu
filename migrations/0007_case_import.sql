-- Court import jobs, source metadata, and verification on the existing file.
alter table matters add column if not exists source_url text not null default '';
alter table matters add column if not exists court_source_id text not null default '';
alter table matters add column if not exists last_synced_at timestamptz;
alter table matters add column if not exists import_status text not null default '';

alter table matter_documents add column if not exists source_url text not null default '';
alter table matter_documents add column if not exists external_id text not null default '';
alter table matter_documents add column if not exists content_hash text not null default '';
alter table matter_documents add column if not exists retrieved_at timestamptz;

alter table timeline_events add column if not exists verification text not null default 'unreviewed';

create table if not exists case_imports (
  id text primary key,
  user_id text not null,
  matter_id text references matters (id) on delete cascade,
  court_id text not null,
  case_number text not null default '',
  cnr text not null default '',
  lookup_json text not null default '{}',
  status text not null,
  stage_note text not null default '',
  summary_json text not null default '{}',
  error text not null default '',
  official_url text not null default '',
  captcha_required boolean not null default false,
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists case_imports_user_idx on case_imports (user_id, updated_at desc);
create index if not exists case_imports_matter_idx on case_imports (matter_id);

create table if not exists case_import_records (
  id text primary key,
  user_id text not null,
  import_id text not null references case_imports (id) on delete cascade,
  matter_id text not null,
  kind text not null default 'order',
  external_id text not null default '',
  order_date date,
  title text not null default '',
  source_url text not null default '',
  content_hash text not null default '',
  body text not null default '',
  status text not null,
  document_id text,
  order_id text,
  error text not null default '',
  retrieved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists case_import_records_import_idx on case_import_records (import_id);
create index if not exists case_import_records_hash_idx on case_import_records (matter_id, content_hash);
