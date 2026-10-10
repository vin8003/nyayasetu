-- A chat can continue one saved research memo.
alter table ask_chats add column if not exists memo_id text not null default '';
create index if not exists ask_chats_memo_idx on ask_chats (user_id, memo_id);
