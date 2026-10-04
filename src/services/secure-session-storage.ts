import * as SecureStore from 'expo-secure-store';

// Die Sitzung liegt im Schlüsselbund (iOS) bzw. Keystore (Android). Manche iOS-Versionen
// lehnen Werte über ca. 2 KB ab, eine Supabase-Sitzung ist größer – daher in Stücken.
const STUECK = 1800;
const OPTIONEN: SecureStore.SecureStoreOptions = {
  // Auch nach einem Neustart im Hintergrund lesbar, damit das Token erneuert werden kann.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

const anzahlKey = (key: string) => `${key}.n`;
const stueckKey = (key: string, i: number) => `${key}.${i}`;

async function anzahl(key: string): Promise<number> {
  return Number((await SecureStore.getItemAsync(anzahlKey(key), OPTIONEN)) ?? 0);
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const n = await anzahl(key);
    if (n === 0) return null;
    const teile: string[] = [];
    for (let i = 0; i < n; i++) {
      const teil = await SecureStore.getItemAsync(stueckKey(key, i), OPTIONEN);
      if (teil === null) return null;
      teile.push(teil);
    }
    return teile.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const vorher = await anzahl(key);
    const n = Math.ceil(value.length / STUECK);
    for (let i = 0; i < n; i++) {
      await SecureStore.setItemAsync(
        stueckKey(key, i),
        value.slice(i * STUECK, (i + 1) * STUECK),
        OPTIONEN,
      );
    }
    await SecureStore.setItemAsync(anzahlKey(key), String(n), OPTIONEN);
    for (let i = n; i < vorher; i++) await SecureStore.deleteItemAsync(stueckKey(key, i), OPTIONEN);
  },

  async removeItem(key: string): Promise<void> {
    const n = await anzahl(key);
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(stueckKey(key, i), OPTIONEN);
    await SecureStore.deleteItemAsync(anzahlKey(key), OPTIONEN);
  },
};
