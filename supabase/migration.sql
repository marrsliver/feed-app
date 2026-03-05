-- Run this once in the Supabase SQL editor: https://supabase.com/dashboard/project/pprlbhcdyynaqjuvcdpf/sql

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
