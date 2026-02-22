import { useState, useMemo } from 'react';
import { useAttendance } from '../hooks/useAttendance';
import { LoadingState } from './ui/LoadingState';
import { EmptyState } from './ui/EmptyState';
import { ErrorState } from './ui/ErrorState';

function getCalendarDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const total = startPad + daysInMonth;
  const rows = Math.ceil(total / 7);
  const cells = rows * 7;
  const days = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length < cells) days.push(null);
  return days;
}

function dateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function AttendanceCalendar() {
  const [viewDate, setViewDate] = useState(() => new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const { status, data, error, refetch } = useAttendance(viewDate);

  const workoutDates = useMemo(() => {
    if (!data) return new Set();
    const set = new Set();
    (Array.isArray(data) ? data : data.dates || []).forEach((item) => {
      const date = typeof item === 'string' ? item : item.date;
      if (date) set.add(date);
    });
    return set;
  }, [data]);

  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);
  const monthLabel = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const goPrev = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const goNext = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));

  return (
    <section className="attendance-calendar" aria-label="Workout attendance">
      <h2>Attendance</h2>

      {status === 'loading' && <LoadingState message="Loading attendance…" />}
      {status === 'error' && <ErrorState message={error} onRetry={refetch} />}
      {status === 'empty' && (
        <EmptyState
          message="No workouts this month."
          actionLabel="Refresh"
          onAction={refetch}
        />
      )}

      {(status === 'success' || status === 'empty') && (
        <>
          <div className="attendance-calendar-nav">
            <button type="button" className="secondary" onClick={goPrev} aria-label="Previous month">
              ←
            </button>
            <span className="attendance-calendar-title">{monthLabel}</span>
            <button type="button" className="secondary" onClick={goNext} aria-label="Next month">
              →
            </button>
          </div>
          <div className="attendance-calendar-grid" role="grid" aria-label={monthLabel}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="attendance-calendar-cell attendance-calendar-header" role="columnheader">
                {d}
              </div>
            ))}
            {calendarDays.map((day, i) => {
              if (day == null) {
                return <div key={`empty-${i}`} className="attendance-calendar-cell attendance-calendar-empty" />;
              }
              const key = dateKey(year, month, day);
              const workedOut = workoutDates.has(key);
              return (
                <div
                  key={key}
                  className={`attendance-calendar-cell attendance-calendar-day ${workedOut ? 'worked-out' : ''}`}
                  role="gridcell"
                  aria-label={day}
                  title={workedOut ? `Worked out on ${key}` : ''}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
