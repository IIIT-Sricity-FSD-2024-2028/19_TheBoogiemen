/**
 * Topbar — Replicates the legacy `.top-header-bar` layout.
 * Displays page title, header badges (e.g. Spring 2026, 4th Semester),
 * and header actions (such as the notification bell).
 */

export default function Topbar({ title, badges = [], children }) {
  return (
    <div className="top-header-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <h1>{title}</h1>
        {badges && badges.length > 0 && (
          <div className="header-badges">
            {badges.map((b, idx) => (
              <span key={idx} className={b.className || 'badge-term'}>
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
