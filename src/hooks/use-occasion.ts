import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { settingsQuery } from '@/data/repositories/settings-repository';
import {
  anlassDesTages,
  relevanteTermine,
  type Anlass,
  type Termin,
} from '@/domain/kalender/anlass';
import { STANDARD_EINSTELLUNGEN } from '@/domain/modell/konstanten';
import {
  calendarAccess,
  loadTodaysCalendar,
  requestCalendarAccess,
  type KalenderZugang,
} from '@/services/calendar';

export interface AnlassAnzeige {
  zugang: KalenderZugang | 'laedt';
  anlass: Anlass;
  termine: Termin[];
  freigeben: () => void;
}

export function useOccasion(): AnlassAnzeige {
  const { data } = useLiveQuery(settingsQuery());
  const alltag = data[0]?.alltagsFormalitaet ?? STANDARD_EINSTELLUNGEN.alltagsFormalitaet;
  const [zugang, setZugang] = useState<KalenderZugang | 'laedt'>('laedt');
  const [termine, setTermine] = useState<Termin[]>([]);

  const laden = useCallback((fragen: boolean) => {
    let aktiv = true;
    void (async () => {
      const z = fragen ? await requestCalendarAccess() : await calendarAccess();
      let heute: Termin[] = [];
      if (z === 'erteilt') {
        try {
          const jetzt = new Date();
          const { kalender, termine: alle } = await loadTodaysCalendar(jetzt);
          heute = relevanteTermine(alle, kalender, jetzt);
        } catch {
          // Ohne Kalender gilt einfach der Alltagswert.
        }
      }
      if (aktiv) {
        setZugang(z);
        setTermine(heute);
      }
    })();
    return () => {
      aktiv = false;
    };
  }, []);

  useFocusEffect(useCallback(() => laden(false), [laden]));

  return useMemo(
    () => ({
      zugang,
      anlass: anlassDesTages(termine, alltag),
      termine,
      freigeben: () => laden(true),
    }),
    [zugang, termine, alltag, laden],
  );
}
