/**
 * Dashboard — ported from legacy fixes.js renderFacultyDashboard() +
 * renderActionRequired() + renderFacultySyllabusManager() + updateSyllabus().
 * The latter two are injected into dashboard-view at runtime by fixes.js,
 * not present in faculty.html's static markup (see the migration notes in
 * student/Attendance.jsx for the same pattern).
 *
 * Redux migration (Dev 4): Metrics reuses the shared usersSlice +
 * timetableSlice (the same faculty-timetable fetch Timetable.jsx itself
 * uses, deduped into one byRole.faculty bucket); Intervention reuses
 * facultyStudentsSlice; ActionRequired reuses attendanceRequestsSlice +
 * researchSlice; CourseOutcomesModal extends Dev 3's learningOutcomesSlice
 * with its first real create/delete/po-mapping consumer; CourseSyllabusPanel
 * is this file's own new topics/topicCompletions slices; SyllabusManager
 * reuses Dev 3's coursesSlice (unscoped /courses, not /faculty/me/courses —
 * see its own comment below for why) and programOutcomesSlice.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../features/auth/useAuth';
import { useNotifications } from '../../features/notifications/useNotifications';
import SendAlertModal from '../../components/shared/SendAlertModal';
import MeetingModal from '../../components/shared/MeetingModal';
import Modal from '../../components/shared/Modal';
import { autoAlertAtRiskStudents } from '../../utils/riskAlerts';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAllUsers } from '../../features/users/usersThunks';
import { fetchTimetable } from '../../features/timetable/timetableThunks';
import { fetchFacultyStudents } from '../../features/facultyStudents/facultyStudentsThunks';
import { fetchAttendanceRequests } from '../../features/attendanceRequests/attendanceRequestsThunks';
import { fetchResearch } from '../../features/research/researchThunks';
import { fetchCourses } from '../../features/courses/coursesThunks';
import { fetchProgramOutcomes } from '../../features/programOutcomes/programOutcomesThunks';
import {
  fetchLearningOutcomes,
  createLearningOutcome,
  deleteLearningOutcome,
  setLearningOutcomePoMapping,
} from '../../features/learningOutcomes/learningOutcomesThunks';
import { fetchTopics, createTopic, deleteTopic } from '../../features/topics/topicsThunks';
import { fetchTopicCompletionsForCourse, setTopicCompletion } from '../../features/topicCompletions/topicCompletionsThunks';
import { previewSet } from '../../features/topicCompletions/topicCompletionsSlice';

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
  const dispatch = useAppDispatch();
  const users = useAppSelector((state) => state.users.items);
  const usersStatus = useAppSelector((state) => state.users.status);
  const timetableEntry = useAppSelector((state) => state.timetable.byRole.faculty);

  useEffect(() => {
    dispatch(fetchAllUsers());
    dispatch(fetchTimetable('faculty'));
  }, [dispatch]);

  const totalStudents = usersStatus === 'succeeded' ? users.filter((u) => u.role === 'student').length : '—';
  let classesThisWeek = '—';
  if (timetableEntry?.data?.grid) {
    let slots = 0;
    Object.values(timetableEntry.data.grid).forEach((day) => {
      slots += Object.keys(day).length;
    });
    classesThisWeek = slots;
  }

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
  const dispatch = useAppDispatch();
  const { send } = useNotifications();
  const facultyStudents = useAppSelector((state) => state.facultyStudents.items);
  const [alertTarget, setAlertTarget] = useState(null);
  const [meetingTarget, setMeetingTarget] = useState(null);

  useEffect(() => {
    // Was reading /admin/users, which carries no is_at_risk/cgpa/risk_reasons
    // field at all (sanitizeUser only strips password fields) — this panel
    // showed "No students currently flagged" unconditionally. /faculty/me/students
    // is the same real, computed source StudentOverview.jsx already uses.
    dispatch(fetchFacultyStudents()).then((action) => {
      if (action.payload) {
        // FR10: notify each at-risk student automatically — the system
        // flags them the moment this loads, rather than only if a faculty
        // member happens to notice and click "Send Alert" below.
        autoAlertAtRiskStudents(action.payload.filter((s) => s.is_at_risk), send);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const students = facultyStudents === null ? undefined : facultyStudents.filter((s) => s.is_at_risk);

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
                {s.risk_reasons?.length > 0 && (
                  <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>{s.risk_reasons.join(' · ')}</div>
                )}
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
  const dispatch = useAppDispatch();
  const { items: attReqs, status: attStatus } = useAppSelector((state) => state.attendanceRequests);
  const { items: research, status: researchStatus } = useAppSelector((state) => state.research);

  useEffect(() => {
    dispatch(fetchAttendanceRequests());
    dispatch(fetchResearch());
  }, [dispatch]);

  // Wait for BOTH to settle before computing anything, same as the
  // pre-Redux page's own Promise.all — each slice's own rejected handler
  // already degrades to an empty array, matching that Promise.all's
  // per-fetch .catch(() => []).
  const bothSettled = (attStatus === 'succeeded' || attStatus === 'failed') && (researchStatus === 'succeeded' || researchStatus === 'failed');
  if (!bothSettled) return null;

  const canGrant = (attReqs || []).filter((r) => r.admin_status === 'approved' && r.faculty_status !== 'granted').length;
  const pendBTP = (research || []).filter((p) => p.status === 'active' && (p.uploads || []).length > 0).length;
  const items = [];
  if (canGrant) items.push({ icon: '✅', text: `${canGrant} attendance request(s) to grant`, view: 'attendance' });
  if (pendBTP) items.push({ icon: '📤', text: `${pendBTP} BTP submission(s) to review`, view: 'research' });

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

/**
 * OUTCOMES_TRACKING_PLAN.md: replaces the old single-slider-per-course
 * syllabus % (and its inert, never-written `modules[]`) with real topics —
 * one list per course (shared across sections, since content doesn't vary
 * by section), each with its own completion % per section this faculty
 * teaches, and each taggable to the course's own Course Outcomes.
 */
