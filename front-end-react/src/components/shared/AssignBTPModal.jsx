/**
 * AssignBTPModal — create a new research/BTP project and assign it to a
 * student in one step (POST /research via createResearch; supervisor is
 * resolved server-side from the logged-in faculty member, never sent here).
 *
 * Originally built inside StudentOverview.jsx's own
 * openAssignBTPModal()/submitAssignBTP() (faculty.html's student-overview-
 * view). Promoted out to this shared location once ResearchPanel.jsx's own
 * faculty "Research Project" tab needed the exact same flow — same design
 * principle this codebase already follows elsewhere: a component moves out
 * to shared only once a second real consumer actually needs it, not before.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '../../features/auth/useAuth';
import { useNotifications } from '../../features/notifications/useNotifications';
import Modal from './Modal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAllUsers } from '../../features/users/usersThunks';
import { fetchFacultyStudents } from '../../features/facultyStudents/facultyStudentsThunks';
import { createResearch } from '../../features/research/researchThunks';

function useSettled(...statuses) {
  return statuses.every((s) => s === 'succeeded' || s === 'failed');
}

export default function AssignBTPModal({ open, onClose, onAssigned }) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const allUsers = useAppSelector((state) => state.users.items);
  const usersStatus = useAppSelector((state) => state.users.status);
  const facultyStudents = useAppSelector((state) => state.facultyStudents.items);
  const facultyStudentsStatus = useAppSelector((state) => state.facultyStudents.status);
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStudentId('');
    setTitle('');
    setAbstract('');
    dispatch(fetchAllUsers());
    dispatch(fetchFacultyStudents());
  }, [open, dispatch]);

  const settled = useSettled(usersStatus, facultyStudentsStatus);
  const students = !settled
    ? null
    : (() => {
        const profileMap = {};
        (facultyStudents || []).forEach((p) => {
          profileMap[p.user_id] = p;
        });
        return (allUsers || [])
          .filter((u) => u.role === 'student')
          .map((s) => {
            const p = profileMap[s.user_id] || {};
            return { id: s.user_id, name: `${p.first_name || s.first_name || s.username || ''} ${p.last_name || s.last_name || ''}`.trim() };
          });
      })();

  const submit = async (e) => {
    e.preventDefault();
    if (!studentId) return showToast('Please select a student to assign this BTP project', 'warning');
    if (!title.trim() || title.trim().length < 3) return showToast('Project title must be at least 3 characters', 'warning');

    setSubmitting(true);
    try {
      await dispatch(createResearch({ student_id: studentId, title: title.trim(), abstract: abstract.trim(), status: 'active', progress: 0 })).unwrap();
      const from = user?.first_name || 'Faculty';
      send(studentId, from, `📚 BTP Project Assigned: "${title.trim()}". Open your Research Projects section to view details and submit your work.`, 'info');
      showToast('BTP Project assigned to student! Student has been notified. ✅', 'success');
      onClose();
      onAssigned();
    } catch (e2) {
      showToast('Failed to assign BTP: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="📚 Assign BTP Project to Student">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>Select Student <span style={{ color: '#ef4444' }}>*</span></label>
            <select required value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">{students === null ? 'Loading…' : '— Select Student —'}</option>
              {students?.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Project Title <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., AI-Based Attendance System" />
          </div>
          <div className="form-group">
            <label>Abstract / Description</label>
            <textarea rows={3} value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="Brief description of the project…" />
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Assigning…' : 'Assign Project'}
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
