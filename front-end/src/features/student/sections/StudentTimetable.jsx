import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudentTimetable, selectStudentResource } from '../studentSlice';
import { ResourceView, EmptyState } from '../../../shared/ui/StatusViews';
import { capitalize } from '../../../shared/format';

const DAY_NAMES = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };

// A cell holds one slot, or an array when two classes share the time.
function slotsAt(grid, day, time) {
  const cell = grid?.[day]?.[time];
  if (!cell) return [];
  return Array.isArray(cell) ? cell : [cell];
}

function Slot({ slot }) {
  return (
    <div className={`sp-slot${slot.type === 'lab' ? ' is-lab' : ''}`}>
      <strong>{slot.course_code}</strong>
      <span>{slot.course_name}</span>
      <div className="sp-muted">Room {slot.room || '-'} · {capitalize(slot.type) || 'Class'}</div>
    </div>
  );
}

function countSlots(data) {
  if (!data?.grid) return 0;
  return Object.values(data.grid).reduce((sum, day) => sum + Object.keys(day || {}).length, 0);
}

export default function StudentTimetable() {
  const dispatch = useDispatch();
  const timetable = useSelector(selectStudentResource('timetable'));

  useEffect(() => {
    dispatch(fetchStudentTimetable());
  }, [dispatch]);

  const todayCode = useMemo(() => ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date().getDay()], []);

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Timetable</h1>
          <p className="sp-page-subtitle">Weekly schedule for the courses you are enrolled in.</p>
        </div>
        <button
          type="button"
          className="sp-btn is-secondary is-small"
          onClick={() => dispatch(fetchStudentTimetable({ force: true }))}
          disabled={timetable.status === 'loading'}
        >
          Refresh
        </button>
      </div>

      <ResourceView
        resource={timetable}
        onRetry={() => dispatch(fetchStudentTimetable({ force: true }))}
        isEmpty={(data) => countSlots(data) === 0}
        empty={
          <div className="sp-card">
            <EmptyState title="No classes scheduled" message="No timetable slots exist yet for your enrolled courses." />
          </div>
        }
      >
        {(data) => {
          const days = data.days?.length ? data.days : Object.keys(data.grid);
          const times = data.times?.length ? data.times : [];
          const usedTimes = times.filter((t) => days.some((d) => slotsAt(data.grid, d, t).length > 0));
          return (
            <>
              {/* Desktop and tablet: week grid */}
              <div className="sp-table-wrap sp-timetable-wrap">
                <table className="sp-table sp-timetable">
                  <caption className="sp-muted" style={{ textAlign: 'left', padding: '10px 14px' }}>
                    Time slots with no class in any day are hidden.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: 80 }}>Time</th>
                      {days.map((d) => (
                        <th key={d} scope="col" style={d === todayCode ? { color: 'var(--sp-accent-dark)' } : undefined}>
                          {DAY_NAMES[d] || d}{d === todayCode ? ' (today)' : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usedTimes.map((time) => (
                      <tr key={time}>
                        <th scope="row">{time}</th>
                        {days.map((day) => (
                          <td key={day}>
                            {slotsAt(data.grid, day, time).map((slot) => (
                              <Slot key={slot.slot_id} slot={slot} />
                            ))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phones: one card per day */}
              <div className="sp-day-list">
                {days.map((day) => {
                  const daySlots = times.flatMap((t) => slotsAt(data.grid, day, t).map((s) => ({ ...s, time: t })));
                  return (
                    <section key={day} className="sp-card" aria-label={DAY_NAMES[day] || day}>
                      <h2 className="sp-section-title">{DAY_NAMES[day] || day}</h2>
                      {daySlots.length === 0 ? (
                        <p className="sp-muted" style={{ margin: 0 }}>No classes</p>
                      ) : (
                        daySlots.map((slot) => (
                          <div key={slot.slot_id} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                            <strong style={{ width: 48 }}>{slot.time}</strong>
                            <div style={{ flex: 1 }}><Slot slot={slot} /></div>
                          </div>
                        ))
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          );
        }}
      </ResourceView>
    </>
  );
}
