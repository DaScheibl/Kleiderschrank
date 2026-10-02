-- 005 Wäscheschwellen, Größenprofil, Stilprofil, Einstellungen
-- Wiederholbar. Voraussetzung: 001.
-- Diese Tabellen haben natürliche Schlüssel (Benutzer + Kategorie usw.) statt einer id.

create table if not exists public.waescheschwelle (
  benutzer_id uuid not null references auth.users (id) on delete cascade,
  kategorie text not null
    check (kategorie in ('oberteil', 'hose', 'jacke', 'schuhe', 'accessoire', 'schmuck')),
  schwelle smallint not null check (schwelle >= 0), -- 0 = wird nie gewaschen
  angelegt_am timestamptz not null default now(),
  zuletzt_geaendert timestamptz not null default now(),
  server_geaendert timestamptz not null default now(),
  geloescht boolean not null default false,
  primary key (benutzer_id, kategorie)
);
create index if not exists waescheschwelle_sync_idx on public.waescheschwelle (benutzer_id, server_geaendert);
select public.sync_trigger_anlegen('public.waescheschwelle');
select public.eigene_zeilen_policies('public.waescheschwelle');


create table if not exists public.groessenprofil (
  benutzer_id uuid not null references auth.users (id) on delete cascade,
  bereich text not null check (bereich in ('oberteil', 'hose', 'schuhe', 'konfektion')),
  system text not null check (system in ('alpha', 'eu_konfektion', 'weite_laenge', 'schuh_eu')),
  werte text[] not null default '{}',
  angelegt_am timestamptz not null default now(),
  zuletzt_geaendert timestamptz not null default now(),
  server_geaendert timestamptz not null default now(),
  geloescht boolean not null default false,
  primary key (benutzer_id, bereich)
);
create index if not exists groessenprofil_sync_idx on public.groessenprofil (benutzer_id, server_geaendert);
select public.sync_trigger_anlegen('public.groessenprofil');
select public.eigene_zeilen_policies('public.groessenprofil');


create table if not exists public.stilprofil (
  benutzer_id uuid not null references auth.users (id) on delete cascade,
  stil text not null check (stil in
    ('clean', 'streetwear', 'business_casual', 'klassisch', 'sportlich', 'outdoor', 'vintage')),
  gewichtung text not null check (gewichtung in ('hauptsaechlich', 'manchmal')),
  angelegt_am timestamptz not null default now(),
  zuletzt_geaendert timestamptz not null default now(),
  server_geaendert timestamptz not null default now(),
  geloescht boolean not null default false,
  primary key (benutzer_id, stil)
);
create index if not exists stilprofil_sync_idx on public.stilprofil (benutzer_id, server_geaendert);
select public.sync_trigger_anlegen('public.stilprofil');
select public.eigene_zeilen_policies('public.stilprofil');


create table if not exists public.einstellungen (
  benutzer_id uuid primary key references auth.users (id) on delete cascade,
  alltags_formalitaet smallint not null default 0 check (alltags_formalitaet between 0 and 3),
  aussortier_nach_monaten smallint not null default 9 check (aussortier_nach_monaten between 1 and 60),
  abendvorschau_uhrzeit time,
  ort_manuell jsonb,
  rundtour_abgeschlossen boolean not null default false,
  angelegt_am timestamptz not null default now(),
  zuletzt_geaendert timestamptz not null default now(),
  server_geaendert timestamptz not null default now(),
  geloescht boolean not null default false
);
create index if not exists einstellungen_sync_idx on public.einstellungen (benutzer_id, server_geaendert);
select public.sync_trigger_anlegen('public.einstellungen');
select public.eigene_zeilen_policies('public.einstellungen');
