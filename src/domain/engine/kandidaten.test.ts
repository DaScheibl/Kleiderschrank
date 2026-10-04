import { describe, expect, it } from 'vitest';

import { neuesKleidungsstueck } from '../kleidungsstueck/anlegen';
import { LEERES_FEEDBACK, lerneAusFeedback } from '../lernen/feedback';
import type { Groessenprofil, Kategorie, Kleidungsstueck, TrageEintrag } from '../modell/typen';
import { MAX_BEGRUENDUNG } from './begruendung';
import { kombinationsSchluessel } from './determinismus';
import { kandidatenFuerTag, type EngineEingabe, type EngineWetter } from './kandidaten';

let nr = 0;
function teil(
  kategorie: Kategorie,
  name: string,
  extra: Partial<Kleidungsstueck> = {},
): Kleidungsstueck {
  nr++;
  const r = neuesKleidungsstueck(
    { name, kategorie, farbeHex: '#1C1C1C', farbeName: 'Schwarz' },
    `${kategorie}-${String(nr).padStart(3, '0')}`,
    '2026-09-01T08:00:00.000Z',
  );
  if (!r.ok) throw new Error('Testteil ungültig');
  return { ...r.teil, waermegrad: 1, formalitaet: 1, ...extra };
}

const MILD: EngineWetter = {
  gefuehltMin: 13,
  gefuehltMax: 18,
  regenrisiko: 0,
  regenAb: null,
  lage: 'heiter',
};
const REGEN: EngineWetter = { ...MILD, regenrisiko: 0.9, regenAb: '14:00', lage: 'regen' };

function eingabe(teile: Kleidungsstueck[], extra: Partial<EngineEingabe> = {}): EngineEingabe {
  return {
    datum: '2026-10-05',
    teile,
    trageEintraege: [],
    historie: [],
    schwellen: {},
    groessenprofil: [],
    stilprofil: [],
    stilHeute: null,
    wetter: MILD,
    anlass: { formalitaet: 1, ausTermin: false },
    feedback: LEERES_FEEDBACK,
    ...extra,
  };
}

function ids(e: ReturnType<typeof kandidatenFuerTag>): Set<string> {
  const s = new Set<string>();
  for (const k of e.kandidaten) {
    for (const t of [k.oberteil, k.hose, k.jacke, k.schuhe, ...k.schmuck]) if (t) s.add(t.id);
  }
  return s;
}

function grundbestand() {
  return [
    teil('oberteil', 'Hemd weiß'),
    teil('oberteil', 'Pullover grau'),
    teil('hose', 'Chino beige'),
    teil('hose', 'Jeans'),
    teil('schuhe', 'Sneaker'),
  ];
}

