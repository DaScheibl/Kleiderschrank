import { describe, expect, it } from 'vitest';

import {
  anlassDesTages,
  formalitaetAusTermin,
  istRelevanterKalender,
  relevanteTermine,
  type KalenderInfo,
  type Termin,
} from './anlass';

const kalender: KalenderInfo[] = [
  { id: 'privat', titel: 'Privat', typ: 'local', konto: 'iCloud' },
  { id: 'arbeit', titel: 'Arbeit', typ: 'exchange', konto: 'firma' },
  { id: 'gb', titel: 'Geburtstage', typ: 'birthdays', konto: null },
  { id: 'abo', titel: 'Bundesliga', typ: 'subscribed', konto: null },
  {
    id: 'feiertage',
    titel: 'Feiertage in Deutschland',
    typ: null,
    konto: 'de.german#holiday@group.v.calendar.google.com',
  },
];

function termin(
  kalenderId: string,
  titel: string,
  von: number,
  bis: number,
  extra: Partial<Termin> = {},
): Termin {
  return {
    kalenderId,
    titel,
    ort: null,
    ganztaegig: false,
    beginn: new Date(2026, 9, 5, von, 0).toISOString(),
    ende: new Date(2026, 9, 5, bis, 0).toISOString(),
    ...extra,
  };
}

describe('istRelevanterKalender', () => {
  it('filtert Geburtstags-, Abo- und Feiertagskalender', () => {
    expect(kalender.filter(istRelevanterKalender).map((k) => k.id)).toEqual(['privat', 'arbeit']);
  });
});

describe('relevanteTermine', () => {
  const jetzt = new Date(2026, 9, 5, 8, 0);
  it('nimmt nur heutige Termine mit Uhrzeit aus relevanten Kalendern', () => {
    const termine = [
      termin('arbeit', 'Kundentermin', 14, 15),
      termin('feiertage', 'Reformationstag (Sachsen)', 0, 23, { ganztaegig: true }),
      termin('privat', 'Urlaub', 0, 23, { ganztaegig: true }),
      termin('gb', 'Geburtstag Oma', 10, 11),
      termin('abo', 'FC Bayern – BVB', 18, 20),
      termin('privat', 'Zahnarzt', 9, 10),
      {
        ...termin('privat', 'Morgen', 9, 10),
        beginn: new Date(2026, 9, 6, 9).toISOString(),
        ende: new Date(2026, 9, 6, 10).toISOString(),
      },
    ];
    expect(relevanteTermine(termine, kalender, jetzt).map((t) => t.titel)).toEqual([
      'Zahnarzt',
      'Kundentermin',
    ]);
  });
  it('lässt bereits vorbei gegangene Termine weg', () => {
    const termine = [termin('privat', 'Frühsport', 6, 7), termin('privat', 'Büro', 9, 17)];
    expect(relevanteTermine(termine, kalender, jetzt).map((t) => t.titel)).toEqual(['Büro']);
  });
});

describe('formalitaetAusTermin', () => {
  it('erkennt förmliche Anlässe', () => {
    expect(formalitaetAusTermin('Hochzeit Anna & Ben', null)).toBe(3);
    expect(formalitaetAusTermin('Trauerfeier', null)).toBe(3);
    expect(formalitaetAusTermin('Abiball', null)).toBe(3);
  });
  it('erkennt Business-Termine, auch in zusammengesetzten Wörtern', () => {
    expect(formalitaetAusTermin('Kundentermin Müller GmbH', null)).toBe(2);
    expect(formalitaetAusTermin('Vorstellungsgespräch', null)).toBe(2);
    expect(formalitaetAusTermin('Q3-Präsentation', null)).toBe(2);
  });
  it('Fußball ist kein Ball', () => {
    expect(formalitaetAusTermin('Fußballtraining', null)).toBe(0);
    expect(formalitaetAusTermin('Ball', null)).toBe(3);
  });
  it('wertet auch den Ort aus', () => {
    expect(formalitaetAusTermin('Mittag', 'Restaurant Tantris')).toBe(1);
  });
  it('legere Termine sind casual, Unbekanntes eine Stufe darüber', () => {
    expect(formalitaetAusTermin('Yoga', null)).toBe(0);
    expect(formalitaetAusTermin('Zahnarzt', null)).toBe(1);
  });
});

describe('anlassDesTages', () => {
  it('ohne Termin gilt der Alltagswert', () => {
    expect(anlassDesTages([], 1)).toEqual({
      formalitaet: 1,
      quelle: 'alltag',
      massgeblicherTermin: null,
    });
  });
  it('der förmlichste Termin bestimmt den Tag', () => {
    const a = anlassDesTages(
      [termin('privat', 'Yoga', 7, 8), termin('arbeit', 'Kundentermin', 14, 15)],
      0,
    );
    expect(a.formalitaet).toBe(2);
    expect(a.quelle).toBe('termin');
    expect(a.massgeblicherTermin?.titel).toBe('Kundentermin');
  });
  it('ein legerer Termin senkt den Alltagswert nicht', () => {
    expect(anlassDesTages([termin('privat', 'Yoga', 7, 8)], 2).formalitaet).toBe(2);
  });
});
