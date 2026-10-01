import React, { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ArrowLeft, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import DataTable from '../../../shared/ui/DataTable';
import Modal, { ConfirmDialog } from '../../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import { capitalize, formatDate } from '../../../shared/format';
import { fetchFacultyDashboard } from '../facultySlice';
import { STATUS_TONE, SectionSelect, useFacultySections } from './common';

// Same list as createAssessment in back-end/src/academics/academics.service.ts.
const TYPES = ['quiz', 'internal', 'assignment', 'lab', 'final'];

function validate(form, isEdit) {
  const e = {};
  if (!isEdit && !form.course_section_id) e.course_section_id = 'Choose a section.';
  if (!form.name.trim()) e.name = 'Assessment name is required.';
  const max = Number(form.max_marks);
  if (form.max_marks === '' || !Number.isFinite(max) || max <= 0 || max > 1000) e.max_marks = 'Maximum marks must be between 1 and 1000.';
  if (!isEdit) {
    const w = Number(form.weightage);
    if (form.weightage === '' || !Number.isFinite(w) || w < 0 || w > 100) e.weightage = 'Weightage must be 0 to 100%.';
  }
  if (!form.date) e.date = 'Choose a date.';
  return e;
}

function AssessmentForm({ sections, assessment, defaultSection, onClose, onSaved }) {
  const isEdit = Boolean(assessment);
  const [form, setForm] = useState(
    isEdit
      ? { course_section_id: assessment.course_section_id, name: assessment.name, type: assessment.type, max_marks: String(assessment.max_marks), weightage: String(assessment.weightage ?? 0), date: assessment.date }
      : { course_section_id: defaultSection || '', name: '', type: 'internal', max_marks: '', weightage: '', date: '' }
  );
  const [submitted, setSubmitted] = useState(false);
  const [save, { loading, error }] = useMutation();
  const errors = validate(form, isEdit);
  const marksLocked = isEdit && assessment.entered > 0;
  const show = (f) => submitted && errors[f];
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    let res;
    if (isEdit) {
      const body = { name: form.name.trim(), date: form.date };
      if (!marksLocked && Number(form.max_marks) !== assessment.max_marks) body.max_marks = Number(form.max_marks);
      res = await save('patch', `/academics/assessments/${encodeURIComponent(assessment.assessment_id)}`, body, { label: `Updated assessment ${body.name}` });
    } else {
      res = await save(
        'post',
        '/academics/assessments',
        { course_section_id: form.course_section_id, name: form.name.trim(), type: form.type, max_marks: Number(form.max_marks), weightage: Number(form.weightage), date: form.date },
        { label: `Created assessment ${form.name.trim()}` }
      );
    }
    if (res.ok) onSaved(res.data);
  };

  const field = (id, label, input, hint) => (
    <div className="sp-field">
      <label htmlFor={`asm-${id}`}>{label}</label>
      {input}
      {show(id) ? <p className="sp-field-error">{errors[id]}</p> : hint ? <p className="sp-hint">{hint}</p> : null}
    </div>
  );

  return (
    <Modal
      title={isEdit ? 'Edit assessment' : 'New assessment'}
      onClose={onClose}
      width={560}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="button" className="sp-btn" onClick={submit} disabled={loading}>{loading ? 'Saving...' : isEdit ? 'Save changes' : 'Create assessment'}</button>
        </>
      }
    >
      <form className="sp-form" onSubmit={submit} noValidate>
        {isEdit ? (
          <p className="sp-muted" style={{ margin: 0 }}>{assessment.course_code} · Section {assessment.section} · {capitalize(assessment.type)} · {assessment.weightage}% weight</p>
        ) : (
          <>
            <SectionSelect id="asm-course_section_id" sections={sections} value={form.course_section_id} onChange={(v) => setForm((p) => ({ ...p, course_section_id: v }))} invalid={show('course_section_id')} />
            {show('course_section_id') && <p className="sp-field-error" style={{ marginTop: -10 }}>{errors.course_section_id}</p>}
          </>
        )}
        {field('name', 'Name', <input id="asm-name" className="sp-input" value={form.name} maxLength={80} onChange={set('name')} placeholder="e.g. Internal 2" aria-invalid={show('name') ? 'true' : undefined} />)}
        <div className="sp-form-row">
          {!isEdit &&
            field('type', 'Type', (
              <select id="asm-type" className="sp-select" value={form.type} onChange={set('type')}>
                {TYPES.map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
              </select>
            ))}
          {field('date', 'Date', <input id="asm-date" type="date" className="sp-input" value={form.date} onChange={set('date')} aria-invalid={show('date') ? 'true' : undefined} />)}
        </div>
        <div className="sp-form-row">
          {field(
            'max_marks',
            'Maximum marks',
            <input id="asm-max_marks" type="number" min={1} max={1000} className="sp-input" value={form.max_marks} onChange={set('max_marks')} disabled={marksLocked} aria-invalid={show('max_marks') ? 'true' : undefined} />,
            marksLocked ? 'Locked because marks have been entered.' : null
          )}
          {!isEdit &&
            field('weightage', 'Weightage (%)', <input id="asm-weightage" type="number" min={0} max={100} className="sp-input" value={form.weightage} onChange={set('weightage')} aria-invalid={show('weightage') ? 'true' : undefined} />, 'Share of the final course grade.')}
        </div>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
      </form>
    </Modal>
  );
}

