/**
 * SpocDashboard — the top-level route for the spoc actor (spoc.html).
 * No nav item here carries a `module` — legacy spoc.html never calls
 * applyModuleGating() or sets data-module on any of its own links; that
 * gating feature exists to hide modules *other* actors' nav depends on,
 * which a SPOC's own subscription/team/support links never do.
 */

import { useState } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import Settings from '../../components/shared/Settings';
import Subscription from './Subscription';
import Team from './Team';
import Support from './Support';

const NAV_ITEMS = [
  {
    id: 'subscription',
    label: 'Subscription',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: 'team',
    label: 'Team',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'support',
    label: 'Support',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
];

const TITLES = {
  subscription: 'Subscription',
  team: 'Team',
  support: 'Support',
  settings: 'Settings',
};

export default function SpocDashboard() {
  const [activeView, setActiveView] = useState('subscription');

  const VIEWS = {
    subscription: <Subscription />,
    team: <Team />,
    support: <Support />,
    settings: <Settings />,
  };

  return (
    <DashboardShell
      brandSubtitle="Institution Partner Platform"
      avatarLetter="S"
      avatarClassName="avatar-s"
      roleLabel="Institution Partner"
      navItems={NAV_ITEMS}
      activeView={activeView}
      onSelect={setActiveView}
      title={TITLES[activeView]}
    >
      {VIEWS[activeView]}
    </DashboardShell>
  );
}
