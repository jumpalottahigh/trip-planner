import { useEffect, useState } from 'react';
import { isISODate } from '../utils/dates';

type Props = {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => boolean;
  onAdd: () => void;
};

export function PlannerHeader({ startDate, endDate, onChange, onAdd }: Props) {
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setStart(startDate); setEnd(endDate); }, [startDate, endDate]);

  return (
    <form className="planner-header" noValidate onSubmit={(event) => {
      event.preventDefault();
      if (!isISODate(start) || !isISODate(end) || start > end) {
        setError('Enter valid trip dates with the end on or after the start.');
        return;
      }
      setError(null);
      onChange(start, end);
    }}>
      <label>Trip start<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label>
      <label>Trip end<input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
      <button type="submit" className="btn secondary">Apply dates</button>
      <span className="header-hours">07:00 – 23:00<span>1-hour steps</span></span>
      <button type="button" className="btn add-event" onClick={onAdd}>+ Add event</button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </form>
  );
}
