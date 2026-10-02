import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Führt alle Migrationen zweimal gegen ein echtes Postgres (PGlite) aus und prüft RLS,
// Konfliktregel, Fremdschlüssel, KI-Zähler, Storage-Policies und Kontolöschung.
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const db = new PGlite();

// Minimaler Nachbau der Supabase-Umgebung
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id serial primary key, bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant all on storage.objects to authenticated; grant usage on sequence storage.objects_id_seq to authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
  grant execute on function storage.foldername(text) to authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);

const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();
for (const runde of [1, 2]) {
  for (const f of files) {
    try {
      await db.exec(readFileSync(join(dir, f), 'utf8'));
    } catch (e) {
      console.log(`FEHLER Runde ${runde} in ${f}:`, e.message);
      process.exit(1);
    }
  }
  console.log(`Runde ${runde}: alle ${files.length} Skripte ok`);
}

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
await db.exec(`insert into auth.users values ('${A}'), ('${B}')`);

let ok = 0,
  fail = 0;
async function als(uid, rolle, sql) {
  await db.exec(
    `reset role; select set_config('test.uid', '${uid ?? ''}', false); set role ${rolle};`,
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec('reset role');
  }
}
async function erwarte(name, fn, sollFehler = false) {
  try {
    const r = await fn();
    if (sollFehler) {
      fail++;
      console.log('âœ—', name, '(kein Fehler)');
      return r;
    }
    ok++;
    console.log('âœ“', name);
    return r;
  } catch (e) {
    if (sollFehler) {
      ok++;
      console.log('âœ“', name, 'â†’', e.message.slice(0, 80));
    } else {
      fail++;
      console.log('âœ—', name, e.message);
    }
  }
}
function pruefe(name, bedingung) {
  if (bedingung) {
    ok++;
    console.log('âœ“', name);
  } else {
    fail++;
    console.log('âœ—', name);
  }
}

const T1 = '11111111-0000-4000-8000-000000000001';
const ins = (
  uid,
  id,
  ts,
  name = 'Hemd',
) => `insert into public.kleidungsstueck (id, benutzer_id, zuletzt_geaendert, name, kategorie, farbe_hex, farbe_name)
  values ('${id}', '${uid}', '${ts}', '${name}', 'oberteil', '#FFFFFF', 'WeiÃŸ')`;

await erwarte('A legt eigenes Teil an', () =>
  als(A, 'authenticated', ins(A, T1, '2026-10-02T10:00:00Z')),
);
await erwarte(
  'A kann kein Teil fÃ¼r B anlegen',
  () =>
    als(A, 'authenticated', ins(B, '11111111-0000-4000-8000-000000000002', '2026-10-02T10:00:00Z')),
  true,
);
const sichtB = await als(B, 'authenticated', 'select * from public.kleidungsstueck');
pruefe('B sieht As Teil nicht', sichtB.rows.length === 0);
const sichtAnon = await erwarte(
  'anon darf nicht lesen',
  () => als(null, 'anon', 'select * from public.kleidungsstueck'),
  true,
);
const upB = await als(
  B,
  'authenticated',
  `update public.kleidungsstueck set name='gehackt' where id='${T1}'`,
);
pruefe('B kann As Teil nicht Ã¤ndern', upB.affectedRows === 0);

await als(
  A,
  'authenticated',
  `update public.kleidungsstueck set name='Alt', zuletzt_geaendert='2026-10-01T00:00:00Z' where id='${T1}'`,
);
let r = await als(
  A,
  'authenticated',
  `select name, server_geaendert from public.kleidungsstueck where id='${T1}'`,
);
pruefe('Ã„lterer Zeitstempel verliert (LWW)', r.rows[0].name === 'Hemd');
await als(
  A,
  'authenticated',
  `update public.kleidungsstueck set name='Neu', zuletzt_geaendert='2026-10-03T00:00:00Z' where id='${T1}'`,
);
r = await als(A, 'authenticated', `select name from public.kleidungsstueck where id='${T1}'`);
pruefe('JÃ¼ngerer Zeitstempel gewinnt', r.rows[0].name === 'Neu');

// Upsert, wie der Sync es machen wird
await als(
  A,
  'authenticated',
  `insert into public.kleidungsstueck (id, benutzer_id, zuletzt_geaendert, name, kategorie, farbe_hex, farbe_name)
  values ('${T1}', '${A}', '2026-09-01T00:00:00Z', 'UpsertAlt', 'oberteil', '#FFFFFF', 'WeiÃŸ')
  on conflict (id) do update set name = excluded.name, zuletzt_geaendert = excluded.zuletzt_geaendert`,
);
r = await als(A, 'authenticated', `select name from public.kleidungsstueck where id='${T1}'`);
pruefe('Upsert mit Ã¤lterem Stand wird verworfen', r.rows[0].name === 'Neu');

