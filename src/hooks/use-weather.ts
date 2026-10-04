import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { tageswetter, zielWaermegrad, type WetterTag } from '@/domain/wetter/wetter';
import type { Waermegrad } from '@/domain/modell/typen';
import { loadWeather, type Vorhersage, type WetterErgebnis } from '@/services/weather';

export interface WetterAnzeige {
  zustand: 'laedt' | WetterErgebnis['art'];
  vorhersage: Vorhersage | null;
  tag: WetterTag | null;
  ziel: Waermegrad | null;
  meldung: string | null;
  neuLaden: () => void;
}

/** Lädt beim Anzeigen des Screens; der Dienst entscheidet, ob ein Abruf nötig ist. */
export function useWeather(): WetterAnzeige {
  const [ergebnis, setErgebnis] = useState<WetterErgebnis | null>(null);

  const laden = useCallback((erzwingen: boolean) => {
    let aktiv = true;
    void loadWeather(erzwingen).then((r) => {
      if (aktiv) setErgebnis(r);
    });
    return () => {
      aktiv = false;
    };
  }, []);

  useFocusEffect(useCallback(() => laden(false), [laden]));

  return useMemo(() => {
    const vorhersage = ergebnis?.art === 'bereit' ? ergebnis.vorhersage : null;
    const tag = vorhersage ? tageswetter(vorhersage.stunden, new Date()) : null;
    return {
      zustand: ergebnis?.art ?? 'laedt',
      vorhersage,
      tag,
      ziel: tag ? zielWaermegrad(tag) : null,
      meldung: ergebnis?.art === 'fehler' ? ergebnis.meldung : null,
      neuLaden: () => laden(true),
    };
  }, [ergebnis, laden]);
}
