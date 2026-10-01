import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarPlus, Download } from 'lucide-react';
import DataTable from '../../../shared/ui/DataTable';
import Modal from '../../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState, ProgressBar } from '../../../shared/ui/StatusViews';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import { downloadFile } from '../../../services/apiClient';
import { apiRequestFailed } from '../../../app/apiActions';
import { formatDate } from '../../../shared/format';
import { fetchFacultyDashboard, selectFacultyResource } from '../facultySlice';
import { pctTone, todayIso, useAllRosters, useFacultySections } from './common';

function MeetingForm({ students, preset, onClose, onSaved }) {
  const [form, setForm] = useState({ student_id: preset || '', date: '', time: '', agenda: '', mode: 'In person' });
  const [submitted, setSubmitted] = useState(false);
  const [save, { loading, error }] = useMutation();
  const errors = {};
  if (!form.student_id) errors.student_id = 'Choose a student.';
  if (!form.date) errors.date = 'Choose a date.';
  else if (form.date < todayIso()) errors.date = 'Choose today or a future date.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time)) errors.time = 'Choose a time.';
  if (!form.agenda.trim()) errors.agenda = 'Agenda is required.';
  const show = (f) => submitted && errors[f];
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const st = students.find((s) => s.student_id === form.student_id);
    const res = await save('post', '/meetings', { ...form, agenda: form.agenda.trim() }, { label: `Scheduled a meeting with ${st?.name || 'a student'}` });
    if (res.ok) onSaved();
  };

  return (
    <Modal
      title="Schedule a meeting"
      onClose={onClose}
      width={520}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="button" className="sp-btn" onClick={submit} disabled={loading}>{loading ? 'Scheduling...' : 'Schedule meeting'}</button>
        </>
      }
    >
      <form className="sp-form" onSubmit={submit} noValidate>
        <div className="sp-field">
          <label htmlFor="mt-student">Student</label>
          <select id="mt-student" className="sp-select" value={form.student_id} onChange={set('student_id')} aria-invalid={show('student_id') ? 'true' : undefined}>
            <option value="">Choose a student</option>
            {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name} ({s.roll_no})</option>)}
          </select>
          {show('student_id') && <p className="sp-field-error">{errors.student_id}</p>}
        </div>
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="mt-date">Date</label>
            <input id="mt-date" type="date" className="sp-input" min={todayIso()} value={form.date} onChange={set('date')} aria-invalid={show('date') ? 'true' : undefined} />
            {show('date') && <p className="sp-field-error">{errors.date}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="mt-time">Time</label>
            <input id="mt-time" type="time" className="sp-input" value={form.time} onChange={set('time')} aria-invalid={show('time') ? 'true' : undefined} />
            {show('time') && <p className="sp-field-error">{errors.time}</p>}
          </div>
        </div>
        <div className="sp-field">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sp-text-2)' }}>Mode</span>
          <div className="sp-segmented" role="group" aria-label="Meeting mode" style={{ alignSelf: 'flex-start' }}>
            {['In person', 'Online'].map((m) => (
              <button key={m} type="button" aria-pressed={form.mode === m} onClick={() => setForm((p) => ({ ...p, mode: m }))}>{m}</button>
            ))}
          </div>
        </div>
        <div className="sp-field">
          <label htmlFor="mt-agenda">Agenda</label>
          <textarea id="mt-agenda" className="sp-textarea" maxLength={200} value={form.agenda} onChange={set('agenda')} placeholder="e.g. Discuss attendance shortage and a catch-up plan" aria-invalid={show('agenda') ? 'true' : undefined} />
          {show('agenda') ? <p className="sp-field-error">{errors.agenda}</p> : <p className="sp-hint">{form.agenda.length}/200</p>}
        </div>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
      </form>
    </Modal>
  );
}