describe('harte Filter – was hier rausfällt, erscheint nie', () => {
  it('nichts aus Wäschekorb oder Maschine', () => {
    const korb = teil('oberteil', 'Shirt im Korb', { waeschestatus: 'korb' });
    const maschine = teil('hose', 'Hose in der Maschine', { waeschestatus: 'maschine' });
    const e = kandidatenFuerTag(eingabe([...grundbestand(), korb, maschine]));
    expect(e.kandidaten.length).toBeGreaterThan(0);
    expect(ids(e).has(korb.id)).toBe(false);
    expect(ids(e).has(maschine.id)).toBe(false);
  });

  it('nichts Aussortiertes, Verkauftes, Weggegebenes oder Gelöschtes', () => {
    const raus = [
      teil('oberteil', 'aussortiert', { status: 'aussortiert' }),
      teil('oberteil', 'verkauft', { status: 'verkauft' }),
      teil('hose', 'weggegeben', { status: 'weggegeben' }),
      teil('hose', 'gelöscht', { geloescht: true }),
    ];
    const e = kandidatenFuerTag(eingabe([...grundbestand(), ...raus]));
    for (const t of raus) expect(ids(e).has(t.id)).toBe(false);
  });

  it('nichts, was laut bestätigter Größe nicht passt – eine geschätzte Größe schließt nie aus', () => {
    const zeit = { angelegtAm: 'z', zuletztGeaendert: 'z', geloescht: false };
    const profil: Groessenprofil[] = [
      { bereich: 'oberteil', system: 'alpha', werte: ['M'], ...zeit },
    ];
    const zuGross = teil('oberteil', 'XXL bestätigt', {
      groesseSystem: 'alpha',
      groesseNormiert: 'XXL',
      groesseQuelle: 'etikett',
    });
    const geschaetzt = teil('oberteil', 'XXL geschätzt', {
      groesseSystem: 'alpha',
      groesseNormiert: 'XXL',
      groesseQuelle: 'geschaetzt',
    });
    const e = kandidatenFuerTag(
      eingabe([...grundbestand(), zuGross, geschaetzt], { groessenprofil: profil }),
    );
    expect(ids(e).has(zuGross.id)).toBe(false);
    expect(ids(e).has(geschaetzt.id)).toBe(true);
  });

  it('nichts, dessen Wärmegrad um mehr als eine Stufe abweicht', () => {
    // Mild → Ziel 1 (Übergang): Winter (3) ist zu warm, Sommer (0) und kühl (2) sind erlaubt.
    const winter = teil('oberteil', 'Winterpulli', { waermegrad: 3 });
    const sommer = teil('oberteil', 'Tanktop', { waermegrad: 0 });
    const e = kandidatenFuerTag(eingabe([...grundbestand(), winter, sommer]));
    expect(e.zielWaerme).toBe(1);
    expect(ids(e).has(winter.id)).toBe(false);
    expect(ids(e).has(sommer.id)).toBe(true);
  });

  it('bei Regen nur regentaugliche Jacken und Schuhe, sofern es welche gibt', () => {
    const regenjacke = teil('jacke', 'Regenjacke', { regentauglich: true });
    const wildleder = teil('jacke', 'Wildlederjacke');
    const gummistiefel = teil('schuhe', 'Stiefel', { regentauglich: true });
    const e = kandidatenFuerTag(
      eingabe([...grundbestand(), regenjacke, wildleder, gummistiefel], { wetter: REGEN }),
    );
    expect(e.regen).toBe(true);
    expect(ids(e).has(wildleder.id)).toBe(false);
    for (const k of e.kandidaten) {
      expect(k.jacke?.id).toBe(regenjacke.id);
      expect(k.schuhe?.regentauglich).toBe(true);
    }
  });

  it('bei Regen ohne regentaugliche Alternative bleibt die normale Jacke erlaubt', () => {
    const jacke = teil('jacke', 'Sakko');
    const e = kandidatenFuerTag(eingabe([...grundbestand(), jacke], { wetter: REGEN }));
    expect(e.kandidaten.every((k) => k.jacke?.id === jacke.id)).toBe(true);
  });

  it('nichts unterhalb der Formalität des Tages', () => {
    const tshirt = teil('oberteil', 'T-Shirt', { formalitaet: 0 });
    const hemd = teil('oberteil', 'Business-Hemd', { formalitaet: 2 });
    const anzughose = teil('hose', 'Anzughose', { formalitaet: 2 });
    const e = kandidatenFuerTag(
      eingabe([tshirt, hemd, anzughose, teil('hose', 'Jogger', { formalitaet: 0 })], {
        anlass: { formalitaet: 2, ausTermin: true },
      }),
    );
    expect(ids(e).has(tshirt.id)).toBe(false);
    expect(e.kandidaten.every((k) => k.oberteil.id === hemd.id && k.hose.id === anzughose.id)).toBe(
      true,
    );
  });

  it('meldet, was fehlt, statt ein unpassendes Outfit zu bauen', () => {
    const e = kandidatenFuerTag(
      eingabe([teil('oberteil', 'Shirt', { waeschestatus: 'korb' }), teil('hose', 'Jeans')]),
    );
    expect(e.kandidaten).toEqual([]);
    expect(e.fehlend).toEqual([{ kategorie: 'oberteil', grund: 'nicht_verfuegbar' }]);
  });
});

