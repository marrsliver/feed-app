-- Run this once in the Supabase SQL editor: https://supabase.com/dashboard/project/pprlbhcdyynaqjuvcdpf/sql
-- After the initial setup, also run the ALTER TABLE statements at the bottom of this file.

create table if not exists comments (
  id text primary key,
  entity_id text not null,
  text text not null,
  created_at bigint not null
);
alter table comments disable row level security;

create table if not exists saved_lists (
  id text primary key,
  name text not null,
  post_ids text[] not null default '{}',
  created_at bigint not null
);
alter table saved_lists disable row level security;

create table if not exists user_sources (
  id text primary key,
  name text not null,
  url text not null,
  feed_url text not null,
  color text not null,
  in_feed boolean not null default true,
  added_at bigint not null
);
alter table user_sources disable row level security;

create table if not exists manual_posts (
  id text primary key,
  feed_id text not null,
  post_data jsonb not null,
  added_at bigint not null
);
alter table manual_posts disable row level security;

create table if not exists deleted_posts (
  post_id text primary key,
  post_data jsonb not null,
  feed_id text not null,
  was_manual boolean not null default false,
  deleted_at bigint not null
);
alter table deleted_posts disable row level security;

-- Columns added after initial setup (run these if they don't exist yet):
alter table user_sources add column if not exists type text not null default 'rss';
alter table user_sources add column if not exists api_path text;
alter table user_sources add column if not exists is_static boolean not null default false;
alter table user_sources add column if not exists feed_group text;
alter table user_sources add column if not exists category_id text;
alter table user_sources add column if not exists industry_id text;
alter table user_sources add column if not exists tags text[] not null default '{}';
alter table user_sources add column if not exists cards jsonb not null default '[]';

alter table saved_lists add column if not exists post_data jsonb not null default '{}';
alter table saved_lists add column if not exists description text;
alter table saved_lists add column if not exists items jsonb not null default '[]';
alter table saved_lists add column if not exists updated_at bigint;
