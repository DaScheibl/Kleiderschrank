import * as Calendar from 'expo-calendar';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import type { KalenderInfo, Termin } from '@/domain/kalender/anlass';

export type KalenderZugang = 'nicht_verfuegbar' | 'erteilt' | 'offen' | 'verweigert';

/**
 * Seit SDK 57 enthält Expo Go das Kalendermodul nicht mehr (nur einen Platzhalter).
 * Im Development Build bzw. der fertigen App steht es zur Verfügung.
 */
export function isCalendarAvailable(): boolean {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

function zugang(r: { granted: boolean; canAskAgain: boolean }): KalenderZugang {
  if (r.granted) return 'erteilt';
  return r.canAskAgain ? 'offen' : 'verweigert';
}

export async function calendarAccess(): Promise<KalenderZugang> {
  if (!isCalendarAvailable()) return 'nicht_verfuegbar';
  return zugang(await Calendar.getCalendarPermissions());
}

/** Nur lesend; gefragt wird erst, wenn der Nutzer es selbst angestoßen hat. */
export async function requestCalendarAccess(): Promise<KalenderZugang> {
  if (!isCalendarAvailable()) return 'nicht_verfuegbar';
  return zugang(await Calendar.requestCalendarPermissions());
}

const iso = (d: string | Date) => new Date(d).toISOString();

/** Kalender und Termine des heutigen Tages. Titel und Orte bleiben auf dem Gerät. */
export async function loadTodaysCalendar(
  jetzt: Date,
): Promise<{ kalender: KalenderInfo[]; termine: Termin[] }> {
  const liste = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  if (!Array.isArray(liste)) return { kalender: [], termine: [] };

  const kalender: KalenderInfo[] = liste.map((k) => ({
    id: k.id,
    titel: k.title,
    typ: k.type ?? null,
    konto: k.ownerAccount ?? k.source?.name ?? null,
  }));

  const anfang = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate());
  const ende = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + 1);
  const events = await Calendar.listEvents(
    kalender.map((k) => k.id),
    anfang,
    ende,
  );

  return {
    kalender,
    termine: events.map((e) => ({
      kalenderId: e.calendarId,
      titel: e.title ?? '',
      ort: e.location ?? null,
      ganztaegig: Boolean(e.allDay),
      beginn: iso(e.startDate),
      ende: iso(e.endDate),
    })),
  };
}
