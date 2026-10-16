import type { Planner, PlannerEvent } from '../types';
import { addDays, isISODate, todayISO } from './dates';
import { eventError } from './schedule';

export const STORAGE_KEY = 'vacation-day-planner:v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEvent(value: unknown): value is PlannerEvent {
  return isRecord(value)
    && typeof value.id === 'string' && value.id.length > 0
    && typeof value.title === 'string'
    && typeof value.date === 'string'
    && typeof value.startMinute === 'number'
    && typeof value.endMinute === 'number'
    && eventError({
      title: value.title, date: value.date,
      startMinute: value.startMinute, endMinute: value.endMinute,
    }) === null;
}

export function isPlanner(value: unknown): value is Planner {
  return isRecord(value)
    && value.version === 1
    && isISODate(value.startDate) && isISODate(value.endDate)
    && value.startDate <= value.endDate
    && Array.isArray(value.events) && value.events.every(isEvent)
    && new Set(value.events.map((event) => event.id)).size === value.events.length;
}

export function emptyPlanner(): Planner {
  const startDate = todayISO();
  return { version: 1, startDate, endDate: addDays(startDate, 6), events: [] };
}

type ReadResult = { planner: Planner; error: null } | { planner: null; error: string };

export function readPlanner(getStorage: () => Pick<Storage, 'getItem'> = () => localStorage): ReadResult {
  try {
    const raw = getStorage().getItem(STORAGE_KEY);
    if (raw === null) return { planner: emptyPlanner(), error: null };
    const value: unknown = JSON.parse(raw);
    if (!isPlanner(value)) throw new Error('The saved planner has invalid data or an unsupported version.');
    return { planner: value, error: null };
  } catch (error) {
    return {
      planner: null,
      error: `Could not load the saved planner. ${error instanceof Error ? error.message : String(error)} Existing data has not been replaced.`,
    };
  }
}

export function writePlanner(planner: Planner, getStorage: () => Pick<Storage, 'setItem'> = () => localStorage): string | null {
  try {
    getStorage().setItem(STORAGE_KEY, JSON.stringify(planner));
    return null;
  } catch (error) {
    return `Changes were not saved. ${error instanceof Error ? error.message : String(error)} Free up browser storage or allow site storage, then try again.`;
  }
}
