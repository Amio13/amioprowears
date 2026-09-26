-- 0007_homepage.sql — homepage content the owner edits in admin → Homepage.
-- Stored as JSON on the single settings row (anyone can already read settings, and
-- this is public page content). Empty = the built-in defaults (lib/homepage.ts).

alter table public.settings add column if not exists homepage jsonb not null default '{}'::jsonb;
