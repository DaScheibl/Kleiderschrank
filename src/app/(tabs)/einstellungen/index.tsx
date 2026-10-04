import Constants from 'expo-constants';

import { Placeholder, Screen } from '@/ui/components/screen';

export default function EinstellungenScreen() {
  return (
    <Screen>
      <Placeholder text="Konto, Größen, Stile und Abo folgen in den Blöcken A3, D und F." />
      <Placeholder text={`Version ${Constants.expoConfig?.version ?? '–'}`} />
    </Screen>
  );
}
