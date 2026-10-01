import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useMutation } from '../../hooks/useMutation';

/** Grade bands, pass mark and minimum attendance (PUT /college/settings/grading). */
export default function GradingForm({ config, canEdit = true, onSaved, submitLabel = 'Save grading' }) {
  const s = config?.settings || {};
  const g = s.grading || { scale: '10pt', pass_pct: 40, bands: [] };
  const [scale, setScale] = useState(g.scale || '10pt');
  const [passPct, setPassPct] = useState(String(g.pass_pct ?? 40));
  const [attendance, setAttendance] = useState(String(s.attendance_min_pct ?? 75));
  const [bands, setBands] = useState(() => (g.bands || []).map((b, i) => ({ key: `b${i}`, grade: b.grade, min_pct: String(b.min_pct), points: String(b.points) })));
  const [touched, setTouched] = useState(false);
  const [save, { loading, error, status }] = useMutation();

  const errors = [];
  const pct = (v) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100;
  if (bands.length < 2) errors.push('Add at least two grade bands.');
  const seen = new Set();
  bands.forEach((b, i) => {
    const grade = b.grade.trim();
    if (!grade) errors.push(`Band ${i + 1} needs a grade letter.`);
    if (grade && seen.has(grade)) errors.push(`Grade "${grade}" is listed twice.`);
    seen.add(grade);
    if (!pct(b.min_pct)) errors.push(`Band ${grade || i + 1}: minimum % must be between 0 and 100.`);
    if (b.points === '' || !(Number(b.points) >= 0)) errors.push(`Band ${grade || i + 1}: grade points must be zero or more.`);
  });
  if (bands.length && !bands.some((b) => Number(b.min_pct) === 0 && b.min_pct !== '')) errors.push('One band must start at 0% so every mark gets a grade.');
  if (!pct(passPct)) errors.push('Pass mark must be between 0 and 100.');
  if (!pct(attendance)) errors.push('Minimum attendance must be between 0 and 100.');

  const update = (i, key) => (e) => setBands((xs) => xs.map((x, j) => (j === i ? { ...x, [key]: e.target.value } : x)));

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (errors.length) return;
    const body = {
      grading: {
        scale,
        pass_pct: Number(passPct),
        bands: [...bands].sort((a, b) => Number(b.min_pct) - Number(a.min_pct)).map((b) => ({ grade: b.grade.trim(), min_pct: Number(b.min_pct), points: Number(b.points) })),
      },
      attendance_min_pct: Number(attendance),
    };
    const res = await save('put', '/college/settings/grading', body, { label: 'Updated grading and attendance rules' });
    if (res.ok) {
      setBands(body.grading.bands.map((b, i) => ({ key: `s${Date.now()}${i}`, grade: b.grade, min_pct: String(b.min_pct), points: String(b.points) })));
      onSaved?.(res.data);
    }
  };

  return (
    <form className="sp-form" onSubmit={submit} noValidate style={{ gap: 22 }}>
      <fieldset className="sp-form" style={{ border: 0, padding: 0, margin: 0 }} disabled={!canEdit}>
        <legend className="sp-section-title">Rules</legend>
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="gr-scale">Grade scale</label>
            <select id="gr-scale" className="sp-select" value={scale} onChange={(e) => setScale(e.target.value)}>
              <option value="10pt">10-point</option>
              <option value="4pt">4-point</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>
          <div className="sp-field">
            <label htmlFor="gr-pass">Pass mark (%)</label>
            <input id="gr-pass" type="number" min={0} max={100} className="sp-input" value={passPct} onChange={(e) => setPassPct(e.target.value)} />
          </div>
          <div className="sp-field">
            <label htmlFor="gr-att">Minimum attendance (%)</label>
            <input id="gr-att" type="number" min={0} max={100} className="sp-input" value={attendance} onChange={(e) => setAttendance(e.target.value)} />
            <p className="sp-hint">Students below this are flagged for shortage.</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="sp-form" style={{ border: 0, padding: 0, margin: 0 }} disabled={!canEdit}>
        <legend className="sp-section-title">Grade bands</legend>
        <p className="sp-hint" style={{ margin: 0 }}>A mark gets the highest band whose minimum it reaches. Bands are sorted from highest to lowest when saved.</p>
        <div className="cl-list-editor">
          {bands.map((b, i) => (
            <div key={b.key} className="cl-list-row is-band">
              <div className="sp-field">
                <label htmlFor={`gb-g-${i}`}>Grade</label>
                <input id={`gb-g-${i}`} className="sp-input" value={b.grade} maxLength={4} onChange={update(i, 'grade')} />
              </div>
              <div className="sp-field">
                <label htmlFor={`gb-m-${i}`}>Minimum %</label>
                <input id={`gb-m-${i}`} type="number" min={0} max={100} className="sp-input" value={b.min_pct} onChange={update(i, 'min_pct')} />
              </div>
              <div className="sp-field">
                <label htmlFor={`gb-p-${i}`}>Grade points</label>
                <input id={`gb-p-${i}`} type="number" min={0} step="0.1" className="sp-input" value={b.points} onChange={update(i, 'points')} />
              </div>
              {canEdit && (
                <button type="button" className="sp-icon-btn" aria-label={`Remove grade ${b.grade || i + 1}`} onClick={() => setBands((xs) => xs.filter((_, j) => j !== i))}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        {canEdit && (
          <div>
            <button type="button" className="sp-btn is-secondary is-small" disabled={bands.length >= 15}
              onClick={() => setBands((xs) => [...xs, { key: `n${Date.now()}`, grade: '', min_pct: '', points: '' }])}>
              <Plus size={14} /> Add band
            </button>
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
