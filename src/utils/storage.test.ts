import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, emptyPlanner, isPlanner, readPlanner, writePlanner } from './storage';

describe('browser persistence', () => {
  it('starts empty only when no saved planner exists', () => {
    const result = readPlanner(() => ({ getItem: () => null }));
    expect(result.error).toBeNull();
    expect(result.planner?.events).toEqual([]);
  });

  it('round-trips a planner including events outside the displayed dates', () => {
    const planner = {
      ...emptyPlanner(), startDate: '2026-06-01', endDate: '2026-06-06',
      events: [{ id: 'dinner', title: 'Dinner', date: '2026-06-07', startMinute: 19 * 60, endMinute: 20 * 60 }],
    };
    let saved = '';
    expect(writePlanner(planner, () => ({ setItem: (key, value) => {
      expect(key).toBe(STORAGE_KEY);
      saved = value;
    } }))).toBeNull();
    expect(readPlanner(() => ({ getItem: () => saved })).planner).toEqual(planner);
  });

  it('surfaces malformed/unsupported data without replacing it', () => {
    for (const raw of ['{broken', '{}', JSON.stringify({ ...emptyPlanner(), version: 2 })]) {
      const result = readPlanner(() => ({ getItem: () => raw }));
      expect(result.planner).toBeNull();
      expect(result.error).toContain('Existing data has not been replaced');
    }
  });

  it('rejects duplicate event IDs and invalid event times', () => {
    const item = { id: 'a', title: 'A', date: '2026-06-01', startMinute: 420, endMinute: 480 };
    expect(isPlanner({ ...emptyPlanner(), events: [item, item] })).toBe(false);
    expect(isPlanner({ ...emptyPlanner(), events: [{ ...item, endMinute: 425 }] })).toBe(false);
  });

  it('surfaces denied storage reads and failed writes', () => {
    expect(readPlanner(() => { throw new Error('Access denied'); }).error).toContain('Access denied');
    expect(writePlanner(emptyPlanner(), () => ({
      setItem: () => { throw new Error('Quota exceeded'); },
    }))).toContain('Changes were not saved');
  });
});
