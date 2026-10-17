/**
 * FacultyDashboard — the top-level route for the faculty actor. Composes
 * DashboardShell with faculty nav items, same view-switching pattern as
 * StudentDashboard. "Request Resources" is a nav action (opens a modal),
 * not a view — matches legacy's own onclick="openResourceBookingModal();
 * return false;" link, which never had a view-section behind it.
 */

import { useState } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import Settings from '../../components/shared/Settings';
import Timetable from '../../components/shared/Timetable';
import LeavePanel from '../../components/shared/LeavePanel';
import ResearchPanel from '../../components/shared/ResearchPanel';
import DiscussionForum from '../../components/shared/DiscussionForum';
import ResourceBookingModal from '../../components/shared/ResourceBookingModal';
import Dashboard from './Dashboard';
import AssessmentMapping from './AssessmentMapping';
import MarkAttendance from './MarkAttendance';
import StudentOverview from './StudentOverview';
import EventScheduler from './EventScheduler';

// Two nav items below (Leave Management, Event Scheduler) don't exist in
// legacy faculty.html's sidebar at all — but both view-sections, both
// render functions (renderFacultyLeaveList, renderFacultyEventsTable), and
// Leave's full apply modal all exist and work; the page's own load script
// even calls both renderers on mount. They were just unreachable: no nav
// link ever called switchView() for either. Same situation as Phase 1's
// orphaned course-enroll modal — complete, working features missing only
// their entry point — so wired up here rather than left silently dropped.

export default function FacultyDashboard() {
  const [activeView, setActiveView] = useState('dashboard');
  const [resourceModalOpen, setResourceModalOpen] = useState(false);

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
      id: 'timetable',
      label: 'My Timetable',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
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
      id: 'assessment-mapping',
      label: 'Assessment Mapping',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      id: 'mark-attendance',
      label: 'Mark Attendance',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      id: 'student-overview',
      label: 'Student Overview',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
    {
      id: 'request-resources',
      label: 'Request Resources',
      onAction: () => setResourceModalOpen(true),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
        </svg>
      ),
    },
  ];

  const TITLES = {
    dashboard: 'Faculty Dashboard',
    timetable: 'My Timetable',
    leave: 'Leave Management',
    'assessment-mapping': 'Assessment Mapping',
    'mark-attendance': 'Mark Attendance',
    'student-overview': 'Student Overview',
    'event-scheduler': 'Event Scheduler',
    discussion: 'Discussion Forum',
    research: 'Research Projects',
    settings: 'Settings',
  };

  const VIEWS = {
    dashboard: <Dashboard onNavigate={setActiveView} />,
    timetable: <Timetable role="faculty" />,
    leave: <LeavePanel role="faculty" />,
    'assessment-mapping': <AssessmentMapping />,
    'mark-attendance': <MarkAttendance />,
    'student-overview': <StudentOverview />,
    'event-scheduler': <EventScheduler />,
    discussion: <DiscussionForum />,
    research: <ResearchPanel role="faculty" />,
    settings: <Settings />,
  };

  return (
    <DashboardShell
      brandSubtitle="Academic Performance & Outcome Tracking"
      avatarLetter="M"
      avatarClassName="avatar-m"
      roleLabel="Faculty"
      navItems={NAV_ITEMS}
      activeView={activeView}
      onSelect={setActiveView}
      title={TITLES[activeView]}
    >
      {VIEWS[activeView]}
      <ResourceBookingModal open={resourceModalOpen} onClose={() => setResourceModalOpen(false)} />
    </DashboardShell>
  );
}
