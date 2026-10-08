/**
 * AdminHeadDashboard — the top-level route for the admin + head actors
 * (super-user.html serves both; nothing in that page's own JS branches on
 * admin vs head, so this React port doesn't either — role is only used for
 * the tenant-isolation guards already enforced server-side). Sidebar
 * label/avatar are "Academic Head"/"H" even for an admin-role user —
 * preserved exactly as legacy hardcodes it, not computed from the role.
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardShell from '../../components/layout/DashboardShell';
import Settings from '../../components/shared/Settings';
import LeavePanel from '../../components/shared/LeavePanel';
import Dashboard from './Dashboard';
import InstitutionalReports from './InstitutionalReports';
import EventScheduler from './EventScheduler';
import CourseManagement from './CourseManagement';
import ResourceManagement from './ResourceManagement';
import FeeCompliance from './FeeCompliance';
import UserManagement from './UserManagement';
import AttendanceOverride from './AttendanceOverride';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'institutional-reports',
    label: 'Institutional Reports',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: 'event-scheduler',
    label: 'Event Scheduler',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'course-management',
    label: 'Course Management',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: 'resource-management',
    label: 'Resources',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    id: 'fee-compliance',
    label: 'Fee Compliance',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'attendance-override',
    label: 'Overrides',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'leave',
    label: 'Leave Requests',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
];

const TITLES = {
  dashboard: 'Dashboard',
  'institutional-reports': 'Institutional Reports',
  'event-scheduler': 'Event Scheduler',
  'course-management': 'Course Management',
  'resource-management': 'Resources',
  'fee-compliance': 'Fee Compliance',
  'user-management': 'User Management',
  'attendance-override': 'Overrides',
  'leave': 'Leave Requests',
  settings: 'Settings',
};

export default function AdminHeadDashboard() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');

  const VIEWS = {
    dashboard: <Dashboard onNavigate={setActiveView} />,
    'institutional-reports': <InstitutionalReports />,
    'event-scheduler': <EventScheduler />,
    'course-management': <CourseManagement />,
    'resource-management': <ResourceManagement />,
    'fee-compliance': <FeeCompliance />,
    'user-management': <UserManagement />,
    'attendance-override': <AttendanceOverride />,
    'leave': <LeavePanel role={user?.role} />,
    settings: <Settings />,
  };

  return (
    <DashboardShell
      brandSubtitle="Academic Performance"
      avatarLetter="H"
      avatarClassName="avatar-h"
      roleLabel="Academic Head"
      navItems={NAV_ITEMS}
      activeView={activeView}
      onSelect={setActiveView}
      title={TITLES[activeView]}
    >
      {VIEWS[activeView]}
    </DashboardShell>
  );
}
