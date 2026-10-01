import React, { lazy } from 'react';
import {
  BarChart3, BookOpen, CalendarDays, CalendarRange, ClipboardCheck, FileText, LayoutDashboard,
  LifeBuoy, Megaphone, MessageSquare, Presentation, Users,
} from 'lucide-react';
import PortalLayout from '../../shared/ui/PortalLayout';
import './hod.css';

const PeopleSection = lazy(() =>
  import('../college/PeopleManager').then((m) => {
    const PeopleManager = m.default;
    return { default: () => <PeopleManager title="People" subtitle="Students and faculty of your department." /> };
  })
);

/** HOD Portal: one department's dashboard, approvals, people, academics and reports. */
const NAV = [
  { group: 'Overview', path: '', label: 'Dashboard', icon: LayoutDashboard, component: lazy(() => import('./sections/HodDashboard')), keywords: 'home kpis department attendance results' },
  { group: 'Overview', path: 'approvals', label: 'Approvals', icon: ClipboardCheck, component: lazy(() => import('../shared/ApprovalsSection')), keywords: 'leave bookings approve reject pending' },
  { group: 'Department', path: 'people', label: 'People', icon: Users, component: PeopleSection, keywords: 'students faculty add import accounts' },
  { group: 'Department', path: 'courses', label: 'Courses & Sections', icon: BookOpen, component: lazy(() => import('./sections/HodCourses')), keywords: 'course section teacher assign enroll roster' },
  { group: 'Department', path: 'timetable', label: 'Timetable', icon: CalendarDays, component: lazy(() => import('./sections/HodTimetable')), keywords: 'schedule slots clash rooms' },
  { group: 'Department', path: 'reports', label: 'Reports', icon: BarChart3, component: lazy(() => import('./sections/HodReports')), keywords: 'at risk results pdf csv attendance' },
  { group: 'Campus', path: 'leave', label: 'My Leave', icon: FileText, component: lazy(() => import('../shared/LeaveSection')), keywords: 'apply absence director' },
  { group: 'Campus', path: 'announcements', label: 'Announcements', icon: Megaphone, component: lazy(() => import('../shared/AnnouncementsSection')), keywords: 'notice broadcast' },
  { group: 'Campus', path: 'events', label: 'Events', icon: CalendarRange, component: lazy(() => import('../shared/EventsSection')), keywords: 'calendar talk seminar' },
  { group: 'Campus', path: 'resources', label: 'Resources', icon: Presentation, component: lazy(() => import('../shared/BookingsSection')), keywords: 'rooms labs book booking' },
  { group: 'Campus', path: 'discussions', label: 'Discussions', icon: MessageSquare, component: lazy(() => import('../shared/DiscussionsSection')), keywords: 'forum questions', module: 'forum' },
  { group: 'Campus', path: 'support', label: 'Help & Support', icon: LifeBuoy, component: lazy(() => import('../shared/HelpSupportSection')), keywords: 'ticket help issue' },
];

export default function HodPortal() {
  return <PortalLayout portalLabel="HOD Portal" basePath="/hod" nav={NAV} />;
}
