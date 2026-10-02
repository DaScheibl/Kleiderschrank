-- 002 Kleidungsstück
-- Wiederholbar. Voraussetzung: 001.

create table if not exists public.kleidungsstueck (
  id uuid primary key,
  benutzer_id uuid not null references auth.users (id) on delete cascade,
  angelegt_am timestamptz not null default now(),
  zuletzt_geaendert timestamptz not null default now(),
  server_geaendert timestamptz not null default now(),
  geloescht boolean not null default false,

  name text not null check (char_length(name) between 1 and 200),
  kategorie text not null
    check (kategorie in ('oberteil', 'hose', 'jacke', 'schuhe', 'accessoire', 'schmuck')),
  unterart text,

  farbe_hex text not null check (farbe_hex ~ '^#[0-9A-Fa-f]{6}$'),
  farbe_name text not null,
  nebenfarbe_hex text check (nebenfarbe_hex ~ '^#[0-9A-Fa-f]{6}$'),
  nebenfarbe_name text,
  muster text not null default 'uni'
    check (muster in ('uni', 'gestreift', 'kariert', 'gepunktet', 'gemustert', 'print')),
  material text,

  waermegrad smallint not null default 1 check (waermegrad between 0 and 3),
  formalitaet smallint not null default 0 check (formalitaet between 0 and 3),
  regentauglich boolean not null default false,
  stil_tags text[] not null default '{}',

  groesse_text text,
  groesse_system text
    check (groesse_system in ('alpha', 'eu_konfektion', 'weite_laenge', 'schuh_eu')),
  groesse_normiert text,
  groesse_quelle text check (groesse_quelle in ('etikett', 'hand', 'geschaetzt')),

  metallton text check (metallton in ('gold', 'silber', 'rose', 'gemischt', 'keins')),

  waeschestatus text not null default 'sauber'
    check (waeschestatus in ('sauber', 'korb', 'maschine')),
  gewaschen_am timestamptz,
  waescheschwelle_eigen smallint check (waescheschwelle_eigen >= 0),

  marke text,
  kaufpreis_cent integer check (kaufpreis_cent >= 0),
  kaufdatum date,

  status text not null default 'aktiv'
    check (status in ('aktiv', 'aussortiert', 'verkauft', 'weggegeben')),
  status_seit timestamptz,
  verkaufspreis_cent integer check (verkaufspreis_cent >= 0),
  zustand text check (zustand in ('neu_mit_etikett', 'sehr_gut', 'gut', 'getragen')),
  aussortier_frage_nicht_vor date,

  bild_pfad text,
  bild_pruefsumme text,

  -- Ziel für zusammengesetzte Fremdschlüssel: Verweise nur auf Teile desselben Kontos.
  unique (benutzer_id, id)
);

create index if not exists kleidungsstueck_sync_idx
  on public.kleidungsstueck (benutzer_id, server_geaendert);

select public.sync_trigger_anlegen('public.kleidungsstueck');
select public.eigene_zeilen_policies('public.kleidungsstueck');
