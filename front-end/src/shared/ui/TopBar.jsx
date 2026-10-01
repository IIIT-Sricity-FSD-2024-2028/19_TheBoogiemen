import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Search, Settings, User, X } from 'lucide-react';
import { logoutThunk, selectCurrentUser } from '../../features/auth/authSlice';
import {
  fetchNotifications,
  markNotificationsRead,
  selectNotifications,
  selectUnreadCount,
} from '../../features/notifications/notificationsSlice';
import { roleLabel } from '../../app/roleRoutes';
import { timeAgo } from '../format';
import Avatar from './Avatar';
import { ErrorState, LoadingState } from './StatusViews';

/** Closes a popover when clicking outside it or pressing Escape. */
function useDismiss(open, setOpen, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen, ref]);
}

const POLL_MS = 60 * 1000;

function NotificationsBell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, status, error } = useSelector(selectNotifications);
  const unread = useSelector(selectUnreadCount);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(open, setOpen, ref);

  // Poll while the page is visible so new events appear without a reload.
  useEffect(() => {
    dispatch(fetchNotifications());
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') dispatch(fetchNotifications());
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [dispatch]);

  const openItem = (n) => {
    if (!n.read) dispatch(markNotificationsRead([n.id]));
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAll = () => {
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (ids.length) dispatch(markNotificationsRead(ids));
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        type="button"
        className="sp-icon-btn"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) dispatch(fetchNotifications());
        }}
      >
        <Bell size={17} />
        {unread > 0 && <span className="sp-count-dot">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="sp-popover is-wide" role="dialog" aria-label="Notifications">
          <div className="sp-popover-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="sp-link-btn" onClick={markAll}>Mark all as read</button>
            )}
          </div>
          <div className="sp-notif-list">
            {status === 'loading' && <LoadingState label="Loading notifications..." />}
            {status === 'failed' && <ErrorState error={error} onRetry={() => dispatch(fetchNotifications())} />}
            {status === 'succeeded' && items.length === 0 && (
              <div className="sp-state"><p className="sp-state-title">You are all caught up</p><p>New activity will appear here.</p></div>
            )}
            {items.map((n) => (
              <button key={n.id} type="button" className={`sp-notif${n.read ? '' : ' is-unread'}`} onClick={() => openItem(n)}>
                <div className="sp-notif-title">
                  {!n.read && <span className="sp-unread-dot" aria-label="Unread" />}
                  {n.title}
                </div>
                <div className="sp-notif-msg">{n.message}</div>
                {n.created_at && <div className="sp-notif-time">{timeAgo(n.created_at)}</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu({ basePath }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(open, setOpen, ref);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button type="button" className="sp-user-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Avatar user={user} />
        <span className="sp-user-btn-name">{user?.name}</span>
      </button>
      {open && (
        <div className="sp-popover" role="menu">
          <div style={{ padding: '8px 10px 10px' }}>
            <div style={{ fontWeight: 600 }}>{user?.name}</div>
            <div className="sp-card-meta">{user?.email}</div>
            <div className="sp-card-meta">{roleLabel(user?.role)}</div>
          </div>
          <div className="sp-menu-sep" />
          <Link role="menuitem" className="sp-menu-item" to={`${basePath}/account`} onClick={() => setOpen(false)}>
            <User size={16} /> My account
          </Link>
          <Link role="menuitem" className="sp-menu-item" to={`${basePath}/account#password`} onClick={() => setOpen(false)}>
            <Settings size={16} /> Change password
          </Link>
          <div className="sp-menu-sep" />
          <button role="menuitem" type="button" className="sp-menu-item" onClick={() => {
            dispatch(logoutThunk());
            navigate('/login', { replace: true });
          }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Jump-to-section search over the current portal's navigation. */
function SectionSearch({ nav, basePath }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(open, setOpen, ref);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nav.filter((item) => `${item.label} ${item.keywords || ''}`.toLowerCase().includes(q)).slice(0, 6);
  }, [nav, query]);

  const go = (item) => {
    navigate(item.path ? `${basePath}/${item.path}` : basePath);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="sp-search" ref={ref}>
      <Search size={15} />
      <input
        type="search"
        className="sp-input"
        placeholder="Search sections..."
        aria-label="Search sections"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) go(results[0]);
        }}
      />
      {open && query && (
        <div className="sp-popover sp-search-results" style={{ width: 'auto' }} role="listbox">
          {results.length === 0 && <div className="sp-menu-item sp-muted">No matching section</div>}
          {results.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.path} type="button" role="option" aria-selected="false" className="sp-menu-item" onClick={() => go(item)}>
                <Icon size={16} /> {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TopBar({ portalLabel, sectionLabel, nav, basePath, menuOpen, onToggleMenu }) {
  return (
    <header className="sp-topbar">
      <button
        type="button"
        className="sp-icon-btn sp-menu-btn"
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={menuOpen}
        onClick={onToggleMenu}
      >
        {menuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      <nav className="sp-breadcrumb" aria-label="Breadcrumb">
        <span>{portalLabel}</span>
        <span aria-hidden="true">/</span>
        <strong aria-current="page">{sectionLabel}</strong>
      </nav>
      <div className="sp-topbar-spacer" />
      <SectionSearch nav={nav} basePath={basePath} />
      <NotificationsBell />
      <UserMenu basePath={basePath} />
    </header>
  );
}
