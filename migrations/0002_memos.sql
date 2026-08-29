-- Per-user research memos for NyayaSetu
create table if not exists memos (
  id text primary key,
  user_id text not null,
  title text not null,
  intake_json text not null,
  memo_json text not null,
  created_at timestamptz not null default now()
);
create index if not exists memos_user_id_idx on memos (user_id);
