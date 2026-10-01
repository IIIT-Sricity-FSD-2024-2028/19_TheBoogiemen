import React, { Suspense, lazy, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronsLeft, ChevronsRight, LogOut, UserCog } from 'lucide-react';
import { logoutThunk } from '../../features/auth/authSlice';
import TopBar from './TopBar';
import SectionErrorBoundary from './SectionErrorBoundary';
import { LoadingState } from './StatusViews';
import ForcePasswordChange from '../../features/account/ForcePasswordChange';

const AccountPage = lazy(() => import('../../features/account/AccountPage'));

/**
 * The layout every portal uses: sidebar navigation, top bar, and the active
 * section rendered from the URL (/student/attendance -> the "attendance"
 * section). Sections are lazy-loaded, wrapped in an error boundary so one
 * broken section never takes down the whole portal.
 *
 * nav: [{ path: '' | 'attendance', label, icon, component: lazy(...), group?, keywords?, module?, when? }]
 *   Items with the same `group` are listed under that heading in the sidebar.
 *   `module` hides the item when the college has not licensed that module
 *   (fees, research, forum, analytics); `when(user)` hides it for other reasons.
 */

function readCollapsed() {
  try {
    return localStorage.getItem('bp_sidebar_collapsed') === '1';
  } catch {
    return false;
  }
}
export default function PortalLayout({ portalLabel, basePath, nav: fullNav }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const modules = user?.modules;
  const nav = fullNav.filter((item) => (!item.module || !Array.isArray(modules) || modules.includes(item.module)) && (!item.when || item.when(user)));
  const location = useLocation();
  const navigate = useNavigate();
  const signOut = () => {
    dispatch(logoutThunk());
    navigate('/login', { replace: true });
  };
  const [menuOpen, setMenuOpen] = useState(false);
  // Per-viewer preference: sidebar collapsed to an icon rail (desktop only).
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem('bp_sidebar_collapsed', c ? '0' : '1');
      } catch {
        // preference just isn't remembered
      }
      return !c;
    });
  };

  // Close the mobile drawer on navigation or Escape.
  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const allItems = [...nav, { path: 'account', label: 'My Account', icon: UserCog, keywords: 'profile password photo settings' }];
  const relative = location.pathname.slice(basePath.length).replace(/^\/+/, '').split('/')[0];
  const active = allItems.find((item) => item.path === relative) || allItems[0];

  useEffect(() => {
    document.title = `${active.label} · ${portalLabel} · BarelyPassing`;
  }, [active.label, portalLabel]);

  const renderNavItem = (item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path || 'home'}
        to={item.path ? `${basePath}/${item.path}` : basePath}
        end={!item.path}
        className="sp-nav-item"
        title={collapsed ? item.label : undefined}
      >
        <Icon size={18} aria-hidden="true" />
        <span className="sp-nav-label">{item.label}</span>
      </NavLink>
    );
  };

  // Group consecutive items under their heading.
  const groups = [];
  nav.forEach((item) => {
    const name = item.group || '';
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(item);
    else groups.push({ name, items: [item] });
  });

  // Accounts created with a temporary password must set their own first.
  if (user?.must_change_password) return <ForcePasswordChange onSignOut={signOut} />;

  return (
    <div className={`sp-root${collapsed ? ' is-collapsed' : ''}`}>
      <aside className={`sp-sidebar${menuOpen ? ' is-open' : ''}`} aria-label={`${portalLabel} navigation`}>
        <NavLink to={basePath} className="sp-brand">
          <span className="sp-brand-mark" aria-hidden="true">BP</span>
          <span className="sp-brand-text">BarelyPassing</span>
        </NavLink>
        <div className="sp-portal-label">{portalLabel}</div>
        <nav className="sp-nav">
          {groups.map((g) => (
            <div key={g.name || 'main'} className="sp-nav-group">
              {g.name && <div className="sp-nav-group-label">{g.name}</div>}
              {g.items.map(renderNavItem)}
            </div>
          ))}
        </nav>
        <div className="sp-sidebar-footer">
          {renderNavItem(allItems[allItems.length - 1])}
          <button type="button" className="sp-nav-item" onClick={signOut} title={collapsed ? 'Sign out' : undefined}>
            <LogOut size={18} aria-hidden="true" />
            <span className="sp-nav-label">Sign out</span>
          </button>
          <button type="button" className="sp-nav-item sp-collapse-btn" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : undefined}>
            {collapsed ? <ChevronsRight size={18} aria-hidden="true" /> : <ChevronsLeft size={18} aria-hidden="true" />}
            <span className="sp-nav-label">Collapse</span>
          </button>
        </div>
      </aside>

      {menuOpen && <div className="sp-drawer-backdrop" aria-hidden="true" onClick={() => setMenuOpen(false)} />}

      <div className="sp-main">
        <TopBar
          portalLabel={portalLabel}
          sectionLabel={active.label}
          nav={allItems}
          basePath={basePath}
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((o) => !o)}
        />
        <main className="sp-content" id="main">
          <SectionErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<><div className="sp-top-progress" aria-hidden="true" /><LoadingState label="Loading..." /></>}>
              {/* Keyed wrapper so each section fades in when the route changes. */}
              <div key={location.pathname} className="sp-page-anim">
              <Routes>
                {nav.map(({ path, component: Section }) =>
                  path ? <Route key={path} path={`${path}/*`} element={<Section />} /> : <Route key="index" index element={<Section />} />
                )}
                <Route path="account" element={<AccountPage />} />
                <Route path="*" element={<Navigate to={basePath} replace />} />
              </Routes>
              </div>
            </Suspense>
          </SectionErrorBoundary>
        </main>
      </div>
    </div>
  );
}
