import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import Modal, { ConfirmDialog } from '../../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { capitalize, displayValue } from '../../../shared/format';
import '../hod.css';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABEL = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };

function SlotModal({ sections, onClose, onDone }) {
  const [form, setForm] = useState({ course_section_id: '', day: 'MON', time: '09:00', room: '', type: 'lecture' });
  const [errors, setErrors] = useState({});
  const [save, { loading, error }] = useMutation();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.course_section_id) errs.course_section_id = 'Choose a course section.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time)) errs.time = 'Time must be HH:MM.';
    if (!form.room.trim()) errs.room = 'Room is required.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const cs = sections.find((s) => s.course_section_id === form.course_section_id);
    const res = await save('post', '/academics/timetable', { ...form, room: form.room.trim() }, { label: `Added ${cs?.course_code} ${cs?.section} on ${form.day} ${form.time}` });
    if (res.ok) onDone();
  };

  return (
    <Modal
      title="Add timetable slot"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="hd-slot-form" className="sp-btn" disabled={loading}>{loading ? 'Saving...' : 'Add slot'}</button>
        </>
      }
    >
      <form id="hd-slot-form" className="sp-form" onSubmit={submit} noValidate>
        {error && (
          <div className="sp-alert is-error" role="alert">
            {error.status === 409 ? `Timetable clash: ${error.message}` : error.message}
          </div>
        )}
        <div className="sp-field">
          <label htmlFor="hd-tcs">Course section</label>
          <select id="hd-tcs" className="sp-select" value={form.course_section_id} onChange={set('course_section_id')} aria-invalid={!!errors.course_section_id}>
            <option value="">Choose a section</option>
            {sections.map((s) => (
              <option key={s.course_section_id} value={s.course_section_id}>
                {s.course_code} {s.section} · {s.course_name} ({displayValue(s.faculty_name, 'no teacher')})
              </option>
            ))}
          </select>
          {errors.course_section_id && <p className="sp-field-error">{errors.course_section_id}</p>}
        </div>
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="hd-td">Day</label>
            <select id="hd-td" className="sp-select" value={form.day} onChange={set('day')}>
              {DAYS.map((d) => <option key={d} value={d}>{DAY_LABEL[d]}</option>)}
            </select>
          </div>
          <div className="sp-field">
            <label htmlFor="hd-tt">Start time</label>
            <input id="hd-tt" type="time" className="sp-input" value={form.time} onChange={set('time')} aria-invalid={!!errors.time} />
            {errors.time && <p className="sp-field-error">{errors.time}</p>}
          </div>
        </div>
        <div className="sp-form-row">
          <div className="sp-field">
            <label htmlFor="hd-tr">Room</label>
            <input id="hd-tr" className="sp-input" value={form.room} onChange={set('room')} aria-invalid={!!errors.room} placeholder="CSE-101" />
            {errors.room && <p className="sp-field-error">{errors.room}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="hd-ty">Type</label>
            <select id="hd-ty" className="sp-select" value={form.type} onChange={set('type')}>
              <option value="lecture">Lecture</option>
              <option value="lab">Lab</option>
            </select>
          </div>
        </div>
        <p className="sp-hint">A slot clashes if the teacher, the section or the room is already booked at that day and time.</p>
      </form>
    </Modal>
  );
}

export default function HodTimetable() {
  const tt = useApiResource('/academics/timetable');
  const sections = useApiResource('/academics/sections');
  const [section, setSection] = useState('all');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [remove, removeState] = useMutation();

  const all = Array.isArray(tt.data) ? tt.data : [];
  const sectionLetters = useMemo(() => [...new Set(all.map((s) => s.section))].sort(), [all]);
  const slots = section === 'all' ? all : all.filter((s) => s.section === section);
  const times = [...new Set(slots.map((s) => s.time))].sort();
  const days = DAYS.filter((d) => d !== 'SAT' || slots.some((s) => s.day === 'SAT'));

  const doRemove = async () => {
    const res = await remove('delete', `/academics/timetable/${removing.slot_id}`, undefined, { label: `Removed ${removing.course_code} ${removing.section} on ${removing.day} ${removing.time}` });
    if (res.ok) {
      setRemoving(null);
      tt.reload();
    }
  };

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Timetable</h1>
          <p className="sp-page-subtitle">Weekly class schedule for your department. Clashes are checked when you add a slot.</p>
        </div>
        <button type="button" className="sp-btn" onClick={() => setAdding(true)} disabled={sections.status !== 'succeeded' || !sections.data?.length}>
          <Plus size={15} /> Add slot
        </button>
      </div>
      {sections.status === 'failed' && <div className="sp-alert is-warning" role="alert" style={{ marginBottom: 12 }}>Could not load course sections, so slots cannot be added. <button type="button" className="sp-link-btn" onClick={sections.reload}>Retry</button></div>}

      {tt.status === 'loading' && <div className="sp-card"><LoadingState label="Loading timetable" lines={6} /></div>}
      {tt.status === 'failed' && <div className="sp-card"><ErrorState error={tt.error} onRetry={tt.reload} /></div>}
      {tt.status === 'succeeded' && (
        <>
          {sectionLetters.length > 1 && (
            <div className="hd-toolbar">
              <div className="sp-segmented" role="group" aria-label="Filter by section">
                <button type="button" aria-pressed={section === 'all'} onClick={() => setSection('all')}>All sections</button>
                {sectionLetters.map((l) => <button key={l} type="button" aria-pressed={section === l} onClick={() => setSection(l)}>Section {l}</button>)}
              </div>
            </div>
          )}
          {slots.length === 0 ? (
            <div className="sp-card"><EmptyState title="No classes scheduled" message="Add the first timetable slot for your department." /></div>
          ) : (
            <div className="sp-table-wrap">
              <table className="sp-table sp-timetable">
                <caption className="sp-visually-hidden">Weekly timetable</caption>
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 80 }}>Time</th>
                    {days.map((d) => <th key={d} scope="col">{DAY_LABEL[d]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {times.map((time) => (
                    <tr key={time}>
                      <th scope="row">{time}</th>
                      {days.map((d) => (
                        <td key={d} className="hd-tt-cell">
                          {slots.filter((s) => s.day === d && s.time === time).map((s) => (
                            <div key={s.slot_id} className={`sp-slot${s.type === 'lab' ? ' is-lab' : ''}`}>
                              <strong>{s.course_code} {s.section}</strong>
                              {s.room} · {capitalize(s.type)}
                              <div className="sp-muted">{displayValue(s.faculty_name, 'No teacher')}</div>
                              <div className="hd-slot-actions">
                                <button type="button" className="sp-link-btn" onClick={() => setRemoving(s)} aria-label={`Remove ${s.course_code} ${s.section} on ${DAY_LABEL[d]} at ${time}`}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {adding && <SlotModal sections={sections.data || []} onClose={() => setAdding(false)} onDone={() => { setAdding(false); tt.reload(); }} />}
      {removing && (
        <ConfirmDialog
          title="Remove timetable slot"
          message={`Remove ${removing.course_code} section ${removing.section} on ${DAY_LABEL[removing.day]} at ${removing.time} (${removing.room})?${removeState.error ? ` Error: ${removeState.error.message}` : ''}`}
          confirmLabel="Remove slot"
          danger
          busy={removeState.loading}
          onConfirm={doRemove}
          onCancel={() => { setRemoving(null); removeState.reset(); }}
        />
      )}
    </>
  );
}
