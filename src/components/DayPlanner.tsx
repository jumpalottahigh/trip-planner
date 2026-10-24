import { useCallback, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { EventDraft, PlannerEvent, Trip } from '../types'
import { addDays, daySpan, formatDay, isWeekend } from '../utils/dates'
import {
  DAY_WIDTH,
  END_MINUTE,
  HOURS,
  HOUR_HEIGHT,
  formatTime,
  placeEvents
} from '../utils/schedule'
import { EventBlock } from './EventBlock'

type Props = {
  planner: Trip
  onAdd: (draft: EventDraft) => void
  onEdit: (event: PlannerEvent) => void
  onCommit: (event: PlannerEvent) => void
}

export function DayPlanner({ planner, onAdd, onEdit, onCommit }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState<PlannerEvent | null>(null)
  const days = useMemo(
    () =>
      Array.from(
        { length: daySpan(planner.startDate, planner.endDate) },
        (_, index) => addDays(planner.startDate, index)
      ),
    [planner.startDate, planner.endDate]
  )
  const visibleEvents = useMemo(
    () =>
      planner.events
        .map((event) => (event.id === preview?.id ? preview : event))
        .filter(
          (event) =>
            event.date >= planner.startDate && event.date <= planner.endDate
        ),
    [planner, preview]
  )
  const placements = useMemo(() => placeEvents(visibleEvents), [visibleEvents])
  const onPreview = useCallback(
    (event: PlannerEvent | null) => setPreview(event),
    []
  )
  const dimensions = {
    '--day-width': `${DAY_WIDTH}px`,
    '--hour-height': `${HOUR_HEIGHT}px`,
    '--days-width': `${days.length * DAY_WIDTH}px`
  } as CSSProperties

  return (
    <div
      ref={scrollerRef}
      className='planner-grid'
      style={dimensions}
      aria-label='Daily vacation schedule'
    >
      <div className='grid-content'>
        <div className='day-headers'>
          <div className='time-corner'>Hour</div>
          {days.map((date) => (
            <div
              key={date}
              className={`day-header${isWeekend(date) ? ' weekend' : ''}`}
            >
              <span>{formatDay(date)}</span>
              <small>{date.slice(0, 4)}</small>
            </div>
          ))}
        </div>
        <div className='grid-body'>
          <div className='hour-labels'>
            {HOURS.map((minute) => (
              <div key={minute} className='hour-label'>
                {formatTime(minute)}
              </div>
            ))}
            <div className='closing-hour'>{formatTime(END_MINUTE)}</div>
          </div>
          <div className='days-body'>
            <div className='slot-columns'>
              {days.map((date) => (
                <div
                  key={date}
                  className={`day-column${isWeekend(date) ? ' weekend' : ''}`}
                >
                  {HOURS.map((minute) => (
                    <button
                      key={minute}
                      className='hour-slot'
                      type='button'
                      aria-label={`Add event on ${date} at ${formatTime(minute)}`}
                      title={`Add event at ${formatTime(minute)}`}
                      onClick={() =>
                        onAdd({
                          title: 'New event',
                          date,
                          startMinute: minute,
                          endMinute: minute + 60
                        })
                      }
                    >
                      <span aria-hidden='true'>+</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className='event-layer'>
              {visibleEvents.map((event) => {
                const placement = placements.get(event.id)
                return (
                  placement && (
                    <EventBlock
                      key={event.id}
                      event={event}
                      placement={placement}
                      startDate={planner.startDate}
                      endDate={planner.endDate}
                      scrollerRef={scrollerRef}
                      onPreview={onPreview}
                      onCommit={onCommit}
                      onEdit={onEdit}
                    />
                  )
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
