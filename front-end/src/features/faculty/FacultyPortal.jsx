import React, { lazy } from 'react';
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  PartyPopper,
  Users,
  Wrench,
} from 'lucide-react';
import PortalLayout from '../../shared/ui/PortalLayout';
import './faculty.css';

/**
 * Faculty Portal: navigation config for the shared PortalLayout. Each section
 * is its own lazily loaded chunk and the URL decides which one is shown.
 */
const NAV = [
  { group: 'Overview', path: '', label: 'Dashboard', icon: LayoutDashboard, component: lazy(() => import('./sections/FacultyDashboard')), keywords: 'home overview today classes at risk' },
  { group: 'Overview', path: 'timetable', label: 'Timetable', icon: CalendarDays, component: lazy(() => import('./sections/FacultyTimetable')), keywords: 'schedule weekly classes' },
  { group: 'Teaching', path: 'sections', label: 'My Sections', icon: BookOpen, component: lazy(() => import('./sections/FacultySections')), keywords: 'courses roster syllabus progress' },
  { group: 'Teaching', path: 'attendance', label: 'Mark Attendance', icon: CheckSquare, component: lazy(() => import('./sections/MarkAttendance')), keywords: 'present absent class register' },
  { group: 'Teaching', path: 'corrections', label: 'Corrections', icon: ClipboardList, component: lazy(() => import('./sections/AttendanceCorrections')), keywords: 'attendance requests accept reject' },
  { group: 'Teaching', path: 'assessments', label: 'Assessments & Marks', icon: FileText, component: lazy(() => import('./sections/FacultyAssessments')), keywords: 'quiz internal exam marks grades publish' },
  { group: 'Students', path: 'students', label: 'Students', icon: Users, component: lazy(() => import('./sections/FacultyStudents')), keywords: 'roster at risk meetings mentor' },
  { group: 'Students', path: 'research', label: 'Research', icon: FlaskConical, component: lazy(() => import('./sections/FacultyResearch')), keywords: 'projects supervision milestones feedback', module: 'research' },
  { group: 'Campus', path: 'leave', label: 'My Leave', icon: CalendarCheck, component: lazy(() => import('../shared/LeaveSection')), keywords: 'apply absence' },
  { group: 'Campus', path: 'announcements', label: 'Announcements', icon: Megaphone, component: lazy(() => import('../shared/AnnouncementsSection')), keywords: 'notices broadcast' },
  { group: 'Campus', path: 'discussions', label: 'Discussions', icon: MessageSquare, component: lazy(() => import('../shared/DiscussionsSection')), keywords: 'forum questions replies', module: 'forum' },
  { group: 'Campus', path: 'bookings', label: 'Resource Booking', icon: Wrench, component: lazy(() => import('../shared/BookingsSection')), keywords: 'rooms labs equipment book' },
  { group: 'Campus', path: 'events', label: 'Events', icon: PartyPopper, component: lazy(() => import('../shared/EventsSection')), keywords: 'calendar fest seminar' },
];

export default function FacultyPortal() {
  return <PortalLayout portalLabel="Faculty Portal" basePath="/faculty" nav={NAV} />;
}
