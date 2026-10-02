-- 007 Abo-Status, serverseitig geführt
-- Wiederholbar. Voraussetzung: keine.
--
-- Wird in Block F vom RevenueCat-Webhook (Service-Rolle) geschrieben. Die Edge Functions
-- lesen den Plus-Status hier selbst und verlassen sich nie auf eine Angabe des Clients.
-- Der Nutzer darf nur lesen.

create table if not exists public.abo_status (
  benutzer_id uuid primary key references auth.users (id) on delete cascade,
  ist_plus boolean not null default false,
  gueltig_bis timestamptz,
  produkt text,
  quelle text,
  aktualisiert timestamptz not null default now()
);

alter table public.abo_status enable row level security;
drop policy if exists eigene_lesen on public.abo_status;
create policy eigene_lesen on public.abo_status for select to authenticated
  using ((select auth.uid()) = benutzer_id);
revoke all on public.abo_status from anon, authenticated;
grant select on public.abo_status to authenticated;

-- Für Edge Functions: ist das Konto gerade Plus? Nur für die Service-Rolle,
-- damit niemand den Status fremder Konten abfragen kann.
create or replace function public.ist_plus(p_benutzer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select a.ist_plus and (a.gueltig_bis is null or a.gueltig_bis > now())
       from public.abo_status a where a.benutzer_id = p_benutzer),
    false);
$$;

revoke execute on function public.ist_plus(uuid) from public, anon, authenticated;
grant execute on function public.ist_plus(uuid) to service_role;
