import React, { lazy } from 'react';
import { Award, BookOpen, CalendarDays, CalendarHeart, CheckSquare, FileText, FlaskConical, IndianRupee, LayoutDashboard, Megaphone, MessageSquare, User } from 'lucide-react';
import PortalLayout from '../../shared/ui/PortalLayout';

/**
 * Student Portal: navigation config for the shared PortalLayout. Each section
 * is its own lazily loaded chunk; the URL decides which one is shown
 * (/student, /student/attendance, ...), so refresh, back/forward and links work.
 */
const NAV = [
  { group: 'Overview', path: '', label: 'Dashboard', icon: LayoutDashboard, component: lazy(() => import('./sections/StudentDashboard')), keywords: 'home overview marks meetings' },
  { group: 'Overview', path: 'profile', label: 'My Profile', icon: User, component: lazy(() => import('./sections/StudentProfile')), keywords: 'details cgpa branch batch' },
  { group: 'Overview', path: 'timetable', label: 'Timetable', icon: CalendarDays, component: lazy(() => import('./sections/StudentTimetable')), keywords: 'schedule classes' },
  { group: 'Academics', path: 'courses', label: 'My Courses', icon: BookOpen, component: lazy(() => import('./sections/StudentCourses')), keywords: 'subjects syllabus enroll' },
  { group: 'Academics', path: 'attendance', label: 'Attendance', icon: CheckSquare, component: lazy(() => import('./sections/StudentAttendance')), keywords: 'present absent request' },
  { group: 'Academics', path: 'results', label: 'Results', icon: Award, component: lazy(() => import('./sections/StudentResults')), keywords: 'marks grades assessments published' },
  { group: 'Academics', path: 'leave', label: 'Leave', icon: FileText, component: lazy(() => import('../shared/LeaveSection')), keywords: 'apply absence' },
  { group: 'Academics', path: 'fees', label: 'Fees', icon: IndianRupee, module: 'fees', component: lazy(() => import('./sections/StudentFees')), keywords: 'pay payment receipt dues' },
  { group: 'Community', path: 'announcements', label: 'Announcements', icon: Megaphone, component: lazy(() => import('../shared/AnnouncementsSection')), keywords: 'notices news' },
  { group: 'Community', path: 'events', label: 'Events', icon: CalendarHeart, component: lazy(() => import('../shared/EventsSection')), keywords: 'campus calendar' },
  { group: 'Community', path: 'discussions', label: 'Discussions', icon: MessageSquare, module: 'forum', component: lazy(() => import('../shared/DiscussionsSection')), keywords: 'forum questions replies' },
  { group: 'Community', path: 'research', label: 'Research', icon: FlaskConical, module: 'research', component: lazy(() => import('./sections/StudentResearch')), keywords: 'btp project milestones' },
];

export default function StudentPortal() {
  return <PortalLayout portalLabel="Student Portal" basePath="/student" nav={NAV} />;
}
