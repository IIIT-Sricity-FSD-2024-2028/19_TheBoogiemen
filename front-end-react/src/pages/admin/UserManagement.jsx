import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../features/auth/useAuth';
import { useNotifications } from '../../features/notifications/useNotifications';
import { downloadCsv } from '../../utils/csv';
import Modal from '../../components/shared/Modal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCourses } from '../../features/courses/coursesThunks';
import { fetchAcademicMetrics } from '../../features/academicMetrics/academicMetricsThunks';
import {
  fetchAllUsers,
  createUser,
  updateUserProfile,
  updateUserRole,
  deleteUser,
  bulkOnboardUsers,
} from '../../features/users/usersThunks';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Stat({ label, value, color }) {
return (
<div>
<div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
<div style={{ fontSize: 28, fontWeight: 800, color: color || '#0f172a' }}>{value}</div>
</div>
);
}

/**
 * Head/admin's "complete metrics" view — faculty and student counts, real
 * breakdowns (branch, semester, course, designation), and faculty
 * workload, filterable by course or semester. A student has no semester
 * field of its own (GET /metrics/academic derives it from enrollment ->
 * course.semester), so the semester dropdown's options come from the
 * courses that actually have one, not a hardcoded 1-8 list.
 *
 * Redux migration (Dev 5): courses dropdown reuses Dev 3's coursesSlice;
 * the filtered metrics view is academicMetricsSlice (its own
 * requestId stale-guard, same shape as attendanceRegisterSlice).
 */
function AcademicMetrics() {
const dispatch = useAppDispatch();
const courses = useAppSelector((state) => state.courses.items);
const metrics = useAppSelector((state) => state.academicMetrics.data);
const [courseId, setCourseId] = useState('');
const [semester, setSemester] = useState('');

useEffect(() => {
dispatch(fetchCourses());
}, [dispatch]);

useEffect(() => {
dispatch(fetchAcademicMetrics({ courseId, semester }));
}, [dispatch, courseId, semester]);

if (metrics === null) return null;

return (
<div className="stats-card" style={{ marginBottom: 20 }}>
<div className="stats-card-header">
<div>
<h3>Academic Metrics</h3>
<p>Faculty and student counts, filterable by course or semester — a student's "semester" comes from what they're enrolled in.</p>
</div>
</div>
<div className="stats-card-body" style={{ padding: 24 }}>
<div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
<div>
<label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Course</label>
<select value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, minWidth: 220 }}>
<option value="">All Courses</option>
{courses?.map((c) => (
<option key={c.course_id} value={c.course_id}>{c.course_code} - {c.course_name}</option>
))}
</select>
</div>
<div>
<label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Semester</label>
<select value={semester} onChange={(e) => setSemester(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, minWidth: 140 }}>
<option value="">All Semesters</option>
{(metrics?.available_semesters || []).map((s) => (
<option key={s} value={s}>Semester {s}</option>
))}
</select>
</div>
</div>

{!metrics ? (
<div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Loading...</div>
) : (
<>
<div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 28, padding: 16, background: '#f8fafc', borderRadius: 10 }}>
<Stat label="Students" value={metrics.students.total} color="#6366f1" />
<Stat label="Faculty" value={metrics.faculty.total} color="#2563eb" />
<Stat label="Avg CGPA" value={metrics.students.avg_cgpa ?? '—'} />
<Stat label="Avg Attendance" value={metrics.students.avg_attendance_pct !== null ? `${metrics.students.avg_attendance_pct}%` : '—'} />
</div>

<div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
{metrics.students.by_branch.map((b) => (
<span key={b.branch} style={{ fontSize: 12, padding: '6px 12px', background: '#eef2ff', color: '#4338ca', borderRadius: 999, fontWeight: 600 }}>{b.branch}: {b.count}</span>
))}
{metrics.faculty.by_designation.map((d) => (
<span key={d.designation} style={{ fontSize: 12, padding: '6px 12px', background: '#f0fdf4', color: '#15803d', borderRadius: 999, fontWeight: 600 }}>{d.designation}: {d.count}</span>
))}
</div>

