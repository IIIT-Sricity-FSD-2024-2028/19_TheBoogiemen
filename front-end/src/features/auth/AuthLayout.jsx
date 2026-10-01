import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

const DEFAULT_POINTS = [
  'Attendance and course progress in real time',
  'Leave, approvals and announcements without paperwork',
  'OBE and accreditation reporting for administrators',
];

/**
 * Two-column layout for sign-in, sign-up and password pages: navy panel on
 * the left (brand, or custom content such as the role cards), form on the right.
 */
export default function AuthLayout({ title, aside, children }) {
  useEffect(() => {
    document.title = `${title} · BarelyPassing`;
  }, [title]);

  return (
    <div className="sp-auth">
      <aside className="sp-auth-aside">
        <Link to="/" className="sp-brand" style={{ padding: 0 }}>
          <span className="sp-brand-mark" aria-hidden="true">BP</span>
          BarelyPassing
        </Link>
        {aside || (
          <div>
            <h2>Academic progress, attendance and outcomes in one place.</h2>
            <ul className="sp-auth-points">
              {DEFAULT_POINTS.map((p) => (
                <li key={p}><CheckCircle2 size={16} aria-hidden="true" /> {p}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="sp-auth-foot">Protected session · http-only cookie · role-based access</p>
      </aside>
      <main className="sp-auth-main">
        <div className="sp-auth-card">{children}</div>
      </main>
    </div>
  );
}
