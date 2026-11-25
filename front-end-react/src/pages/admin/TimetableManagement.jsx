import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';

const DAY_LABELS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday' };
const DAY_SHORT = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri' };
const DAY_COLORS = {
  MON: { bg: '#6366f1' },
  TUE: { bg: '#8b5cf6' },
  WED: { bg: '#0ea5e9' },
  THU: { bg: '#f59e0b' },
  FRI: { bg: '#10b981' },
};
const TYPE_COLORS = {
  lab: { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#f59e0b', text: '#92400e', icon: '🔬' },
  lecture: { bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '#6366f1', text: '#1e40af', icon: '📖' },
  tutorial: { bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '#22c55e', text: '#166534', icon: '✏️' },
};

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

export default function TimetableManagement() {
  const { showToast } = useNotifications();
  const [selectedSection, setSelectedSection] = useState('A');
  const [timetableData, setTimetableData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [day, setDay] = useState('MON');
  const [time, setTime] = useState('09:00');
  const [room, setRoom] = useState('');
  const [type, setType] = useState('lecture');
  const [submitting, setSubmitting] = useState(false);

  // Load Courses
  const loadCourses = async () => {
    try {
      const c = await apiFetch('/courses');
      setCourses(c || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Load Timetable Grid
  const loadTimetable = async (sec = selectedSection) => {
    setLoading(true);
    try {
      const data = await apiFetch(`/timetable?section=${encodeURIComponent(sec)}`);
      setTimetableData(data);
    } catch (e) {
      showToast('Failed to load timetable: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    loadTimetable(selectedSection);
  }, [selectedSection]);

  const days = timetableData?.days || ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const times = timetableData?.times || ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  const slotsList = timetableData?.slots || [];

  // Open modal to schedule a new slot
  const openAddModal = (defaultDay = 'MON', defaultTime = '09:00') => {
    setEditingSlot(null);
    setCourseId(courses[0]?.course_id || '');
    setDay(defaultDay);
    setTime(defaultTime);
    setRoom('');
    setType('lecture');
    setModalOpen(true);
  };

  // Open modal to edit existing slot
  const openEditModal = (slot) => {
    setEditingSlot(slot);
    setCourseId(slot.course_id);
    setDay(slot.day);
    setTime(slot.time);
    setRoom(slot.room || '');
    setType(slot.type || 'lecture');
    setModalOpen(true);
  };

  // Submit Add or Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseId) return showToast('Please select a course', 'warning');
    setSubmitting(true);
    try {
      if (editingSlot) {
        await apiFetch(`/timetable/slots/${editingSlot.slot_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            course_id: courseId,
            section: selectedSection,
            day,
            time,
            room,
            type,
          }),
        });
        showToast('Timetable slot updated successfully!', 'success');
      } else {
        await apiFetch('/timetable/slots', {
          method: 'POST',
          body: JSON.stringify({
            course_id: courseId,
            section: selectedSection,
            day,
            time,
            room,
            type,
          }),
        });
        showToast('Class scheduled successfully!', 'success');
      }
      setModalOpen(false);
      loadTimetable(selectedSection);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete slot
  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to remove this timetable slot?')) return;
    try {
      await apiFetch(`/timetable/slots/${slotId}`, { method: 'DELETE' });
      showToast('Timetable slot deleted', 'success');
      loadTimetable(selectedSection);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Compute available sections across all courses
  const allSectionsSet = new Set(['A', 'B']);
  courses.forEach((c) => {
    (c.sections || []).forEach((s) => {
      if (s.section) allSectionsSet.add(s.section);
    });
  });
  const availableSections = Array.from(allSectionsSet).sort();

  // Filter courses that are assigned to the currently selected section
  const sectionCourses = courses.filter((c) =>
    (c.sections || []).some((s) => s.section === selectedSection)
  );

  return (
    <div className="stats-card">
      <div className="stats-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3>Timetable Management</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
            Schedule and manage weekly slots. Enforces: <strong>1 credit = 1 hour/week</strong> with room & section conflict checks.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Section:</span>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 700 }}
            >
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="submit-btn"
            style={{ padding: '7px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => openAddModal()}
          >
            <span>+</span> Schedule Class
          </button>
        </div>
      </div>

      <div className="stats-card-body" style={{ padding: 20 }}>
        {/* Course Credit & Hours Summary for this Section */}
        <div style={{ marginBottom: 20, padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 8 }}>
            Course Hours Allocation (Section {selectedSection})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {sectionCourses.length === 0 ? (
              <span style={{ fontSize: 13, color: '#94a3b8' }}>No courses assigned to Section {selectedSection} yet. Assign them in Course Management.</span>
            ) : (
              sectionCourses.map((c) => {
                const assignedHours = slotsList.filter((s) => s.course_id === c.course_id).length;
                const creditLimit = c.credits || 0;
                const isFull = creditLimit > 0 && assignedHours >= creditLimit;
                const isOver = creditLimit > 0 && assignedHours > creditLimit;
                return (
                  <div
                    key={c.course_id}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: '#fff',
                      border: `1px solid ${isOver ? '#fca5a5' : isFull ? '#86efac' : '#e2e8f0'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{c.course_code}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{c.course_name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: isOver ? '#fee2e2' : isFull ? '#dcfce7' : '#f1f5f9',
                          color: isOver ? '#b91c1c' : isFull ? '#15803d' : '#475569',
                        }}
                      >
                        {assignedHours} / {creditLimit || '∞'} hrs
                      </span>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{creditLimit} credits</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Timetable Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading timetable...</div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, minWidth: 750, background: '#fff' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      width: 90,
                      padding: '14px 12px',
                      background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)',
                      color: '#475569',
                      fontSize: 11,
                      fontWeight: 800,
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      borderBottom: '2px solid #e2e8f0',
                      borderRight: '1px solid #e2e8f0',
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                    }}
                  >
                    Time
                  </th>
                  {days.map((d) => {
                    const dc = DAY_COLORS[d] || { bg: '#6366f1' };
                    return (
                      <th
                        key={d}
                        style={{
                          padding: '12px 8px',
                          background: dc.bg,
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 700,
                          textAlign: 'center',
                          letterSpacing: 0.5,
                          borderBottom: `2px solid ${dc.bg}`,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{DAY_SHORT[d] || d}</div>
                        <div style={{ fontSize: 9, opacity: 0.8, marginTop: 2, fontWeight: 500 }}>{DAY_LABELS[d] || d}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {times.map((t, idx) => {
                  const isEvenRow = idx % 2 === 0;
                  return (
                    <tr key={t} style={{ background: isEvenRow ? '#ffffff' : '#fafbfc' }}>
                      <td
                        style={{
                          padding: '10px 8px',
                          fontSize: 12,
                          color: '#475569',
                          fontWeight: 700,
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid #e2e8f0',
                          background: isEvenRow ? '#f8fafc' : '#f1f5f9',
                          position: 'sticky',
                          left: 0,
                          zIndex: 1,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>{formatTime(t)}</div>
                      </td>
                      {days.map((d) => {
                        const cell = timetableData?.grid?.[d]?.[t];
                        if (!cell) {
                          return (
                            <td
                              key={d}
                              style={{ padding: 6, verticalAlign: 'top', borderBottom: '1px solid #f1f5f9' }}
                              onClick={() => openAddModal(d, t)}
                              title="Click to schedule class in this slot"
                            >
                              <div
                                style={{
                                  minHeight: 65,
                                  borderRadius: 8,
                                  background: '#f8fafc',
                                  border: '1px dashed #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
                              >
                                <span style={{ fontSize: 14, opacity: 0.4, color: '#64748b' }}>+ Add</span>
                              </div>
                            </td>
                          );
                        }
                        const slots = Array.isArray(cell) ? cell : [cell];
                        return (
                          <td key={d} style={{ padding: 6, verticalAlign: 'top', borderBottom: '1px solid #f1f5f9' }}>
                            {slots.map((slot, si) => {
                              const c = TYPE_COLORS[slot.type] || TYPE_COLORS.lecture;
                              return (
                                <div
                                  key={slot.slot_id || si}
                                  style={{
                                    padding: '8px 10px',
                                    background: c.bg,
                                    borderRadius: 10,
                                    borderLeft: `4px solid ${c.border}`,
                                    marginBottom: 4,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                    position: 'relative',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <span style={{ fontSize: 12 }}>{c.icon}</span>
                                      <span style={{ fontWeight: 800, color: c.text, fontSize: 13 }}>{slot.course_code || ''}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button
                                        type="button"
                                        title="Edit class slot"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditModal(slot);
                                        }}
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, fontSize: 12 }}
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        type="button"
                                        title="Delete slot"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSlot(slot.slot_id);
                                        }}
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, fontSize: 12 }}
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                  {slot.course_name && (
                                    <div style={{ fontSize: 11, color: '#475569', fontWeight: 500, margin: '2px 0 4px', lineHeight: 1.2 }}>
                                      {slot.course_name}
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    {slot.room && (
                                      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>📍 {slot.room}</span>
                                    )}
                                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.7)', color: c.text, fontWeight: 700, textTransform: 'uppercase' }}>
                                      {slot.type}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingSlot ? 'Edit Timetable Slot' : `Schedule Class — Section ${selectedSection}`}>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Course <span style={{ color: '#ef4444' }}>*</span></label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
                <option value="">— Select Course —</option>
                {courses.map((c) => {
                  const hasSection = (c.sections || []).some((s) => s.section === selectedSection);
                  return (
                    <option key={c.course_id} value={c.course_id}>
                      {c.course_code} - {c.course_name} ({c.credits} Credits){!hasSection ? ' (No Sec ' + selectedSection + ' assigned)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Day <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={day} onChange={(e) => setDay(e.target.value)} required>
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {DAY_SHORT[d]} ({DAY_LABELS[d]})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Time Slot <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={time} onChange={(e) => setTime(e.target.value)} required>
                  {times.map((t) => (
                    <option key={t} value={t}>
                      {formatTime(t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Room / Venue</label>
                <input
                  type="text"
                  placeholder="e.g. Room 101, Lab 2"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Modality / Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="lecture">Lecture 📖</option>
                  <option value="lab">Lab 🔬</option>
                  <option value="tutorial">Tutorial ✏️</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? 'Saving…' : editingSlot ? 'Update Slot' : 'Add to Timetable'}
            </button>
            <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
