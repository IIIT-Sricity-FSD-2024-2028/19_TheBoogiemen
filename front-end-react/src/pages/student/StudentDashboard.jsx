/**
 * StudentDashboard — the top-level route for the student actor. Composes
 * DashboardShell with student nav items and does the view-switching that
 * legacy fixes.js's switchView()/triggerViewRender() did via DOM show/hide
 * — here it's just `activeView` state and conditional rendering, no
 * separate dispatch table needed.
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardShell from '../../components/layout/DashboardShell';
import Settings from '../../components/shared/Settings';
import Timetable from '../../components/shared/Timetable';
import LeavePanel from '../../components/shared/LeavePanel';
import ResearchPanel from '../../components/shared/ResearchPanel';
import DiscussionForum from '../../components/shared/DiscussionForum';
import Dashboard from './Dashboard';
import Profile from './Profile';
import Courses from './Courses';
import Attendance from './Attendance';

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
    id: 'profile',
    label: 'My Profile',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'timetable',
    label: 'Time Table',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'courses',
    label: 'My Courses',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'leave',
    label: 'Leave Management',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    id: 'discussion',
    label: 'Discussion Forum',
    module: 'forum',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'research',
    label: 'Research Projects',
    module: 'research',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

const TITLES = {
  dashboard: 'Dashboard',
  profile: 'My Profile',
  timetable: 'My Timetable',
  courses: 'My Courses',
  attendance: 'Attendance',
  leave: 'Leave Management',
  discussion: 'Discussion Forum',
  research: 'Research Projects',
  settings: 'Settings',
};

const VIEWS = {
  dashboard: <Dashboard />,
  profile: <Profile />,
  timetable: <Timetable role="student" />,
  courses: <Courses />,
  attendance: <Attendance />,
  leave: <LeavePanel role="student" />,
  discussion: <DiscussionForum />,
  research: <ResearchPanel role="student" />,
  settings: <Settings />,
};

export default function StudentDashboard() {
  const [activeView, setActiveView] = useState('dashboard');
  const { user } = useAuth();
  const avatarLetter = (user?.first_name || user?.username || 'S')[0].toUpperCase();

  return (
    <DashboardShell
      brandSubtitle="Academic Performance"
      avatarLetter={avatarLetter}
      avatarClassName="avatar-f"
      roleLabel="Student"
      navItems={NAV_ITEMS}
      activeView={activeView}
      onSelect={setActiveView}
      title={TITLES[activeView]}
      badges={[
        { label: 'Spring 2026', className: 'badge-term' },
        { label: '4th Semester', className: 'badge-semester' },
      ]}
    >
      {VIEWS[activeView]}
    </DashboardShell>
  );
}
