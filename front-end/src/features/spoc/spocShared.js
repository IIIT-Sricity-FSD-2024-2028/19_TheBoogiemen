/** Labels shared by the SPOC dashboard, setup wizard and subscription views. */

export const SETUP_STEPS = [
  { key: 'profile', label: 'College profile and code' },
  { key: 'structure', label: 'Departments and academic structure' },
  { key: 'id_formats', label: 'ID formats' },
  { key: 'grading', label: 'Grading and attendance rules' },
  { key: 'custom_fields', label: 'Custom fields' },
  { key: 'people', label: 'People imported' },
];

export const MODULE_LABEL = {
  research: 'Research and BTP',
  fees: 'Fees and finance',
  forum: 'Discussion forum',
  analytics: 'OBE analytics',
};

export const PLAN_STATUS = {
  active: { label: 'Active', tone: 'is-success' },
  expiring_soon: { label: 'Expiring soon', tone: 'is-warning' },
  expired: { label: 'Expired', tone: 'is-danger' },
};

export const PAYMENT_TONE = { captured: 'is-success', created: 'is-neutral', failed: 'is-danger' };

export function seatPercent(seat) {
  if (!seat || !seat.total) return 0;
  return Math.round((seat.used / seat.total) * 100);
}

export const seatTone = (pct) => (pct >= 100 ? 'danger' : pct >= 90 ? 'warning' : 'default');
