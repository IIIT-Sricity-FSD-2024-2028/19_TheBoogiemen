import React, { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ArrowLeft, BookOpen, CheckSquare, FileText, Plus, Trash2, Users } from 'lucide-react';
import DataTable from '../../../shared/ui/DataTable';
import { EmptyState, ErrorState, LoadingState, ProgressBar, ResourceView } from '../../../shared/ui/StatusViews';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import { fetchFacultyDashboard, fetchFacultySections } from '../facultySlice';
import { pctTone, useFacultySections } from './common';

function SectionList() {
  const navigate = useNavigate();
  const { resource, reload } = useFacultySections();

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">My Sections</h1>
          <p className="sp-page-subtitle">Course sections assigned to you this term. Open one for its roster and syllabus progress.</p>
        </div>
      </div>
      <ResourceView
        resource={resource}
        onRetry={reload}
        isEmpty={(data) => !data?.length}
        empty={<div className="sp-card"><EmptyState title="No sections assigned" message="Your HOD assigns course sections to you. They will appear here." /></div>}
      >
        {(data) => (
          <div className="sp-grid sp-grid-3">
            {data.map((s) => (
              <button
                key={s.course_section_id}
                type="button"
                className="sp-card is-interactive fac-section-card"
                onClick={() => navigate(`/faculty/sections/${encodeURIComponent(s.course_section_id)}`)}
              >
                <div className="sp-card-head" style={{ width: '100%' }}>
                  <div>
                    <span className="sp-code">{s.course_code}</span>
                    <h2 className="sp-card-title">{s.course_name}</h2>
                  </div>
                  <span className="sp-badge is-info">Section {s.section}</span>
                </div>
                <div className="fac-section-meta">
                  <span><Users size={13} style={{ verticalAlign: -2 }} /> {s.student_count} students</span>
                  <span>Semester {s.semester ?? '-'}</span>
                  <span>{s.credits ?? '-'} credits</span>
                  {s.term && <span>{s.term}</span>}
                </div>
                <div style={{ width: '100%' }}>
                  <div className="sp-progress-row" style={{ marginTop: 0 }}>
                    <span>Syllabus covered</span>
                    <strong>{typeof s.syllabus_progress === 'number' ? `${s.syllabus_progress}%` : 'Not started'}</strong>
                  </div>
                  <ProgressBar value={s.syllabus_progress ?? 0} label={`${s.course_code} section ${s.section} syllabus progress`} />
                </div>
              </button>
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}

function validateUnits(units) {
  const errors = {};
  units.forEach((u, i) => {
    if (!u.name.trim()) errors[i] = 'Every unit needs a name.';
    else if (u.progress === '' || Number.isNaN(Number(u.progress)) || Number(u.progress) < 0 || Number(u.progress) > 100) errors[i] = 'Progress must be 0 to 100.';
  });
  return errors;
}

function SyllabusEditor({ section, onSaved }) {
  const initial = useMemo(
    () => (Array.isArray(section.syllabus_modules) && section.syllabus_modules.length ? section.syllabus_modules.map((m) => ({ name: m.name, progress: m.progress })) : []),
    [section]
  );
  const [units, setUnits] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [save, { loading, error }] = useMutation();
  const [saved, setSaved] = useState(false);

  useEffect(() => setUnits(initial), [initial]);

  const errors = validateUnits(units);
  const average = units.length ? Math.round(units.reduce((s, u) => s + (Number(u.progress) || 0), 0) / units.length) : 0;

  const update = (i, field, value) => {
    setSaved(false);
    setUnits((prev) => prev.map((u, idx) => (idx === i ? { ...u, [field]: value } : u)));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!units.length || Object.keys(errors).length) return;
    const res = await save(
      'put',
      `/academics/sections/${encodeURIComponent(section.course_section_id)}/syllabus`,
      { modules: units.map((u) => ({ name: u.name.trim(), progress: Number(u.progress) })) },
      { label: `Updated syllabus progress for ${section.course_code} ${section.section}` }
    );
    if (res.ok) {
      setSaved(true);
      setSubmitted(false);
      onSaved();
    }
  };

  return (
    <form className="sp-card sp-form" onSubmit={submit} noValidate aria-labelledby="fac-syllabus">
      <div className="sp-card-head">
        <div>
          <h2 id="fac-syllabus" className="sp-section-title" style={{ marginBottom: 2 }}>Syllabus progress</h2>
          <p className="sp-hint">Overall progress is the average of the units. Students see it on their courses page.</p>
        </div>
        <span className="sp-badge is-info">{units.length ? `${average}% overall` : 'No units yet'}</span>
      </div>
      {units.length === 0 && (
        <p className="sp-muted" style={{ margin: 0 }}>
          {typeof section.syllabus_progress === 'number'
            ? `Recorded progress is ${section.syllabus_progress}%. Add the units you teach to update it.`
            : 'No syllabus progress recorded yet. Add the units of this course.'}
        </p>
      )}
      <div>
        {units.map((u, i) => (
          <div key={i}>
            <div className="fac-unit-row">
              <input
                className="sp-input"
                aria-label={`Unit ${i + 1} name`}
                placeholder={`Unit ${i + 1} name`}
                value={u.name}
                maxLength={80}
                onChange={(e) => update(i, 'name', e.target.value)}
                aria-invalid={submitted && errors[i] && !u.name.trim() ? 'true' : undefined}
              />
              <input
                type="range"
                className="sp-range"
                min={0}
                max={100}
                step={1}
                value={Number(u.progress) || 0}
                style={{ '--fill': `${Number(u.progress) || 0}%` }}
                aria-label={`Unit ${i + 1} progress`}
                onChange={(e) => update(i, 'progress', Number(e.target.value))}
              />
              <input
                type="number"
                className="sp-input"
                min={0}
                max={100}
                aria-label={`Unit ${i + 1} progress percent`}
                value={u.progress}
                onChange={(e) => update(i, 'progress', e.target.value === '' ? '' : Number(e.target.value))}
              />
              <button type="button" className="sp-icon-btn" aria-label={`Remove unit ${i + 1}`} onClick={() => { setSaved(false); setUnits((prev) => prev.filter((_, idx) => idx !== i)); }}>
                <Trash2 size={15} />
              </button>
            </div>
            {submitted && errors[i] && <p className="sp-field-error" style={{ marginTop: 4 }}>{errors[i]}</p>}
          </div>
        ))}
      </div>
      {submitted && units.length === 0 && <p className="sp-field-error">Add at least one unit.</p>}
      {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
      {saved && <div className="sp-alert is-success" role="status">Syllabus progress saved.</div>}
      <div className="sp-btn-row">
        <button type="button" className="sp-btn is-secondary" onClick={() => { setSaved(false); setUnits((prev) => [...prev, { name: '', progress: 0 }]); }}>
          <Plus size={15} /> Add unit
        </button>
        <button type="submit" className="sp-btn" disabled={loading}>{loading ? 'Saving...' : 'Save progress'}</button>
      </div>
    </form>
  );
}

function SectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { resource, list, reload } = useFacultySections();
  const roster = useApiResource(`/academics/sections/${encodeURIComponent(id)}/students`);
  const section = list.find((s) => s.course_section_id === id);

  const columns = [
    { key: 'roll_no', header: 'Roll no' },
    { key: 'name', header: 'Name', render: (r) => (<><strong>{r.name}</strong><div className="sp-card-meta">{r.email}</div></>) },
    { key: 'cgpa', header: 'CGPA', align: 'right', render: (r) => (typeof r.cgpa === 'number' ? r.cgpa.toFixed(1) : '-') },
    { key: 'classes', header: 'Classes', align: 'right', value: (r) => r.attendance.total, render: (r) => `${r.attendance.attended} / ${r.attendance.total}` },
    {
      key: 'attendance',
      header: 'Attendance',
      value: (r) => (r.attendance.total ? r.attendance.percentage : null),
      render: (r) =>
        r.attendance.total ? (
          <div style={{ minWidth: 140 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <strong>{r.attendance.percentage}%</strong>
              {r.attendance.below_min && <span className="sp-badge is-danger">Shortage</span>}
            </div>
            <ProgressBar value={r.attendance.percentage} tone={pctTone(r.attendance.percentage)} label={`${r.name} attendance`} />
          </div>
        ) : (
          <span className="sp-muted">No classes yet</span>
        ),
    },
  ];

  return (
    <>
      <div className="sp-page-header">
        <div>
          <button type="button" className="sp-link-btn" style={{ color: '#c7d2ea', marginBottom: 6 }} onClick={() => navigate('/faculty/sections')}>
            <ArrowLeft size={14} style={{ verticalAlign: -2 }} /> All sections
          </button>
          <h1 className="sp-page-title">{section ? `${section.course_code} ${section.course_name}` : 'Section'}</h1>
          <p className="sp-page-subtitle">
            {section ? `Section ${section.section} · Semester ${section.semester ?? '-'} · ${section.student_count} students${section.term ? ` · ${section.term}` : ''}` : 'Roster and syllabus progress'}
          </p>
        </div>
        {section && (
          <div className="sp-btn-row">
            <button type="button" className="sp-btn" onClick={() => navigate(`/faculty/attendance?section=${encodeURIComponent(id)}`)}>
              <CheckSquare size={15} /> Mark attendance
            </button>
            <button type="button" className="sp-btn is-secondary" onClick={() => navigate(`/faculty/assessments?section=${encodeURIComponent(id)}`)}>
              <FileText size={15} /> Assessments
            </button>
          </div>
        )}
      </div>

      {resource.status === 'failed' ? (
        <div className="sp-card"><ErrorState error={resource.error} onRetry={reload} /></div>
      ) : resource.status !== 'succeeded' ? (
        <div className="sp-card"><LoadingState /></div>
      ) : !section ? (
        <div className="sp-card">
          <EmptyState title="Section not found" message="This section is not assigned to you, or it no longer exists.">
            <button type="button" className="sp-btn is-secondary is-small" onClick={() => navigate('/faculty/sections')}>
              <BookOpen size={14} /> Back to my sections
            </button>
          </EmptyState>
        </div>
      ) : (
        <div className="sp-grid">
          <SyllabusEditor
            section={section}
            onSaved={() => {
              dispatch(fetchFacultySections({ force: true }));
              dispatch(fetchFacultyDashboard({ force: true }));
            }}
          />
          <section className="sp-card" aria-labelledby="fac-roster">
            <h2 id="fac-roster" className="sp-section-title">Roster</h2>
            {roster.status === 'loading' && <LoadingState />}
            {roster.status === 'failed' && <ErrorState error={roster.error} onRetry={roster.reload} />}
            {roster.status === 'succeeded' && (
              <DataTable
                columns={columns}
                rows={Array.isArray(roster.data) ? roster.data : []}
                rowKey={(r) => r.enrollment_id}
                searchPlaceholder="Search students..."
                csvName={`roster-${section.course_code}-${section.section}`}
                emptyTitle="No students enrolled"
                emptyMessage="Students enrolled in this section by your HOD will appear here."
                pageSize={15}
              />
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default function FacultySections() {
  return (
    <Routes>
      <Route index element={<SectionList />} />
      <Route path=":id" element={<SectionDetail />} />
    </Routes>
  );
}
