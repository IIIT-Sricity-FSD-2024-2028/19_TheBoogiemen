/**
 * Display helpers shared by every portal.
 *
 * formatStudentId follows the project's existing display-ID convention
 * (front-end/fixes.js `formatDisplayId` and the backend student PDF report):
 * "STU-2026" + the numeric part of the user id padded to 4 digits, so the
 * internal id "u1" is shown as "STU-20260001".
 */

export function formatStudentId(userId) {
  return formatDisplayId(userId, 'STU');
}

const ROLE_ID_PREFIX = {
  student: 'STU',
  faculty: 'FAC',
  head: 'HOD',
  DEPARTMENT_ADMIN_HOD: 'HOD',
  superadmin: 'DIR',
  INSTITUTE_SUPER_ADMIN: 'DIR',
  admin: 'ADM',
  FINANCE_ADMIN: 'FIN',
  spoc: 'SPC',
};

/**
 * Human-readable ID in the project's existing format (PREFIX-2026 + the
 * numeric part of the internal id, padded to 4). Ids with no digits (UUIDs,
 * named ids) are not guessable into a number, so 'Not available' is shown
 * rather than an invented value.
 */
export function formatDisplayId(userId, prefix) {
  if (!userId) return 'Not available';
  const digits = String(userId).match(/\d+/);
  if (!digits || !prefix) return 'Not available';
  return `${prefix}-2026${digits[0].padStart(4, '0')}`;
}

export function formatUserId(user) {
  const prefix = ROLE_ID_PREFIX[user?.role] || (String(user?.role || '').startsWith('PLATFORM_') ? 'SUP' : null);
  return formatDisplayId(user?.user_id, prefix);
}

export function formatCurrency(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return 'Not available';
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

export function timeAgo(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) return formatDate(value);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(value);
}

export function formatDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function displayValue(value, fallback = 'Not available') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number' && Number.isNaN(value)) return fallback;
  if (typeof value === 'object') return fallback;
  return String(value);
}

export function fullName(person) {
  if (!person) return '';
  return [person.first_name, person.last_name].filter(Boolean).join(' ') || person.name || '';
}

export function capitalize(text) {
  if (!text) return '';
  return String(text).charAt(0).toUpperCase() + String(text).slice(1).toLowerCase();
}

/** Attendance below 75% is the institute's shortage threshold. */
export const ATTENDANCE_THRESHOLD = 75;

export function attendanceTone(percentage) {
  if (typeof percentage !== 'number') return 'neutral';
  if (percentage < ATTENDANCE_THRESHOLD) return 'danger';
  if (percentage < 85) return 'warning';
  return 'success';
}
