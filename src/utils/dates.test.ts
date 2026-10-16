import { describe, expect, it } from 'vitest';
import { addDays, dayIndex, daySpan, isISODate } from './dates';

describe('calendar dates', () => {
  it('rejects impossible calendar dates and accepts leap days', () => {
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('2026-02-29')).toBe(false);
    expect(isISODate('2028-02-29')).toBe(true);
    expect(isISODate('2026-6-01')).toBe(false);
  });

  it('keeps calendar-day arithmetic stable across DST and year boundaries', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daySpan('2026-06-01', '2026-06-07')).toBe(7);
    expect(dayIndex('2026-06-01', '2026-06-07')).toBe(6);
  });
});
