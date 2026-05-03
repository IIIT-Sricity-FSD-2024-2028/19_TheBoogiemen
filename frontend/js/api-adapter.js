/**
 * api-adapter.js
 * Bridges the vanilla JS frontend with the NestJS backend.
 * Every method maps to a real NestJS REST endpoint.
 */

const API_BASE_URL = 'http://localhost:3001';

const ApiAdapter = {
  // ─── HELPERS ──────────────────────────────────────────────────────────────
  getHeaders() {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    return {
      'Content-Type': 'application/json',
      'x-user-role': user.role || 'student',
      'x-user-id': user.user_id || ''
    };
  },

  async _get(path, fallback = null) {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, { headers: this.getHeaders() });
      if (!res.ok) return fallback;
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    } catch (e) { console.error('GET', path, e); return fallback; }
  },

  async _post(path, body) {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    } catch (e) { console.error('POST', path, e); return null; }
  },

  async _put(path, body) {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    } catch (e) { console.error('PUT', path, e); return null; }
  },

  async _patch(path, body) {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'PATCH', headers: this.getHeaders(), body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    } catch (e) { console.error('PATCH', path, e); return null; }
  },

  async _delete(path) {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'DELETE', headers: this.getHeaders()
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    } catch (e) { console.error('DELETE', path, e); return null; }
  },

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  async login(email, password, role) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: err.message || 'Invalid credentials' };
      }
      return await res.json();
    } catch (e) { console.error('Login error:', e); return null; }
  },

  // ─── USERS ────────────────────────────────────────────────────────────────
  fetchUser:       (id)        => ApiAdapter._get(`/users/${id}`),
  fetchAllUsers:   ()          => ApiAdapter._get('/users', []),
  updateUser:      (id, body)  => ApiAdapter._put(`/users/${id}`, body),
  deleteUser:      (id)        => ApiAdapter._delete(`/users/${id}`),
  updateUserRole:  (id, role)  => ApiAdapter._patch(`/users/${id}/role`, { role }),
  createUser:      (body)      => ApiAdapter._post('/users', body),

  // ─── ASSESSMENTS ──────────────────────────────────────────────────────────
  fetchAssessments:     ()             => ApiAdapter._get('/assessments', []),
  fetchAssessment:      (id)           => ApiAdapter._get(`/assessments/${id}`),
  createAssessment:     (body)         => ApiAdapter._post('/assessments', body),
  updateAssessment:     (id, body)     => ApiAdapter._put(`/assessments/${id}`, body),
  deleteAssessment:     (id)           => ApiAdapter._delete(`/assessments/${id}`),
  gradeAssessment:      (body)         => ApiAdapter._patch('/assessments/grade', body),
  submitAssessment:     (id, body)     => ApiAdapter._patch(`/assessments/${id}`, body),
  updateSyllabus:       (body)         => ApiAdapter._patch('/courses/syllabus', body),

  // ─── ATTENDANCE ───────────────────────────────────────────────────────────
  fetchAttendance:            ()        => ApiAdapter._get('/attendance', []),
  fetchAttendanceById:        (id)      => ApiAdapter._get(`/attendance/${id}`),
  fetchStudentAttendance:     (sid)     => ApiAdapter._get(`/attendance/student/${sid}/subject-wise`, []),
  createAttendance:           (body)    => ApiAdapter._post('/attendance', body),
  updateAttendance:           (id, b)   => ApiAdapter._put(`/attendance/${id}`, b),
  patchAttendance:            (id, b)   => ApiAdapter._patch(`/attendance/${id}`, b),
  deleteAttendance:           (id)      => ApiAdapter._delete(`/attendance/${id}`),

  // ─── LEAVES ───────────────────────────────────────────────────────────────
  fetchLeaves:       ()         => ApiAdapter._get('/leaves', []),
  fetchLeave:        (id)       => ApiAdapter._get(`/leaves/${id}`),
  applyLeave:        (body)     => ApiAdapter._post('/leaves', body),
  approveLeave:      (id, body) => ApiAdapter._patch(`/leaves/${id}/approve`, body),
  updateLeave:       (id, body) => ApiAdapter._put(`/leaves/${id}`, body),
  deleteLeave:       (id)       => ApiAdapter._delete(`/leaves/${id}`),
  async fetchStudentLeaves(studentId) {
    const leaves = await this.fetchLeaves();
    return (leaves || []).filter(l => l.student_id === studentId);
  },

  // ─── FORUM ────────────────────────────────────────────────────────────────
  fetchForumPosts:      ()             => ApiAdapter._get('/forum', []),
  fetchForumPost:       (id)           => ApiAdapter._get(`/forum/${id}`),
  fetchFacultyForum:    (facultyId)    => ApiAdapter._get(`/forum/domain/${facultyId}`, []),
  createForumPost:      (body)         => ApiAdapter._post('/forum', body),
  replyToPost:          (postId, body) => ApiAdapter._post(`/forum/${postId}/reply`, body),
  updateForumPost:      (id, body)     => ApiAdapter._put(`/forum/${id}`, body),
  patchForumPost:       (id, body)     => ApiAdapter._patch(`/forum/${id}`, body),
  deleteForumPost:      (id)           => ApiAdapter._delete(`/forum/${id}`),
  deleteForumReply:     (postId, rId)  => ApiAdapter._delete(`/forum/${postId}/reply/${rId}`),

  // ─── RESEARCH ─────────────────────────────────────────────────────────────
  fetchResearchProjects: ()           => ApiAdapter._get('/research', []),
  fetchResearchProject:  (id)         => ApiAdapter._get(`/research/${id}`),
  updateResearchProject: (id, body)   => ApiAdapter._put(`/research/${id}`, body),
  patchResearchProject:  (id, body)   => ApiAdapter._patch(`/research/${id}`, body),
  deleteResearchProject: (id)         => ApiAdapter._delete(`/research/${id}`),
  uploadMilestone:       (body)       => ApiAdapter._post('/research/milestones', body),
  reviewMilestone:       (id, body)   => ApiAdapter._patch(`/research/milestones/${id}/review`, body),
  deleteMilestone:       (id)         => ApiAdapter._delete(`/research/milestones/${id}`),

  // ─── RESOURCES / EVENTS ───────────────────────────────────────────────────
  fetchResources:      ()          => ApiAdapter._get('/resources', []),
  fetchResource:       (id)        => ApiAdapter._get(`/resources/${id}`),
  createResource:      (body)      => ApiAdapter._post('/resources', body),
  updateResource:      (id, body)  => ApiAdapter._put(`/resources/${id}`, body),
  patchResource:       (id, body)  => ApiAdapter._patch(`/resources/${id}`, body),
  deleteResource:      (id)        => ApiAdapter._delete(`/resources/${id}`),
  fetchEvents:         ()          => ApiAdapter._get('/resources/events/all', []),
  fetchEvent:          (id)        => ApiAdapter._get(`/resources/events/${id}`),
  scheduleEvent:       (body)      => ApiAdapter._post('/resources/events', body),
  updateEvent:         (id, body)  => ApiAdapter._put(`/resources/events/${id}`, body),
  deleteEvent:         (id)        => ApiAdapter._delete(`/resources/events/${id}`),

  // ─── FEES ─────────────────────────────────────────────────────────────────
  fetchFeePayments:     ()          => ApiAdapter._get('/fees/payments', []),
  fetchFeePayment:      (id)        => ApiAdapter._get(`/fees/payments/${id}`),
  createFeePayment:     (body)      => ApiAdapter._post('/fees/payments', body),
  updateFeePayment:     (id, body)  => ApiAdapter._put(`/fees/payments/${id}`, body),
  patchFeePayment:      (id, body)  => ApiAdapter._patch(`/fees/payments/${id}`, body),
  deleteFeePayment:     (id)        => ApiAdapter._delete(`/fees/payments/${id}`),
  createFeeAudit:       (body)      => ApiAdapter._post('/fees/audit', body),

  // ─── REPORTS ──────────────────────────────────────────────────────────────
  fetchReports:         ()          => ApiAdapter._get('/reports', []),
  fetchReport:          (id)        => ApiAdapter._get(`/reports/${id}`),
  createReport:         (body)      => ApiAdapter._post('/reports', body),
  updateReport:         (id, body)  => ApiAdapter._put(`/reports/${id}`, body),
  patchReport:          (id, body)  => ApiAdapter._patch(`/reports/${id}`, body),
  deleteReport:         (id)        => ApiAdapter._delete(`/reports/${id}`),
  generateProgressReport:(body)     => ApiAdapter._post('/reports/progress', body),

  // ─── OUTCOMES ─────────────────────────────────────────────────────────────
  fetchOutcomes:          ()        => ApiAdapter._get('/outcomes', []),
  fetchStudentOutcomes:   (sid)     => ApiAdapter._get(`/outcomes/student/${sid}`, []),
  mapOutcome:             (body)    => ApiAdapter._post('/outcomes/map', body),
  createOutcome:          (body)    => ApiAdapter._post('/outcomes', body),
  updateOutcome:          (id, b)   => ApiAdapter._put(`/outcomes/${id}`, b),
  deleteOutcome:          (id)      => ApiAdapter._delete(`/outcomes/${id}`)
};

window.ApiAdapter = ApiAdapter;
