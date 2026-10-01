import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Check, CheckCheck, Lock, RotateCcw, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import { capitalize, formatDate } from '../../../shared/format';
import { fetchFacultyDashboard } from '../facultySlice';
import { EDIT_WINDOW_DAYS, SectionSelect, daysAgoIso, todayIso, useFacultySections } from './common';

function StatusToggle({ value, onChange, disabled, name }) {
  return (
    <div className="fac-status-toggle" role="group" aria-label={`Attendance for ${name}`}>
      <button type="button" className="is-present" aria-pressed={value === 'present'} disabled={disabled} onClick={() => onChange('present')}>
        <Check size={14} aria-hidden="true" /> Present
      </button>
      <button type="button" className="is-absent" aria-pressed={value === 'absent'} disabled={disabled} onClick={() => onChange('absent')}>
        <X size={14} aria-hidden="true" /> Absent
      </button>
    </div>
  );
}

function AttendanceSheet({ session, onSaved }) {
  const dispatch = useDispatch();
  const initial = useMemo(() => Object.fromEntries(session.students.map((s) => [s.student_id, s.status])), [session]);
  const [marks, setMarks] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [save, { loading, error }] = useMutation();

  // A save returns the refreshed session; sync the toggles to it. The sheet is
  // keyed by section and date, so switching class remounts it with a clean state.
  useEffect(() => {
    setMarks(initial);
  }, [initial]);

  const editable = session.editable;
  const markable = session.students.filter((s) => !s.from_leave);
  const onLeave = session.students.filter((s) => s.from_leave);
  const unmarked = markable.filter((s) => marks[s.student_id] !== 'present' && marks[s.student_id] !== 'absent');
  const changed = markable.filter((s) => marks[s.student_id] !== initial[s.student_id]);
  const present = markable.filter((s) => marks[s.student_id] === 'present').length;
  const absent = markable.filter((s) => marks[s.student_id] === 'absent').length;
  const alreadyMarked = session.students.some((s) => s.status && !s.from_leave);

  const set = (id, status) => {
    setResult(null);
    setMarks((prev) => ({ ...prev, [id]: status }));
  };
  const setAll = (status) => {
    setResult(null);
    setMarks((prev) => ({ ...prev, ...Object.fromEntries(markable.map((s) => [s.student_id, status])) }));
  };

  const submit = async () => {
    setSubmitted(true);
    if (unmarked.length || !markable.length) return;
    const res = await save(
      'put',
      '/attendance/session',
      {
        course_section_id: session.section.course_section_id,
        date: session.date,
        records: markable.map((s) => ({ student_id: s.student_id, status: marks[s.student_id] })),
      },
      { label: `Marked attendance for ${session.section.course_code} ${session.section.section} on ${formatDate(session.date)}` }
    );
    if (res.ok) {
      setResult(`Attendance saved for ${res.data.saved} student${res.data.saved === 1 ? '' : 's'}.`);
      setSubmitted(false);
      dispatch(fetchFacultyDashboard({ force: true }));
      onSaved(res.data.session);
    }
  };

  return (
    <>
      <div className="sp-card" style={{ marginBottom: 16 }}>
        <div className="sp-card-head" style={{ flexWrap: 'wrap' }}>
          <div>
            <h2 className="sp-section-title" style={{ marginBottom: 4 }}>
              {session.section.course_code} {session.section.course_name} · Section {session.section.section}
            </h2>
            <div className="sp-card-meta">
              {formatDate(session.date)}
              {session.scheduled.length
                ? ` · Scheduled: ${session.scheduled.map((s) => `${s.time} ${capitalize(s.type)} in ${s.room}`).join(', ')}`
                : ' · No class on the timetable for this day'}
            </div>
          </div>
          <div className="fac-att-summary">
            <span className="sp-badge is-success">{present} present</span>
            <span className="sp-badge is-danger">{absent} absent</span>
            {onLeave.length > 0 && <span className="sp-badge is-info">{onLeave.length} on leave</span>}
            {unmarked.length > 0 && <span className="sp-badge is-neutral">{unmarked.length} not marked</span>}
          </div>
        </div>
        {!editable && (
          <div className="sp-alert is-info" role="status" style={{ marginTop: 12 }}>
            <Lock size={15} aria-hidden="true" />
            <span>
              This register is read-only. Attendance can only be marked by the section teacher, for today or up to {EDIT_WINDOW_DAYS} days back.
            </span>
          </div>
        )}
        {editable && alreadyMarked && (
          <p className="sp-hint" style={{ marginTop: 10 }}>Attendance was already recorded for this class. Changes you save replace it.</p>
        )}
        {editable && session.scheduled.length === 0 && (
          <div className="sp-alert is-warning" role="status" style={{ marginTop: 12 }}>
            This section has no class on the timetable for this weekday. Check the date before saving.
          </div>
        )}
      </div>

      {session.students.length === 0 ? (
        <div className="sp-card"><EmptyState title="No students enrolled" message="There is nobody to mark in this section yet." /></div>
      ) : (
        <>
          {editable && (
            <div className="sp-btn-row" style={{ marginBottom: 12 }}>
              <button type="button" className="sp-btn is-secondary is-small" onClick={() => setAll('present')}>
                <CheckCheck size={14} /> Mark all present
              </button>
              <button type="button" className="sp-btn is-secondary is-small" onClick={() => setAll('absent')}>
                Mark all absent
              </button>
              {changed.length > 0 && (
                <button type="button" className="sp-btn is-secondary is-small" onClick={() => { setMarks(initial); setResult(null); }}>
                  <RotateCcw size={14} /> Undo changes
                </button>
              )}
            </div>
          )}
          <div className="sp-table-wrap">
            <table className="sp-table">
              <caption className="sp-visually-hidden">Attendance register</caption>
              <thead>
                <tr>
                  <th scope="col">Roll no</th>
                  <th scope="col">Student</th>
                  <th scope="col" className="sp-num">Overall</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {session.students.map((s) => {
                  const isChanged = !s.from_leave && marks[s.student_id] !== initial[s.student_id];
                  const missing = submitted && !s.from_leave && !marks[s.student_id];
                  return (
                    <tr key={s.student_id} className={isChanged ? 'fac-row-changed' : undefined}>
                      <td>{s.roll_no}</td>
                      <td>
                        <strong>{s.name}</strong>
                        {s.attendance?.below_min && <span className="sp-badge is-danger" style={{ marginLeft: 8 }}>Shortage</span>}
                        {missing && <p className="sp-field-error">Mark present or absent.</p>}
                      </td>
                      <td className="sp-num">{s.attendance?.total ? `${s.attendance.percentage}%` : '-'}</td>
                      <td>
                        {s.from_leave ? (
                          <span className="sp-badge is-info" title="Approved leave is recorded as excused and cannot be changed here">
                            <Lock size={11} style={{ verticalAlign: -1 }} /> On approved leave (excused)
                          </span>
                        ) : (
                          <StatusToggle value={marks[s.student_id]} disabled={!editable || loading} name={s.name} onChange={(v) => set(s.student_id, v)} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {editable && markable.length > 0 && (
            <div className="sp-card fac-sticky-bar">
              <div>
                {submitted && unmarked.length > 0 ? (
                  <p className="sp-field-error">{unmarked.length} student{unmarked.length === 1 ? ' is' : 's are'} not marked yet.</p>
                ) : (
                  <span className="sp-muted">
                    {changed.length ? `${changed.length} unsaved change${changed.length === 1 ? '' : 's'}` : 'No unsaved changes'}
                  </span>
                )}
                {error && <p className="sp-field-error" role="alert">{error.message}</p>}
                {result && <p style={{ margin: 0, color: 'var(--sp-success)', fontWeight: 600 }} role="status">{result}</p>}
              </div>
              <button type="button" className="sp-btn" onClick={submit} disabled={loading}>
                {loading ? 'Saving...' : alreadyMarked ? 'Update attendance' : 'Save attendance'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function MarkAttendance() {
  const [params, setParams] = useSearchParams();
  const { resource, list, reload } = useFacultySections();
  const sectionId = params.get('section') || '';
  const date = params.get('date') || todayIso();
  const [override, setOverride] = useState(null); // session returned by a save

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  // Pick the only section automatically.
  useEffect(() => {
    if (!sectionId && list.length === 1) setParam('section', list[0].course_section_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, sectionId]);

  const dateError = !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ? 'Choose a valid date.'
    : date > todayIso()
      ? 'Attendance cannot be marked for a future date.'
      : null;

  const path = sectionId && !dateError ? `/attendance/session?course_section_id=${encodeURIComponent(sectionId)}&date=${date}` : null;
  const session = useApiResource(path);
  useEffect(() => setOverride(null), [path, session.data]);
  const current = override || session.data;

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Mark Attendance</h1>
          <p className="sp-page-subtitle">Choose a section and class date. You can mark or change attendance for up to {EDIT_WINDOW_DAYS} days.</p>
        </div>
      </div>

      <div className="sp-card" style={{ marginBottom: 16 }}>
        {resource.status === 'failed' ? (
          <ErrorState error={resource.error} onRetry={reload} />
        ) : resource.status !== 'succeeded' ? (
          <LoadingState lines={1} />
        ) : list.length === 0 ? (
          <EmptyState title="No sections assigned" message="You can mark attendance once a section is assigned to you." />
        ) : (
          <div className="sp-form-row" style={{ alignItems: 'end' }}>
            <SectionSelect id="att-section" sections={list} value={sectionId} onChange={(v) => setParam('section', v)} />
            <div className="sp-field">
              <label htmlFor="att-date">Class date</label>
              <input
                id="att-date"
                type="date"
                className="sp-input"
                value={date}
                max={todayIso()}
                min={daysAgoIso(EDIT_WINDOW_DAYS + 60)}
                onChange={(e) => setParam('date', e.target.value)}
                aria-invalid={dateError ? 'true' : undefined}
                aria-describedby="att-date-hint"
              />
              {dateError ? (
                <p className="sp-field-error" id="att-date-hint">{dateError}</p>
              ) : (
                <p className="sp-hint" id="att-date-hint">Editable from {formatDate(daysAgoIso(EDIT_WINDOW_DAYS))} to today. Older dates are view-only.</p>
              )}
            </div>
            <div className="sp-btn-row" style={{ paddingBottom: dateError ? 22 : 20 }}>
              <button type="button" className="sp-btn is-secondary is-small" onClick={() => setParam('date', todayIso())} disabled={date === todayIso()}>
                Today
              </button>
              <button type="button" className="sp-btn is-secondary is-small" onClick={() => setParam('date', daysAgoIso(1))}>
                Yesterday
              </button>
            </div>
          </div>
        )}
      </div>

      {resource.status === 'succeeded' && list.length > 0 && (
        !sectionId ? (
          <div className="sp-card"><EmptyState title="Choose a section" message="Pick one of your sections above to open its register." /></div>
        ) : dateError ? null : session.status === 'failed' ? (
          <div className="sp-card"><ErrorState error={session.error} onRetry={session.reload} /></div>
        ) : session.status === 'loading' || !current ? (
          <div className="sp-card"><LoadingState lines={5} /></div>
        ) : (
          <AttendanceSheet key={path} session={current} onSaved={setOverride} />
        )
      )}
    </>
  );
}
