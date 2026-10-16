import { useEffect, useRef, useState } from 'react';
import type { EventDraft } from '../types';
import { END_MINUTE, HOURS, eventError, formatTime } from '../utils/schedule';

type Props = {
  draft: EventDraft;
  id?: string;
  startDate: string;
  endDate: string;
  onSave: (draft: EventDraft, id?: string) => boolean;
  onDelete: (id: string) => boolean;
  onClose: () => void;
};

export function EventEditor({ draft, id, startDate, endDate, onSave, onDelete, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState(draft);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    titleRef.current?.select();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={dialogRef} className="event-editor" aria-labelledby="editor-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <form noValidate onSubmit={(event) => {
        event.preventDefault();
        const failure = eventError(fields)
          ?? (fields.date < startDate || fields.date > endDate ? 'Choose a date within the displayed trip.' : null);
        setError(failure);
        if (!failure) {
          if (onSave(fields, id)) onClose();
          else setError('Changes were not saved. Allow site storage or free up browser storage, then try again.');
        }
      }}>
        <div className="editor-heading">
          <h2 id="editor-title">{id ? 'Edit event' : 'New event'}</h2>
          <button type="button" className="icon-btn" aria-label="Close editor" onClick={onClose}>×</button>
        </div>
        <label>Event name
          <input ref={titleRef} autoFocus value={fields.title} maxLength={200}
            onChange={(event) => setFields({ ...fields, title: event.target.value })} />
        </label>
        <label>Day
          <input type="date" value={fields.date} min={startDate} max={endDate}
            onChange={(event) => setFields({ ...fields, date: event.target.value })} />
        </label>
        <div className="time-fields">
          <label>Start
            <select value={fields.startMinute} onChange={(event) => setFields({ ...fields, startMinute: Number(event.target.value) })}>
              {HOURS.map((minute) => <option key={minute} value={minute}>{formatTime(minute)}</option>)}
            </select>
          </label>
          <label>End
            <select value={fields.endMinute} onChange={(event) => setFields({ ...fields, endMinute: Number(event.target.value) })}>
              {[...HOURS.slice(1), END_MINUTE].map((minute) => <option key={minute} value={minute}>{formatTime(minute)}</option>)}
            </select>
          </label>
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="editor-actions">
          {id && <button type="button" className="btn danger" onClick={() => {
            if (!confirmDelete) { setConfirmDelete(true); return; }
            if (onDelete(id)) onClose();
            else setError('The event was not deleted because browser storage could not be updated. Please try again.');
          }}>{confirmDelete ? 'Confirm delete' : 'Delete'}</button>}
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn">Save event</button>
        </div>
      </form>
    </dialog>
  );
}
