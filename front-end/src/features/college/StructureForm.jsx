import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useMutation } from '../../hooks/useMutation';

/** New programmes need an id before a batch can point at them; the server keeps ids it is given. */
const newProgrammeId = () => `prg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Academic structure: term type and current term, programmes, batches and
 * sections (PUT /college/settings/structure).
 */
export default function StructureForm({ config, canEdit = true, onSaved, submitLabel = 'Save structure' }) {
  const s = config?.settings || {};
  const [termType, setTermType] = useState(s.term_type || 'semester');
  const [term, setTerm] = useState({ label: s.current_term?.label || '', start: s.current_term?.start || '', end: s.current_term?.end || '' });
  const [programmes, setProgrammes] = useState(() => (s.programmes || []).map((p) => ({ ...p, duration_years: String(p.duration_years) })));
  const [batches, setBatches] = useState(() => (s.batches || []).map((b) => ({ ...b, start_year: String(b.start_year), current_semester: String(b.current_semester ?? 1) })));
  const [sections, setSections] = useState(s.sections || []);
  const [sectionInput, setSectionInput] = useState('');
  const [touched, setTouched] = useState(false);
  const [save, { loading, error, status }] = useMutation();

  const errors = [];
  const termFilled = term.label || term.start || term.end;
  if (termFilled && (!term.label.trim() || !term.start || !term.end)) errors.push('The current term needs a label, a start date and an end date.');
  if (term.start && term.end && term.end < term.start) errors.push('The term end date must be after the start date.');
  const codes = new Set();
  programmes.forEach((p, i) => {
    const code = p.code.trim().toUpperCase();
    if (!code || !p.name.trim()) errors.push(`Programme ${i + 1} needs a code and a name.`);
    if (code && codes.has(code)) errors.push(`Programme code ${code} is used twice.`);
    codes.add(code);
    const y = Number(p.duration_years);
    if (!Number.isInteger(y) || y < 1 || y > 6) errors.push(`Programme ${code || i + 1}: duration must be 1 to 6 years.`);
  });
  batches.forEach((b, i) => {
    const y = Number(b.start_year);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) errors.push(`Batch ${i + 1}: start year must be between 2000 and 2100.`);
    if (!programmes.some((p) => p.programme_id === b.programme_id)) errors.push(`Batch ${i + 1}: choose a programme.`);
  });
  if (!sections.length) errors.push('Add at least one section.');

  const addSection = () => {
    const v = sectionInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,4}$/.test(v) || sections.includes(v)) return;
    setSections((xs) => [...xs, v]);
    setSectionInput('');
  };
  const sectionInvalid = sectionInput.trim() && !/^[A-Za-z0-9]{1,4}$/.test(sectionInput.trim());

  const updateList = (setter, i, key) => (e) => setter((xs) => xs.map((x, j) => (j === i ? { ...x, [key]: e.target.value } : x)));

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (errors.length) return;
    const body = {
      term_type: termType,
      current_term: termFilled ? { label: term.label.trim(), start: term.start, end: term.end } : null,
      programmes: programmes.map((p) => ({ programme_id: p.programme_id, code: p.code.trim().toUpperCase(), name: p.name.trim(), duration_years: Number(p.duration_years) })),
      batches: batches.map((b) => ({ batch_id: b.batch_id, label: b.label.trim(), start_year: Number(b.start_year), programme_id: b.programme_id, current_semester: Number(b.current_semester) || 1 })),
      sections,
    };
    const res = await save('put', '/college/settings/structure', body, { label: 'Updated academic structure' });
    if (res.ok) onSaved?.(res.data);
  };

  return (
    <form className="sp-form" onSubmit={submit} noValidate style={{ gap: 22 }}>
      <fieldset className="sp-form" style={{ border: 0, padding: 0, margin: 0 }} disabled={!canEdit}>
        <legend className="sp-section-title">Academic term</legend>
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="st-type">Term type</label>
            <select id="st-type" className="sp-select" value={termType} onChange={(e) => setTermType(e.target.value)}>
              <option value="semester">Semester</option>
              <option value="trimester">Trimester</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div className="sp-field">
            <label htmlFor="st-label">Current term label</label>
            <input id="st-label" className="sp-input" value={term.label} placeholder="2026 odd semester" onChange={(e) => setTerm((t) => ({ ...t, label: e.target.value }))} />
          </div>
          <div className="sp-field">
            <label htmlFor="st-start">Starts</label>
            <input id="st-start" type="date" className="sp-input" value={term.start} onChange={(e) => setTerm((t) => ({ ...t, start: e.target.value }))} />
          </div>
          <div className="sp-field">
            <label htmlFor="st-end">Ends</label>
            <input id="st-end" type="date" className="sp-input" value={term.end} min={term.start || undefined} onChange={(e) => setTerm((t) => ({ ...t, end: e.target.value }))} />
          </div>
        </div>
      </fieldset>

      <fieldset className="sp-form" style={{ border: 0, padding: 0, margin: 0 }} disabled={!canEdit}>
        <legend className="sp-section-title">Programmes</legend>
        <div className="cl-list-editor">
          {programmes.length === 0 && <p className="sp-muted" style={{ margin: 0 }}>No programmes yet, for example B.Tech (4 years).</p>}
          {programmes.map((p, i) => (
            <div key={p.programme_id} className="cl-list-row is-4">
              <div className="sp-field">
                <label htmlFor={`pg-code-${i}`}>Code</label>
                <input id={`pg-code-${i}`} className="sp-input" value={p.code} placeholder="BTECH" onChange={updateList(setProgrammes, i, 'code')} />
              </div>
              <div className="sp-field">
                <label htmlFor={`pg-name-${i}`}>Name</label>
                <input id={`pg-name-${i}`} className="sp-input" value={p.name} placeholder="B.Tech" onChange={updateList(setProgrammes, i, 'name')} />
              </div>
              <div className="sp-field">
                <label htmlFor={`pg-years-${i}`}>Years</label>
                <input id={`pg-years-${i}`} type="number" min={1} max={6} className="sp-input" value={p.duration_years} onChange={updateList(setProgrammes, i, 'duration_years')} />
              </div>
              {canEdit && (
                <button type="button" className="sp-icon-btn" aria-label={`Remove programme ${p.code || i + 1}`}
                  onClick={() => { setProgrammes((xs) => xs.filter((_, j) => j !== i)); setBatches((bs) => bs.filter((b) => b.programme_id !== p.programme_id)); }}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        {canEdit && (
          <div>
            <button type="button" className="sp-btn is-secondary is-small" onClick={() => setProgrammes((xs) => [...xs, { programme_id: newProgrammeId(), code: '', name: '', duration_years: '4' }])}>
              <Plus size={14} /> Add programme
            </button>
          </div>
        )}
      </fieldset>

      <fieldset className="sp-form" style={{ border: 0, padding: 0, margin: 0 }} disabled={!canEdit}>
        <legend className="sp-section-title">Batches</legend>
        <div className="cl-list-editor">
          {batches.length === 0 && <p className="sp-muted" style={{ margin: 0 }}>No batches yet. A batch is an intake year of a programme, for example 2024-2028.</p>}
          {batches.map((b, i) => (
            <div key={b.batch_id || b._key} className="cl-list-row is-5">
              <div className="sp-field">
                <label htmlFor={`bt-prog-${i}`}>Programme</label>
                <select id={`bt-prog-${i}`} className="sp-select" value={b.programme_id} onChange={updateList(setBatches, i, 'programme_id')}>
                  <option value="">Select</option>
                  {programmes.map((p) => <option key={p.programme_id} value={p.programme_id}>{p.code || p.name || 'New programme'}</option>)}
                </select>
              </div>
              <div className="sp-field">
                <label htmlFor={`bt-year-${i}`}>Start year</label>
                <input id={`bt-year-${i}`} type="number" className="sp-input" value={b.start_year} onChange={updateList(setBatches, i, 'start_year')} />
              </div>
              <div className="sp-field">
                <label htmlFor={`bt-label-${i}`}>Label</label>
                <input id={`bt-label-${i}`} className="sp-input" value={b.label} placeholder="2024-2028" onChange={updateList(setBatches, i, 'label')} />
              </div>
              <div className="sp-field">
                <label htmlFor={`bt-sem-${i}`}>Current {termType === 'annual' ? 'year' : termType}</label>
                <input id={`bt-sem-${i}`} type="number" min={1} className="sp-input" value={b.current_semester} onChange={updateList(setBatches, i, 'current_semester')} />
              </div>
              {canEdit && (
                <button type="button" className="sp-icon-btn" aria-label={`Remove batch ${b.label || i + 1}`} onClick={() => setBatches((xs) => xs.filter((_, j) => j !== i))}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        {canEdit && (
          <div>
            <button type="button" className="sp-btn is-secondary is-small" disabled={!programmes.length}
              onClick={() => setBatches((xs) => [...xs, { batch_id: undefined, _key: `nb${Date.now()}`, programme_id: programmes[0]?.programme_id || '', start_year: String(new Date().getFullYear()), label: '', current_semester: '1' }])}>
              <Plus size={14} /> Add batch
            </button>
            {!programmes.length && <p className="sp-hint">Add a programme first.</p>}
          </div>
        )}
      </fieldset>

      <fieldset className="sp-form" style={{ border: 0, padding: 0, margin: 0 }} disabled={!canEdit}>
        <legend className="sp-section-title">Sections</legend>
        <div className="cl-chips">
          {sections.map((x) => (
            <span key={x} className="cl-chip">
              {x}
              {canEdit && <button type="button" aria-label={`Remove section ${x}`} onClick={() => setSections((xs) => xs.filter((y) => y !== x))}><X size={13} /></button>}
            </span>
          ))}
          {!sections.length && <span className="sp-muted">No sections.</span>}
        </div>
        {canEdit && (
          <div className="sp-btn-row" style={{ alignItems: 'flex-start' }}>
            <div className="sp-field">
              <label htmlFor="st-sec" className="sp-visually-hidden">New section</label>
              <input id="st-sec" className="sp-input" value={sectionInput} maxLength={4} placeholder="e.g. C" style={{ width: 120 }}
                onChange={(e) => setSectionInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSection(); } }} aria-invalid={!!sectionInvalid} />
              {sectionInvalid && <p className="sp-field-error">1-4 letters or digits.</p>}
            </div>
            <button type="button" className="sp-btn is-secondary is-small" onClick={addSection} disabled={!sectionInput.trim() || !!sectionInvalid}>Add section</button>
          </div>
        )}
      </fieldset>

      {touched && errors.length > 0 && (
        <div className="sp-alert is-error" role="alert"><ul style={{ margin: 0, paddingLeft: 18 }}>{errors.map((m) => <li key={m}>{m}</li>)}</ul></div>
      )}
      {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
      {canEdit && (
        <div className="cl-form-actions">
          <button type="submit" className="sp-btn" disabled={loading}>{loading ? 'Saving...' : submitLabel}</button>
          {status === 'succeeded' && <span className="sp-hint" role="status">Saved.</span>}
        </div>
      )}
    </form>
  );
}
