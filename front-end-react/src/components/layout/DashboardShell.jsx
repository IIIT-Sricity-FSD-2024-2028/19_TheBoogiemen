/**
 * DashboardShell — the layout every actor dashboard (Phases 1–5) will
 * compose: Sidebar + Topbar + a content area, plus the logout wiring and
 * the `dashboard-body` page class every legacy dashboard HTML file set on
 * <body>. One shell, parameterized by props, instead of five copies.
 */

import { useNavigate } from 'react-router-dom';
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
  children,
}) {
  useBodyClass('dashboard-body');
  const { logout } = useAuth();
  const navigate = useNavigate();

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
        activeView={activeView}
        onSelect={onSelect}
        onLogout={handleLogout}
      />
      <div className="main-content">
        <Topbar title={title}>
          <NotificationBell onNavigate={onSelect} />
        </Topbar>
        <div className="content-body">{children}</div>
      </div>
    </>
  );
}
