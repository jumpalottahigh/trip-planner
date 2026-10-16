export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function isISODate(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(parseDate(value).getTime())
    && parseDate(value).toISOString().slice(0, 10) === value;
}

export function addDays(iso: string, days: number): string {
  const date = parseDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dayIndex(start: string, date: string): number {
  return Math.round((parseDate(date).getTime() - parseDate(start).getTime()) / 86_400_000);
}

export function daySpan(start: string, end: string): number {
  return dayIndex(start, end) + 1;
}

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isWeekend(iso: string): boolean {
  return [0, 6].includes(parseDate(iso).getUTCDay());
}

export function formatDay(iso: string): string {
  return parseDate(iso).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}