export default function FacultyStudents() {
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const onlyRisk = params.get('filter') === 'at-risk';
  const { resource: secRes, list: sections, reload: reloadSections } = useFacultySections();
  const dash = useSelector(selectFacultyResource('dashboard'));
  const rosters = useAllRosters(sections, secRes.status === 'succeeded');
  const meetings = useApiResource('/meetings');
  const [meetingFor, setMeetingFor] = useState(null); // '' for blank form, or student id
  const [pdfError, setPdfError] = useState(null);

  useEffect(() => {
    dispatch(fetchFacultyDashboard());
  }, [dispatch]);

  const riskById = useMemo(() => {
    const list = dash.status === 'succeeded' ? dash.data.at_risk : [];
    return new Map(list.map((s) => [s.student_id, s]));
  }, [dash]);

  const allRows = useMemo(() => (rosters.data || []).map((r) => ({ ...r, risk: riskById.get(r.student_id) || null })), [rosters.data, riskById]);
  const rows = onlyRisk ? allRows.filter((r) => r.risk || r.attendance.below_min) : allRows;
  const uniqueStudents = useMemo(() => {
    const m = new Map();
    allRows.forEach((r) => m.set(r.student_id, r));
    return [...m.values()].sort((a, b) => String(a.roll_no).localeCompare(String(b.roll_no)));
  }, [allRows]);

  const downloadReport = async (r) => {
    setPdfError(null);
    try {
      await downloadFile(`/reports/student-pdf/${encodeURIComponent(r.student_id)}`, `progress-report-${r.roll_no || r.student_id}.pdf`);
    } catch (err) {
      setPdfError(`Could not download the report for ${r.name}: ${err.message}`);
      dispatch(apiRequestFailed({ status: err.status ?? 0, message: err.message, path: '/reports/student-pdf', method: 'GET' }));
    }
  };

  const columns = [
    { key: 'roll_no', header: 'Roll no' },
    { key: 'name', header: 'Student', render: (r) => (<><strong>{r.name}</strong><div className="sp-card-meta">{r.email}</div></>) },
    { key: 'class', header: 'Class', value: (r) => `${r.course_code} ${r.class_section}`, render: (r) => (<><span className="sp-code">{r.course_code}</span> Sec {r.class_section}</>) },
    { key: 'cgpa', header: 'CGPA', align: 'right', render: (r) => (typeof r.cgpa === 'number' ? r.cgpa.toFixed(1) : '-') },
    {
      key: 'attendance',
      header: 'Attendance',
      value: (r) => (r.attendance.total ? r.attendance.percentage : null),
      render: (r) =>
        r.attendance.total ? (
          <div style={{ minWidth: 120 }}>
            <strong style={{ fontSize: 13 }}>{r.attendance.percentage}%</strong>
            <ProgressBar value={r.attendance.percentage} tone={pctTone(r.attendance.percentage, dash.data?.attendance_min_pct ?? 75)} label={`${r.name} attendance`} />
          </div>
        ) : (
          <span className="sp-muted">No classes</span>
        ),
    },
    {
      key: 'risk',
      header: 'Standing',
      value: (r) => (r.risk || r.attendance.below_min ? 'At risk' : 'On track'),
      render: (r) =>
        r.risk || r.attendance.below_min ? (
          <span className="sp-badge is-danger" title={r.risk ? r.risk.reasons.join('; ') : 'Below minimum attendance in this section'}>At risk</span>
        ) : (
          <span className="sp-badge is-success">On track</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      value: () => '',
      render: (r) => (
        <div className="sp-btn-row" style={{ flexWrap: 'nowrap' }}>
          <button type="button" className="sp-btn is-secondary is-small" onClick={() => setMeetingFor(r.student_id)}>
            <CalendarPlus size={13} /> Meet
          </button>
          <button type="button" className="sp-icon-btn" aria-label={`Download progress report for ${r.name}`} title="Progress report (PDF)" onClick={() => downloadReport(r)}>
            <Download size={15} />
          </button>
        </div>
      ),
    },
  ];

  const meetingList = Array.isArray(meetings.data) ? meetings.data : [];
  const upcoming = meetingList.filter((m) => m.upcoming);
  const past = meetingList.filter((m) => !m.upcoming).reverse();

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Students</h1>
          <p className="sp-page-subtitle">Everyone enrolled in your sections, with attendance and standing. Schedule a meeting with anyone who needs support.</p>
        </div>
        <button type="button" className="sp-btn" onClick={() => setMeetingFor('')} disabled={!uniqueStudents.length}>
          <CalendarPlus size={15} /> Schedule meeting
        </button>
      </div>

      <section className="sp-card" aria-labelledby="fac-roster-all">
        <div className="sp-card-head" style={{ marginBottom: 10 }}>
          <h2 id="fac-roster-all" className="sp-section-title" style={{ margin: 0 }}>Roster</h2>
          <div className="sp-segmented" role="group" aria-label="Filter students">
            <button type="button" aria-pressed={!onlyRisk} onClick={() => setParams({}, { replace: true })}>All</button>
            <button type="button" aria-pressed={onlyRisk} onClick={() => setParams({ filter: 'at-risk' }, { replace: true })}>
              At risk{riskById.size ? ` (${riskById.size})` : ''}
            </button>
          </div>
        </div>
        {pdfError && <div className="sp-alert is-error" role="alert" style={{ marginBottom: 12 }}>{pdfError}</div>}
        {secRes.status === 'failed' ? (
          <ErrorState error={secRes.error} onRetry={reloadSections} />
        ) : secRes.status === 'succeeded' && sections.length === 0 ? (
          <EmptyState title="No sections assigned" message="Students appear here once you are assigned a section." />
        ) : rosters.status === 'failed' ? (
          <ErrorState error={rosters.error} onRetry={rosters.reload} />
        ) : rosters.status !== 'succeeded' ? (
          <LoadingState lines={6} />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.enrollment_id}
            searchPlaceholder="Search by name, roll no or course..."
            csvName={onlyRisk ? 'at-risk-students' : 'my-students'}
            emptyTitle={onlyRisk ? 'No students at risk' : 'No students enrolled'}
            emptyMessage={onlyRisk ? 'Everyone is on track right now.' : 'Enrolled students will appear here.'}
            pageSize={15}
          />
        )}
      </section>

      <section className="sp-section" aria-labelledby="fac-meetings">
        <div className="sp-grid sp-grid-2">
          <div className="sp-card">
            <h2 id="fac-meetings" className="sp-section-title">Upcoming meetings</h2>
            {meetings.status === 'loading' && !meetings.data && <LoadingState />}
            {meetings.status === 'failed' && <ErrorState error={meetings.error} onRetry={meetings.reload} />}
            {meetings.status !== 'failed' && meetings.data &&
              (upcoming.length === 0 ? (
                <EmptyState title="No upcoming meetings" message="Meetings you schedule with students appear here." />
              ) : (
                <ul className="fac-list">
                  {upcoming.map((m) => (
                    <li key={m.meeting_id} className="fac-list-row">
                      <div className="fac-list-main">
                        <div><strong>{m.student_name}</strong> <span className="sp-muted">· {m.mode}</span></div>
                        <div className="sp-card-meta">{m.agenda}</div>
                      </div>
                      <span className="sp-badge is-info">{formatDate(m.date)} {m.time}</span>
                    </li>
                  ))}
                </ul>
              ))}
          </div>
          <div className="sp-card">
            <h2 className="sp-section-title">Past meetings</h2>
            {meetings.status === 'loading' && !meetings.data && <LoadingState />}
            {meetings.status === 'failed' && <ErrorState error={meetings.error} onRetry={meetings.reload} />}
            {meetings.status !== 'failed' && meetings.data &&
              (past.length === 0 ? (
                <EmptyState title="No past meetings" message="Completed meetings are kept here for reference." />
              ) : (
                <ul className="fac-list">
                  {past.slice(0, 8).map((m) => (
                    <li key={m.meeting_id} className="fac-list-row">
                      <div className="fac-list-main">
                        <div><strong>{m.student_name}</strong> <span className="sp-muted">· {m.mode}</span></div>
                        <div className="sp-card-meta">{m.agenda}</div>
                      </div>
                      <span className="sp-badge is-neutral">{formatDate(m.date)}</span>
                    </li>
                  ))}
                </ul>
              ))}
          </div>
        </div>
      </section>

      {meetingFor !== null && (
        <MeetingForm
          students={uniqueStudents}
          preset={meetingFor}
          onClose={() => setMeetingFor(null)}
          onSaved={() => {
            setMeetingFor(null);
            meetings.reload();
          }}
        />
      )}
    </>
  );
}
