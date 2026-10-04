import type { Einstellungen, Kategorie, Waeschestatus } from './typen';

export const STANDARD_SCHWELLEN: Record<Kategorie, number> = {
  oberteil: 1,
  hose: 4,
  jacke: 10,
  schuhe: 30,
  accessoire: 5,
  schmuck: 0,
};

export const STANDARD_EINSTELLUNGEN: Pick<
  Einstellungen,
  | 'alltagsFormalitaet'
  | 'aussortierNachMonaten'
  | 'abendvorschauUhrzeit'
  | 'ortManuell'
  | 'rundtourAbgeschlossen'
> = {
  alltagsFormalitaet: 0,
  aussortierNachMonaten: 9,
  abendvorschauUhrzeit: null,
  ortManuell: null,
  rundtourAbgeschlossen: false,
};

export const KATEGORIE_NAMEN: Record<Kategorie, string> = {
  oberteil: 'Oberteil',
  hose: 'Hose',
  jacke: 'Jacke',
  schuhe: 'Schuhe',
  accessoire: 'Accessoire',
  schmuck: 'Schmuck',
};

export const WAESCHESTATUS_NAMEN: Record<Waeschestatus, string> = {
  sauber: 'Im Schrank',
  korb: 'Im Wäschekorb',
  maschine: 'In der Maschine',
};
