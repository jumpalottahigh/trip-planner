export type PlannerEvent = {
  id: string;
  title: string;
  date: string;
  startMinute: number;
  endMinute: number;
};

export type EventDraft = Omit<PlannerEvent, 'id'>;

export type Planner = {
  version: 1;
  startDate: string;
  endDate: string;
  events: PlannerEvent[];
};
