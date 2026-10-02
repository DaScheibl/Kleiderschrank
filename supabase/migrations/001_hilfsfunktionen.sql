-- 001 Hilfsfunktionen für den Sync
-- Wiederholbar: kann beliebig oft ausgeführt werden.

-- Setzt server_geaendert bei jedem Schreiben und schützt vor veralteten Updates.
-- Konflikte entscheidet zuletzt_geaendert (Uhr des Geräts): der jüngere Stand gewinnt.
-- Abgerufen wird über server_geaendert (Uhr des Servers), damit Zeilen von Geräten
-- mit nachgehender Uhr trotzdem bei allen anderen Geräten ankommen.
create or replace function public.sync_vor_schreiben()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.zuletzt_geaendert < old.zuletzt_geaendert then
      return null; -- älterer Stand verliert, Zeile bleibt unverändert
    end if;
    new.angelegt_am := old.angelegt_am;
    new.benutzer_id := old.benutzer_id;
  end if;
  new.server_geaendert := now();
  return new;
end;
$$;

-- Hängt den Trigger an eine Tabelle. Aufruf in jedem Tabellenskript.
create or replace function public.sync_trigger_anlegen(tabelle regclass)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format('drop trigger if exists sync_vor_schreiben on %s', tabelle);
  execute format(
    'create trigger sync_vor_schreiben before insert or update on %s
       for each row execute function public.sync_vor_schreiben()',
    tabelle
  );
end;
$$;

-- Legt die vier Standard-Policies "nur eigene Zeilen" an.
create or replace function public.eigene_zeilen_policies(tabelle regclass)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format('alter table %s enable row level security', tabelle);

  execute format('drop policy if exists eigene_lesen on %s', tabelle);
  execute format(
    'create policy eigene_lesen on %s for select to authenticated
       using ((select auth.uid()) = benutzer_id)', tabelle);

  execute format('drop policy if exists eigene_anlegen on %s', tabelle);
  execute format(
    'create policy eigene_anlegen on %s for insert to authenticated
       with check ((select auth.uid()) = benutzer_id)', tabelle);

  execute format('drop policy if exists eigene_aendern on %s', tabelle);
  execute format(
    'create policy eigene_aendern on %s for update to authenticated
       using ((select auth.uid()) = benutzer_id)
       with check ((select auth.uid()) = benutzer_id)', tabelle);

  execute format('drop policy if exists eigene_loeschen on %s', tabelle);
  execute format(
    'create policy eigene_loeschen on %s for delete to authenticated
       using ((select auth.uid()) = benutzer_id)', tabelle);

  execute format('revoke all on %s from anon', tabelle);
  execute format('grant select, insert, update, delete on %s to authenticated', tabelle);
end;
$$;

-- Die Hilfsfunktionen sind nur für diese Skripte gedacht, nicht für die App.
revoke execute on function public.sync_trigger_anlegen(regclass) from public, anon, authenticated;
revoke execute on function public.eigene_zeilen_policies(regclass) from public, anon, authenticated;