// Outfit / FremdschlÃ¼ssel Ã¼ber Konten hinweg
const TB = '22222222-0000-4000-8000-000000000001';
await als(B, 'authenticated', ins(B, TB, '2026-10-02T10:00:00Z', 'Bs Hemd'));
const O = '33333333-0000-4000-8000-000000000001';
await erwarte('A legt Outfit an', () =>
  als(
    A,
    'authenticated',
    `insert into public.outfit (id, benutzer_id, datum, anlass, anlass_formalitaet, kombinations_schluessel) values ('${O}', '${A}', '2026-10-02', 'alltag', 0, 'x')`,
  ),
);
await erwarte('A verknÃ¼pft eigenes Teil', () =>
  als(
    A,
    'authenticated',
    `insert into public.outfit_teil (id, benutzer_id, outfit_id, teil_id, rolle) values ('44444444-0000-4000-8000-000000000001', '${A}', '${O}', '${T1}', 'oberteil')`,
  ),
);
await erwarte(
  'A kann Bs Teil nicht ins Outfit nehmen',
  () =>
    als(
      A,
      'authenticated',
      `insert into public.outfit_teil (id, benutzer_id, outfit_id, teil_id, rolle) values ('44444444-0000-4000-8000-000000000002', '${A}', '${O}', '${TB}', 'oberteil')`,
    ),
  true,
);
await erwarte('Trageeintrag', () =>
  als(
    A,
    'authenticated',
    `insert into public.trage_eintrag (id, benutzer_id, teil_id, outfit_id, datum) values ('55555555-0000-4000-8000-000000000001', '${A}', '${T1}', '${O}', '2026-10-02')`,
  ),
);
await erwarte(
  'Zweiter Trageeintrag am selben Tag abgelehnt',
  () =>
    als(
      A,
      'authenticated',
      `insert into public.trage_eintrag (id, benutzer_id, teil_id, datum) values ('55555555-0000-4000-8000-000000000002', '${A}', '${T1}', '2026-10-02')`,
    ),
  true,
);
await erwarte('WÃ¤scheschwelle', () =>
  als(
    A,
    'authenticated',
    `insert into public.waescheschwelle (benutzer_id, kategorie, schwelle) values ('${A}', 'hose', 4)`,
  ),
);

// KI-ZÃ¤hler
await erwarte(
  'Nutzer kann ZÃ¤hler nicht schreiben',
  () =>
    als(
      A,
      'authenticated',
      `insert into public.ki_nutzung (benutzer_id, datum, art, anzahl) values ('${A}', '2026-10-02', 'sortierung', 0)`,
    ),
  true,
);
await erwarte(
  'Nutzer kann ZÃ¤hlfunktion nicht aufrufen',
  () => als(A, 'authenticated', `select public.ki_zaehler_erhoehen('${A}', 'sortierung', 99)`),
  true,
);
await erwarte(
  'Nutzer kann ki_protokoll nicht lesen',
  () => als(A, 'authenticated', `select * from public.ki_protokoll`),
  true,
);
const z = [];
for (let i = 0; i < 4; i++)
  z.push(
    (
      await als(
        A,
        'service_role',
        `select public.ki_zaehler_erhoehen('${A}', 'sortierung', 3) as erlaubt`,
      )
    ).rows[0].erlaubt,
  );
pruefe('Limit 3: drei erlaubt, vierter abgelehnt', JSON.stringify(z) === '[true,true,true,false]');
const z0 = (
  await als(
    A,
    'service_role',
    `select public.ki_zaehler_erhoehen('${A}', 'erkennung', 0) as erlaubt`,
  )
).rows[0].erlaubt;
pruefe('Limit 0 lehnt sofort ab', z0 === false);
r = await als(A, 'authenticated', `select anzahl from public.ki_nutzung`);
pruefe('Nutzer sieht eigenen ZÃ¤hler (3)', r.rows.length === 1 && r.rows[0].anzahl === 3);
r = await als(B, 'authenticated', `select anzahl from public.ki_nutzung`);
pruefe('B sieht As ZÃ¤hler nicht', r.rows.length === 0);

// Abo
await erwarte(
  'Nutzer kann sich nicht selbst Plus geben',
  () =>
    als(
      A,
      'authenticated',
      `insert into public.abo_status (benutzer_id, ist_plus) values ('${A}', true)`,
    ),
  true,
);
await erwarte(
  'Nutzer kann ist_plus nicht aufrufen',
  () => als(A, 'authenticated', `select public.ist_plus('${B}')`),
  true,
);
await als(
  A,
  'service_role',
  `insert into public.abo_status (benutzer_id, ist_plus, gueltig_bis) values ('${A}', true, now() + interval '1 day')`,
);
r = await als(
  A,
  'service_role',
  `select public.ist_plus('${A}') as a, public.ist_plus('${B}') as b`,
);
pruefe('ist_plus: A ja, B nein', r.rows[0].a === true && r.rows[0].b === false);

// Storage
await erwarte('A lÃ¤dt in eigenen Ordner', () =>
  als(
    A,
    'authenticated',
    `insert into storage.objects (bucket_id, name) values ('kleidung', '${A}/${T1}.jpg')`,
  ),
);
await erwarte(
  'A kann nicht in Bs Ordner laden',
  () =>
    als(
      A,
      'authenticated',
      `insert into storage.objects (bucket_id, name) values ('kleidung', '${B}/x.jpg')`,
    ),
  true,
);
r = await als(B, 'authenticated', `select * from storage.objects`);
pruefe('B sieht As Bild nicht', r.rows.length === 0);

// KontolÃ¶schung: Cascade
await db.exec(`delete from auth.users where id = '${A}'`);
r = await db.query(
  `select (select count(*) from public.kleidungsstueck where benutzer_id='${A}') + (select count(*) from public.outfit where benutzer_id='${A}') + (select count(*) from public.trage_eintrag where benutzer_id='${A}') + (select count(*) from public.ki_nutzung where benutzer_id='${A}') as rest`,
);
pruefe('KontolÃ¶schung entfernt alle Zeilen', Number(r.rows[0].rest) === 0);

// PrÃ¼fskript schlÃ¤gt bei offener Tabelle an
await db.exec(`create table public.offen (x int)`);
await erwarte(
  '099 erkennt Tabelle ohne RLS',
  () => db.exec(readFileSync(join(dir, '099_pruefung.sql'), 'utf8')),
  true,
);

console.log(`\n${ok} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
