export type PlannerEvent = {
  id: string
  title: string
  date: string
  startMinute: number
  endMinute: number
}

export type EventDraft = Omit<PlannerEvent, 'id'>

// Legacy single-trip shape, only read to migrate old saved data.
export type Planner = {
  version: 1
  startDate: string
  endDate: string
  events: PlannerEvent[]
}

export type Trip = {
  id: string
  name: string
  startDate: string
  endDate: string
  events: PlannerEvent[]
}

export type StoredState = {
  version: 2
  activeTripId: string
  trips: Trip[]
}
