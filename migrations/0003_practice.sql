-- CiteBench practice: clients, matters, hearings, orders, tasks, deadlines, timeline
create table if not exists clients (
  id text primary key,
  user_id text not null,
  name text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists clients_user_id_idx on clients (user_id);

create table if not exists matters (
  id text primary key,
  user_id text not null,
  client_id text references clients (id) on delete set null,
  title text not null,
  proceeding text not null,
  stage text not null,
  court_name text not null default '',
  case_number text not null default '',
  cnr text not null default '',
  case_type text not null default '',
  jurisdiction text not null default '',
  our_side text not null default 'petitioner',
  parties_json text not null default '[]',
  status text not null default 'active',
  next_hearing_on date,
  last_order_on date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists matters_user_id_idx on matters (user_id);
create index if not exists matters_next_hearing_idx on matters (user_id, next_hearing_on);

create table if not exists hearings (
  id text primary key,
  user_id text not null,
  matter_id text not null references matters (id) on delete cascade,
  listed_on date not null,
  listed_at text not null default '',
  court_room text not null default '',
  bench text not null default '',
  purpose text not null default '',
  stage text not null default '',
  outcome text not null default '',
  next_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists hearings_user_listed_idx on hearings (user_id, listed_on);

create table if not exists matter_documents (
  id text primary key,
  user_id text not null,
  matter_id text not null references matters (id) on delete cascade,
  kind text not null default 'note',
  title text not null,
  body text not null default '',
  source_kind text not null default 'paste',
  created_at timestamptz not null default now()
);
create index if not exists matter_documents_matter_idx on matter_documents (matter_id);

create table if not exists matter_orders (
  id text primary key,
  user_id text not null,
  matter_id text not null references matters (id) on delete cascade,
  document_id text,
  order_date date,
  body text not null default '',
  directions_json text not null default '[]',
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists matter_orders_user_confirmed_idx on matter_orders (user_id, confirmed);

create table if not exists tasks (
  id text primary key,
  user_id text not null,
  matter_id text references matters (id) on delete cascade,
  title text not null,
  origin text not null default 'lawyer',
  status text not null default 'open',
  due_on date,
  source_quote text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_status_idx on tasks (user_id, status);

create table if not exists deadlines (
  id text primary key,
  user_id text not null,
  matter_id text references matters (id) on delete cascade,
  title text not null,
  due_on date not null,
  origin text not null default 'lawyer',
  source_quote text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create index if not exists deadlines_user_due_idx on deadlines (user_id, due_on);

create table if not exists timeline_events (
  id text primary key,
  user_id text not null,
  matter_id text not null references matters (id) on delete cascade,
  happened_on date not null,
  kind text not null,
  title text not null,
  detail text not null default '',
  origin text not null default 'lawyer',
  ref_id text,
  created_at timestamptz not null default now()
);
create index if not exists timeline_events_matter_idx on timeline_events (matter_id, happened_on desc);

alter table memos add column if not exists matter_id text;
