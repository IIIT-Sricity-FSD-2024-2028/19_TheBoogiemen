import React, { lazy } from 'react';
import {
  Building2, CalendarRange, ClipboardCheck, GraduationCap, IndianRupee, LayoutDashboard, LifeBuoy,
  Megaphone, MessageSquare, Presentation, Settings, Users,
} from 'lucide-react';
import PortalLayout from '../../shared/ui/PortalLayout';
import '../hod/hod.css';

const PeopleSection = lazy(() =>
  import('../college/PeopleManager').then((m) => {
    const PeopleManager = m.default;
    return { default: () => <PeopleManager title="People" subtitle="Everyone in the college: students, faculty, HODs and staff." /> };
  })
);

/** Director Portal: whole-college dashboard, departments, academics, fees and administration. */
const NAV = [
  { group: 'Overview', path: '', label: 'Dashboard', icon: LayoutDashboard, component: lazy(() => import('./sections/DirectorDashboard')), keywords: 'home kpis college departments comparison' },
  { group: 'Overview', path: 'approvals', label: 'Approvals', icon: ClipboardCheck, component: lazy(() => import('../shared/ApprovalsSection')), keywords: 'hod leave bookings approve reject pending' },
  { group: 'College', path: 'departments', label: 'Departments', icon: Building2, component: lazy(() => import('./sections/DirectorDepartments')), keywords: 'department hod report create' },
  { group: 'College', path: 'people', label: 'People', icon: Users, component: PeopleSection, keywords: 'students faculty hod staff accounts import' },
  { group: 'College', path: 'academics', label: 'Academics', icon: GraduationCap, component: lazy(() => import('./sections/DirectorAcademics')), keywords: 'results at risk marks attendance' },
  { group: 'College', path: 'fees', label: 'Fee compliance', icon: IndianRupee, component: lazy(() => import('./sections/DirectorFees')), keywords: 'fees collection overdue finance', module: 'fees' },
  { group: 'Campus', path: 'announcements', label: 'Announcements', icon: Megaphone, component: lazy(() => import('../shared/AnnouncementsSection')), keywords: 'notice broadcast' },
  { group: 'Campus', path: 'events', label: 'Events', icon: CalendarRange, component: lazy(() => import('../shared/EventsSection')), keywords: 'calendar seminar placement' },
  { group: 'Campus', path: 'resources', label: 'Resources', icon: Presentation, component: lazy(() => import('../shared/BookingsSection')), keywords: 'rooms labs bookings manage' },
  { group: 'Campus', path: 'discussions', label: 'Discussions', icon: MessageSquare, component: lazy(() => import('../shared/DiscussionsSection')), keywords: 'forum questions', module: 'forum' },
  { group: 'Administration', path: 'configuration', label: 'Configuration', icon: Settings, component: lazy(() => import('../college/ConfigurationSection')), keywords: 'settings grading structure id formats custom fields' },
  { group: 'Administration', path: 'support', label: 'Help & Support', icon: LifeBuoy, component: lazy(() => import('../shared/HelpSupportSection')), keywords: 'ticket help issue' },
];

export default function DirectorPortal() {
  return <PortalLayout portalLabel="Director Portal" basePath="/director" nav={NAV} />;
}
