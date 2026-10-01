/**
 * Role rules and small helpers shared by the college administration screens
 * (People, CSV import, Configuration). The server (college.service.ts GRANTS
 * and RolesGuard) is the real access control; these copies only decide which
 * options and buttons to offer.
 */

export const ADMIN_ROLES = ['spoc', 'superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN'];
export const HOD_ROLES = ['head', 'DEPARTMENT_ADMIN_HOD'];
export const DIRECTOR_ROLES = ['superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN'];

/** Roles each actor may create and manage (mirrors GRANTS in college.service.ts). */
const GRANTS = {
  spoc: ['superadmin', 'head', 'FINANCE_ADMIN', 'faculty', 'student'],
  superadmin: ['head', 'FINANCE_ADMIN', 'faculty', 'student'],
  admin: ['head', 'FINANCE_ADMIN', 'faculty', 'student'],
  INSTITUTE_SUPER_ADMIN: ['head', 'FINANCE_ADMIN', 'faculty', 'student'],
  head: ['faculty', 'student'],
  DEPARTMENT_ADMIN_HOD: ['faculty', 'student'],
};

export const ROLE_LABEL = {
  student: 'Student',
  faculty: 'Faculty',
  head: 'Head of Department',
  DEPARTMENT_ADMIN_HOD: 'Head of Department',
  superadmin: 'Director',
  admin: 'Director',
  INSTITUTE_SUPER_ADMIN: 'Director',
  FINANCE_ADMIN: 'Finance Officer',
  spoc: 'Institute SPOC',
};

/** role_kind values returned by the server (roleKind in core/roles.ts). */
export const KIND_LABEL = {
  student: 'Student',
  faculty: 'Faculty',
  hod: 'HOD',
  director: 'Director',
  finance: 'Finance',
  spoc: 'SPOC',
};

export const grantableRoles = (role) => GRANTS[role] || [];
export const canManageRole = (viewerRole, targetRole) => grantableRoles(viewerRole).includes(targetRole);
export const isAdminRole = (role) => ADMIN_ROLES.includes(role);
export const isHodRole = (role) => HOD_ROLES.includes(role);

/** Filter options for the people list (server accepts hod/director aliases). */
export function roleFilterOptions(viewerRole) {
  if (isHodRole(viewerRole)) {
    return [
      { value: 'student', label: 'Students' },
      { value: 'faculty', label: 'Faculty' },
      { value: 'hod', label: 'HODs' },
    ];
  }
  return [
    { value: 'student', label: 'Students' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'hod', label: 'HODs' },
    { value: 'director', label: 'Directors' },
    { value: 'FINANCE_ADMIN', label: 'Finance' },
    ...(isAdminRole(viewerRole) ? [{ value: 'spoc', label: 'SPOC' }] : []),
  ];
}

/** Which ID format a role uses (student / faculty / staff), as in checkPerson(). */
export function idKindForRole(role) {
  if (role === 'student') return 'student';
  if (role === 'faculty' || isHodRole(role)) return 'faculty';
  return 'staff';
}

/** Roles that must belong to a department. */
export const needsDepartment = (role) => ['student', 'faculty', 'head'].includes(role);

/** Custom fields that apply to a role (students get student fields, everyone else faculty fields). */
export function customFieldsFor(settings, role) {
  const target = role === 'student' ? 'student' : 'faculty';
  return (settings?.custom_fields || []).filter((f) => f.applies_to === target);
}

export const PERSON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PERSON_PHONE = /^[0-9+\-\s]{7,15}$/;

/** Saves rows as a CSV file in the browser. */
export function downloadCsv(filename, header, rows) {
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

export const paiseToRupees = (paise) =>
  typeof paise === 'number'
    ? (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    : 'Not available';
