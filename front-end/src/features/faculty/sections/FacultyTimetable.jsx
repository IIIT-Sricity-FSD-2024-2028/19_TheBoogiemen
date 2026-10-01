import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { useApiResource } from '../../../hooks/useApiResource';
import { capitalize } from '../../../shared/format';
import { todayIso } from './common';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAMES = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };
const JS_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Most recent date (today or earlier, UTC like the server) that falls on `day`. */
function lastDateFor(day) {
  const d = new Date(`${todayIso()}T00:00:00Z`);
  const diff = (d.getUTCDay() - JS_DAYS.indexOf(day) + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export default function FacultyTimetable() {
  const navigate = useNavigate();
  const tt = useApiResource('/academics/timetable');
  const todayCode = JS_DAYS[new Date().getDay()];

  const slots = useMemo(() => (Array.isArray(tt.data) ? tt.data : []), [tt.data]);
  const times = useMemo(() => [...new Set(slots.map((s) => s.time))].sort(), [slots]);
  const at = (day, time) => slots.filter((s) => s.day === day && s.time === time);
  const weeklyHours = slots.length;
  const labs = slots.filter((s) => s.type === 'lab').length;

  const open = (s) => navigate(`/faculty/attendance?section=${encodeURIComponent(s.course_section_id)}&date=${lastDateFor(s.day)}`);

  const Slot = ({ s }) => (
    <div
      className={`sp-slot${s.type === 'lab' ? ' is-lab' : ''}`}
      role="button"
      tabIndex={0}
      title="Open attendance for the latest class in this slot"
      onClick={() => open(s)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open(s))}
    >
      <strong>{s.course_code} · {s.section}</strong>
      {s.room} · {capitalize(s.type)}
    </div>
  );

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Timetable</h1>
          <p className="sp-page-subtitle">
            {tt.status === 'succeeded' && slots.length
              ? `${weeklyHours} class${weeklyHours === 1 ? '' : 'es'} a week${labs ? `, ${labs} lab${labs === 1 ? '' : 's'}` : ''}. Click a class to open its attendance register.`
              : 'Your weekly teaching schedule.'}
          </p>
        </div>
      </div>

      <div className="sp-card">
        {tt.status === 'loading' && <LoadingState lines={6} />}
        {tt.status === 'failed' && <ErrorState error={tt.error} onRetry={tt.reload} />}
        {tt.status === 'succeeded' &&
          (slots.length === 0 ? (
            <EmptyState title="No classes scheduled" message="Your HOD sets the timetable. Your classes will appear here once added." />
          ) : (
            <>
              <div className="fac-week-wrap">
                <div className="fac-week" role="table" aria-label="Weekly timetable">
                  <div className="fac-week-head" role="columnheader">Time</div>
                  {DAYS.map((d) => (
                    <div key={d} role="columnheader" className={`fac-week-head${d === todayCode ? ' is-today' : ''}`}>
                      {DAY_NAMES[d]}{d === todayCode ? ' · Today' : ''}
                    </div>
                  ))}
                  {times.map((time) => (
                    <React.Fragment key={time}>
                      <div className="fac-week-time" role="rowheader">{time}</div>
                      {DAYS.map((d) => (
                        <div key={d} role="cell" className={d === todayCode ? 'is-today-col' : undefined}>
                          {at(d, time).map((s) => <Slot key={s.slot_id} s={s} />)}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="fac-day-list">
                {DAYS.filter((d) => slots.some((s) => s.day === d)).map((d) => (
                  <div key={d}>
                    <h2 className="sp-section-title" style={{ marginBottom: 6 }}>
                      {DAY_NAMES[d]} {d === todayCode && <span className="sp-badge is-info">Today</span>}
                    </h2>
                    {slots
                      .filter((s) => s.day === d)
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((s) => (
                        <div key={s.slot_id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                          <span className="sp-muted" style={{ width: 48, fontSize: 13 }}>{s.time}</span>
                          <div style={{ flex: 1 }}><Slot s={s} /></div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
              <div className="sp-legend" style={{ marginTop: 12 }}>
                <span><span className="sp-legend-swatch" style={{ background: 'var(--sp-accent)' }} />Lecture</span>
                <span><span className="sp-legend-swatch" style={{ background: 'var(--sp-success)' }} />Lab</span>
              </div>
            </>
          ))}
      </div>
    </>
  );
}