function CourseOutcomesModal({ course, programOutcomes, onClose, onChanged }) {
  const dispatch = useAppDispatch();
  const { showToast } = useNotifications();
  const outcomes = useAppSelector((state) => (course ? state.learningOutcomes.byCourse[course.course_id] : undefined)) ?? null;
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [mappingTarget, setMappingTarget] = useState(null); // the CO currently being mapped to POs
  const [draftMapping, setDraftMapping] = useState([]); // [{po_id, strength}] while editing

  useEffect(() => {
    if (!course) return;
    dispatch(fetchLearningOutcomes(course.course_id));
  }, [dispatch, course]);

  const addOutcome = async (e) => {
    e.preventDefault();
    if (!code.trim() || !description.trim()) return showToast('Code and description are both required', 'warning');
    try {
      await dispatch(createLearningOutcome({ courseId: course.course_id, code: code.trim(), description: description.trim() })).unwrap();
      setCode('');
      setDescription('');
      onChanged();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    }
  };

  const removeOutcome = async (id) => {
    try {
      await dispatch(deleteLearningOutcome({ loId: id, courseId: course.course_id })).unwrap();
      onChanged();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };

  const openMapping = (lo) => {
    setMappingTarget(lo);
    setDraftMapping(lo.po_mapping || []);
  };

  const toggleMappedPo = (poId) => {
    setDraftMapping((m) =>
      m.some((x) => x.po_id === poId) ? m.filter((x) => x.po_id !== poId) : [...m, { po_id: poId, strength: 2 }],
    );
  };

  const setStrength = (poId, strength) => {
    setDraftMapping((m) => m.map((x) => (x.po_id === poId ? { ...x, strength } : x)));
  };

  const saveMapping = async () => {
    try {
      await dispatch(setLearningOutcomePoMapping({ loId: mappingTarget.lo_id, courseId: course.course_id, poMapping: draftMapping })).unwrap();
      showToast('PO mapping saved', 'success');
      setMappingTarget(null);
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };

  return (
    <Modal open={!!course} onClose={onClose} title={`Course Outcomes — ${course?.course_code || ''}`} maxWidth={520}>
      <div className="modal-body">
        {outcomes === null ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 12 }}>Loading...</div>
        ) : outcomes.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 13 }}>No Course Outcomes defined yet.</p>
        ) : (
          outcomes.map((lo) => (
            <div key={lo.lo_id} style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <strong style={{ fontSize: 13 }}>{lo.code}</strong>
                  <span style={{ fontSize: 13, marginLeft: 6 }}>{lo.description}</span>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {(lo.po_mapping || []).length === 0
                      ? 'Not mapped to any Program Outcome yet'
                      : lo.po_mapping.map((m) => `${programOutcomes.find((p) => p.po_id === m.po_id)?.code || '?'}(${m.strength})`).join(', ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openMapping(lo)} style={{ padding: '4px 8px', fontSize: 11, background: '#eef2ff', color: '#4338ca', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Map to POs</button>
                  <button onClick={() => removeOutcome(lo.lo_id)} style={{ padding: '4px 8px', fontSize: 11, background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
        <form onSubmit={addOutcome} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CO3" style={{ width: 70, padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what a student can do after this..." style={{ flex: 1, padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} />
          <button type="submit" style={{ padding: '8px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Add</button>
        </form>
      </div>

      {mappingTarget && (
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Mapping {mappingTarget.code} to Program Outcomes</div>
          {programOutcomes.map((po) => {
            const mapped = draftMapping.find((m) => m.po_id === po.po_id);
            return (
              <div key={po.po_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <input type="checkbox" checked={!!mapped} onChange={() => toggleMappedPo(po.po_id)} />
                <span style={{ fontSize: 12, flex: 1 }}>{po.code} — {po.description}</span>
                {mapped && (
                  <select value={mapped.strength} onChange={(e) => setStrength(po.po_id, Number(e.target.value))} style={{ fontSize: 12, padding: 2 }}>
                    <option value={1}>Strength 1</option>
                    <option value={2}>Strength 2</option>
                    <option value={3}>Strength 3</option>
                  </select>
                )}
              </div>
            );
          })}
          <button onClick={saveMapping} style={{ marginTop: 6, padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Save Mapping</button>
        </div>
      )}
    </Modal>
  );
}

function TopicRow({ topic, mySections, completionBySection, onProgressChange, onSave, onDelete }) {
  return (
    <div style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>{topic.title}</strong>
        <button onClick={() => onDelete(topic.topic_id)} style={{ padding: '2px 8px', fontSize: 11, background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Delete</button>
      </div>
      {mySections.map((sec) => {
        const val = completionBySection[sec]?.[topic.topic_id] ?? 0;
        return (
          <div key={sec} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, width: 56 }}>Sec {sec}:</span>
            <input type="range" min={0} max={100} value={val} onChange={(e) => onProgressChange(topic.topic_id, sec, e.target.value)} style={{ flex: 1 }} />
            <span style={{ fontSize: 12, fontWeight: 700, width: 36 }}>{val}%</span>
            <button onClick={() => onSave(topic.topic_id, sec)} style={{ padding: '3px 8px', fontSize: 10, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Save</button>
          </div>
        );
      })}
    </div>
  );
}

function CourseSyllabusPanel({ course, programOutcomes }) {
  const dispatch = useAppDispatch();
  const { showToast } = useNotifications();
  const topics = useAppSelector((state) => state.topics.byCourse[course.course_id]?.items) ?? null;
  const completionBySection = useAppSelector((state) => state.topicCompletions.byCourse[course.course_id]) ?? {};
  const [newTopic, setNewTopic] = useState('');
  const [outcomesOpen, setOutcomesOpen] = useState(false);

  const load = () => {
    dispatch(fetchTopics(course.course_id));
    dispatch(fetchTopicCompletionsForCourse({ courseId: course.course_id, sections: course.mySections }));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.course_id]);

  const addTopic = async (e) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    try {
      await dispatch(createTopic({ courseId: course.course_id, title: newTopic.trim() })).unwrap();
      setNewTopic('');
      load();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    }
  };

  const removeTopic = async (topicId) => {
    try {
      await dispatch(deleteTopic(topicId)).unwrap();
      load();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };

  const onProgressChange = (topicId, section, value) => {
    dispatch(previewSet({ courseId: course.course_id, section, topicId, progress: Number(value) }));
  };

  const onSave = async (topicId, section) => {
    const progress = completionBySection[section]?.[topicId] ?? 0;
    try {
      await dispatch(setTopicCompletion({ courseId: course.course_id, section, topicId, progress })).unwrap();
      showToast(`Topic updated: Section ${section} → ${progress}%`, 'success');
    } catch (e) {
      showToast('Failed to update topic: ' + e.message, 'error');
    }
  };

  return (
    <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{course.course_code} – {course.course_name}</div>
        <button onClick={() => setOutcomesOpen(true)} style={{ padding: '4px 10px', fontSize: 11, background: '#eef2ff', color: '#4338ca', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
          Manage Course Outcomes
        </button>
      </div>
      {topics === null ? (
        <div style={{ color: '#64748b', fontSize: 12 }}>Loading topics...</div>
      ) : topics.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: 12 }}>No topics yet — add your syllabus units below.</p>
      ) : (
        topics.map((t) => (
          <TopicRow
            key={t.topic_id}
            topic={t}
            mySections={course.mySections}
            completionBySection={completionBySection}
            onProgressChange={onProgressChange}
            onSave={onSave}
            onDelete={removeTopic}
          />
        ))
      )}
      <form onSubmit={addTopic} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="e.g. Module 6 – Hashing" style={{ flex: 1, padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }} />
        <button type="submit" style={{ padding: '8px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Add Topic</button>
      </form>
      <CourseOutcomesModal
        course={outcomesOpen ? course : null}
        programOutcomes={programOutcomes}
        onClose={() => setOutcomesOpen(false)}
        onChanged={load}
      />
    </div>
  );
}

function SyllabusManager() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const courses = useAppSelector((state) => state.courses.items);
  const coursesStatus = useAppSelector((state) => state.courses.status);
  const programOutcomes = useAppSelector((state) => state.programOutcomes.items);

  useEffect(() => {
    // /courses (not /faculty/me/courses) because it carries every
    // section's own faculty_id — /faculty/me/courses only ever attaches
    // one section per course, which breaks if this faculty teaches more
    // than one section of the same course.
    dispatch(fetchCourses());
    dispatch(fetchProgramOutcomes());
  }, [dispatch]);

  if (coursesStatus === 'idle' || coursesStatus === 'loading') return null;

  const myUserId = user?.user_id;
  const mine = coursesStatus === 'failed' ? [] : courses
    .map((c) => ({ ...c, mySections: (c.sections || []).filter((s) => s.faculty_id === myUserId).map((s) => s.section) }))
    .filter((c) => c.mySections.length > 0);

  return (
    <div style={{ marginTop: 20, padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>📊 Syllabus Topics & Course Outcomes</h3>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Track topic-wise completion per section, and define the Course Outcomes each topic and assessment contributes to.</div>
      {mine.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center' }}>No sections assigned to you yet.</p>
      ) : (
        mine.map((c) => <CourseSyllabusPanel key={c.course_id} course={c} programOutcomes={programOutcomes} />)
      )}
    </div>
  );
}
