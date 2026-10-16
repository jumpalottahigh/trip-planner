import type { EventDraft, PlannerEvent } from '../types';
import { addDays, isISODate } from './dates';

export const START_MINUTE = 7 * 60;
export const END_MINUTE = 23 * 60;
export const HOUR = 60;
export const HOURS = Array.from({ length: 16 }, (_, index) => START_MINUTE + index * HOUR);

// Keep geometry shared between the grid, event positions, and pointer calculations.
export const DAY_WIDTH = 210;
export const HOUR_HEIGHT = 64;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function formatTime(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

export function eventError(event: EventDraft): string | null {
  if (!event.title.trim() || event.title.trim().length > 200) {
    return 'Enter an event name between 1 and 200 characters.';
  }
  if (!isISODate(event.date)) return 'Enter a valid event date.';
  if (![event.startMinute, event.endMinute].every((minute) => Number.isInteger(minute) && minute % HOUR === 0)) {
    return 'Start and end times must be on the hour.';
  }
  if (event.startMinute < START_MINUTE || event.endMinute > END_MINUTE || event.endMinute - event.startMinute < HOUR) {
    return 'Events must be at least one hour long and stay between 07:00 and 23:00.';
  }
  return null;
}

export function moveEvent(event: PlannerEvent, dayDelta: number, hourDelta: number, minDay: number, maxDay: number): PlannerEvent {
  const duration = event.endMinute - event.startMinute;
  const startMinute = clamp(event.startMinute + Math.round(hourDelta) * HOUR, START_MINUTE, END_MINUTE - duration);
  return {
    ...event,
    date: addDays(event.date, clamp(Math.round(dayDelta), minDay, maxDay)),
    startMinute,
    endMinute: startMinute + duration,
  };
}

export function resizeEvent(event: PlannerEvent, edge: 'start' | 'end', hourDelta: number): PlannerEvent {
  const change = Math.round(hourDelta) * HOUR;
  return edge === 'start'
    ? { ...event, startMinute: clamp(event.startMinute + change, START_MINUTE, event.endMinute - HOUR) }
    : { ...event, endMinute: clamp(event.endMinute + change, event.startMinute + HOUR, END_MINUTE) };
}

export type Placement = { column: number; columns: number };

export function placeEvents(events: PlannerEvent[]): Map<string, Placement> {
  const placements = new Map<string, Placement>();
  const byDay = new Map<string, PlannerEvent[]>();
  for (const event of events) {
    const day = byDay.get(event.date) ?? [];
    day.push(event);
    byDay.set(event.date, day);
  }
  for (const day of byDay.values()) {
    const sorted = [...day].sort((a, b) =>
      a.startMinute - b.startMinute || b.endMinute - a.endMinute || a.id.localeCompare(b.id));
    let group: PlannerEvent[] = [];
    let ends: number[] = [];
    let groupEnd = -1;
    const finishGroup = () => {
      for (const event of group) {
        const placement = placements.get(event.id);
        if (placement) placement.columns = ends.length;
      }
    };
    for (const event of sorted) {
      if (event.startMinute >= groupEnd) {
        finishGroup();
        group = [];
        ends = [];
      }
      let column = ends.findIndex((end) => end <= event.startMinute);
      if (column === -1) column = ends.length;
      ends[column] = event.endMinute;
      group.push(event);
      groupEnd = group.length === 1 ? event.endMinute : Math.max(groupEnd, event.endMinute);
      placements.set(event.id, { column, columns: 1 });
    }
    finishGroup();
  }
  return placements;
}

export function eventColor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return `var(--event-color-${(Math.abs(hash) % 5) + 1})`;
}
