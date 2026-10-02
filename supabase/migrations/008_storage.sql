-- 008 Privater Bucket für die Anzeigefassungen der Bilder
-- Wiederholbar. Voraussetzung: keine.
-- Pfad: <benutzer_id>/<teil_id>.jpg – jeder sieht und schreibt nur seinen eigenen Ordner.
-- Originalfotos werden nie hochgeladen.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kleidung', 'kleidung', false, 153600, array['image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists kleidung_eigene_lesen on storage.objects;
create policy kleidung_eigene_lesen on storage.objects for select to authenticated
  using (bucket_id = 'kleidung' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists kleidung_eigene_anlegen on storage.objects;
create policy kleidung_eigene_anlegen on storage.objects for insert to authenticated
  with check (bucket_id = 'kleidung' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists kleidung_eigene_aendern on storage.objects;
create policy kleidung_eigene_aendern on storage.objects for update to authenticated
  using (bucket_id = 'kleidung' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'kleidung' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists kleidung_eigene_loeschen on storage.objects;
create policy kleidung_eigene_loeschen on storage.objects for delete to authenticated
  using (bucket_id = 'kleidung' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Ob Hochladen zusätzlich Plus voraussetzt (public.ist_plus), entscheidet E11 in Block F.
