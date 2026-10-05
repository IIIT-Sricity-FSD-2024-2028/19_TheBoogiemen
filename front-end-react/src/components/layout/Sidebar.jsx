/**
 * Sidebar — the chrome every dashboard shares (brand, user card, nav,
 * Settings + Logout footer), ported from the identical markup repeated
 * across student.html/faculty.html/super-user.html/spoc.html/super-admin.html.
 *
 * Takes its nav items and per-dashboard presentation (avatar letter/class,
 * role label, brand subtitle) as props instead of being five near-copies of
 * the same markup — this is the "props" half of the migration plan's
 * foundation layer.
 */

import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ brandSubtitle, avatarLetter, avatarClassName = 'avatar-default', roleLabel, navItems, activeView, onSelect, onLogout }) {
  const { user } = useAuth();
  const name = user ? `${user.first_name || ''} ${user.last_name || user.username || ''}`.trim() : '';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>BarelyPassing</h2>
        <p>{brandSubtitle}</p>
      </div>

      <div className="sidebar-user">
        <div className={`user-avatar ${avatarClassName}`}>{avatarLetter}</div>
        <div className="user-info">
          <h3>{name || roleLabel}</h3>
          <p>{roleLabel}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => onSelect('settings')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
          </svg>
          <span>Settings</span>
        </button>
        <button type="button" className="nav-item" style={{ color: '#ef4444' }} onClick={onLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