function AssessmentList() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const sectionFilter = params.get('section') || '';
  const { resource: secRes, list: sections, reload: reloadSections } = useFacultySections();
  const list = useApiResource('/academics/assessments');
  const [form, setForm] = useState(null); // { assessment? }
  const [confirm, setConfirm] = useState(null); // { kind: 'publish'|'delete', a }
  const [act, { loading: acting, error: actError, reset }] = useMutation();

  const rows = useMemo(() => {
    const all = Array.isArray(list.data) ? list.data : [];
    return sectionFilter ? all.filter((a) => a.course_section_id === sectionFilter) : all;
  }, [list.data, sectionFilter]);

  const refresh = () => {
    list.reload();
    dispatch(fetchFacultyDashboard({ force: true }));
  };

  const runConfirm = async () => {
    const { kind, a } = confirm;
    const res =
      kind === 'publish'
        ? await act('post', `/academics/assessments/${encodeURIComponent(a.assessment_id)}/publish`, {}, { label: `Published results of ${a.name} (${a.course_code} ${a.section})` })
        : await act('delete', `/academics/assessments/${encodeURIComponent(a.assessment_id)}`, undefined, { label: `Deleted assessment ${a.name}` });
    if (res.ok) {
      setConfirm(null);
      refresh();
    }
  };

  const columns = [
    { key: 'name', header: 'Assessment', render: (a) => (<><strong>{a.name}</strong><div className="sp-card-meta">{capitalize(a.type)} · {a.weightage}% weight</div></>) },
    { key: 'section', header: 'Section', value: (a) => `${a.course_code} ${a.section}`, render: (a) => (<><span className="sp-code">{a.course_code}</span> Sec {a.section}</>) },
    { key: 'date', header: 'Date', render: (a) => formatDate(a.date) },
    { key: 'max_marks', header: 'Max', align: 'right' },
    { key: 'entered', header: 'Entered', align: 'right', render: (a) => `${a.entered} / ${a.enrolled}` },
    { key: 'average', header: 'Average', align: 'right', render: (a) => (a.average === null ? '-' : `${a.average} / ${a.max_marks}`) },
    { key: 'status', header: 'Status', render: (a) => <span className={`sp-badge ${STATUS_TONE[a.status] || 'is-neutral'}`}>{capitalize(a.status)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      csv: () => '',
      value: () => '',
      render: (a) => (
        <div className="sp-btn-row" style={{ flexWrap: 'nowrap' }}>
          <button type="button" className="sp-btn is-small" onClick={() => navigate(`/faculty/assessments/${encodeURIComponent(a.assessment_id)}`)}>Marks</button>
          {a.status === 'draft' && (
            <button type="button" className="sp-btn is-secondary is-small" disabled={a.entered === 0} title={a.entered === 0 ? 'Enter marks before publishing' : 'Publish results to students'} onClick={() => { reset(); setConfirm({ kind: 'publish', a }); }}>
              <Send size={13} /> Publish
            </button>
          )}
          <button type="button" className="sp-icon-btn" aria-label={`Edit ${a.name}`} onClick={() => setForm({ assessment: a })}><Pencil size={15} /></button>
          {a.status === 'draft' && (
            <button type="button" className="sp-icon-btn" aria-label={`Delete ${a.name}`} onClick={() => { reset(); setConfirm({ kind: 'delete', a }); }}><Trash2 size={15} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Assessments & Marks</h1>
          <p className="sp-page-subtitle">Create assessments for your sections, enter marks, and publish results to students. Grades follow the college grading scale.</p>
        </div>
        <button type="button" className="sp-btn" onClick={() => setForm({})} disabled={!sections.length}>
          <Plus size={15} /> New assessment
        </button>
      </div>

      <div className="sp-card">
        {secRes.status === 'failed' && <ErrorState error={secRes.error} onRetry={reloadSections} />}
        {list.status === 'loading' && !list.data && <LoadingState lines={5} />}
        {list.status === 'failed' && <ErrorState error={list.error} onRetry={list.reload} />}
        {list.status !== 'failed' && list.data && (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(a) => a.assessment_id}
            searchPlaceholder="Search assessments..."
            csvName="assessments"
            emptyTitle={sectionFilter ? 'No assessments for this section' : 'No assessments yet'}
            emptyMessage="Create an assessment to start entering marks."
            toolbar={
              sections.length > 1 && (
                <select
                  className="sp-select"
                  style={{ width: 'auto' }}
                  aria-label="Filter by section"
                  value={sectionFilter}
                  onChange={(e) => {
                    const next = new URLSearchParams(params);
                    if (e.target.value) next.set('section', e.target.value);
                    else next.delete('section');
                    setParams(next, { replace: true });
                  }}
                >
                  <option value="">All sections</option>
                  {sections.map((s) => <option key={s.course_section_id} value={s.course_section_id}>{s.course_code} · Section {s.section}</option>)}
                </select>
              )
            }
          />
        )}
      </div>

      {form && (
        <AssessmentForm
          sections={sections}
          assessment={form.assessment}
          defaultSection={sectionFilter || (sections.length === 1 ? sections[0].course_section_id : '')}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            refresh();
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.kind === 'publish' ? 'Publish results?' : 'Delete assessment?'}
          message={
            <>
              {confirm.kind === 'publish'
                ? `Students of ${confirm.a.course_code} section ${confirm.a.section} will see their marks and grades for "${confirm.a.name}". ${confirm.a.entered} of ${confirm.a.enrolled} students have marks. Published assessments cannot be deleted.`
                : `"${confirm.a.name}" and any marks entered for it will be removed. This cannot be undone.`}
              {actError && <span className="sp-field-error" style={{ display: 'block', marginTop: 10 }} role="alert">{actError.message}</span>}
            </>
          }
          confirmLabel={confirm.kind === 'publish' ? 'Publish' : 'Delete'}
          danger={confirm.kind === 'delete'}
          busy={acting}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}

function MarksGrid() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const sheetRes = useApiResource(`/academics/assessments/${encodeURIComponent(id)}/marks`);
  const [sheet, setSheet] = useState(null);
  const [values, setValues] = useState({});
  const [save, { loading, error }] = useMutation();
  const [publishOpen, setPublishOpen] = useState(false);
  const [publish, { loading: publishing, error: publishError }] = useMutation();
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (sheetRes.status === 'succeeded') setSheet(sheetRes.data);
  }, [sheetRes.status, sheetRes.data]);

  useEffect(() => {
    if (sheet) setValues(Object.fromEntries(sheet.rows.map((r) => [r.student_id, r.marks_obtained === null ? '' : String(r.marks_obtained)])));
  }, [sheet]);

  const a = sheet?.assessment;
  const rowError = (v) => {
    if (v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > a.max_marks) return `0 to ${a.max_marks}`;
    return null;
  };
  const original = (r) => (r.marks_obtained === null ? '' : String(r.marks_obtained));
  const changed = sheet ? sheet.rows.filter((r) => values[r.student_id] !== original(r)) : [];
  const invalid = sheet ? sheet.rows.filter((r) => rowError(values[r.student_id] ?? '')) : [];
  const entered = sheet ? sheet.rows.filter((r) => r.marks_obtained !== null).length : 0;

  const submit = async () => {
    setMessage(null);
    if (invalid.length || !changed.length) return;
    const res = await save(
      'put',
      `/academics/assessments/${encodeURIComponent(id)}/marks`,
      { entries: changed.map((r) => ({ student_id: r.student_id, marks_obtained: values[r.student_id] === '' ? null : Number(values[r.student_id]) })) },
      { label: `Saved marks for ${a.name} (${a.course_code})` }
    );
    if (res.ok) {
      setSheet(res.data.sheet);
      setMessage(`Saved ${res.data.saved} mark${res.data.saved === 1 ? '' : 's'}. Grades were calculated by the server.`);
    }
  };

  const doPublish = async () => {
    const res = await publish('post', `/academics/assessments/${encodeURIComponent(id)}/publish`, {}, { label: `Published results of ${a.name} (${a.course_code})` });
    if (res.ok) {
      setPublishOpen(false);
      setSheet((prev) => ({ ...prev, assessment: res.data }));
      setMessage('Results published. Students can now see their marks and grades.');
      dispatch(fetchFacultyDashboard({ force: true }));
    }
  };

  return (
    <>
      <div className="sp-page-header">
        <div>
          <button type="button" className="sp-link-btn" style={{ color: '#c7d2ea', marginBottom: 6 }} onClick={() => navigate('/faculty/assessments')}>
            <ArrowLeft size={14} style={{ verticalAlign: -2 }} /> All assessments
          </button>
          <h1 className="sp-page-title">{a ? `${a.name} · ${a.course_code}` : 'Marks'}</h1>
          <p className="sp-page-subtitle">
            {a ? `${capitalize(a.type)} · ${formatDate(a.date)} · out of ${a.max_marks} · ${a.weightage}% weight` : 'Enter marks for each student'}
          </p>
        </div>
        {a && (
          <div className="sp-btn-row" style={{ alignItems: 'center' }}>
            <span className={`sp-badge ${STATUS_TONE[a.status] || 'is-neutral'}`}>{capitalize(a.status)}</span>
            {a.status === 'draft' && (
              <button type="button" className="sp-btn" onClick={() => setPublishOpen(true)} disabled={entered === 0 || changed.length > 0} title={changed.length ? 'Save your changes first' : entered === 0 ? 'Enter marks before publishing' : undefined}>
                <Send size={15} /> Publish results
              </button>
            )}
          </div>
        )}
      </div>

      {sheetRes.status === 'failed' ? (
        <div className="sp-card"><ErrorState error={sheetRes.error} onRetry={sheetRes.reload} /></div>
      ) : !sheet ? (
        <div className="sp-card"><LoadingState lines={6} /></div>
      ) : sheet.rows.length === 0 ? (
        <div className="sp-card"><EmptyState title="No students enrolled" message="Marks can be entered once students are enrolled in this section." /></div>
      ) : (
        <>
          <div className="sp-card" style={{ marginBottom: 16 }}>
            <div className="fac-att-summary">
              <span className="sp-badge is-info">{entered} of {sheet.rows.length} entered</span>
              <span className="sp-muted" style={{ fontSize: 13 }}>
                Grade scale: {sheet.grading.bands.map((b) => `${b.grade} ${b.min_pct}%+`).join(' · ')} · pass {sheet.grading.pass_pct}%
              </span>
            </div>
            {a.status === 'published' && <p className="sp-hint" style={{ marginTop: 8 }}>Results are published. Corrections you save are visible to students straight away.</p>}
          </div>
          <div className="sp-table-wrap">
            <table className="sp-table">
              <caption className="sp-visually-hidden">Marks sheet</caption>
              <thead>
                <tr>
                  <th scope="col">Roll no</th>
                  <th scope="col">Student</th>
                  <th scope="col" className="sp-num">Marks (out of {a.max_marks})</th>
                  <th scope="col">Grade</th>
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((r) => {
                  const v = values[r.student_id] ?? '';
                  const err = rowError(v);
                  const isChanged = v !== original(r);
                  return (
                    <tr key={r.student_id} className={isChanged ? 'fac-row-changed' : undefined}>
                      <td>{r.roll_no}</td>
                      <td><strong>{r.name}</strong></td>
                      <td className="sp-num">
                        <input
                          type="number"
                          inputMode="decimal"
                          className="sp-input fac-marks-input"
                          min={0}
                          max={a.max_marks}
                          step="0.5"
                          value={v}
                          aria-label={`Marks for ${r.name}`}
                          aria-invalid={err ? 'true' : undefined}
                          onChange={(e) => {
                            setMessage(null);
                            setValues((p) => ({ ...p, [r.student_id]: e.target.value }));
                          }}
                        />
                        {err && <p className="sp-field-error">{err}</p>}
                      </td>
                      <td>
                        {isChanged ? (
                          <span className="sp-badge is-neutral">Unsaved</span>
                        ) : r.grade ? (
                          <span className={`sp-badge ${r.grade === sheet.grading.bands[sheet.grading.bands.length - 1]?.grade ? 'is-danger' : 'is-info'}`}>{r.grade}</span>
                        ) : (
                          <span className="sp-muted">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="sp-card fac-sticky-bar">
            <div>
              {invalid.length > 0 ? (
                <p className="sp-field-error">{invalid.length} mark{invalid.length === 1 ? ' is' : 's are'} out of range.</p>
              ) : (
                <span className="sp-muted">{changed.length ? `${changed.length} unsaved change${changed.length === 1 ? '' : 's'}. Clear a box to remove a mark.` : 'No unsaved changes'}</span>
              )}
              {error && <p className="sp-field-error" role="alert">{error.message}</p>}
              {message && <p style={{ margin: 0, color: 'var(--sp-success)', fontWeight: 600 }} role="status">{message}</p>}
            </div>
            <div className="sp-btn-row">
              {changed.length > 0 && (
                <button type="button" className="sp-btn is-secondary" onClick={() => setValues(Object.fromEntries(sheet.rows.map((r) => [r.student_id, original(r)])))}>Undo changes</button>
              )}
              <button type="button" className="sp-btn" onClick={submit} disabled={loading || !changed.length || invalid.length > 0}>
                {loading ? 'Saving...' : 'Save marks'}
              </button>
            </div>
          </div>
        </>
      )}

      {publishOpen && a && (
        <ConfirmDialog
          title="Publish results?"
          message={
            <>
              Students will see their marks and grades for "{a.name}". {entered} of {sheet.rows.length} students have marks. Published assessments cannot be deleted.
              {publishError && <span className="sp-field-error" style={{ display: 'block', marginTop: 10 }} role="alert">{publishError.message}</span>}
            </>
          }
          confirmLabel="Publish"
          busy={publishing}
          onConfirm={doPublish}
          onCancel={() => setPublishOpen(false)}
        />
      )}
    </>
  );
}

export default function FacultyAssessments() {
  return (
    <Routes>
      <Route index element={<AssessmentList />} />
      <Route path=":id" element={<MarksGrid />} />
    </Routes>
  );
}
