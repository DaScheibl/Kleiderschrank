import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { useSyncState } from '@/hooks/use-sync';
import { resolveAccountConflict } from '@/services/sync/sync-service';

/** Fragt einmal nach, wenn ein anderes Konto auf einen vorhandenen Schrank trifft. */
export function AccountConflictPrompt() {
  const { status } = useSyncState();
  const gefragt = useRef<string | null>(null);

  useEffect(() => {
    if (status.art !== 'anderes_konto') return;
    const frage = `${status.lokal}>${status.sitzung}`;
    if (gefragt.current === frage) return;
    gefragt.current = frage;

    Alert.alert(
      'Anderes Konto',
      'Auf diesem Gerät liegt ein Schrank, der zu einem anderen Konto gehört. Was soll damit passieren? Gelöscht wird in keinem Fall etwas.',
      [
        {
          text: 'Beiseitelegen',
          onPress: () => void resolveAccountConflict('beiseitelegen'),
        },
        {
          text: 'In dieses Konto übernehmen',
          onPress: () => void resolveAccountConflict('uebernehmen'),
        },
      ],
      { cancelable: false },
    );
  }, [status]);

  return null;
}
