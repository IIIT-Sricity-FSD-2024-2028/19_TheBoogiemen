/**
 * SuperadminDashboard — the top-level route for the superadmin actor
 * (super-admin.html). Institutions is the only nav item: every panel an
 * admin/head would otherwise want already lives on AdminHeadDashboard —
 * see super-admin.html's own header comment for why those moved out.
 */

import { useState } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import Settings from '../../components/shared/Settings';
import Institutions from './Institutions';

const NAV_ITEMS = [
  {
    id: 'institutions',
    label: 'Institutions',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" />
      </svg>
    ),
  },
];

const TITLES = {
  institutions: 'Institutions',
  settings: 'Settings',
};

export default function SuperadminDashboard() {
  const [activeView, setActiveView] = useState('institutions');

  const VIEWS = {
    institutions: <Institutions />,
    settings: <Settings />,
  };

  return (
    <DashboardShell
      brandSubtitle="Institution Partner Platform"
      avatarLetter="S"
      avatarClassName="avatar-sa"
      roleLabel="Platform Operator"
      navItems={NAV_ITEMS}
      activeView={activeView}
      onSelect={setActiveView}
      title={TITLES[activeView]}
    >
      {VIEWS[activeView]}
    </DashboardShell>
  );
}
