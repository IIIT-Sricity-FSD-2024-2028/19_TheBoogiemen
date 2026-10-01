import React, { lazy } from 'react';
import { CreditCard, LayoutDashboard, LifeBuoy, ListChecks, Megaphone, Settings, Users } from 'lucide-react';
import PortalLayout from '../../shared/ui/PortalLayout';
import './spoc.css';

/**
 * Institute SPOC Portal: the college's single point of contact sets the
 * college up (profile, structure, ID formats, grading, people) and manages the
 * subscription. Sections are lazily loaded; the URL decides which is shown.
 */
const NAV = [
  { group: 'Overview', path: '', label: 'Dashboard', icon: LayoutDashboard, component: lazy(() => import('./sections/SpocDashboard')), keywords: 'home overview plan seats setup' },
  { group: 'Overview', path: 'setup', label: 'Setup wizard', icon: ListChecks, component: lazy(() => import('./sections/SetupWizard')), keywords: 'onboarding steps getting started' },
  { group: 'College', path: 'people', label: 'People', icon: Users, component: lazy(() => import('../college/PeopleManager')), keywords: 'students faculty hod director finance import csv accounts' },
  { group: 'College', path: 'configuration', label: 'Configuration', icon: Settings, component: lazy(() => import('../college/ConfigurationSection')), keywords: 'settings departments programmes batches grading id format custom fields' },
  { group: 'College', path: 'announcements', label: 'Announcements', icon: Megaphone, component: lazy(() => import('../shared/AnnouncementsSection')), keywords: 'notice broadcast' },
  { group: 'Account', path: 'subscription', label: 'Subscription', icon: CreditCard, component: lazy(() => import('./sections/SubscriptionSection')), keywords: 'plan billing modules seats payments' },
  { group: 'Account', path: 'support', label: 'Help & Support', icon: LifeBuoy, component: lazy(() => import('../shared/HelpSupportSection')), keywords: 'ticket help issue' },
];

export default function SpocPortal() {
  return <PortalLayout portalLabel="Institute SPOC" basePath="/spoc" nav={NAV} />;
}
