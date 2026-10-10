-- Saved Ask threads, grouped by case. A case can hold many chats.
create table if not exists ask_chats (
  id text primary key,
  user_id text not null,
  matter_id text references matters (id) on delete set null,
  matter_title text not null default '',
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ask_chats_user_idx on ask_chats (user_id, updated_at desc);

create table if not exists ask_messages (
  id text primary key,
  chat_id text not null references ask_chats (id) on delete cascade,
  user_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists ask_messages_chat_idx on ask_messages (chat_id, created_at);