{metrics.students.by_semester.length > 0 && (
<>
<h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#475569' }}>STUDENTS BY SEMESTER</h4>
<ResponsiveContainer width="100%" height={Math.max(100, metrics.students.by_semester.length * 36)}>
<BarChart data={metrics.students.by_semester.map((s) => ({ name: `Sem ${s.semester ?? '—'}`, count: s.count }))} layout="vertical" margin={{ left: 8, right: 24 }}>
<XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
<YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: '#475569' }} axisLine={false} tickLine={false} width={70} />
<Tooltip formatter={(v) => [`${v} student${v === 1 ? '' : 's'}`, 'Count']} cursor={{ fill: '#f8fafc' }} />
<Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={22} />
</BarChart>
</ResponsiveContainer>
</>
)}

{metrics.students.by_course.length > 0 && (
<>
<h4 style={{ fontSize: 13, fontWeight: 700, margin: '28px 0 12px', color: '#475569' }}>STUDENTS BY COURSE</h4>
<ResponsiveContainer width="100%" height={Math.max(100, metrics.students.by_course.length * 36)}>
<BarChart data={metrics.students.by_course.map((c) => ({ name: c.course_code, count: c.enrolled_count }))} layout="vertical" margin={{ left: 8, right: 24 }}>
<XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
<YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: '#475569' }} axisLine={false} tickLine={false} width={70} />
<Tooltip formatter={(v) => [`${v} student${v === 1 ? '' : 's'}`, 'Enrolled']} cursor={{ fill: '#f8fafc' }} />
<Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={22} />
</BarChart>
</ResponsiveContainer>
</>
)}

<h4 style={{ fontSize: 13, fontWeight: 700, margin: '28px 0 12px', color: '#475569' }}>FACULTY WORKLOAD</h4>
{metrics.faculty.workload.length === 0 ? (
<p style={{ color: '#94a3b8', fontSize: 13 }}>No faculty match this filter.</p>
) : (
<table className="crud-table">
<thead><tr><th>Faculty</th><th>Designation</th><th style={{ textAlign: 'right' }}>Sections</th><th style={{ textAlign: 'right' }}>Courses</th></tr></thead>
<tbody>
{metrics.faculty.workload.map((f) => (
<tr key={f.faculty_id}>
<td>{f.name}</td>
<td style={{ color: '#64748b' }}>{f.designation || '—'}</td>
<td style={{ textAlign: 'right', fontWeight: 600 }}>{f.sections_taught}</td>
<td style={{ textAlign: 'right', fontWeight: 600 }}>{f.courses_taught}</td>
</tr>
))}
</tbody>
</table>
)}
</>
)}
</div>
</div>
);
}

function AddUserModal({ open, onClose, onCreated }) {
const dispatch = useAppDispatch();
const { showToast, send } = useNotifications();
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [role, setRole] = useState('');
const [submitting, setSubmitting] = useState(false);

useEffect(() => {
if (!open) return;
setFirstName('');
setLastName('');
setEmail('');
setPassword('');
setRole('');
}, [open]);

const submit = async (e) => {
e.preventDefault();
if (!firstName.trim()) return showToast('First name is required', 'warning');
if (!EMAIL_RE.test(email.trim())) return showToast('Enter a valid email address', 'warning');
if (!password || password.length < 8) return showToast('Password must be at least 8 characters', 'warning');
if (!role) return showToast('Please select a role', 'warning');
setSubmitting(true);
try {
await dispatch(createUser({
  first_name: firstName.trim(),
  last_name: lastName.trim() || undefined,
  email: email.trim(),
  password,
  role,
})).unwrap();
showToast('User created! They can now log in.', 'success');
onClose();
onCreated();
// Welcome notification, sent once we can look up the new user's id.
setTimeout(async () => {
try {
const action = await dispatch(fetchAllUsers());
const nu = (action.payload || []).find((u) => u.email === email.trim());
if (nu) send(nu.user_id, 'Admin', `Welcome to BarelyPassing! Your account (${role}) is ready.`, 'info');
} catch {
// Best-effort the account is already created either way.
}
}, 500);
} catch (e2) {
showToast('Failed: ' + e2.message, 'error');
} finally {
setSubmitting(false);
}
};

return (
<Modal open={open} onClose={onClose} title="Add New User">
<form onSubmit={submit}>
<div className="modal-body">
<div className="form-row">
<div className="form-group">
<label>First Name <span style={{ color: '#ef4444' }}>*</span></label>
<input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
</div>
<div className="form-group">
<label>Last Name</label>
<input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
</div>
</div>
<div className="form-group">
<label>Email</label>
<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
</div>
<div className="form-group">
<label>Password</label>
<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" />
</div>
<div className="form-group">
<label>Role</label>
<select required value={role} onChange={(e) => setRole(e.target.value)}>
<option value="">Select role</option>
<option value="student">Student</option>
<option value="faculty">Faculty</option>
</select>
</div>
</div>
<div className="modal-footer">
<button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
{submitting ? 'Creating' : 'Create User'}
</button>
</div>
</form>
</Modal>
);
}

