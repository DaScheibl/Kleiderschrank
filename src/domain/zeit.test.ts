import { describe, expect, it } from 'vitest';

import { lokalesDatum } from './zeit';

describe('lokalesDatum', () => {
  it('nimmt den Kalendertag der lokalen Zeitzone', () => {
    expect(lokalesDatum(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(lokalesDatum(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });
});
