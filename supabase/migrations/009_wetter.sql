-- 009 Zwischenspeicher für den Wetter-Proxy (A4)
-- Wiederholbar. Voraussetzung: keine.
--
-- MET Norway verlangt, dass Apps nicht direkt abfragen, sondern über einen eigenen
-- Zwischenspeicher, der die Gültigkeit (Expires) respektiert. Schlüssel ist der auf
-- zwei Nachkommastellen gerundete Ort (ca. 1 km) – kein Bezug zu einem Nutzer.
-- Nur die Edge Function (Service-Rolle) liest und schreibt.

create table if not exists public.wetter_cache (
  schluessel text primary key,
  daten jsonb not null,
  gueltig_bis timestamptz not null,
  last_modified text,
  abgerufen timestamptz not null default now()
);

create index if not exists wetter_cache_abgerufen_idx on public.wetter_cache (abgerufen);

alter table public.wetter_cache enable row level security;
revoke all on public.wetter_cache from anon, authenticated;
