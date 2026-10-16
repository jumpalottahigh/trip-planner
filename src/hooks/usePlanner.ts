import { useCallback, useState } from 'react';
import type { EventDraft, Planner, PlannerEvent } from '../types';
import { emptyPlanner, readPlanner, writePlanner } from '../utils/storage';

export function usePlanner() {
  const [initial] = useState(readPlanner);
  const [planner, setPlanner] = useState<Planner | null>(initial.planner);
  const [error, setError] = useState<string | null>(initial.error);

  const commit = useCallback((next: Planner): boolean => {
    const failure = writePlanner(next);
    setError(failure);
    if (failure) return false;
    setPlanner(next);
    return true;
  }, []);

  const saveEvent = useCallback((draft: EventDraft, id?: string): boolean => {
    if (!planner) return false;
    const event: PlannerEvent = { ...draft, title: draft.title.trim(), id: id ?? crypto.randomUUID() };
    return commit({
      ...planner,
      events: id ? planner.events.map((item) => item.id === id ? event : item) : [...planner.events, event],
    });
  }, [planner, commit]);

  const deleteEvent = useCallback((id: string): boolean => {
    return planner ? commit({ ...planner, events: planner.events.filter((event) => event.id !== id) }) : false;
  }, [planner, commit]);

  const updateRange = useCallback((startDate: string, endDate: string): boolean => {
    return planner ? commit({ ...planner, startDate, endDate }) : false;
  }, [planner, commit]);

  const retry = useCallback(() => {
    const result = readPlanner();
    setPlanner(result.planner);
    setError(result.error);
  }, []);

  return { planner, error, saveEvent, deleteEvent, updateRange, retry, reset: () => commit(emptyPlanner()) };
}
