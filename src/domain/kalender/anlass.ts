import type { Formalitaet, IsoZeitpunkt } from '../modell/typen';
import { lokalesDatum } from '../zeit';

// Titel und Ort eines Termins werden nur auf dem Gerät ausgewertet und verlassen es nie.
// Nach außen geht höchstens die abgeleitete Formalität.

export interface KalenderInfo {
  id: string;
  titel: string;
  /** iOS: 'birthdays', 'subscribed', 'local', 'caldav', … */
  typ: string | null;
  /** Konto bzw. Besitzer, unter Android z. B. "…#holiday@group.v.calendar.google.com" */
  konto: string | null;
}

export interface Termin {
  kalenderId: string;
  titel: string;
  ort: string | null;
  ganztaegig: boolean;
  beginn: IsoZeitpunkt;
  ende: IsoZeitpunkt;
}

const FREMDKALENDER =
  /#(holiday|contacts)@|feiertag|geburtstag|holiday|birthday|ferien|schulferien/i;

/**
 * Abonnierte Kalender, Geburtstags- und Feiertagskalender haben keinen Dresscode.
 * Ein Feiertag eines anderen Bundeslands ist kein Termin – die Vorgängerversion hatte genau das falsch.
 */
export function istRelevanterKalender(k: KalenderInfo): boolean {
  if (k.typ === 'birthdays' || k.typ === 'subscribed') return false;
  return !FREMDKALENDER.test(k.titel) && !FREMDKALENDER.test(k.konto ?? '');
}

/** Heutige Termine mit Uhrzeit, die noch nicht vorbei sind. Ganztägiges zählt nicht. */
export function relevanteTermine(
  termine: readonly Termin[],
  kalender: readonly KalenderInfo[],
  jetzt: Date,
): Termin[] {
  const erlaubt = new Set(kalender.filter(istRelevanterKalender).map((k) => k.id));
  const heute = lokalesDatum(jetzt);
  return termine
    .filter(
      (t) =>
        erlaubt.has(t.kalenderId) &&
        !t.ganztaegig &&
        lokalesDatum(new Date(t.beginn)) === heute &&
        Date.parse(t.ende) > jetzt.getTime(),
    )
    .sort((a, b) => Date.parse(a.beginn) - Date.parse(b.beginn));
}

interface Stichwort {
  wort: string;
  /** true: auch als Teil eines Wortes ("Kundentermin"); false: nur als ganzes Wort ("Ball") */
  teil: boolean;
}

const w = (wort: string): Stichwort => ({ wort, teil: false });
const t = (wort: string): Stichwort => ({ wort, teil: true });

/** Von fein nach leger – der erste Treffer zählt. */
const STICHWORTE: readonly { formalitaet: Formalitaet; woerter: readonly Stichwort[] }[] = [
  {
    formalitaet: 3,
    woerter: [
      t('hochzeit'),
      t('trauung'),
      t('standesamt'),
      t('gala'),
      w('ball'),
      t('abiball'),
      t('opernball'),
      t('beerdigung'),
      t('trauerfeier'),
      t('beisetzung'),
      w('oper'),
      t('festakt'),
      t('preisverleihung'),
      w('black tie'),
      t('empfang'),
    ],
  },
  {
    formalitaet: 2,
    woerter: [
      t('vorstellungsgespräch'),
      t('bewerbungsgespräch'),
      t('interview'),
      t('kunde'),
      t('mandant'),
      t('präsentation'),
      t('pitch'),
      t('vorstand'),
      t('aufsichtsrat'),
      t('verhandlung'),
      t('gericht'),
      t('notar'),
      t('konferenz'),
      t('geschäftsessen'),
      t('business'),
      t('investor'),
      t('audit'),
      w('board'),
      t('taufe'),
      t('konfirmation'),
      t('kommunion'),
      t('abschlussfeier'),
    ],
  },
  {
    formalitaet: 1,
    woerter: [
      t('meeting'),
      t('besprechung'),
      t('jour fixe'),
      t('workshop'),
      t('schulung'),
      t('seminar'),
      t('büro'),
      w('office'),
      t('abendessen'),
      w('dinner'),
      t('restaurant'),
      w('date'),
      t('theater'),
      t('geburtstag'),
      t('brunch'),
    ],
  },
  {
    formalitaet: 0,
    woerter: [
      t('sport'),
      t('fitness'),
      w('gym'),
      t('training'),
      w('laufen'),
      t('joggen'),
      w('yoga'),
      t('schwimmen'),
      t('wandern'),
      t('fußball'),
      t('radtour'),
      t('garten'),
      t('umzug'),
      t('putzen'),
      t('renovieren'),
      t('grillen'),
      t('spieleabend'),
      w('kino'),
    ],
  },
];

function normalisieren(text: string): string {
  return text
    .toLocaleLowerCase('de-DE')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function trifft(text: string, s: Stichwort): boolean {
  if (s.teil) return text.includes(s.wort);
  return ` ${text} `.includes(` ${s.wort} `);
}

/** Unbekannte Termine gelten eine Stufe ordentlicher als casual. */
export function formalitaetAusTermin(titel: string, ort: string | null): Formalitaet {
  const text = normalisieren(`${titel} ${ort ?? ''}`);
  for (const stufe of STICHWORTE) {
    if (stufe.woerter.some((s) => trifft(text, s))) return stufe.formalitaet;
  }
  return 1;
}

export interface Anlass {
  formalitaet: Formalitaet;
  quelle: 'termin' | 'alltag';
  /** Nur zur Anzeige auf dem Gerät */
  massgeblicherTermin: Termin | null;
}

/** Der förmlichste Termin des Tages bestimmt den Anlass; ohne Termin gilt der Alltagswert. */
export function anlassDesTages(termine: readonly Termin[], alltag: Formalitaet): Anlass {
  let bester: { termin: Termin; formalitaet: Formalitaet } | null = null;
  for (const termin of termine) {
    const formalitaet = formalitaetAusTermin(termin.titel, termin.ort);
    if (!bester || formalitaet > bester.formalitaet) bester = { termin, formalitaet };
  }
  if (!bester) return { formalitaet: alltag, quelle: 'alltag', massgeblicherTermin: null };
  return {
    formalitaet: Math.max(bester.formalitaet, alltag) as Formalitaet,
    quelle: 'termin',
    massgeblicherTermin: bester.termin,
  };
}

export const FORMALITAET_NAMEN: Record<Formalitaet, string> = {
  0: 'Casual',
  1: 'Smart Casual',
  2: 'Business',
  3: 'Förmlich',
};