describe('Ergebnis', () => {
  const viele = () => [
    ...['Hemd', 'Polo', 'Pulli', 'Shirt', 'Bluse', 'Top'].map((n) => teil('oberteil', n)),
    ...['Jeans', 'Chino', 'Stoffhose', 'Cord'].map((n) => teil('hose', n)),
    teil('jacke', 'Jacke'),
    teil('schuhe', 'Sneaker'),
    teil('schuhe', 'Boots'),
  ];

  it('höchstens zehn verschiedene Kombinationen, kein Teil öfter als dreimal', () => {
    const e = kandidatenFuerTag(eingabe(viele()));
    expect(e.kandidaten.length).toBeLessThanOrEqual(10);
    expect(new Set(e.kandidaten.map((k) => k.schluessel)).size).toBe(e.kandidaten.length);
    const zaehler = new Map<string, number>();
    for (const k of e.kandidaten) {
      for (const t of [k.oberteil, k.hose]) zaehler.set(t.id, (zaehler.get(t.id) ?? 0) + 1);
    }
    expect(Math.max(...zaehler.values())).toBeLessThanOrEqual(3);
  });

  it('ein einziges Paar Schuhe begrenzt den Stapel nicht', () => {
    const e = kandidatenFuerTag(eingabe(viele().filter((t) => t.name !== 'Boots')));
    expect(e.kandidaten).toHaveLength(10);
  });

  it('deterministisch: gleicher Tag und Bestand ergeben dieselbe Liste, egal in welcher Reihenfolge', () => {
    const teile = viele();
    const a = kandidatenFuerTag(eingabe(teile)).kandidaten.map((k) => k.schluessel);
    const b = kandidatenFuerTag(eingabe([...teile].reverse())).kandidaten.map((k) => k.schluessel);
    expect(a).toEqual(b);
  });

  it('funktioniert ohne Wetter', () => {
    const e = kandidatenFuerTag(eingabe(viele(), { wetter: null }));
    expect(e.kandidaten.length).toBeGreaterThan(0);
    expect(e.zielWaerme).toBe(1);
  });

  it('Begründung höchstens 160 Zeichen, Titel höchstens vier Wörter', () => {
    const e = kandidatenFuerTag(
      eingabe(viele(), { wetter: REGEN, anlass: { formalitaet: 1, ausTermin: true } }),
    );
    for (const k of e.kandidaten) {
      expect(k.begruendung.length).toBeLessThanOrEqual(MAX_BEGRUENDUNG);
      expect(k.titel.split(' ').length).toBeLessThanOrEqual(4);
    }
    expect(e.kandidaten[0]!.begruendung).toMatch(/^Regen ab 14 Uhr/);
  });

  it('Farbharmonie zählt: Rot zu Grün landet hinter Rot zu Schwarz', () => {
    const rot = teil('oberteil', 'Rot', { farbeHex: '#B3262E', farbeName: 'Rot' });
    const gruen = teil('hose', 'Grün', { farbeHex: '#3E7D4E', farbeName: 'Grün' });
    const schwarz = teil('hose', 'Schwarz');
    const e = kandidatenFuerTag(eingabe([rot, gruen, schwarz]));
    expect(e.kandidaten[0]!.hose.id).toBe(schwarz.id);
  });

  it('lange nicht Getragenes rückt nach vorn, gestern Getragenes nach hinten', () => {
    const a = teil('oberteil', 'Gestern getragen');
    const b = teil('oberteil', 'Lange her');
    const hose = teil('hose', 'Jeans');
    const eintrag = (id: string, datum: string): TrageEintrag => ({
      id: `${id}-${datum}`,
      teilId: id,
      outfitId: null,
      datum,
      angelegtAm: `${datum}T08:00:00.000Z`,
      zuletztGeaendert: `${datum}T08:00:00.000Z`,
      geloescht: false,
    });
    const e = kandidatenFuerTag(
      eingabe([a, b, hose], {
        trageEintraege: [eintrag(a.id, '2026-10-04'), eintrag(b.id, '2026-08-01')],
        schwellen: { oberteil: 99, hose: 99 },
      }),
    );
    expect(e.kandidaten[0]!.oberteil.id).toBe(b.id);
  });

  it('dieselbe Kombination, in den letzten 14 Tagen getragen, rutscht nach hinten', () => {
    const o1 = teil('oberteil', 'A');
    const o2 = teil('oberteil', 'B');
    const h = teil('hose', 'H');
    const historie = [
      {
        datum: '2026-10-01',
        kombinationsSchluessel: kombinationsSchluessel([o1.id, h.id]),
        bewertung: 'offen' as const,
        getragen: true,
        teilIds: [o1.id, h.id],
      },
    ];
    const e = kandidatenFuerTag(eingabe([o1, o2, h], { historie }));
    expect(e.kandidaten[0]!.oberteil.id).toBe(o2.id);
    expect(e.kandidaten[1]!.anteile.gleicheKombination14Tage).toBe(-30);
  });

  it('gelerntes Feedback hebt Gemochtes und senkt Abgelehntes', () => {
    const o1 = teil('oberteil', 'Gemocht');
    const o2 = teil('oberteil', 'Abgelehnt');
    const h = teil('hose', 'H');
    const historie = [o1, o2].map((o, i) => ({
      datum: '2026-10-03',
      kombinationsSchluessel: kombinationsSchluessel([o.id, h.id]),
      bewertung: (i === 0 ? 'gefaellt' : 'abgelehnt') as 'gefaellt' | 'abgelehnt',
      getragen: false,
      teilIds: [o.id, h.id],
    }));
    const feedback = lerneAusFeedback(
      historie,
      new Map([o1, o2, h].map((t) => [t.id, t])),
      '2026-10-05',
    );
    const e = kandidatenFuerTag(eingabe([o1, o2, h], { feedback }));
    expect(e.kandidaten[0]!.oberteil.id).toBe(o1.id);
    expect(e.kandidaten[0]!.anteile.feedback).toBeGreaterThan(0);
    expect(e.kandidaten[1]!.anteile.feedback).toBeLessThan(0);
  });
});

