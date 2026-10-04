import * as Location from 'expo-location';

export interface Ort {
  name: string;
  breite: number;
  laenge: number;
}

export type Berechtigung = 'erteilt' | 'offen' | 'verweigert';

/** Auf zwei Nachkommastellen (~1 km) – genauer braucht es das Wetter nicht. */
export function runden(ort: Ort): Ort {
  return {
    name: ort.name,
    breite: Math.round(ort.breite * 100) / 100,
    laenge: Math.round(ort.laenge * 100) / 100,
  };
}

export async function locationPermission(): Promise<Berechtigung> {
  const r = await Location.getForegroundPermissionsAsync();
  if (r.granted) return 'erteilt';
  return r.canAskAgain ? 'offen' : 'verweigert';
}

/** Fragt erst, wenn der Nutzer es selbst angestoßen hat (Berechtigung beim ersten Bedarf). */
export async function requestLocationPermission(): Promise<Berechtigung> {
  const r = await Location.requestForegroundPermissionsAsync();
  if (r.granted) return 'erteilt';
  return r.canAskAgain ? 'offen' : 'verweigert';
}

/** Ungefährer Standort – ohne vorher zu fragen. Liefert null, wenn keine Freigabe besteht. */
export async function approximateDeviceLocation(): Promise<Ort | null> {
  if ((await locationPermission()) !== 'erteilt') return null;
  const position =
    (await Location.getLastKnownPositionAsync({ maxAge: 3 * 3600_000 })) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }));
  return runden({
    name: 'Aktueller Standort',
    breite: position.coords.latitude,
    laenge: position.coords.longitude,
  });
}
