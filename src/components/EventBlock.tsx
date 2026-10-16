import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import interact from 'interactjs';
import type { PlannerEvent } from '../types';
import { dayIndex } from '../utils/dates';
import type { Placement } from '../utils/schedule';
import { DAY_WIDTH, HOUR_HEIGHT, START_MINUTE, eventColor, formatTime, moveEvent, resizeEvent } from '../utils/schedule';

type Props = {
  event: PlannerEvent;
  startDate: string;
  endDate: string;
  placement: Placement;
  scrollerRef: RefObject<HTMLDivElement>;
  onPreview: (event: PlannerEvent | null) => void;
  onCommit: (event: PlannerEvent) => void;
  onEdit: (event: PlannerEvent) => void;
};

export function EventBlock(props: Props) {
  const { event, startDate, placement, scrollerRef } = props;
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [active, setActive] = useState(false);
  const moved = useRef(false);
  const gesture = useRef({
    original: event, next: event, x: 0, y: 0,
    scrollLeft: 0, scrollTop: 0, deltaX: 0, deltaY: 0,
  });

  useEffect(() => {
    const el = ref.current;
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;

    const start = (x: number, y: number) => {
      const original = latest.current.event;
      gesture.current = {
        original, next: original, x, y, scrollLeft: scroller.scrollLeft,
        scrollTop: scroller.scrollTop, deltaX: 0, deltaY: 0,
      };
      moved.current = false;
      setActive(true);
    };
    const preview = (next: PlannerEvent) => {
      gesture.current.next = next;
      moved.current = true;
      latest.current.onPreview(next);
    };
    const end = () => {
      const { original, next } = gesture.current;
      setActive(false);
      latest.current.onPreview(null);
      if (original.date !== next.date || original.startMinute !== next.startMinute || original.endMinute !== next.endMinute) {
        latest.current.onCommit(next);
      }
    };
    const inst = interact(el)
      .draggable({
        ignoreFrom: '.resize-handle',
        autoScroll: { container: scroller, margin: 40, speed: 400 },
        listeners: {
          start: (event) => start(event.clientX, event.clientY),
          move: (event) => {
            const state = gesture.current;
            state.deltaX = event.clientX - state.x + scroller.scrollLeft - state.scrollLeft;
            state.deltaY = event.clientY - state.y + scroller.scrollTop - state.scrollTop;
            preview(moveEvent(
              state.original, state.deltaX / DAY_WIDTH, state.deltaY / HOUR_HEIGHT,
              dayIndex(state.original.date, latest.current.startDate),
              dayIndex(state.original.date, latest.current.endDate),
            ));
          },
          end,
        },
      })
      .resizable({
        edges: { top: '.resize-handle.top', bottom: '.resize-handle.bottom' },
        autoScroll: { container: scroller, margin: 40, speed: 400 },
        listeners: {
          start: (event) => start(event.clientX, event.clientY),
          move: (event) => {
            const state = gesture.current;
            const delta = event.clientY - state.y + scroller.scrollTop - state.scrollTop;
            preview(resizeEvent(state.original, event.edges.top ? 'start' : 'end', delta / HOUR_HEIGHT));
          },
          end,
        },
      });
    return () => { inst.unset(); };
  }, [scrollerRef]);

  const columnWidth = DAY_WIDTH / placement.columns;
  return (
    <div ref={ref} role="button" tabIndex={0}
      className={`event-block${active ? ' dragging' : ''}`}
      data-event-id={event.id}
      aria-label={`${event.title}, ${event.date}, ${formatTime(event.startMinute)} to ${formatTime(event.endMinute)}. Edit event`}
      title={`${event.title}\n${event.date} · ${formatTime(event.startMinute)}–${formatTime(event.endMinute)}\nClick to edit; drag to move; drag top or bottom to resize.`}
      style={{
        left: dayIndex(startDate, event.date) * DAY_WIDTH + placement.column * columnWidth + 4,
        top: (event.startMinute - START_MINUTE) / 60 * HOUR_HEIGHT + 2,
        width: columnWidth - 8,
        height: (event.endMinute - event.startMinute) / 60 * HOUR_HEIGHT - 4,
        background: eventColor(event.id),
      }}
      onClick={() => {
        if (moved.current) { moved.current = false; return; }
        latest.current.onEdit(latest.current.event);
      }}
      onKeyDown={(key) => {
        if (key.key === 'Enter' || key.key === ' ') {
          key.preventDefault();
          latest.current.onEdit(latest.current.event);
        }
      }}>
      <div className="resize-handle top" aria-hidden="true" />
      <strong>{event.title}</strong>
      <span className="event-time">{formatTime(event.startMinute)}–{formatTime(event.endMinute)}</span>
      <div className="resize-handle bottom" aria-hidden="true" />
    </div>
  );
}
