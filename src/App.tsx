import { useState } from 'react';
import type { EventDraft } from './types';
import { DayPlanner } from './components/DayPlanner';
import { EventEditor } from './components/EventEditor';
import { PlannerHeader } from './components/PlannerHeader';
import { usePlanner } from './hooks/usePlanner';

export function App() {
  const { planner, error, saveEvent, deleteEvent, updateRange, reset, retry } = usePlanner();
  const [editor, setEditor] = useState<{ draft: EventDraft; id?: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const hidden = planner?.events.filter((event) => event.date < planner.startDate || event.date > planner.endDate).length ?? 0;

  return (
    <main className="app">
      <header className="app-header">
        <div><p className="eyebrow">Make room for the good things</p><h1>Vacation Planner</h1></div>
        <span className="storage-note">{error ? 'Storage needs attention' : 'Stored only in this browser'}</span>
      </header>
      {error && <div className="error" role="alert">{error}</div>}
      {!planner ? (
        <section className="recovery">
          <h2>Your saved planner could not be opened</h2>
          <p>Retry to keep your existing data. Starting fresh explicitly replaces the saved planner.</p>
          <button className="btn secondary" onClick={retry}>Retry loading</button>
          <button className="btn danger" onClick={() => {
            if (!confirmReset) { setConfirmReset(true); return; }
            reset();
          }}>{confirmReset ? 'Confirm replace saved planner' : 'Start fresh'}</button>
        </section>
      ) : (
        <>
          <PlannerHeader startDate={planner.startDate} endDate={planner.endDate} onChange={updateRange}
            onAdd={() => setEditor({ draft: { title: 'New event', date: planner.startDate, startMinute: 9 * 60, endMinute: 10 * 60 } })} />
          <div className="planner-hints">
            <p>Click an empty hour to add an event. Drag to move; pull the top or bottom edge to resize.</p>
            {planner.events.length === 0 && <span>Your days, your pace. Start with one event.</span>}
          </div>
          {hidden > 0 && <p className="notice" role="status">
            {hidden} {hidden === 1 ? 'event is' : 'events are'} outside the displayed dates, still saved. Extend the trip dates to see {hidden === 1 ? 'it' : 'them'} again.
          </p>}
          <DayPlanner planner={planner}
            onAdd={(draft) => setEditor({ draft })}
            onEdit={(event) => setEditor({ draft: event, id: event.id })}
            onCommit={(event) => { saveEvent(event, event.id); }} />
          <p className="footer-note">One trip · Local times · Overlaps welcome · Click an event to edit its details</p>
          {editor && <EventEditor draft={editor.draft} id={editor.id}
            startDate={planner.startDate} endDate={planner.endDate}
            onSave={saveEvent} onDelete={deleteEvent} onClose={() => setEditor(null)} />}
        </>
      )}
    </main>
  );
}
