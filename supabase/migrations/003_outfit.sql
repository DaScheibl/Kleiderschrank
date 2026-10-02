-- 003 Outfit und Zuordnung der Teile
-- Wiederholbar. Voraussetzung: 001, 002.

create table if not exists public.outfit (
  id uuid primary key,
  benutzer_id uuid not null references auth.users (id) on delete cascade,
  angelegt_am timestamptz not null default now(),
  zuletzt_geaendert timestamptz not null default now(),
  server_geaendert timestamptz not null default now(),
  geloescht boolean not null default false,

  datum date not null,
  anlass text not null check (anlass in ('termin', 'alltag', 'manuell')),
  anlass_formalitaet smallint not null check (anlass_formalitaet between 0 and 3),
  bewertung text not null default 'offen' check (bewertung in ('gefaellt', 'abgelehnt', 'offen')),
  ist_tageswahl boolean not null default false,
  getragen boolean not null default false,
  kombinations_schluessel text not null,
  titel text,
  begruendung text,
  begruendung_quelle text check (begruendung_quelle in ('regel', 'ki')),
  regel_score integer,
  stil_heute text,

  unique (benutzer_id, id)
);

create index if not exists outfit_sync_idx on public.outfit (benutzer_id, server_geaendert);
create index if not exists outfit_datum_idx on public.outfit (benutzer_id, datum);

select public.sync_trigger_anlegen('public.outfit');
select public.eigene_zeilen_policies('public.outfit');


create table if not exists public.outfit_teil (
  id uuid primary key,
  benutzer_id uuid not null references auth.users (id) on delete cascade,
  angelegt_am timestamptz not null default now(),
  zuletzt_geaendert timestamptz not null default now(),
  server_geaendert timestamptz not null default now(),
  geloescht boolean not null default false,

  outfit_id uuid not null,
  teil_id uuid not null,
  rolle text not null
    check (rolle in ('oberteil', 'hose', 'jacke', 'schuhe', 'accessoire', 'schmuck')),

  unique (outfit_id, teil_id),
  foreign key (benutzer_id, outfit_id) references public.outfit (benutzer_id, id) on delete cascade,
  foreign key (benutzer_id, teil_id) references public.kleidungsstueck (benutzer_id, id) on delete cascade
);

create index if not exists outfit_teil_sync_idx on public.outfit_teil (benutzer_id, server_geaendert);
create index if not exists outfit_teil_teil_idx on public.outfit_teil (benutzer_id, teil_id);

select public.sync_trigger_anlegen('public.outfit_teil');
select public.eigene_zeilen_policies('public.outfit_teil');
