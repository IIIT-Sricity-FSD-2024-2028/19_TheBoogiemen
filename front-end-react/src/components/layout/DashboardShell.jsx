/**
 * DashboardShell — the layout every actor dashboard (Phases 1–5) will
 * compose: Sidebar + Topbar + a content area, plus the logout wiring and
 * the `dashboard-body` page class every legacy dashboard HTML file set on
 * <body>. One shell, parameterized by props, instead of five copies.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import useBodyClass from '../../hooks/useBodyClass';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NotificationBell from './NotificationBell';

export default function DashboardShell({
  brandSubtitle,
  avatarLetter,
  avatarClassName,
  roleLabel,
  navItems,
  activeView,
  onSelect,
  title,
  badges = [],
  children,
}) {
  useBodyClass('dashboard-body');
  const { logout } = useAuth();
  const navigate = useNavigate();

  // null = not loaded yet / lookup failed — Sidebar treats that as "show
  // everything" (see its own comment).
  const [licensedModules, setLicensedModules] = useState(null);
  useEffect(() => {
    apiFetch('/billing/colleges/me/modules')
      .then((res) => setLicensedModules(res?.data?.modules || null))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <Sidebar
        brandSubtitle={brandSubtitle}
        avatarLetter={avatarLetter}
        avatarClassName={avatarClassName}
        roleLabel={roleLabel}
        navItems={navItems}
        licensedModules={licensedModules}
        activeView={activeView}
        onSelect={onSelect}
        onLogout={handleLogout}
      />
      <div className="main-content">
        <Topbar title={title} badges={badges}>
          <NotificationBell onNavigate={onSelect} />
        </Topbar>
        <div className="content-body">{children}</div>
      </div>
    </>
  );
}
