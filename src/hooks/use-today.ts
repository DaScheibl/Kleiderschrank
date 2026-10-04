import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { LokalesDatum } from '@/domain/modell/typen';
import { lokalesDatum } from '@/domain/zeit';

/** Der heutige Kalendertag – wechselt um Mitternacht und beim Zurückkehren in die App. */
export function useToday(): LokalesDatum {
  const [heute, setHeute] = useState(() => lokalesDatum(new Date()));

  useEffect(() => {
    const jetzt = new Date();
    const mitternacht = new Date(
      jetzt.getFullYear(),
      jetzt.getMonth(),
      jetzt.getDate() + 1,
      0,
      0,
      1,
    );
    const timer = setTimeout(
      () => setHeute(lokalesDatum(new Date())),
      mitternacht.getTime() - jetzt.getTime(),
    );
    const sub = AppState.addEventListener('change', (z) => {
      if (z === 'active') setHeute(lokalesDatum(new Date()));
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [heute]);

  return heute;
}
