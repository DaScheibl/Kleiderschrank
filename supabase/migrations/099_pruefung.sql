-- 099 Sicherheitsprüfung – immer als Letztes ausführen.
-- Bricht mit einer Fehlermeldung ab, wenn eine Tabelle im Schema public ohne Row Level
-- Security existiert oder der Bucket öffentlich ist. Kommt "Prüfung bestanden", ist alles gut.

do $$
declare
  offen text;
begin
  select string_agg(c.relname, ', ')
    into offen
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('r', 'p')
     and not c.relrowsecurity;

  if offen is not null then
    raise exception 'BLOCKER: Tabellen ohne Row Level Security: %', offen;
  end if;

  if exists (select 1 from storage.buckets where id = 'kleidung' and public) then
    raise exception 'BLOCKER: Bucket "kleidung" ist öffentlich.';
  end if;

  if not exists (select 1 from storage.buckets where id = 'kleidung') then
    raise exception 'Bucket "kleidung" fehlt – bitte 008_storage.sql ausführen.';
  end if;

end;
$$;

select 'Prüfung bestanden: alle Tabellen in public haben RLS, Bucket ist privat.' as ergebnis;
