-- 006 KI-Nutzung: Tageszähler, Kostenprotokoll, Antwort-Cache
-- Wiederholbar. Voraussetzung: keine.
--
-- Bewusste Abweichung von "vier Policies je Tabelle": Der Nutzer darf seinen Zähler
-- nur LESEN. Schreiben geht ausschließlich über die Service-Rolle in den Edge Functions,
-- sonst könnte jeder sein Tageslimit selbst zurücksetzen. RLS ist trotzdem aktiv.

create table if not exists public.ki_nutzung (
  benutzer_id uuid not null references auth.users (id) on delete cascade,
  datum date not null,
  art text not null check (art in ('sortierung', 'erkennung')),
  anzahl integer not null default 0 check (anzahl >= 0),
  primary key (benutzer_id, datum, art)
);

alter table public.ki_nutzung enable row level security;
drop policy if exists eigene_lesen on public.ki_nutzung;
create policy eigene_lesen on public.ki_nutzung for select to authenticated
  using ((select auth.uid()) = benutzer_id);
revoke all on public.ki_nutzung from anon, authenticated;
grant select on public.ki_nutzung to authenticated;


create table if not exists public.ki_protokoll (
  id bigint generated always as identity primary key,
  benutzer_id uuid not null references auth.users (id) on delete cascade,
  zeitpunkt timestamptz not null default now(),
  art text not null check (art in ('sortierung', 'erkennung')),
  modell text not null,
  tokens_ein integer not null default 0,
  tokens_aus integer not null default 0,
  kosten_mikro_usd integer not null default 0, -- 1 USD = 1.000.000
  dauer_ms integer,
  erfolg boolean not null
);
create index if not exists ki_protokoll_zeit_idx on public.ki_protokoll (zeitpunkt);

alter table public.ki_protokoll enable row level security;
revoke all on public.ki_protokoll from anon, authenticated;


create table if not exists public.ki_cache (
  benutzer_id uuid not null references auth.users (id) on delete cascade,
  datum date not null,
  bestands_pruefsumme text not null,
  antwort jsonb not null,
  angelegt_am timestamptz not null default now(),
  primary key (benutzer_id, datum, bestands_pruefsumme)
);

alter table public.ki_cache enable row level security;
revoke all on public.ki_cache from anon, authenticated;


-- Erhöht den Zähler atomar, aber nur solange das Limit nicht erreicht ist.
-- Liefert true, wenn der Aufruf erlaubt ist. Der Tag richtet sich nach deutscher Zeit,
-- nicht nach der Uhr des Geräts.
create or replace function public.ki_zaehler_erhoehen(p_benutzer uuid, p_art text, p_limit integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_anzahl integer;
begin
  if p_limit <= 0 then
    return false;
  end if;

  insert into public.ki_nutzung as k (benutzer_id, datum, art, anzahl)
  values (p_benutzer, (now() at time zone 'Europe/Berlin')::date, p_art, 1)
  on conflict (benutzer_id, datum, art)
    do update set anzahl = k.anzahl + 1
    where k.anzahl < p_limit
  returning anzahl into v_anzahl;

  return v_anzahl is not null;
end;
$$;

revoke execute on function public.ki_zaehler_erhoehen(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.ki_zaehler_erhoehen(uuid, text, integer) to service_role;
