-- 004 Trageeinträge: Grundlage für Statistik, Wiederholungssperre und Lernen
-- Wiederholbar. Voraussetzung: 001, 002, 003.

create table if not exists public.trage_eintrag (
  id uuid primary key,
  benutzer_id uuid not null references auth.users (id) on delete cascade,
  angelegt_am timestamptz not null default now(),
  zuletzt_geaendert timestamptz not null default now(),
  server_geaendert timestamptz not null default now(),
  geloescht boolean not null default false,

  teil_id uuid not null,
  outfit_id uuid, -- null: Teil einzeln als getragen markiert
  datum date not null,

  -- Ein Teil zählt pro Tag höchstens einmal, auch wenn zwei Geräte es melden.
  unique (benutzer_id, teil_id, datum),
  foreign key (benutzer_id, teil_id) references public.kleidungsstueck (benutzer_id, id) on delete cascade,
  foreign key (benutzer_id, outfit_id) references public.outfit (benutzer_id, id) on delete set null (outfit_id)
);

create index if not exists trage_eintrag_sync_idx on public.trage_eintrag (benutzer_id, server_geaendert);

select public.sync_trigger_anlegen('public.trage_eintrag');
select public.eigene_zeilen_policies('public.trage_eintrag');