describe('Schmuck', () => {
  const ring = (
    metall: 'gold' | 'silber',
    name: string,
    unterart: 'ring' | 'kette' | 'armband' | 'ohrring' = 'ring',
  ) => teil('schmuck', name, { metallton: metall, unterart });

  it('nie Pflicht, höchstens drei, höchstens eins je Unterart, gleicher Metallton', () => {
    const schmuck = [
      ring('gold', 'Goldring'),
      ring('gold', 'Goldring 2'),
      ring('gold', 'Goldkette', 'kette'),
      ring('gold', 'Goldarmband', 'armband'),
      ring('gold', 'Goldohrring', 'ohrring'),
      ring('silber', 'Silberkette', 'kette'),
    ];
    const e = kandidatenFuerTag(
      eingabe([...grundbestand(), ...schmuck], { anlass: { formalitaet: 3, ausTermin: true } }),
    );
    // Förmlich: Grundbestand hat Formalität 1 → keine Kandidaten; daher eigene förmliche Kleidung.
    expect(e.kandidaten).toEqual([]);

    const fein = [
      teil('oberteil', 'Smokinghemd', { formalitaet: 3 }),
      teil('hose', 'Anzughose', { formalitaet: 3 }),
    ];
    const f = kandidatenFuerTag(
      eingabe([...fein, ...schmuck], { anlass: { formalitaet: 3, ausTermin: true } }),
    );
    for (const k of f.kandidaten) {
      expect(k.schmuck.length).toBeLessThanOrEqual(3);
      expect(new Set(k.schmuck.map((s) => s.unterart)).size).toBe(k.schmuck.length);
      expect(new Set(k.schmuck.map((s) => s.metallton)).size).toBe(1);
    }
    expect(f.kandidaten[0]!.schmuck.length).toBe(3);
  });

  it('bei casual höchstens ein Teil', () => {
    const e = kandidatenFuerTag(
      eingabe(
        [...grundbestand().map((t) => ({ ...t, formalitaet: 0 as const })), ring('silber', 'Ring')],
        {
          anlass: { formalitaet: 0, ausTermin: false },
        },
      ),
    );
    expect(e.kandidaten.every((k) => k.schmuck.length <= 1)).toBe(true);
  });
});
