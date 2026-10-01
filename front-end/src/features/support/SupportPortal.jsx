import React, { lazy } from 'react';
import { BarChart3, Building2, Inbox, LayoutDashboard, Rocket, Users } from 'lucide-react';
import PortalLayout from '../../shared/ui/PortalLayout';
import { levelOf } from './supportUi';
import './support.css';

const manager = (user) => levelOf(user).tier >= 3;
const managerOrSales = (user) => levelOf(user).tier >= 3 || levelOf(user).isSales;

/**
 * Platform Support portal. Sections follow the support level: L1/L2/Sales work
 * the queue; Sales also sees institutions and onboarding; L3 managers add team
 * and analytics; L4 edits subscriptions and staff. The API enforces the same rules.
 */
const NAV = [
  { group: 'Desk', path: '', label: 'Dashboard', icon: LayoutDashboard, component: lazy(() => import('./sections/SupportDashboard')), keywords: 'home overview sla levels' },
  { group: 'Desk', path: 'queue', label: 'Ticket queue', icon: Inbox, component: lazy(() => import('./sections/SupportQueue')), keywords: 'tickets reply escalate assign' },
  { group: 'Customers', path: 'institutions', label: 'Institutions', icon: Building2, component: lazy(() => import('./sections/SupportInstitutions')), keywords: 'colleges subscription seats suspend', when: managerOrSales },
  { group: 'Customers', path: 'onboarding', label: 'Onboarding', icon: Rocket, component: lazy(() => import('./sections/SupportOnboarding')), keywords: 'pipeline quotes signups', when: managerOrSales },
  { group: 'Management', path: 'team', label: 'Team', icon: Users, component: lazy(() => import('./sections/SupportTeam')), keywords: 'staff workload levels', when: manager },
  { group: 'Management', path: 'analytics', label: 'Analytics', icon: BarChart3, component: lazy(() => import('./sections/SupportAnalytics')), keywords: 'charts response resolution', when: manager },
];

export default function SupportPortal() {
  return <PortalLayout portalLabel="Platform Support" basePath="/support" nav={NAV} />;
}
