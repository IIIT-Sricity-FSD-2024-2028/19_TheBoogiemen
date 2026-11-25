import { useEffect, useState, useCallback } from 'react';
import { useNotifications } from '../../features/notifications/useNotifications';
import Modal from '../../components/shared/Modal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCourses } from '../../features/courses/coursesThunks';
import { fetchAllUsers } from '../../features/users/usersThunks';
import { fetchResources } from '../../features/resources/resourcesThunks';
import {
  fetchTimetable as fetchTimetableData,
  validateTimetable,
  saveTimetableSlot,
  deleteTimetableSlot,
  publishTimetable,
  generateTimetable,
} from '../../features/timetableManagement/timetableManagementThunks';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
const TYPES = ['lecture', 'lab', 'tutorial'];

export default function TimetableManagement() {
  const dispatch = useAppDispatch();
  const { showToast } = useNotifications();

  // Filters & State — deliberately no page-wide "Section" filter: a
  // course's sections are its own concern (course_sections), and different
  // branches' courses don't share one global "Section A/B/C". The grid
  // shows every section at once, scoped only by Semester; which section a
  // given class session is for is picked per-slot in the Add/Edit modal.
  const [branch, setBranch] = useState('CS');
  const [semester, setSemester] = useState('3');
  const [academicYear, setAcademicYear] = useState('2024-2025');

  // Loaded Data
  const timetableData = useAppSelector((state) => state.timetableManagement.data);
  const validationReport = useAppSelector((state) => state.timetableManagement.validationReport);
  const courses = useAppSelector((state) => state.courses.items);
  const allUsers = useAppSelector((state) => state.users.items);
  const facultyList = allUsers.filter((u) => u.role === 'faculty');
  const resources = useAppSelector((state) => state.resources.items) || [];
  const [loading, setLoading] = useState(false);

  // Slot Edit / Create Modal State
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalDay, setModalDay] = useState('MON');
  const [modalTime, setModalTime] = useState('09:00');
  const [modalCourseId, setModalCourseId] = useState('');
  const [modalSection, setModalSection] = useState('');
  const [modalRoom, setModalRoom] = useState('');
  const [modalType, setModalType] = useState('lecture');
  const [modalFacultyId, setModalFacultyId] = useState('');
  const [modalStatus, setModalStatus] = useState('draft');
  const [submittingSlot, setSubmittingSlot] = useState(false);

  // Bulk Generation Modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [clearDraftsOnGen, setClearDraftsOnGen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load Timetable & Validation
  const fetchTimetable = useCallback(async () => {
    setLoading(true);
    try {
      await dispatch(fetchTimetableData({ semester: Number(semester) })).unwrap();
      await dispatch(validateTimetable({ semester: Number(semester) })).unwrap();
    } catch (err) {
      showToast('Failed to load timetable: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [semester, showToast, dispatch]);

  // Initial metadata loading
  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchAllUsers());
    dispatch(fetchResources());
  }, [dispatch]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  // A course's own section/faculty assignments (course_sections), already
  // folded into each course by GET /courses — this is what lets the Add/Edit
  // modal offer "which section of THIS course" rather than assuming one
  // page-wide section applies to every course.
  const sectionsForCourse = (courseId) => courses.find((c) => c.course_id === courseId)?.sections || [];

  // Picking a course resets Section/Faculty to that course's own first
  // assigned section, rather than leaving a stale selection from whatever
  // course was previously chosen.
  const applyCourseDefaults = (courseId) => {
    const secs = sectionsForCourse(courseId);
    setModalSection(secs[0]?.section || '');
    setModalFacultyId(secs[0]?.faculty_id || '');
  };

  // Open modal for new slot at a specific day/time
  const openNewSlotModal = (day, time) => {
    setSelectedSlot(null);
    setModalDay(day);
    setModalTime(time);
    const firstCourseId = courses[0]?.course_id || '';
    setModalCourseId(firstCourseId);
    applyCourseDefaults(firstCourseId);
    setModalRoom(resources.find((r) => r.type !== 'Lab')?.name || '');
    setModalType('lecture');
    setModalStatus('draft');
    setSlotModalOpen(true);
  };

  // Open modal for editing existing slot
  const openEditSlotModal = (slot) => {
    setSelectedSlot(slot);
    setModalDay(slot.day);
    setModalTime(slot.time);
    setModalCourseId(slot.course_id);
    setModalSection(slot.section || '');
    setModalRoom(slot.room || '');
    setModalType(slot.type || 'lecture');
    setModalFacultyId(slot.faculty_id || '');
    setModalStatus(slot.status || 'draft');
    setSlotModalOpen(true);
  };

  // Save Slot Handler
  const handleSaveSlot = async (e, force = false) => {
    if (e) e.preventDefault();
    if (!modalCourseId) return showToast('Please select a course', 'warning');
    if (!modalSection) return showToast('Please select which section this class is for', 'warning');

    setSubmittingSlot(true);
    try {
      const payload = {
        slot_id: selectedSlot?.slot_id,
        day: modalDay,
        time: modalTime,
        course_id: modalCourseId,
        section: modalSection,
        room: modalRoom,
        type: modalType,
        faculty_id: modalFacultyId || undefined,
        status: modalStatus,
        semester: Number(semester),
        branch,
        force,
      };

      const res = await dispatch(saveTimetableSlot(payload)).unwrap();

      if (!res.success && res.hasConflicts) {
        const confirmForce = window.confirm(
          `Scheduling Conflict Detected:\n\n${res.message}\n\nDo you want to override and save anyway?`,
        );
        if (confirmForce) {
          // Awaited, not just returned — otherwise this function's own
          // `finally` below flips submittingSlot back to false immediately,
          // before the forced retry's request has actually resolved,
          // letting a second click fire mid-flight.
          return await handleSaveSlot(null, true);
        } else {
          setSubmittingSlot(false);
          return;
        }
      }

      showToast(res.message || 'Slot saved successfully! ✅', 'success');
      setSlotModalOpen(false);
      fetchTimetable();
    } catch (err) {
      showToast('Error saving slot: ' + err.message, 'error');
    } finally {
      setSubmittingSlot(false);
    }
  };

  // Delete Slot Handler
  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this class session?')) return;
    try {
      await dispatch(deleteTimetableSlot(slotId)).unwrap();
      showToast('Class session removed. 🗑️', 'info');
      setSlotModalOpen(false);
      fetchTimetable();
    } catch (err) {
      showToast('Failed to delete slot: ' + err.message, 'error');
    }
  };

  // Publish Timetable
  const handlePublish = async (force = false) => {
    if (!force && validationReport?.conflicts?.length > 0) {
      const confirmForce = window.confirm(
        `There are ${validationReport.conflicts.length} active conflict(s) in this timetable. Are you sure you want to publish anyway?`,
      );
      if (!confirmForce) return;
      force = true;
    }

    try {
      const res = await dispatch(publishTimetable({ semester: Number(semester), force })).unwrap();
      showToast(res.message || 'Timetable published! Students & faculty can now view it. 🚀', 'success');
      fetchTimetable();
    } catch (err) {
      showToast('Failed to publish: ' + err.message, 'error');
    }
  };

  // Automated Draft Generation
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await dispatch(generateTimetable({
        semester: Number(semester),
        academic_year: academicYear,
        branch,
        clearExistingDrafts: clearDraftsOnGen,
      })).unwrap();

      if (res.success) {
        showToast(res.message || 'Draft sessions generated! 📅', 'success');
        setGenerateModalOpen(false);
        fetchTimetable();
      } else {
        showToast(res.message || 'Generation skipped', 'warning');
      }
    } catch (err) {
      showToast('Generation failed: ' + err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const grid = timetableData?.grid || {};
  const allSlots = timetableData?.slots || [];
  const publishedCount = allSlots.filter((s) => s.status === 'published' || s.status === undefined).length;
  const draftCount = allSlots.filter((s) => s.status === 'draft').length;
  const isNewSlot = selectedSlot === null;
  const modalCourseSections = sectionsForCourse(modalCourseId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Academic Timetable Management
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Configure weekly course hour requirements, allocate classrooms, detect conflicts, and publish schedules across every section.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '8px 16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setGenerateModalOpen(true)}
          >
            <span>⚡</span> Auto-Generate Draft
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontWeight: 600, background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px' }}
            onClick={() => handlePublish(false)}
          >
            <span>📢</span> Publish Timetable
          </button>
        </div>
      </div>

      {/* Cohort & Filter Controls */}
      <div style={{ display: 'flex', gap: '12px', background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Semester</label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '100px' }}
          >
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
            <option value="5">Semester 5</option>
            <option value="6">Semester 6</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Branch</label>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '90px' }}
          >
            <option value="CS">CS</option>
            <option value="ECE">ECE</option>
            <option value="AI">AI</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Academic Year</label>
          <input
            type="text"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '120px' }}
          />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Status: </span>
            <strong style={{ color: draftCount > 0 ? '#b45309' : '#15803d' }}>
              {draftCount > 0 ? `${draftCount} Drafts Pending` : 'All Published'}
            </strong>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Total: {allSlots.length} sessions ({publishedCount} published)
            </div>
          </div>
        </div>
      </div>

      {/* Conflict & Hour Requirements Warning Alerts */}
      {validationReport?.conflicts && validationReport.conflicts.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <h4 style={{ margin: 0, color: '#991b1b', fontWeight: 700 }}>
              {validationReport.conflicts.length} Scheduling Conflict(s) Detected:
            </h4>
          </div>
          <ul style={{ margin: '4px 0 0 20px', color: '#b91c1c', fontSize: '0.875rem' }}>
            {validationReport.conflicts.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '2px' }}>
                {item.conflicts?.map((c) => c.message).join('; ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weekly Hours Coverage Matrix */}
      {validationReport?.hourReports && validationReport.hourReports.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
            Weekly Course Contact Hour Coverage (Semester {semester})
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {validationReport.hourReports.map((hr) => (
              <div
                key={`${hr.course_id}-${hr.section}`}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${hr.isComplete ? '#bbf7d0' : '#fed7aa'}`,
                  background: hr.isComplete ? '#f0fdf4' : '#fffbeb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                    {hr.course_code} <span style={{ fontWeight: 600, color: '#64748b' }}>· Sec {hr.section}</span>
                  </strong>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: hr.isComplete ? '#15803d' : '#c2410c' }}>
                    {hr.scheduledHours}/{hr.expectedContactHours} hrs
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  L: {hr.lectureHours} • Lab: {hr.labHours} • Tut: {hr.tutorialHours}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Master Timetable Grid */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '750px' }}>
          <thead>
            <tr>
              <th style={{ width: '85px', padding: '10px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.8rem', textAlign: 'center' }}>
                TIME
              </th>
              {DAYS.map((d) => (
                <th key={d} style={{ padding: '10px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', textAlign: 'center' }}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIMES.map((t) => (
              <tr key={t}>
                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: 700, fontSize: '0.8rem', color: '#475569', textAlign: 'center' }}>
                  {t}
                </td>
                {DAYS.map((d) => {
                  const cell = grid[d]?.[t];
                  const slots = Array.isArray(cell) ? cell : cell ? [cell] : [];

                  return (
                    <td
                      key={d}
                      style={{
                        padding: '6px',
                        borderBottom: '1px solid #f1f5f9',
                        borderRight: '1px solid #f8fafc',
                        verticalAlign: 'top',
                        minHeight: '75px',
                        width: '18%',
                      }}
                    >
                      {slots.length === 0 ? (
                        <div
                          onClick={() => openNewSlotModal(d, t)}
                          style={{
                            height: '65px',
                            borderRadius: '6px',
                            border: '1px dashed #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            fontSize: '0.8rem',
                          }}
                          title="Click to schedule class session"
                        >
                          + Add
                        </div>
                      ) : (
                        <>
                          {slots.map((s) => {
                            const isDraft = s.status === 'draft';
                            return (
                              <div
                                key={s.slot_id}
                                onClick={() => openEditSlotModal(s)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  background: isDraft ? '#fffbeb' : s.type === 'lab' ? '#fef3c7' : '#eff6ff',
                                  border: `1px solid ${isDraft ? '#fcd34d' : s.type === 'lab' ? '#f59e0b' : '#3b82f6'}`,
                                  borderLeft: `4px solid ${isDraft ? '#f59e0b' : s.type === 'lab' ? '#d97706' : '#2563eb'}`,
                                  cursor: 'pointer',
                                  marginBottom: '4px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{s.course_code || s.course_id}</strong>
                                  {isDraft && (
                                    <span style={{ fontSize: '0.65rem', background: '#f59e0b', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>
                                      DRAFT
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {s.course_name} <span style={{ color: '#94a3b8' }}>· Sec {s.section}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                                  <span>📍 {s.room}</span>
                                  <span>{s.type}</span>
                                </div>
                                {s.faculty_name && (
                                  <div style={{ fontSize: '0.7rem', color: '#2563eb', marginTop: '2px' }}>
                                    👤 {s.faculty_name}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <div
                            onClick={() => openNewSlotModal(d, t)}
                            title="Click to schedule another class session at this same day/time (e.g. a different section)"
                            style={{
                              fontSize: '0.7rem',
                              color: '#94a3b8',
                              textAlign: 'center',
                              padding: '2px',
                              cursor: 'pointer',
                            }}
                          >
                            + Add another
                          </div>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Slot Modal */}
      <Modal
        open={slotModalOpen}
        onClose={() => setSlotModalOpen(false)}
        title={selectedSlot ? 'Edit Class Session Slot' : 'Schedule New Class Session'}
        maxWidth="540px"
      >
        <form onSubmit={handleSaveSlot} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, minHeight: 0, padding: '1.25rem 1.5rem' }}>
            {isNewSlot ? (
              // Day/Time came from the exact grid cell that was clicked —
              // no point offering a dropdown to change what's already
              // obvious from where "+ Add" was clicked.
              <div
                style={{
                  padding: '10px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  color: '#334155',
                }}
              >
                Scheduling for <strong>{modalDay}, {modalTime}</strong>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Day of Week</label>
                  <select value={modalDay} onChange={(e) => setModalDay(e.target.value)} className="form-control">
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Time Slot</label>
                  <select value={modalTime} onChange={(e) => setModalTime(e.target.value)} className="form-control">
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Course <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                value={modalCourseId}
                onChange={(e) => {
                  setModalCourseId(e.target.value);
                  applyCourseDefaults(e.target.value);
                }}
                className="form-control"
                required
              >
                <option value="">— Select Course —</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_code}: {c.course_name} ({c.credits || 4} credits)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600 }}>
                Section <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={modalSection}
                onChange={(e) => {
                  setModalSection(e.target.value);
                  const cs = modalCourseSections.find((s) => s.section === e.target.value);
                  if (cs) setModalFacultyId(cs.faculty_id || '');
                }}
                className="form-control"
                required
                disabled={modalCourseSections.length === 0}
              >
                {modalCourseSections.length === 0 ? (
                  <option value="">No sections assigned to this course yet — add one in Course Management</option>
                ) : (
                  modalCourseSections.map((s) => (
                    <option key={s.section} value={s.section}>
                      Section {s.section} — {s.faculty_name || s.faculty_id}
                    </option>
                  ))
                )}
              </select>
              {/* A course's sections (and which faculty teaches each one) are
                  owned by Course Management's "Manage Sections", not picked
                  freely here — this only lets you choose which of a course's
                  already-assigned sections this particular class is for. */}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Room / Laboratory</label>
                <select value={modalRoom} onChange={(e) => setModalRoom(e.target.value)} className="form-control">
                  <option value="">— Unassigned (TBA) —</option>
                  {resources.map((r) => (
                    <option key={r.resource_id} value={r.name}>{r.name} ({r.type})</option>
                  ))}
                </select>
                {/* Room/type/capacity conflict checks (back-end validateSlotConflicts)
                    only ever fire when the chosen name matches a real resources[]
                    record — these used to be 6 hardcoded placeholder names ("Room
                    101", "Lab 1", ...) that matched no real resource at all, so
                    picking one silently skipped every one of those checks. */}
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Session Type</label>
                <select value={modalType} onChange={(e) => setModalType(e.target.value)} className="form-control">
                  <option value="lecture">📖 Lecture</option>
                  <option value="lab">🔬 Laboratory / Practical</option>
                  <option value="tutorial">✏️ Tutorial</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Faculty Instructor</label>
                <select value={modalFacultyId} onChange={(e) => setModalFacultyId(e.target.value)} className="form-control">
                  <option value="">(Auto-assign from course section)</option>
                  {facultyList.map((f) => (
                    <option key={f.user_id} value={f.user_id}>
                      {`${f.first_name || ''} ${f.last_name || ''}`.trim() || f.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Publication Status</label>
                <select value={modalStatus} onChange={(e) => setModalStatus(e.target.value)} className="form-control">
                  <option value="draft">Draft (Admin only)</option>
                  <option value="published">Published (Visible to students/faculty)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0' }}>
            {selectedSlot ? (
              <button
                type="button"
                className="btn btn-outline"
                style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                onClick={() => handleDeleteSlot(selectedSlot.slot_id)}
              >
                Delete Slot
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setSlotModalOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 600 }}
                disabled={submittingSlot}
              >
                {submittingSlot ? 'Saving…' : 'Save Slot'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Auto-Generate Timetable Modal */}
      <Modal
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="⚡ Auto-Generate Semester Timetable Draft"
        maxWidth="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 1.5rem' }}>
          <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0 }}>
            This will calculate required contact hours for every section of every course in <strong>Semester {semester}</strong> and automatically place class sessions into non-conflicting room, time, and faculty slots.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <input
              type="checkbox"
              id="clearDrafts"
              checked={clearDraftsOnGen}
              onChange={(e) => setClearDraftsOnGen(e.target.checked)}
            />
            <label htmlFor="clearDrafts" style={{ fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
              Clear previous draft slots before generating
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setGenerateModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 600 }}
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? 'Generating…' : 'Generate Draft'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
