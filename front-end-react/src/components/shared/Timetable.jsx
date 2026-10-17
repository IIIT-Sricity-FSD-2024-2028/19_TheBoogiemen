/**
 * Timetable — complete end-to-end timetable management and view.
 * Supports student enrolled schedule, faculty schedule, and dynamic
 * class scheduling with conflict detection (room & section conflicts).
 */

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from './Modal';

const ENDPOINT_BY_ROLE = {
  student: '/student-timetable',
  faculty: '/faculty/me/timetable',
  admin: '/timetable',
};

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
  lab: { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#f59e0b', text: '#92400e', icon: '🔬', label: 'Lab' },
  lecture: { bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '#6366f1', text: '#1e40af', icon: '📖', label: 'Lecture' },
  tutorial: { bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '#22c55e', text: '#166534', icon: '✏️', label: 'Tutorial' },
};

const TIME_OPTIONS = [
  { value: '09:00', label: '09:00 AM – 10:00 AM' },
  { value: '10:00', label: '10:00 AM – 11:00 AM' },
  { value: '11:00', label: '11:00 AM – 12:00 PM' },
  { value: '12:00', label: '12:00 PM – 01:00 PM' },
  { value: '13:00', label: '01:00 PM – 02:00 PM' },
  { value: '14:00', label: '02:00 PM – 03:00 PM' },
  { value: '15:00', label: '03:00 PM – 04:00 PM' },
];

