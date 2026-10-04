import { describe, expect, it } from 'vitest';

import { darfSynchronisieren, kontoAbgleich } from './kontoabgleich';

describe('kontoAbgleich', () => {
  it('ohne Sitzung passiert nichts', () => {
    expect(kontoAbgleich(null, null)).toEqual({ art: 'ohne_sitzung' });
    expect(kontoAbgleich('a', null)).toEqual({ art: 'ohne_sitzung' });
  });
  it('ein noch freier Schrank wird an die erste Sitzung gebunden', () => {
    expect(kontoAbgleich(null, 'a')).toEqual({ art: 'binden', kontoId: 'a' });
  });
  it('gleiches Konto passt', () => {
    expect(kontoAbgleich('a', 'a')).toEqual({ art: 'passt' });
  });
  it('ein anderes Konto führt zur Nachfrage', () => {
    expect(kontoAbgleich('a', 'b')).toEqual({ art: 'anderes_konto', lokal: 'a', sitzung: 'b' });
  });
  it('bei einem anderen Konto wird nie synchronisiert', () => {
    expect(darfSynchronisieren(kontoAbgleich('a', 'b'))).toBe(false);
    expect(darfSynchronisieren(kontoAbgleich(null, null))).toBe(false);
    expect(darfSynchronisieren(kontoAbgleich('a', 'a'))).toBe(true);
    expect(darfSynchronisieren(kontoAbgleich(null, 'a'))).toBe(true);
  });
});