const TEMPLATE_HEADERS = {
student: ['first_name', 'last_name', 'email', 'phone', 'branch', 'batch', 'cgpa'],
faculty: ['first_name', 'last_name', 'email', 'phone', 'designation', 'department_id'],
};

/**
 * Bulk onboarding from a roster CSV — the explicit use case is a Google
 * Form export. "Download Template" gives the exact column names the
 * backend recognizes (bulk-onboard.util.ts also accepts common synonyms
 * like "Email Address"/"Mobile Number", but a Google Form built against
 * this template's own headers as its question titles is a guaranteed
 * match, no synonym guessing needed).
 */
function BulkOnboardModal({ open, onClose, onDone }) {
const dispatch = useAppDispatch();
const { showToast } = useNotifications();
const [role, setRole] = useState('student');
const [file, setFile] = useState(null);
const [submitting, setSubmitting] = useState(false);
const [result, setResult] = useState(null);

useEffect(() => {
if (!open) return;
setRole('student');
setFile(null);
setResult(null);
}, [open]);

const downloadTemplate = () => {
downloadCsv(`BarelyPassing_${role}_roster_template.csv`, [TEMPLATE_HEADERS[role].join(',')]);
};

const submit = async () => {
if (!file) return showToast('Choose a CSV file first', 'warning');
setSubmitting(true);
setResult(null);
try {
const res = await dispatch(bulkOnboardUsers({ role, file })).unwrap();
setResult(res.data);
showToast(`${res.data.created} created, ${res.data.skipped} skipped.`, res.data.created > 0 ? 'success' : 'warning');
onDone();
} catch (e) {
showToast('Failed: ' + e.message, 'error');
} finally {
setSubmitting(false);
}
};

const exportResults = () => {
if (!result) return;
const lines = [
'Row,Email,Status,Reason/Role,Generated Password',
...result.results.map((r) => `${r.row},"${r.email || ''}",${r.status},"${r.reason || r.role || ''}",${r.generated_password || ''}`),
];
downloadCsv('BarelyPassing_BulkOnboard_Results.csv', lines);
};

return (
<Modal open={open} onClose={onClose} title="📤 Bulk Onboard from CSV" maxWidth={620}>
<div className="modal-body">
{!result ? (
<>
<p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
Upload a roster CSV — a Google Form export works directly if its question titles match the template's column names below.
</p>
<div className="form-group">
<label>Account Type</label>
<select value={role} onChange={(e) => setRole(e.target.value)}>
<option value="student">Student</option>
<option value="faculty">Faculty</option>
</select>
</div>
<div className="form-group">
<label>CSV File <span style={{ color: '#ef4444' }}>*</span></label>
<input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
</div>
<button type="button" onClick={downloadTemplate} style={{ fontSize: 12, background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
⬇ Download {role} CSV template
</button>
</>
) : (
<>
<div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
<Stat label="Created" value={result.created} color="#16a34a" />
<Stat label="Skipped" value={result.skipped} color={result.skipped > 0 ? '#ef4444' : '#94a3b8'} />
</div>
{result.unrecognized_headers.length > 0 && (
<p style={{ fontSize: 12, color: '#d97706', background: '#fffbeb', padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>
⚠ Unrecognized columns, ignored: {result.unrecognized_headers.join(', ')}
</p>
)}
<div style={{ maxHeight: 280, overflowY: 'auto' }}>
<table className="crud-table">
<thead><tr><th>Row</th><th>Email</th><th>Status</th><th>Detail</th></tr></thead>
<tbody>
{result.results.map((r) => (
<tr key={r.row}>
<td>{r.row}</td>
<td style={{ fontSize: 12 }}>{r.email || '—'}</td>
<td>
<span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: r.status === 'created' ? '#f0fdf4' : '#fef2f2', color: r.status === 'created' ? '#16a34a' : '#ef4444' }}>
{r.status.toUpperCase()}
</span>
</td>
<td style={{ fontSize: 12, color: '#64748b' }}>{r.reason || (r.generated_password ? `password: ${r.generated_password}` : '—')}</td>
</tr>
))}
</tbody>
</table>
</div>
</>
)}
</div>
<div className="modal-footer">
{!result ? (
<button className="submit-btn" style={{ flex: 1 }} onClick={submit} disabled={submitting}>
{submitting ? 'Uploading…' : 'Upload & Create Accounts'}
</button>
) : (
<button className="submit-btn" style={{ flex: 1 }} onClick={exportResults}>
⬇ Export Results (CSV)
</button>
)}
<button className="btn-cancel" onClick={onClose}>Close</button>
</div>
</Modal>
);
}

function EditUserModal({ user, onClose, onSaved }) {
const dispatch = useAppDispatch();
const { showToast } = useNotifications();
const [username, setUsername] = useState('');
const [email, setEmail] = useState('');
const [role, setRole] = useState('student');
const [submitting, setSubmitting] = useState(false);

useEffect(() => {
if (!user) return;
setUsername(user.username);
setEmail(user.email);
setRole(user.role);
}, [user]);

const submit = async () => {
setSubmitting(true);
try {
// Profile fields and role are separate calls — the server rejects a
// `role` key on the profile route so a routine edit can never carry a
// privilege change, and the role endpoint applies its own ceiling.
await dispatch(updateUserProfile({ id: user.user_id, payload: { username, email } })).unwrap();
if (role && role !== user.role) {
await dispatch(updateUserRole({ id: user.user_id, role })).unwrap();
}
showToast('User updated!', 'success');
onClose();
onSaved();
} catch (e) {
showToast('Failed: ' + e.message, 'error');
} finally {
setSubmitting(false);
}
};

return (
<Modal open={!!user} onClose={onClose} title="Edit User">
<div className="modal-body">
<div className="form-group">
<label>Username</label>
<input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Full name" />
</div>
<div className="form-group">
<label>Email</label>
<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
</div>
<div className="form-group">
<label>Role</label>
<select value={role} onChange={(e) => setRole(e.target.value)}>
<option value="student">Student</option>
<option value="faculty">Faculty</option>
</select>
</div>
</div>
<div className="modal-footer">
<button className="submit-btn" style={{ flex: 1 }} onClick={submit} disabled={submitting}>
{submitting ? 'Saving…' : 'Save Changes'}
</button>
<button className="btn-cancel" onClick={onClose}>Cancel</button>
</div>
</Modal>
);
}

export default function UserManagement() {
const dispatch = useAppDispatch();
const { showToast } = useNotifications();
const { user } = useAuth();
const users = useAppSelector((state) => state.users.items);
const usersStatus = useAppSelector((state) => state.users.status);
const [addOpen, setAddOpen] = useState(false);
const [bulkOpen, setBulkOpen] = useState(false);
const [editTarget, setEditTarget] = useState(null);
const [roleFilter, setRoleFilter] = useState('');
const [branchFilter, setBranchFilter] = useState('');
const [search, setSearch] = useState('');

const load = () => dispatch(fetchAllUsers());

useEffect(() => {
load();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// Branch only means anything once "Student" is picked — clear it on any
// other type so switching away and back doesn't silently reapply a stale
// branch the user never re-chose.
useEffect(() => {
setBranchFilter('');
}, [roleFilter]);

// Options are derived from whatever's actually loaded, not hardcoded — a
// type/branch with no users right now just doesn't show up as a choice,
// instead of offering a filter that's guaranteed to find nothing.
const roleOptions = [...new Set(users.map((u) => u.role))].sort();
const branchOptions = [...new Set(users.filter((u) => u.role === 'student' && u.branch).map((u) => u.branch))].sort();

const filteredUsers = users.filter((u) => {
if (roleFilter && u.role !== roleFilter) return false;
if (roleFilter === 'student' && branchFilter && u.branch !== branchFilter) return false;
const q = search.trim().toLowerCase();
if (q && !(u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))) return false;
return true;
});

/**
* Mirror of the backend's canDeleteRole() privilege ceiling, for the UI only.
* Hides the Delete button on rows the actor is not allowed to remove. The
* server enforces the same rule regardless — this is defense-in-depth.
*/
const canDelete = (targetRole) => {
const actorRole = user?.role;
if (actorRole === 'superadmin') return true; // full management, incl. spoc
if (actorRole === 'spoc') return targetRole === 'admin';
// admin & head ceiling: students and faculty only
return targetRole === 'student' || targetRole === 'faculty';
};

const remove = async (id) => {
if (!window.confirm('Are you sure you want to delete this user?')) return;
try {
await dispatch(deleteUser(id)).unwrap();
showToast('User deleted!', 'success');
} catch (e) {
showToast('Failed: ' + e.message, 'error');
}
};

return (
<>
<AcademicMetrics />
<div className="stats-card">
<div className="stats-card-header">
<div>
<h3>System User Management</h3>
<p>Manage all institutional users.</p>
</div>
<div style={{ display: 'flex', gap: 10 }}>
<button className="btn-cancel" onClick={() => setBulkOpen(true)}>📤 Bulk Onboard (CSV)</button>
<button className="page-action-btn" onClick={() => setAddOpen(true)}>+ Add User</button>
</div>
</div>
<div className="stats-card-body">
<div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
<div>
<label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>User Type</label>
<select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, minWidth: 160 }}>
<option value="">All Types</option>
{roleOptions.map((r) => (
<option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
))}
</select>
</div>
{roleFilter === 'student' && (
<div>
<label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Branch</label>
<select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, minWidth: 160 }}>
<option value="">All Branches</option>
{branchOptions.map((b) => (
<option key={b} value={b}>{b}</option>
))}
</select>
</div>
)}
<div style={{ flex: 1, minWidth: 200 }}>
<label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Search</label>
<input
type="text"
value={search}
onChange={(e) => setSearch(e.target.value)}
placeholder="Search by name or email…"
style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, width: '100%' }}
/>
</div>
</div>
{usersStatus === 'idle' || usersStatus === 'loading' ? (
<div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Loading...</div>
) : filteredUsers.length === 0 ? (
<div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>No users match these filters.</div>
) : (
<table className="crud-table">
<thead>
<tr><th>Username</th><th>Email</th><th>Role</th><th>Details</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
</thead>
<tbody>
{filteredUsers.map((u) => (
<tr key={u.user_id}>
<td>{u.username}</td>
<td>{u.email}</td>
<td><span style={{ fontSize: 11, padding: '3px 8px', background: '#e2e8f0', borderRadius: 4, textTransform: 'uppercase' }}>{u.role}</span></td>
<td style={{ color: '#64748b' }}>{u.role === 'student' ? (u.branch || '—') : u.role === 'faculty' ? (u.designation || '—') : '—'}</td>
<td style={{ textAlign: 'right' }}>
<button onClick={() => setEditTarget(u)} style={{ padding: '4px 8px', marginRight: 4, background: '#e2e8f0', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Edit</button>
{canDelete(u.role) ? (
<button onClick={() => remove(u.user_id)} style={{ padding: '4px 8px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
) : (
<span title="Your role cannot delete this account" style={{ padding: '4px 8px', color: '#cbd5e1', fontSize: 12 }}>Delete</span>
)}
</td>
</tr>
))}
</tbody>
</table>
)}
</div>
<AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
<EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />
</div>
<BulkOnboardModal open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={load} />
</>
);
}
