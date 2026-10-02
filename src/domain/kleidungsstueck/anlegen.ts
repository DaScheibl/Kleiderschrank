import { istGueltigerHex } from '../modell/farben';
import type {
  Formalitaet,
  IsoZeitpunkt,
  Kategorie,
  Kleidungsstueck,
  Unterart,
  Uuid,
  Waermegrad,
} from '../modell/typen';
import { UNTERARTEN } from '../modell/typen';

export interface NeuesTeilEingabe {
  name: string;
  kategorie: Kategorie;
  farbeHex: string;
  farbeName: string;
  unterart?: Unterart | null;
  waermegrad?: Waermegrad;
  formalitaet?: Formalitaet;
  regentauglich?: boolean;
}

export type AnlegenFehler = 'name_leer' | 'farbe_ungueltig' | 'unterart_passt_nicht';

export type AnlegenErgebnis =
  { ok: true; teil: Kleidungsstueck } | { ok: false; fehler: AnlegenFehler };

/** Erzeugt ein vollständiges Kleidungsstück mit Standardwerten. ID und Zeit kommen von außen, damit das testbar bleibt. */
export function neuesKleidungsstueck(
  eingabe: NeuesTeilEingabe,
  id: Uuid,
  jetzt: IsoZeitpunkt,
): AnlegenErgebnis {
  const name = eingabe.name.trim();
  if (name.length === 0) return { ok: false, fehler: 'name_leer' };
  if (!istGueltigerHex(eingabe.farbeHex)) return { ok: false, fehler: 'farbe_ungueltig' };

  const unterart = eingabe.unterart ?? null;
  if (
    unterart !== null &&
    !(UNTERARTEN[eingabe.kategorie] as readonly string[]).includes(unterart)
  ) {
    return { ok: false, fehler: 'unterart_passt_nicht' };
  }

  return {
    ok: true,
    teil: {
      id,
      angelegtAm: jetzt,
      zuletztGeaendert: jetzt,
      geloescht: false,

      name,
      kategorie: eingabe.kategorie,
      unterart,

      farbeHex: eingabe.farbeHex.toUpperCase(),
      farbeName: eingabe.farbeName,
      nebenfarbeHex: null,
      nebenfarbeName: null,
      muster: 'uni',
      material: null,

      waermegrad: eingabe.waermegrad ?? 1,
      formalitaet: eingabe.formalitaet ?? 0,
      regentauglich: eingabe.regentauglich ?? false,
      stilTags: [],

      groesseText: null,
      groesseSystem: null,
      groesseNormiert: null,
      groesseQuelle: null,

      metallton: eingabe.kategorie === 'schmuck' ? 'keins' : null,

      waeschestatus: 'sauber',
      gewaschenAm: null,
      waescheschwelleEigen: null,

      marke: null,
      kaufpreisCent: null,
      kaufdatum: null,

      status: 'aktiv',
      statusSeit: jetzt,
      verkaufspreisCent: null,
      zustand: null,
      aussortierFrageNichtVor: null,

      bildPfad: null,
      bildPruefsumme: null,
    },
  };
}
