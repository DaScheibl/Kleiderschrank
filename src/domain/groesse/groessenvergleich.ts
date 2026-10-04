import type {
  Groessenprofil,
  GroessenSystem,
  Kategorie,
  Kleidungsstueck,
  Koerperbereich,
} from '../modell/typen';

const ALPHA = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

/** Stufenwert einer normierten Größe; null, wenn sie nicht lesbar ist. */
export function stufe(system: GroessenSystem, wert: string): number | null {
  const w = wert.trim().toUpperCase();
  switch (system) {
    case 'alpha': {
      const i = ALPHA.indexOf(w === '2XL' ? 'XXL' : w === '3XL' ? 'XXXL' : w);
      return i >= 0 ? i : null;
    }
    case 'eu_konfektion': {
      // Konfektionsgrößen springen in Zweierschritten (46, 48, 50 …).
      const n = Number(w);
      return Number.isFinite(n) ? n / 2 : null;
    }
    case 'weite_laenge': {
      // Bundweite zählt; übliche Sprünge sind zwei Zoll.
      const n = Number(w.split('/')[0]);
      return Number.isFinite(n) ? n / 2 : null;
    }
    case 'schuh_eu': {
      const n = Number(w.replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
  }
}

export function bereichFuer(kategorie: Kategorie): Koerperbereich | null {
  switch (kategorie) {
    case 'oberteil':
    case 'jacke':
      return 'oberteil';
    case 'hose':
      return 'hose';
    case 'schuhe':
      return 'schuhe';
    default:
      return null;
  }
}

/** Nur Etikett und Handeingabe gelten als bestätigt – eine geschätzte Größe zählt nie. */
export function hatBestaetigteGroesse(teil: Kleidungsstueck): boolean {
  return (
    (teil.groesseQuelle === 'etikett' || teil.groesseQuelle === 'hand') &&
    teil.groesseSystem !== null &&
    teil.groesseNormiert !== null
  );
}

/**
 * Abstand in Stufen zur nächstgelegenen Profilgröße; null, wenn nicht vergleichbar
 * (keine bestätigte Größe, kein Profil für den Bereich, anderes Größensystem).
 */
export function abweichungZumProfil(
  teil: Kleidungsstueck,
  profil: readonly Groessenprofil[],
): number | null {
  if (!hatBestaetigteGroesse(teil)) return null;
  const bereich = bereichFuer(teil.kategorie);
  if (!bereich) return null;

  // Konfektion gilt als Ausweichprofil für Oberteile und Hosen.
  const kandidaten = profil.filter(
    (p) =>
      !p.geloescht &&
      (p.bereich === bereich || (p.bereich === 'konfektion' && bereich !== 'schuhe')),
  );
  const passend = kandidaten.filter((p) => p.system === teil.groesseSystem);
  if (passend.length === 0) return null;

  const eigene = stufe(teil.groesseSystem!, teil.groesseNormiert!);
  if (eigene === null) return null;

  let best: number | null = null;
  for (const p of passend) {
    for (const wert of p.werte) {
      const s = stufe(p.system, wert);
      if (s === null) continue;
      const d = Math.abs(s - eigene);
      if (best === null || d < best) best = d;
    }
  }
  return best;
}

/** Passt nicht = bestätigte Größe weicht um mehr als eine Stufe vom Profil ab. */
export function passtNichtLautGroesse(
  teil: Kleidungsstueck,
  profil: readonly Groessenprofil[],
): boolean {
  const d = abweichungZumProfil(teil, profil);
  return d !== null && d > 1;
}
