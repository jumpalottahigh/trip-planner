import { describe, expect, it } from 'vitest';
import type { PlannerEvent } from '../types';
import { END_MINUTE, HOURS, START_MINUTE, eventError, moveEvent, placeEvents, resizeEvent } from './schedule';

const event = (id: string, start: number, end: number, date = '2026-06-01'): PlannerEvent =>
  ({ id, title: id, date, startMinute: start * 60, endMinute: end * 60 });

describe('hourly scheduling', () => {
  it('has exactly 16 hourly slots ending at 23:00', () => {
    expect(HOURS).toHaveLength(16);
    expect(HOURS[0]).toBe(START_MINUTE);
    expect(HOURS.at(-1)).toBe(END_MINUTE - 60);
  });

  it('moves days and hours while preserving duration and respecting bounds', () => {
    const source = event('a', 9, 11);
    expect(moveEvent(source, 1, 3, 0, 6)).toMatchObject({
      date: '2026-06-02', startMinute: 12 * 60, endMinute: 14 * 60,
    });
    expect(moveEvent(source, -20, -50, 0, 6)).toMatchObject({
      date: '2026-06-01', startMinute: 7 * 60, endMinute: 9 * 60,
    });
    expect(moveEvent(source, 20, 50, 0, 6)).toMatchObject({
      date: '2026-06-07', startMinute: 21 * 60, endMinute: 23 * 60,
    });
  });

  it('resizes either edge with a one-hour minimum', () => {
    const source = event('a', 9, 11);
    expect(resizeEvent(source, 'start', 20)).toMatchObject({ startMinute: 10 * 60, endMinute: 11 * 60 });
    expect(resizeEvent(source, 'end', -20)).toMatchObject({ startMinute: 9 * 60, endMinute: 10 * 60 });
    expect(resizeEvent(source, 'start', -20).startMinute).toBe(7 * 60);
    expect(resizeEvent(source, 'end', 20).endMinute).toBe(23 * 60);
  });

  it('rejects empty names, invalid dates, sub-hour and out-of-bounds events', () => {
    expect(eventError({ ...event('a', 22, 23) })).toBeNull();
    for (const invalid of [
      { ...event('a', 9, 10), title: '  ' },
      event('a', 9, 10, '2026-02-30'), event('a', 9.5, 10),
      event('a', 23, 24), event('a', 9, 9), event('a', 6, 8),
    ]) expect(eventError(invalid)).not.toBeNull();
  });
});

describe('overlap layout', () => {
  it('does not overlap adjacent events or events on different days', () => {
    const result = placeEvents([event('a', 10, 11), event('b', 11, 12), event('c', 10, 11, '2026-06-02')]);
    expect([...result.values()]).toEqual(Array(3).fill({ column: 0, columns: 1 }));
  });

  it('handles nested events and reuses free columns', () => {
    const result = placeEvents([event('a', 8, 15), event('b', 9, 11), event('c', 10, 12), event('d', 12, 14)]);
    expect(result.get('a')).toEqual({ column: 0, columns: 3 });
    expect(result.get('b')).toEqual({ column: 1, columns: 3 });
    expect(result.get('c')).toEqual({ column: 2, columns: 3 });
    expect(result.get('d')).toEqual({ column: 1, columns: 3 });
  });

  it('sizes a chained overlap group consistently and resets after the group', () => {
    const items = [event('a', 9, 11), event('b', 10, 13), event('c', 12, 14), event('d', 14, 15)];
    const result = placeEvents(items);
    for (const id of ['a', 'b', 'c']) expect(result.get(id)?.columns).toBe(2);
    expect(result.get('d')).toEqual({ column: 0, columns: 1 });
    expect(placeEvents([...items].reverse())).toEqual(result);
  });
});
