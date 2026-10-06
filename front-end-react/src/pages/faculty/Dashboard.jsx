/**
 * Dashboard — ported from legacy fixes.js renderFacultyDashboard() +
 * renderActionRequired() + renderFacultySyllabusManager() + updateSyllabus().
 * The latter two are injected into dashboard-view at runtime by fixes.js,
 * not present in faculty.html's static markup (see the migration notes in
 * student/Attendance.jsx for the same pattern).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import SendAlertModal from '../../components/shared/SendAlertModal';
import MeetingModal from '../../components/shared/MeetingModal';

export default function Dashboard({ onNavigate }) {
  return (
    <>
      <Metrics onNavigate={onNavigate} />
      <Intervention />
      <ActionRequired onNavigate={onNavigate} />
      <SyllabusManager />
    </>
  );
}

function Metrics({ onNavigate }) {
  const [totalStudents, setTotalStudents] = useState('—');
  const [classesThisWeek, setClassesThisWeek] = useState('—');

  useEffect(() => {
    apiFetch('/admin/users')
      .then((all) => setTotalStudents(all.filter((u) => u.role === 'student').length))
      .catch(() => setTotalStudents('—'));
    apiFetch('/faculty/me/timetable')
      .then((tt) => {
        if (!tt?.grid) return;
        let slots = 0;
        Object.values(tt.grid).forEach((day) => {
          slots += Object.keys(day).length;
        });
        setClassesThisWeek(slots);
      })
      .catch(() => setClassesThisWeek('—'));
  }, []);

  return (
    <div className="metrics-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('student-overview')} title="View students">
        <div className="label">TOTAL STUDENTS</div>
        <div className="value">{totalStudents}</div>
        <div className="sub">click to view all ↗</div>
      </div>
      <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('timetable')} title="View timetable">
        <div className="label">CLASSES THIS WEEK</div>
        <div className="value">{classesThisWeek}</div>
        <div className="sub">click to view timetable ↗</div>
      </div>
    </div>
  );
}

function Intervention() {
  const [students, setStudents] = useState(undefined);
  const [alertTarget, setAlertTarget] = useState(null);
  const [meetingTarget, setMeetingTarget] = useState(null);

  useEffect(() => {
    apiFetch('/admin/users')
      .then((all) => setStudents(all.filter((u) => u.role === 'student' && u.is_at_risk)))
      .catch(() => setStudents([]));
  }, []);

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3>Early Intervention Required</h3>
          <p>Students needing attention based on attendance &amp; performance.</p>
        </div>
      </div>
      <div className="stats-card-body">
        {students === undefined ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Loading...</div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#16a34a', fontWeight: 600 }}>✓ No students currently flagged for intervention</div>
        ) : (
          students.map((s) => (
            <div key={s.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontWeight: 700, color: s.cgpa && s.cgpa < 6 ? '#dc2626' : '#d97706' }}>{s.first_name} {s.last_name || ''}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>ID: {s.user_id} &nbsp;·&nbsp; CGPA: {s.cgpa || 'N/A'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setAlertTarget({ id: s.user_id, name: `${s.first_name} ${s.last_name || ''}`.trim() })}
                  style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  Send Alert
                </button>
                <button
                  onClick={() => setMeetingTarget({ id: s.user_id, name: `${s.first_name} ${s.last_name || ''}`.trim() })}
                  style={{ padding: '6px 12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  Schedule Meeting
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <SendAlertModal student={alertTarget} onClose={() => setAlertTarget(null)} />
      <MeetingModal open={!!meetingTarget} preselected={meetingTarget} onClose={() => setMeetingTarget(null)} />
    </div>
  );
}

function ActionRequired({ onNavigate }) {
  const [items, setItems] = useState(undefined);

  useEffect(() => {
    Promise.all([apiFetch('/attendance-requests').catch(() => []), apiFetch('/research').catch(() => [])])
      .then(([attReqs, research]) => {
        const canGrant = attReqs.filter((r) => r.admin_status === 'approved' && r.faculty_status !== 'granted').length;
        const pendBTP = research.filter((p) => p.status === 'active' && (p.uploads || []).length > 0).length;
        const list = [];
        if (canGrant) list.push({ icon: '✅', text: `${canGrant} attendance request(s) to grant`, view: 'attendance' });
        if (pendBTP) list.push({ icon: '📤', text: `${pendBTP} BTP submission(s) to review`, view: 'research' });
        setItems(list);
      })
      .catch(() => setItems([]));
  }, []);

  if (items === undefined) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>⚡ Action Required</h3>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 16, color: '#16a34a', fontWeight: 600 }}>✓ Nothing requires your attention</div>
      ) : (
        items.map((i, idx) => (
          <div
            key={idx}
            onClick={() => onNavigate(i.view)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 8, cursor: 'pointer' }}
          >
            <span style={{ fontSize: 18 }}>{i.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>{i.text}</span>
          </div>
        ))
      )}
    </div>
  );
}

function SyllabusManager() {
  const { user } = useAuth();
  const [courses, setCourses] = useState(undefined);
  const [values, setValues] = useState({}); // `${courseId}_${section}` -> slider value

  const load = async () => {
    try {
      // /courses (not /faculty/me/courses) because it carries every
      // section's own faculty_id — /faculty/me/courses only ever attaches
      // one section per course, which breaks if this faculty teaches more
      // than one section of the same course.
      const [allCourses, allProgress] = await Promise.all([apiFetch('/courses'), apiFetch('/syllabus-progress')]);
      const myUserId = user?.user_id;
      const mine = allCourses
        .map((c) => ({ ...c, mySections: (c.sections || []).filter((s) => s.faculty_id === myUserId).map((s) => s.section) }))
        .filter((c) => c.mySections.length > 0);
      const initial = {};
      mine.forEach((c) => {
        c.mySections.forEach((sec) => {
          const sp = allProgress.find((p) => p.course_id === c.course_id && p.section === sec);
          initial[`${c.course_id}_${sec}`] = sp ? sp.progress : 0;
        });
      });
      setValues(initial);
      setCourses(mine);
    } catch {
      setCourses([]);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const save = async (courseId, section) => {
    const val = values[`${courseId}_${section}`];
    try {
      await apiFetch('/syllabus-progress', { method: 'PATCH', body: JSON.stringify({ course_id: courseId, section, progress: Number(val) }) });
    } catch {
      // No toast in legacy on this specific save either — the slider's own
      // value is the only feedback.
    }
  };

  return (
    <div style={{ marginTop: 20, padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>📊 Update Syllabus Progress</h3>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Update syllabus completion % per course and section</div>
      {courses === undefined ? null : courses.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center' }}>No sections assigned to you yet.</p>
      ) : (
        courses.map((c) => (
          <div key={c.course_id} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{c.course_code} – {c.course_name}</div>
            {c.mySections.map((sec) => {
              const key = `${c.course_id}_${sec}`;
              return (
                <div key={sec} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, width: 70 }}>Sec {sec}:</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={values[key] ?? 0}
                    onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, width: 40 }}>{values[key] ?? 0}%</span>
                  <button
                    onClick={() => save(c.course_id, sec)}
                    style={{ padding: '4px 10px', fontSize: 11, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  >
                    Save
                  </button>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
