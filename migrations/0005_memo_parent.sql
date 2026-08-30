-- Follow-up memos point at the parent they were asked from. No overwrite.
alter table memos add column if not exists parent_id text;
create index if not exists memos_parent_id_idx on memos (parent_id);