const ROOM_OPTIONS = ['101', '102', '103', '104', '201', '202', 'Lab 1', 'Lab 2', 'Seminar Hall'];

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function ScheduleClassModal({ open, onClose, onCreated, defaultSection = 'A' }) {
  const { showToast } = useNotifications();
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [section, setSection] = useState(defaultSection);
  const [day, setDay] = useState('MON');
  const [time, setTime] = useState('09:00');
  const [room, setRoom] = useState('101');
  const [type, setType] = useState('lecture');
  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState(null);

  useEffect(() => {
    if (open) {
      setConflictError(null);
      setSection(defaultSection);
      apiFetch('/courses')
        .then((res) => {
          const list = Array.isArray(res) ? res : res.courses || [];
          setCourses(list);
          if (list.length) {
            setCourseId(list[0].course_id);
          }
        })
        .catch(() => {});
    }
  }, [open, defaultSection]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseId) {
      setConflictError('Please select a course to schedule');
      return;
    }
    setSubmitting(true);
    setConflictError(null);

    try {
      const res = await apiFetch('/timetable', {
        method: 'POST',
        body: {
          course_id: courseId,
          section: section.toUpperCase(),
          day,
          time,
          room: room.trim(),
          type,
        },
      });
      showToast(res.message || 'Class scheduled successfully!', 'success');
      onCreated();
      onClose();
    } catch (err) {
      setConflictError(err.message || 'Scheduling conflict detected');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule Class Slot" maxWidth={540}>
      <form onSubmit={handleSubmit} style={{ padding: '0 4px' }}>
        {conflictError && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Conflict Detected</div>
              <div>{conflictError}</div>
            </div>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
            Select Course *
          </label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              background: '#fff',
              outline: 'none',
            }}
          >
            {courses.map((c) => (
              <option key={c.course_id} value={c.course_id}>
                {c.course_code} – {c.course_name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Section
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: '#fff',
                outline: 'none',
              }}
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Class Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: '#fff',
                outline: 'none',
              }}
            >
              <option value="lecture">📖 Lecture</option>
              <option value="lab">🔬 Lab</option>
              <option value="tutorial">✏️ Tutorial</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Day of Week *
            </label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: '#fff',
                outline: 'none',
              }}
            >
              <option value="MON">Monday</option>
              <option value="TUE">Tuesday</option>
              <option value="WED">Wednesday</option>
              <option value="THU">Thursday</option>
              <option value="FRI">Friday</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Time Slot *
            </label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: '#fff',
                outline: 'none',
              }}
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
            Classroom / Lab Location *
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. 101 or Lab 1"
              required
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <select
              onChange={(e) => e.target.value && setRoom(e.target.value)}
              value=""
              style={{
                padding: '10px 8px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                background: '#f8fafc',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <option value="">Presets ▾</option>
              {ROOM_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#475569',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
            }}
          >
            {submitting ? 'Checking Conflicts...' : 'Schedule Class'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Timetable({ role = 'student' }) {
  const { showToast } = useNotifications();
  const [data, setData] = useState(undefined); // undefined = loading
  const [error, setError] = useState(null);
  const [sectionFilter, setSectionFilter] = useState('A');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [hoveredSlotId, setHoveredSlotId] = useState(null);

  const load = useCallback(() => {
    let cancelled = false;
    let url = ENDPOINT_BY_ROLE[role] || '/timetable';
    if (role !== 'student' && role !== 'faculty') {
      url = `/timetable?section=${sectionFilter}`;
    }

    apiFetch(url)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          if (res.section) setSectionFilter(res.section);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, [role, sectionFilter]);

  useEffect(() => {
    return load();
  }, [load]);

  const handleDeleteSlot = async (slotId, courseCode, day, time) => {
    if (!slotId) return;
    if (!window.confirm(`Are you sure you want to remove this ${courseCode} class on ${day} at ${time}?`)) {
      return;
    }
    try {
      await apiFetch(`/timetable/${slotId}`, { method: 'DELETE' });
      showToast(`Removed class slot for ${courseCode}`, 'success');
      load();
    } catch (err) {
      showToast(err.message || 'Failed to remove class slot', 'error');
    }
  };

  if (error) {
    return (
      <div style={{ padding: '24px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12 }}>
        <p style={{ color: '#ef4444', fontWeight: 600 }}>Failed to load timetable: {error}</p>
        <button
          onClick={load}
          style={{
            marginTop: 12,
            padding: '6px 14px',
            borderRadius: 6,
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 32, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>⏳</div>
        <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>Loading your weekly schedule...</p>
      </div>
    );
  }

  const days = data.days || ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const times = data.times || ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  let totalSlots = 0;
  let lectureCount = 0;
  let labCount = 0;
  let tutorialCount = 0;

  days.forEach((d) => {
    if (data.grid && data.grid[d]) {
      Object.values(data.grid[d]).forEach((cell) => {
        const slots = Array.isArray(cell) ? cell : [cell];
        slots.forEach((s) => {
          totalSlots++;
          if (s.type === 'lab') labCount++;
          else if (s.type === 'tutorial') tutorialCount++;
          else lectureCount++;
        });
      });
    }
  });

  return (
    <>
      {/* Schedule Class Modal */}
      <ScheduleClassModal
        open={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onCreated={load}
        defaultSection={sectionFilter || 'A'}
      />

      {/* Timetable Header Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
          padding: '14px 18px',
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b', letterSpacing: -0.2 }}>
              Weekly Academic Timetable
            </h3>
            <span
              style={{
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 20,
                fontWeight: 700,
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #dbeafe',
              }}
            >
              Section {data.section || sectionFilter || 'A'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            {role === 'student'
              ? 'Personalized schedule automatically filtered to your enrolled courses'
              : 'Institutional class schedule with automated conflict prevention'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {role !== 'student' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Section:</span>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsScheduleOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
              transition: 'transform 0.1s',
            }}
          >
            <span>+</span> Schedule Class
          </button>
        </div>
      </div>

      {totalSlots === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: '#ffffff',
            borderRadius: 12,
            border: '1px dashed #cbd5e1',
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 14 }}>📅</div>
          <p style={{ color: '#334155', fontSize: 16, fontWeight: 700, margin: 0 }}>
            No classes scheduled for this view
          </p>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 6, maxWidth: 420, margin: '6px auto 16px' }}>
            {role === 'student'
              ? 'Classes will appear here once you enroll in courses that have scheduled slots.'
              : 'You can schedule class slots dynamically using the button below.'}
          </p>
          <button
            type="button"
            onClick={() => setIsScheduleOpen(true)}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              background: '#4f46e5',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            + Schedule First Class Slot
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              fontSize: 13,
              minWidth: 780,
              background: '#fff',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    width: 95,
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
                    zIndex: 2,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Time
                  </div>
                </th>
                {days.map((d) => {
                  const dc = DAY_COLORS[d] || { bg: '#6366f1' };
                  return (
                    <th
                      key={d}
                      style={{
                        padding: '14px 8px',
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
                      <div style={{ fontSize: 9, opacity: 0.85, marginTop: 2, fontWeight: 500 }}>
                        {DAY_LABELS[d] || d}
                      </div>
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
                        padding: '12px 8px',
                        fontSize: 12,
                        color: '#475569',
                        fontWeight: 700,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        whiteSpace: 'nowrap',
                        borderRight: '1px solid #e2e8f0',
                        borderBottom: '1px solid #f1f5f9',
                        background: isEvenRow ? '#f8fafc' : '#f1f5f9',
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>{formatTime(t)}</div>
                    </td>
                    {days.map((d) => {
                      const cell = data.grid && data.grid[d] && data.grid[d][t];
                      if (!cell) {
                        return (
                          <td
                            key={d}
                            style={{
                              padding: 6,
                              verticalAlign: 'top',
                              borderBottom: '1px solid #f1f5f9',
                            }}
                          >
                            <div
                              style={{
                                minHeight: 64,
                                borderRadius: 8,
                                background: '#f8fafc',
                                border: '1px dashed #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <span style={{ fontSize: 16, opacity: 0.18 }}>—</span>
                            </div>
                          </td>
                        );
                      }
                      const slots = Array.isArray(cell) ? cell : [cell];
                      return (
                        <td
                          key={d}
                          style={{
                            padding: 6,
                            verticalAlign: 'top',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          {slots.map((slot, si) => {
                            const c = TYPE_COLORS[slot.type] || TYPE_COLORS.lecture;
                            const isHovered = hoveredSlotId === slot.slot_id;
                            return (
                              <div
                                key={si}
                                onMouseEnter={() => setHoveredSlotId(slot.slot_id)}
                                onMouseLeave={() => setHoveredSlotId(null)}
                                style={{
                                  position: 'relative',
                                  padding: '10px 12px',
                                  background: c.bg,
                                  borderRadius: 10,
                                  borderLeft: `4px solid ${c.border}`,
                                  marginBottom: 4,
                                  boxShadow: isHovered
                                    ? '0 4px 8px rgba(0,0,0,0.1)'
                                    : '0 1px 3px rgba(0,0,0,0.06)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 4,
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ fontSize: 13 }}>{c.icon}</span>
                                    <span
                                      style={{
                                        fontWeight: 800,
                                        color: c.text,
                                        fontSize: 13,
                                        letterSpacing: 0.3,
                                      }}
                                    >
                                      {slot.course_code || ''}
                                    </span>
                                  </div>
                                  {slot.slot_id && (
                                    <button
                                      type="button"
                                      title="Delete class slot"
                                      onClick={() =>
                                        handleDeleteSlot(
                                          slot.slot_id,
                                          slot.course_code,
                                          slot.day,
                                          slot.time,
                                        )
                                      }
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: isHovered ? '#ef4444' : 'transparent',
                                        cursor: 'pointer',
                                        padding: '0 2px',
                                        fontSize: 14,
                                        fontWeight: 800,
                                        lineHeight: 1,
                                        transition: 'color 0.15s',
                                      }}
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>

                                {slot.course_name && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: '#475569',
                                      fontWeight: 600,
                                      marginBottom: 6,
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    {slot.course_name}
                                  </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  {slot.room && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        color: '#475569',
                                        background: 'rgba(255,255,255,0.7)',
                                        padding: '2px 6px',
                                        borderRadius: 6,
                                        border: '1px solid rgba(0,0,0,0.06)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3,
                                        fontWeight: 600,
                                      }}
                                    >
                                      📍 {slot.room}
                                    </span>
                                  )}
                                  {slot.type && (
                                    <span
                                      style={{
                                        fontSize: 9,
                                        background: `${c.border}22`,
                                        color: c.text,
                                        padding: '2px 6px',
                                        borderRadius: 6,
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                      }}
                                    >
                                      {c.label || slot.type}
                                    </span>
                                  )}
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

      {/* Legend & Stats Footer */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 16,
          padding: '12px 18px',
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          alignItems: 'center',
          fontSize: 12,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Legend:
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#1e40af', fontWeight: 600 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#6366f1', display: 'inline-block' }} />
          Lecture ({lectureCount})
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#92400e', fontWeight: 600 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b', display: 'inline-block' }} />
          Lab ({labCount})
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#166534', fontWeight: 600 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#22c55e', display: 'inline-block' }} />
          Tutorial ({tutorialCount})
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
          Total: <strong style={{ color: '#0f172a' }}>{totalSlots}</strong> classes scheduled this week
        </span>
      </div>
    </>
  );
}
